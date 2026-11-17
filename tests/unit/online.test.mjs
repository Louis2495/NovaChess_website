import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { Chess } from "chess.js";
const pg = new PGlite(),
  users = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444",
  ];
let handler, temporary;
class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.columns = "*";
  }
  select(columns = "*", opts) {
    this.columns = columns;
    this.count = opts?.count;
    return this;
  }
  eq(k, v) {
    this.filters.push([k, "=", v]);
    return this;
  }
  gt(k, v) {
    this.filters.push([k, ">", v]);
    return this;
  }
  insert(value) {
    this.value = value;
    return this;
  }
  single() {
    return this.execute(true);
  }
  then(resolve, reject) {
    return this.execute(false).then(resolve, reject);
  }
  async execute(single) {
    try {
      const args = [];
      let sql;
      if (this.value) {
        const keys = Object.keys(this.value);
        args.push(
          ...keys.map((k) =>
            this.value[k] !== null && typeof this.value[k] === "object"
              ? JSON.stringify(this.value[k])
              : this.value[k],
          ),
        );
        sql = `insert into public.${this.table}(${keys.join(",")}) values(${keys.map((_, i) => "$" + (i + 1)).join(",")}) returning *`;
      } else {
        sql = `select ${this.count ? "count(*) as count" : this.columns} from public.${this.table}`;
        if (this.filters.length)
          sql +=
            " where " +
            this.filters
              .map(([k, op, v]) => {
                args.push(v);
                return `${k}${op}$${args.length}`;
              })
              .join(" and ");
      }
      const r = await pg.query(sql, args);
      return {
        data: single ? r.rows[0] : r.rows,
        error: null,
        count: this.count ? +r.rows[0].count : undefined,
      };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  }
}
const mockDb = {
  auth: {
    getUser: async (token) => ({
      data: { user: users.includes(token) ? { id: token } : null },
      error: users.includes(token) ? null : "Invalid",
    }),
  },
  from: (table) => new Query(table),
  rpc: async (name, values) => {
    try {
      const keys = Object.keys(values),
        args = keys.map((k) =>
          typeof values[k] === "object" && values[k] !== null
            ? JSON.stringify(values[k])
            : values[k],
        );
      const r = await pg.query(
        `select * from public.${name}(${keys.map((k, i) => k + "=> $" + (i + 1)).join(",")})`,
        args,
      );
      return { data: r.rows[0], error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  },
};
async function call(user, body) {
  const r = await handler(
    new Request("https://edge.test/chess", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + user,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
  return { status: r.status, data: await r.json() };
}
async function room(mode = "standard", extra = {}) {
  const r = await call(users[0], { action: "create", mode, ...extra });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data;
}
async function command(user, r, action, extra = {}) {
  return call(user, { action, room: r.id, revision: r.revision, ...extra });
}
before(async () => {
  await pg.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;`,
  );
  let migration = readFileSync(
    "supabase/migrations/202611160001_online.sql",
    "utf8",
  )
    .replace("create extension if not exists pgcrypto;", "")
    .replace(
      "alter publication supabase_realtime add table public.rooms,public.messages,public.votes;",
      "",
    );
  await pg.exec(migration);
  await pg.exec(
    readFileSync(
      "supabase/migrations/202611160002_chat_moderation.sql",
      "utf8",
    ),
  );
  await pg.exec(readFileSync("supabase/migrations/202611170001_throne_time.sql","utf8"));
  await pg.exec(readFileSync("supabase/migrations/202611170002_throne_games.sql","utf8"));
  await pg.exec(`create schema cron;create table cron.test_jobs(name text,schedule text,command text);create function cron.schedule(text,text,text) returns bigint language plpgsql as $$begin insert into cron.test_jobs values($1,$2,$3);return 1;end $$;`);
  await pg.exec(readFileSync("supabase/migrations/202611180001_online_operations.sql","utf8").replace('create extension if not exists pg_cron with schema pg_catalog;',''));
  for (const uid of users)
    await pg.query("insert into auth.users(id)values($1)", [uid]);
  let source = readFileSync("supabase/functions/chess/index.ts", "utf8");
  source = source
    .replace(
      /import \{ createClient \} from ["']npm:@supabase\/supabase-js@2(?:\.\d+\.\d+)?["'];/,
      "",
    )
    .replace(
      /import \{ Chess \} from ["']npm:chess.js@1.4.0["'];/,
      `import {Chess} from ${JSON.stringify(pathToFileURL(resolve("node_modules/chess.js/dist/esm/chess.js")).href)};`,
    )
    .replace(
      /["']\.\.\/\.\.\/\.\.\/src\/lib\/specialRules.ts["']/,
      JSON.stringify(pathToFileURL(resolve("src/lib/specialRules.ts")).href),
    )
    .replace(
      /const db = createClient\(url, key, \{ auth: \{ persistSession: false \} \}\);/,
      "const db=globalThis.__testDb;",
    );
  globalThis.__testDb = mockDb;
  globalThis.Deno = {
    env: { get: () => "" },
    serve: (fn) => {
      handler = fn;
    },
  };
  temporary = mkdtempSync(join(tmpdir(), "nova-edge-"));
  const file = join(temporary, "edge.mjs");
  writeFileSync(
    file,
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  );
  await import(pathToFileURL(file).href);
});
after(async () => {
  await pg.close();
  rmSync(temporary, { recursive: true, force: true });
  delete globalThis.__testDb;
  delete globalThis.Deno;
});
test("Edge Function rejects unauthenticated requests and validates standard moves", async () => {
  let r = await call("not-a-user", { action: "create", mode: "standard" });
  assert.equal(r.status, 401);
  let game = await room();
  r = await command(users[1], game, "join");
  assert.equal(r.status, 200);
  game = r.data;
  r = await command(users[0], game, "move", { move: "e2e5" });
  assert.equal(r.status, 400);
  r = await command(users[1], game, "move", { move: "e7e5" });
  assert.equal(r.status, 400);
  r = await command(users[0], game, "move", { move: "e2e4" });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.state.moves, ["e2e4"]);
  const stale = await command(users[1], game, "move", { move: "e7e5" });
  assert.equal(stale.status, 400);
});
test("Throne keeps the winner and advances the queue, including the finish action", async () => {
  let game = await room("throne");
  game = (await command(users[1], game, "join")).data;
  game = (await command(users[2], game, "join")).data;
  game = (await command(users[3], game, "join")).data;
  assert.deepEqual(game.queue, [users[2], users[3]]);
  const r = await command(users[1], game, "resign");
  assert.equal(r.status, 200, JSON.stringify(r.data));
  game = r.data;
  assert.equal(game.members.find((m) => m.id === users[0]).team, "w");
  assert.equal(game.members.find((m) => m.id === users[2]).team, "b");
  assert.deepEqual(game.queue, [users[3]]);
  game = (await command(users[0], game, "finish")).data;
  assert.equal(game.members.find((m) => m.id === users[2]).team, "w");
  assert.equal(game.members.find((m) => m.id === users[3]).team, "b");
  assert.equal(game.status, "playing");
});
test("Vote Chess balances teams, keeps ballots after joins, closes at one day and breaks ties by the earliest vote", async () => {
  let game = await room("vote");
  game = (await command(users[1], game, "join")).data;
  const deadline = Date.parse(game.deadline);
  assert.ok(Math.abs(deadline - Date.now() - 86400000) < 5000);
  assert.equal(
    (await command(users[0], game, "vote", { move: "d2d4" })).status,
    200,
  );
  game = (await command(users[2], game, "join")).data;
  game = (await command(users[3], game, "join")).data;
  assert.equal(game.members.filter((m) => m.team === "w").length, 2);
  assert.equal(game.members.filter((m) => m.team === "b").length, 2);
  assert.equal(
    (await command(users[2], game, "vote", { move: "e2e4" })).status,
    200,
  );
  assert.equal(
    (await command(users[1], game, "vote", { move: "e7e5" })).status,
    400,
  );
  await pg.query(
    "update rooms set deadline=now()-interval'1 second' where id=$1",
    [game.id],
  );
  await pg.query("select close_due_votes()");
  const r = (await pg.query("select * from rooms where id=$1", [game.id]))
    .rows[0];
  assert.deepEqual(r.state.moves, ["d2d4"]);
  assert.ok(Date.parse(r.deadline) > Date.now());
});
test("Team chess lets teammates move and draw shared arrows, and the server plays the bot", async () => {
  let game = await room("team", { bot: true });
  game = (await command(users[1], game, "join")).data;
  assert.equal(game.members[1].team, "w");
  let r = await command(users[1], game, "marks", {
    marks: [{ from: "e2", to: "e4", color: "#63d6a1" }],
  });
  assert.equal(r.status, 200);
  game = r.data;
  assert.equal(game.marks.length, 1);
  r = await command(users[1], game, "move", { move: "e2e4" });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.state.moves.length, 2);
  const c = new Chess();
  for (const move of r.data.state.moves) c.move(move);
});
test("only computer team games accept a draw, and draws finish the game", async () => {
  const computer = await room("team", { bot: true });
  let result = await command(users[0], computer, "draw");
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.state.result, "1/2-1/2");
  assert.equal(result.data.status, "finished");
  const humans = await room();
  const joined = await command(users[1], humans, "join");
  result = await command(users[0], joined.data, "draw");
  assert.notEqual(result.status, 200);
});
test("ratings count each validated game once and expose country/global percentiles after five games", async () => {
  const game = await room();
  for (let i = 0; i < 5; i++) {
    const args = {
      p_room: game.id,
      p_key: "rating-" + i,
      p_white: users[0],
      p_black: users[1],
      p_result: "1-0",
    };
    assert.equal((await mockDb.rpc("rate_game", args)).error, null);
    await mockDb.rpc("rate_game", args);
  }
  const p = (await pg.query("select * from profiles where id=$1", [users[0]]))
    .rows[0];
  assert.ok(p.wins >= 5 && p.wins < 8);
  const rankings = (
    await pg.query("select * from rankings where id=$1", [users[0]])
  ).rows;
  assert.equal(rankings.length, 1);
  assert.equal(+rankings[0].global_percentile, 100);
});
test("RLS blocks forged rooms, votes, ratings and another player’s profile", async () => {
  await pg.exec(
    `set role authenticated;set request.jwt.claim.sub='${users[0]}';`,
  );
  try {
    await assert.rejects(() =>
      pg.query("update profiles set rating=9999 where id=$1", [users[0]]),
    );
    const r = await pg.query(
      "update profiles set bio=$1 where id=$2 returning id",
      ["Forged", users[1]],
    );
    assert.equal(r.rows.length, 0);
    await assert.rejects(() =>
      pg.query(
        "insert into votes(room_id,revision,user_id,move,next_state)values(gen_random_uuid(),0,$1,'e2e4','{}')",
        [users[0]],
      ),
    );
    await assert.rejects(() => pg.query("select close_due_votes()"));
    await assert.rejects(() =>
      pg.query("select rate_game(gen_random_uuid(),'fake',$1,$2,'1-0')", [
        users[0],
        users[1],
      ]),
    );
  } finally {
    await pg.exec("reset role");
  }
});
test("global chat stores plain text, applies rate limits, and allows only the author to delete", async () => {
  await pg.exec(
    `set role authenticated;set request.jwt.claim.sub='${users[0]}';`,
  );
  try {
    for (let i = 0; i < 4; i++)
      await pg.query("select post_message($1)", ["hello " + i]);
    await assert.rejects(() => pg.query("select post_message($1)", ["spam"]));
    await pg.exec(`set request.jwt.claim.sub='${users[1]}';`);
    const r = await pg.query(
      "delete from messages where user_id=$1 returning id",
      [users[0]],
    );
    assert.equal(r.rows.length, 0);
    await pg.exec(`set request.jwt.claim.sub='${users[0]}';`);
    assert.equal(
      (
        await pg.query("delete from messages where user_id=$1 returning id", [
          users[0],
        ])
      ).rows.length,
      4,
    );
  } finally {
    await pg.exec("reset role");
  }
});

test("chat moderation is server-enforced, audited, and cannot be granted by a regular member", async () => {
  await pg.exec("update profiles set banned=false");
  await pg.exec(
    `set role authenticated;set request.jwt.claim.sub='${users[1]}';`,
  );
  let id;
  try {
    assert.equal(
      (await pg.query("select is_chat_moderator() as allowed")).rows[0].allowed,
      false,
    );
    await assert.rejects(() =>
      pg.query("insert into chat_moderators(user_id)values($1)", [users[1]]),
    );
    await pg.query("select post_message('A message for moderation')");
    id = (
      await pg.query(
        "select id from messages where body='A message for moderation'",
      )
    ).rows[0].id;
    await assert.rejects(() => pg.query("select moderate_chat($1,true)", [id]));
    await assert.rejects(() =>
      pg.query("select post_message('A message for moderation')"),
    );
  } finally {
    await pg.exec("reset role");
  }
  await pg.query("insert into chat_moderators(user_id)values($1)", [users[2]]);
  await pg.exec(
    `set role authenticated;set request.jwt.claim.sub='${users[2]}';`,
  );
  try {
    await pg.query("select moderate_chat($1,true)", [id]);
    assert.equal(
      (
        await pg.query("select count(*)::int as n from messages where id=$1", [
          id,
        ])
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await pg.query(
          "select count(*)::int as n from chat_moderation_log where action='ban'",
        )
      ).rows[0].n,
      1,
    );
    await pg.exec(`set request.jwt.claim.sub='${users[1]}';`);
    await assert.rejects(() =>
      pg.query("select post_message('Trying after a ban')"),
    );
  } finally {
    await pg.exec("reset role");
  }
});

test("Team invitations join the requested side while Vote Chess always balances teams", async () => {
  const created = await call(users[3], {action:"create",mode:"team"});
  assert.equal(created.status,200,JSON.stringify(created.data));
  let game = created.data;
  const joined = await command(users[0], game, "join", {team:"w"});
  assert.equal(joined.status,200,JSON.stringify(joined.data));
  game = joined.data;
  assert.equal(game.members.find(m=>m.id===users[0]).team,"w");
  game = (await command(users[2], game, "join", {team:"b"})).data;
  assert.equal(game.members.find(m=>m.id===users[2]).team,"b");
  const moved = await command(users[0], game, "move", {move:"e2e4"});
  assert.equal(moved.status,200);
  const createdVote = await call(users[3], {action:"create",mode:"vote"});
  assert.equal(createdVote.status,200,JSON.stringify(createdVote.data));
  let vote = createdVote.data;
  vote = (await command(users[0],vote,"join",{team:"w"})).data;
  assert.equal(vote.members.find(m=>m.id===users[0]).team,"b");
});

test("throne time is recorded by room transitions and protected from browser writes", async()=>{
 const response=await call(users[0],{action:'create',mode:'throne',variant:'chess',name:'Timing'});assert.equal(response.status,200);const room=response.data;
 await pg.query("update rooms set state=state || jsonb_build_object('lastWinner',$2::text) where id=$1",[room.id,users[0]]);
 let records=await pg.query('select * from throne_reigns where room_id=$1',[room.id]);assert.equal(records.rows.length,1);assert.equal(records.rows[0].ended_at,null);
 await pg.query("update rooms set state=state || jsonb_build_object('lastWinner',$2::text) where id=$1",[room.id,users[0]]);
 records=await pg.query('select * from throne_reigns where room_id=$1',[room.id]);assert.equal(records.rows.length,1);
 await pg.query("update rooms set state=state - 'lastWinner' where id=$1",[room.id]);records=await pg.query('select * from throne_reigns where room_id=$1',[room.id]);assert.ok(records.rows[0].ended_at);
 const privilege=await pg.query("select has_table_privilege('authenticated','throne_reigns','INSERT') as allowed");assert.equal(privilege.rows[0].allowed,false);
});

test("throne aggregate returns only the signed-in player's full reign duration",async()=>{
 const r=await room('throne');await pg.query("insert into throne_reigns(room_id,user_id,started_at,ended_at) values($1,$2,now()-interval '1 hour',now())",[r.id,users[0]]);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[0]}';`);
 try { const total=await pg.query('select throne_time_ms() as ms');assert.ok(Number(total.rows[0].ms)>=3600000);await pg.exec(`set request.jwt.claim.sub='${users[3]}';`);const other=await pg.query('select throne_time_ms() as ms');assert.equal(Number(other.rows[0].ms),0); } finally {await pg.exec('reset role');}
});

test("Throne counts completed incumbent games once, including loss and draw",async()=>{
 const r=await room('throne');await pg.query("update rooms set status='playing',state=state || jsonb_build_object('lastWinner',$2::text,'gameKey','round1') where id=$1",[r.id,users[0]]);
 await pg.query("update rooms set state=state || jsonb_build_object('lastWinner',$2::text,'gameKey','round2','lastResult','1/2-1/2') where id=$1",[r.id,users[0]]);
 await pg.query("update rooms set revision=revision+1 where id=$1",[r.id]);
 let rows=await pg.query('select games from throne_reigns where room_id=$1',[r.id]);assert.equal(rows.rows[0].games,1);
 await pg.query("update rooms set state=state || jsonb_build_object('lastWinner',$2::text,'gameKey','round3','lastResult','0-1') where id=$1",[r.id,users[1]]);
 rows=await pg.query('select games,ended_at from throne_reigns where room_id=$1 order by id',[r.id]);assert.equal(rows.rows[0].games,2);assert.ok(rows.rows[0].ended_at);assert.equal(rows.rows[1].games,0);
});

test("online deployment schedules voting and bounded chat/vote retention",async()=>{
 const jobs=await pg.query('select * from cron.test_jobs order by name');assert.equal(jobs.rows.length,3);const votes=jobs.rows.find(j=>j.name==='novachess-votes');assert.equal(votes.schedule,'* * * * *');assert.match(votes.command,/close_due_votes/);assert.match(jobs.rows.find(j=>j.name==='novachess-chat-retention').command,/30 days/);
});

test('public lobby projection excludes full board histories and private-size queues',async()=>{
 const columns=await pg.query("select column_name from information_schema.columns where table_name='room_lobby' order by ordinal_position");assert.deepEqual(columns.rows.map(r=>r.column_name),['id','name','mode','variant','status','member_count','updated_at']);
});
