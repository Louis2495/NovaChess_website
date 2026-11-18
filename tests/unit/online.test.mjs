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
    getClaims: async token=>({data:{claims:users.includes(token)?{sub:token,role:"authenticated"}:null},error:users.includes(token)?null:"Invalid"}),
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
      return { data: name==="room_for_action"?r.rows[0].room_for_action:name==="active_online_account"?r.rows[0].active_online_account:r.rows[0], error: null };
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
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text unique,created_at timestamptz default now(),last_sign_in_at timestamptz,email_confirmed_at timestamptz,banned_until timestamptz,raw_app_meta_data jsonb default '{}'::jsonb,raw_user_meta_data jsonb default '{}'::jsonb,encrypted_password text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;`,
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
  await pg.exec(readFileSync("supabase/migrations/202611180002_all_online_variants.sql","utf8"));
  for (const uid of users)
    await pg.query("insert into auth.users(id)values($1)", [uid]);
  await pg.query('update auth.users set email=$1,email_confirmed_at=now(),encrypted_password=$2 where id=$3',['louisanderson477@gmail.com','hashed-test-value',users[0]]);
  await pg.exec(readFileSync('supabase/migrations/202611180003_owner_accounts.sql','utf8'));
  await pg.exec(readFileSync('supabase/migrations/202611180004_screen_names.sql','utf8'));
  await pg.exec(`create schema realtime;create table realtime.messages(extension text default 'broadcast',payload jsonb,event text,topic text,private boolean);alter table realtime.messages enable row level security;grant usage on schema realtime to authenticated;grant select,insert on realtime.messages to authenticated;create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true)$$;create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$insert into realtime.messages(payload,event,topic,private) values($1,$2,$3,$4)$$;`);
  await pg.exec(readFileSync('supabase/migrations/202611180005_fast_rooms_chat_clocks.sql','utf8').replace('alter publication supabase_realtime add table public.room_messages;',''));
  await pg.exec(readFileSync('supabase/migrations/202611180006_increment_matchmaking.sql','utf8'));
  await pg.exec(readFileSync('supabase/migrations/202611180007_delegated_admins.sql','utf8'));
  await pg.exec(readFileSync('supabase/migrations/202611180008_account_activity.sql','utf8'));
  await pg.exec(readFileSync('supabase/migrations/202611180009_account_presence_counts.sql','utf8'));
  await pg.exec(readFileSync('supabase/migrations/202611180010_daily_puzzle_chat.sql','utf8').replace('alter publication supabase_realtime add table public.puzzle_messages;',''));
  await pg.exec(readFileSync('supabase/migrations/202611180011_players_friends.sql','utf8'));

  let source = readFileSync("supabase/functions/chess/index.ts", "utf8");
  source = source
    .replace('"./engine.ts"',JSON.stringify(pathToFileURL(resolve("supabase/functions/chess/engine.ts")).href))
    .replace('"../../../src/lib/onlineVariants.ts"',JSON.stringify(pathToFileURL(resolve("src/lib/onlineVariants.ts")).href))
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
    readFile: async path => new Uint8Array(readFileSync(path)),
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
test("computer draws finish immediately; human draws require an opponent acceptance", async () => {
  const computer = await room("team", { bot: true });
  let result = await command(users[0], computer, "draw");
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.state.result, "1/2-1/2");
  assert.equal(result.data.status, "finished");
  const humans = await room();
  const joined = await command(users[1], humans, "join");
  result = await command(users[0], joined.data, "draw");
  assert.equal(result.status, 200);
  assert.equal(result.data.state.result, "*");
  assert.equal(result.data.state.drawOffer, "w");
  assert.notEqual((await command(users[0],result.data,"draw")).status,200);
  assert.notEqual((await command(users[0],result.data,"decline_draw")).status,200);
  const declined = await command(users[1],result.data,"decline_draw");
  assert.equal(declined.status,200);
  assert.ok(!declined.data.state.drawOffer);
  const offered = await command(users[1],declined.data,"draw");
  const accepted = await command(users[0],offered.data,"draw");
  assert.equal(accepted.status,200);
  assert.equal(accepted.data.state.result,"1/2-1/2");
  assert.equal(accepted.data.status,"finished");
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
 let rows=await pg.query('select games from throne_reigns where room_id=$1',[r.id]);assert.equal(rows.rows[0].games,2);
 await pg.query("update rooms set state=state || jsonb_build_object('lastWinner',$2::text,'gameKey','round3','lastResult','0-1') where id=$1",[r.id,users[1]]);
 rows=await pg.query('select games,ended_at from throne_reigns where room_id=$1 order by id',[r.id]);assert.equal(rows.rows[0].games,3);assert.ok(rows.rows[0].ended_at);assert.equal(rows.rows[1].games,1);
});

test("online deployment schedules voting and bounded chat/vote retention",async()=>{
 const jobs=await pg.query('select * from cron.test_jobs order by name');assert.equal(jobs.rows.length,6);const votes=jobs.rows.find(j=>j.name==='novachess-votes');assert.equal(votes.schedule,'* * * * *');assert.match(votes.command,/close_due_votes/);assert.match(jobs.rows.find(j=>j.name==='novachess-chat-retention').command,/30 days/);
});

test('public lobby projection excludes full board histories and private-size queues',async()=>{
 const columns=await pg.query("select column_name from information_schema.columns where table_name='room_lobby' order by ordinal_position");assert.deepEqual(columns.rows.map(r=>r.column_name),['id','name','mode','variant','status','member_count','updated_at','time_control','increment_seconds']);
});

test('every native online variant uses authoritative rules and rejects illegal moves',async()=>{
 await pg.query('update profiles set banned=false');
 const {onlineEngine}=await import('../../supabase/functions/chess/engine.ts');const ff=await onlineEngine();
 const {variantList}=await import('../../src/lib/variantCatalog.ts');
 for(const id of [...variantList.map(v=>v.id),'speedrun'].filter(id=>!['chess','dropping','chaos','random','bughouse'].includes(id))){
  await pg.query("update rooms set created_at=now()-interval '2 hours'");
  let game=await room('standard',{variant:id});assert.equal(game.variant,id);const joined=await command(users[1],game,'join');assert.equal(joined.status,200,JSON.stringify(joined.data));game=joined.data;assert.equal(game.status,'playing');
  const invalid=await command(users[0],game,'move',{move:'a1a8'});assert.equal(invalid.status,400,id);
  const {onlineLegal}=await import('../../src/lib/onlineVariants.ts');const move=onlineLegal(ff,id,game.state)[0];assert.ok(move,id);
  const moved=await command(users[0],game,'move',{move});assert.equal(moved.status,200,JSON.stringify(moved.data));assert.equal(moved.data.state.moves[0],move,id);
  if(id==='speedrun'){assert.ok(game.state.speedrun.startedAt);assert.ok(moved.data.state.speedrun.elapsed.w>=0);}
 }
});
test('online Bughouse seats four players, enforces board ownership and transfers captured pieces',async()=>{
 await pg.query('update profiles set banned=false');
 await pg.query("update rooms set created_at=now()-interval '2 hours'");let game=await room('standard',{variant:'bughouse'});
 for(let i=1;i<4;i++){const joined=await command(users[i],game,'join');assert.equal(joined.status,200,JSON.stringify(joined.data));game=joined.data;assert.equal(game.status,i===3?'playing':'waiting');}
 assert.deepEqual(game.members.map(m=>[m.board,m.team]),[[0,'w'],[0,'b'],[1,'w'],[1,'b']]);
 for(const [i,move] of [[0,'e2e4'],[1,'d7d5'],[0,'e4d5']]){const result=await command(users[i],game,'move',{move});assert.equal(result.status,200,JSON.stringify(result.data));game=result.data;}
 assert.match(game.state.partner.fen,/\[p\]/);
 const wrong=await command(users[0],game,'move',{move:'e2e4',board:1});assert.equal(wrong.status,400);
 game=(await command(users[2],game,'move',{move:'e2e4'})).data;
 const dropped=await command(users[3],game,'move',{move:'P@e6'});assert.equal(dropped.status,200,JSON.stringify(dropped.data));assert.equal(dropped.data.state.partner.moves.at(-1),'P@e6');
 const ended=await command(users[3],dropped.data,'resign');assert.equal(ended.data.state.result,'0-1');
});


test('account administration is pinned to the verified owner and exposes no password fields',async()=>{
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[0]}';`);
 try{
  assert.equal((await pg.query('select is_site_admin() as allowed')).rows[0].allowed,true);
  const result=(await pg.query("select admin_accounts('louisanderson477',0) as result")).rows[0].result;
  assert.equal(result.total,1);assert.equal(result.users[0].email,'louisanderson477@gmail.com');assert.equal(result.users[0].id,users[0]);
  assert.ok(!JSON.stringify(result).includes('hashed-test-value'));assert.ok(!Object.keys(result.users[0]).some(k=>/password|token|secret/.test(k)));
  await assert.rejects(()=>pg.query('select * from site_admins'),/permission denied/);
 }finally{await pg.exec('reset role');}
 for(const role of ['authenticated','anon']){
  await pg.exec(`set role ${role};set request.jwt.claim.sub='${users[1]}';`);
  try{
   await assert.rejects(()=>pg.query('select admin_accounts()'),/Administrator access required|permission denied/);
   await assert.rejects(()=>pg.query(`insert into site_admins(user_id) values('${users[1]}')`),/permission denied|row-level security/);
  }finally{await pg.exec('reset role');}
 }
 // Merely changing the email on a different account cannot acquire the pinned grant.
 await pg.query('update auth.users set email=$1 where id=$2',['owner-other@example.test',users[0]]);
 await pg.query('update auth.users set email=$1,email_confirmed_at=now() where id=$2',['louisanderson477@gmail.com',users[1]]);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[1]}';`);
 try{assert.equal((await pg.query('select is_site_admin() as allowed')).rows[0].allowed,false);await assert.rejects(()=>pg.query('select admin_accounts()'),/Administrator access required/);}finally{await pg.exec('reset role');}
});


test('public screen names are separate from generated handles and owner search includes them',async()=>{
 await pg.query("update profiles set screen_name='Fork Master' where id=$1",[users[2]]);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[2]}';`);
 try{
  await pg.query("update profiles set screen_name='Knight Rider' where id=$1",[users[2]]);
  const p=(await pg.query('select username,screen_name from profiles where id=$1',[users[2]])).rows[0];assert.match(p.username,/^player_/);assert.equal(p.screen_name,'Knight Rider');
  await assert.rejects(()=>pg.query("update profiles set screen_name='player_fake' where id=$1",[users[2]]),/check constraint/);
 }finally{await pg.exec('reset role');}
 const fresh='55555555-5555-4555-8555-555555555555';
 await pg.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[fresh,JSON.stringify({screen_name:'New Knight'})]);
 assert.equal((await pg.query('select screen_name from profiles where id=$1',[fresh])).rows[0].screen_name,'New Knight');
 // Restore the pinned owner after the preceding email-change denial test.
 await pg.query('update auth.users set email=$1 where id=$2',['other@example.test',users[1]]);
 await pg.query('update auth.users set email=$1 where id=$2',['louisanderson477@gmail.com',users[0]]);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[0]}';`);
 try{const result=(await pg.query("select admin_accounts('Knight Rider',0) as result")).rows[0].result;assert.equal(result.total,1);assert.equal(result.users[0].screen_name,'Knight Rider');}finally{await pg.exec('reset role');}
});


test('password hashes are fetched on demand only by the pinned owner',async()=>{
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[0]}';`);
 try{assert.equal((await pg.query('select admin_password_hash($1) as hash',[users[0]])).rows[0].hash,'hashed-test-value');assert.equal((await pg.query('select admin_password_hash($1) as hash',[users[2]])).rows[0].hash,null);}finally{await pg.exec('reset role');}
 for(const role of ['authenticated','anon']){
  await pg.exec(`set role ${role};set request.jwt.claim.sub='${users[1]}';`);
  try{await assert.rejects(()=>pg.query('select admin_password_hash($1)',[users[0]]),/Administrator access required|permission denied/);}finally{await pg.exec('reset role');}
 }
});

test('Throne announces the finished round, counts the first win and queued Finish preserves the active game',async()=>{
 await pg.exec("update profiles set banned=false;update rooms set created_at=now()-interval '2 hours'");
 let game=await room('throne');game=(await command(users[1],game,'join')).data;game=(await command(users[2],game,'join')).data;
 game=(await command(users[0],game,'move',{move:'e2e4'})).data;const before=structuredClone(game.state);
 game=(await command(users[2],game,'finish')).data;assert.equal(game.state.gameKey,before.gameKey);assert.deepEqual(game.state.moves,before.moves);assert.ok(!game.members.some(m=>m.id===users[2]));assert.ok(!game.queue.includes(users[2]));
 const id=game.state.gameKey;game=(await command(users[1],game,'resign')).data;assert.equal(game.state.lastGame.id,id);assert.equal(game.state.lastGame.reason,'resignation');assert.equal(game.state.lastGame.resignedBy,users[1]);assert.equal(game.state.lastGame.white,users[0]);assert.equal(game.state.lastWinner,users[0]);assert.deepEqual(game.state.lastGame.position.moves,before.moves);assert.equal(game.state.lastGame.position.initial,before.initial);assert.equal(game.state.lastGame.position.result,'1-0');
 const reign=await pg.query('select games from throne_reigns where room_id=$1',[game.id]);assert.equal(reign.rows[0].games,1);
 const logged=await pg.query('select * from throne_results where room_id=$1',[game.id]);assert.equal(logged.rows.length,1);assert.equal(logged.rows[0].black,users[1]);
 game=(await command(users[0],game,'finish')).data;assert.ok(!game.members.some(m=>m.id===users[0]));assert.ok(!game.queue.includes(users[0]));
});
test('online clocks start on joining, deduct only the mover and reject premature flags',async()=>{
 await pg.exec("update profiles set banned=false;update rooms set created_at=now()-interval '2 hours'");let game=await room('standard',{variant:'chess',timeControlSeconds:300});assert.equal(game.state.clock.startedAt,null);assert.equal(game.settings.timeControlSeconds,300);game=(await command(users[1],game,'join')).data;assert.ok(game.state.clock.startedAt);
 assert.equal((await command(users[1],game,'claim_timeout')).status,400);
 await pg.query("update rooms set state=jsonb_set(state,'{clock,startedAt}',to_jsonb($2::bigint)) where id=$1",[game.id,Date.now()-1500]);
 const moved=await command(users[0],game,'move',{move:'e2e4'});assert.equal(moved.status,200,JSON.stringify(moved.data));game=moved.data;assert.ok(game.state.clock.remaining.w<=298500);assert.equal(game.state.clock.remaining.b,300000);
 await pg.query("update rooms set state=jsonb_set(jsonb_set(state,'{clock,remaining,b}','0'::jsonb),'{clock,startedAt}',to_jsonb($2::bigint)) where id=$1",[game.id,Date.now()-10]);
 const flagged=await command(users[0],game,'claim_timeout');assert.equal(flagged.status,200,JSON.stringify(flagged.data));assert.equal(flagged.data.state.result,'1-0');assert.equal(flagged.data.status,'finished');assert.equal(flagged.data.state.clock.startedAt,null);
});
test('live game replies are compact while complete replay history stays in the database',async()=>{
 await pg.exec("update rooms set created_at=now()-interval '2 hours'");let game=await room();game=(await command(users[1],game,'join')).data;
 for(const [user,move]of [[0,'e2e4'],[1,'e7e5'],[0,'g1f3'],[1,'b8c6']])game=(await command(users[user],game,'move',{move})).data;
 assert.equal(game.state.moves.length,4);assert.equal(game.state.positions.length,2);const stored=(await pg.query('select state from rooms where id=$1',[game.id])).rows[0].state;assert.equal(stored.positions.length,5);assert.equal(game.state.positions[0],stored.positions[0]);assert.equal(game.state.positions[1],stored.fen);
 const sent=(await pg.query('select payload from realtime.messages where topic=$1 order by (payload->>\'revision\')::int desc limit 1',['room:'+game.id])).rows[0].payload;assert.equal(sent.state.positions.length,2);assert.equal(sent.revision,game.revision);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[0]}';set realtime.topic='room:${game.id}';`);
 try{assert.ok((await pg.query('select * from realtime.messages')).rows.length);await assert.rejects(()=>pg.query("insert into realtime.messages(topic,event,payload,private)values($1,'state','{}',true)",['room:'+game.id]),/row-level security|permission denied/);await assert.rejects(()=>pg.query('select room_for_action($1,$2)',[game.id,users[1]]),/permission denied/);}finally{await pg.exec('reset role');}
});
test('Throne chat is scoped, rejects direct forged writes and throttles even after deletion',async()=>{
 await pg.exec("update profiles set banned=false;update rooms set created_at=now()-interval '2 hours'");const game=await room('throne');
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[0]}';`);
 try{
  const row=(await pg.query("select * from post_room_message($1,'Good game!')",[game.id])).rows[0];assert.equal(row.room_id,game.id);assert.equal(row.user_id,users[0]);assert.equal(row.body,'Good game!');
  await assert.rejects(()=>pg.query("insert into room_messages(room_id,user_id,body)values($1,$2,'Forged')",[game.id,users[1]]),/permission denied|row-level security/);
  await pg.query('delete from room_messages where id=$1',[row.id]);for(let i=0;i<4;i++)await pg.query("select post_room_message($1,'Hello')",[game.id]);await assert.rejects(()=>pg.query("select post_room_message($1,'Too fast')",[game.id]),/Wait a moment/);
 }finally{await pg.exec('reset role');}
});


test('expired clocks finish and rate games without an open browser',async()=>{
 await pg.exec("update profiles set banned=false;update rooms set created_at=now()-interval '2 hours'");let game=await room('standard',{variant:'chess',timeControlSeconds:180});game=(await command(users[1],game,'join')).data;
 await pg.query("update rooms set state=jsonb_set(jsonb_set(state,'{clock,remaining,w}','0'::jsonb),'{clock,startedAt}',to_jsonb($2::bigint)) where id=$1",[game.id,Date.now()-10000]);
 assert.ok((await pg.query('select close_expired_games() as count')).rows[0].count>=1);
 const saved=(await pg.query('select state,status from rooms where id=$1',[game.id])).rows[0];assert.equal(saved.status,'finished');assert.equal(saved.state.result,'0-1');assert.equal((await pg.query('select * from rated_games where room_id=$1',[game.id])).rows.length,1);
 assert.equal((await pg.query("select timeout_result('4k3/8/8/8/8/8/P7/4K3 w - - 0 1') as result")).rows[0].result,'1/2-1/2');
});


test('cached signed-claims authentication still respects Supabase account bans',async()=>{
 await pg.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[users[0]]);
 try{const blocked=await call(users[0],{action:'create',mode:'standard'});assert.equal(blocked.status,403);assert.equal(blocked.data.error,'Account unavailable.');}finally{await pg.query('update auth.users set banned_until=null where id=$1',[users[0]]);}
});

 test('3+2 clocks award exactly one increment to the mover and reject unsupported controls',async()=>{
 await pg.exec("update profiles set banned=false;update rooms set created_at=now()-interval '2 hours'");
 let game=await room('standard',{variant:'chess',timeControlSeconds:180,incrementSeconds:2});
 assert.equal(game.state.clock.incrementMs,2000);assert.equal(game.settings.incrementSeconds,2);
 game=(await command(users[1],game,'join')).data;
 await pg.query("update rooms set state=jsonb_set(state,'{clock,startedAt}',to_jsonb($2::bigint)) where id=$1",[game.id,Date.now()-1000]);
 const moved=await command(users[0],game,'move',{move:'e2e4'});assert.equal(moved.status,200,JSON.stringify(moved.data));
 assert.ok(moved.data.state.clock.remaining.w>180500 && moved.data.state.clock.remaining.w<=181000);
 assert.equal(moved.data.state.clock.remaining.b,180000);assert.equal(moved.data.state.clock.incrementMs,2000);
 for(const opts of [{timeControlSeconds:60},{timeControlSeconds:300,incrementSeconds:2},{timeControlSeconds:180,incrementSeconds:3}]){
 const rejected=await call(users[0],{action:'create',mode:'standard',variant:'chess',...opts});assert.notEqual(rejected.status,200);
 }
 });

test('only the pinned owner can grant admin access to confirmed active accounts by email',async()=>{
 await pg.query("update auth.users set email='delegate@example.test',email_confirmed_at=now(),banned_until=null where id=$1",[users[2]]);
 await pg.query('update profiles set banned=false where id=$1',[users[2]]);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[0]}';`);
 try{
 assert.equal((await pg.query('select is_site_owner() as owner')).rows[0].owner,true);
 const granted=(await pg.query("select grant_site_admin('  DELEGATE@EXAMPLE.TEST  ') as result")).rows[0].result;
 assert.equal(granted.email,'delegate@example.test');
 await pg.query("select grant_site_admin('delegate@example.test')");
 await assert.rejects(()=>pg.query("select grant_site_admin('missing@example.test')"),/No active, confirmed/);
 }finally{await pg.exec('reset role');}
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[2]}';`);
 try{
 assert.equal((await pg.query('select is_site_admin() as admin')).rows[0].admin,true);
 assert.equal((await pg.query('select is_site_owner() as owner')).rows[0].owner,false);
 assert.ok((await pg.query("select admin_accounts() as result")).rows[0].result.users.length>0);
 await assert.rejects(()=>pg.query("select grant_site_admin('other@example.test')"),/Only the site owner/);
 await assert.rejects(()=>pg.query(`insert into site_owners values('${users[2]}')`),/permission denied|row-level security/);
 await assert.rejects(()=>pg.query(`insert into site_admins values('${users[1]}')`),/permission denied|row-level security/);
 }finally{await pg.exec('reset role');}
 for(const update of ['email_confirmed_at=null',"banned_until=now()+interval '1 day'"]){
 await pg.query('update auth.users set email_confirmed_at=now(),banned_until=null where id=$1',[users[2]]);
 await pg.query('update auth.users set '+update+' where id=$1',[users[2]]);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[2]}';`);
 try{assert.equal((await pg.query('select is_site_admin() as allowed')).rows[0].allowed,false);}finally{await pg.exec('reset role');}
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[0]}';`);
 try{await assert.rejects(()=>pg.query("select grant_site_admin('delegate@example.test')"),/No active, confirmed/);}finally{await pg.exec('reset role');}
 }
 await pg.query('update auth.users set email_confirmed_at=now(),banned_until=null where id=$1',[users[2]]);
 await pg.query('delete from site_admins where user_id=$1',[users[2]]);
});

test('account heartbeats are self-only and online status is restricted to administrators',async()=>{
 const accountCount=Number((await pg.query('select count(*) from auth.users')).rows[0].count);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[1]}';`);
 try{
  await pg.query('select account_heartbeat()');
  await assert.rejects(()=>pg.query('select * from account_activity'),/permission denied/);
  await assert.rejects(()=>pg.query('select admin_online_accounts($1)',[[users[1]]]),/Administrator access required/);
  await assert.rejects(()=>pg.query('select admin_presence_counts()'),/Administrator access required/);
 }finally{await pg.exec('reset role');}
 assert.equal((await pg.query('select user_id from account_activity')).rows[0].user_id,users[1]);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[0]}';`);
 try{assert.deepEqual((await pg.query('select admin_online_accounts($1) as ids',[[users[1],users[3]]])).rows[0].ids,[users[1]]);assert.deepEqual((await pg.query('select admin_presence_counts() as counts')).rows[0].counts,{online:1,offline:accountCount-1});}finally{await pg.exec('reset role');}
 await pg.query("update account_activity set seen_at=now()-interval '151 seconds'");
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[0]}';`);
 try{assert.deepEqual((await pg.query('select admin_online_accounts($1) as ids',[[users[1]]])).rows[0].ids,[]);}finally{await pg.exec('reset role');}
 await pg.exec("set role anon;set request.jwt.claim.sub='';");
 try{await assert.rejects(()=>pg.query('select account_heartbeat()'),/permission denied/);}finally{await pg.exec('reset role');}
});

test('daily puzzle chat scopes posts, enforces identity and blocks direct inserts',async()=>{
 await pg.exec('delete from room_chat_throttle');await pg.query('update profiles set banned=false where id=$1',[users[1]]);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[1]}';`);
 try{
  const sent=(await pg.query("select * from post_puzzle_message('2026-11-18/puzzle-one','  Good puzzle!  ')")).rows[0];assert.equal(sent.user_id,users[1]);assert.equal(sent.body,'Good puzzle!');assert.equal(sent.puzzle_key,'2026-11-18/puzzle-one');
  assert.equal((await pg.query("select count(*) from puzzle_messages where puzzle_key='2026-11-18/other'")).rows[0].count,0);
  await assert.rejects(()=>pg.query("select post_puzzle_message('bad-key','Hi')"),/Invalid puzzle/);
  await assert.rejects(()=>pg.query("select post_puzzle_message('2026-11-18/puzzle-one','')"),/1–600/);
  await assert.rejects(()=>pg.query("insert into puzzle_messages(puzzle_key,user_id,body)values('other',$1,'Spoof')",[users[0]]),/permission denied|row-level security/);
 }finally{await pg.exec('reset role');}
 await pg.query('update profiles set banned=true where id=$1',[users[1]]);await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[1]}';`);
 try{await assert.rejects(()=>pg.query("select post_puzzle_message('2026-11-18/puzzle-one','Blocked')"),/Sign in/);}finally{await pg.exec('reset role');await pg.query('update profiles set banned=false where id=$1',[users[1]]);}
});

test('friend requests need acceptance and friend games are reserved and absent from matchmaking',async()=>{
 await pg.exec('delete from friendships');await pg.query('update profiles set banned=false where id=any($1::uuid[])',[users]);await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[0]}';`);
 try{await pg.query('select friend_action($1,$2)',[users[1],'send']);const rows=(await pg.query("select player_directory('','everyone',0) as players")).rows[0].players;assert.equal(rows.find(p=>p.id===users[1]).relationship,'outgoing');assert.ok(rows.every(p=>!('email' in p)&&!('encrypted_password' in p)));await assert.rejects(()=>pg.query('select friend_action($1,$2)',[users[1],'accept']),/No incoming/);await assert.rejects(()=>pg.query('select friend_action($1,$2)',[users[0],'send']),/unavailable/);}finally{await pg.exec('reset role');}
 assert.equal((await call(users[0],{action:'create',mode:'standard',variant:'chess',friend:users[2]})).status,400);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[1]}';`);
 try{assert.equal((await pg.query("select player_directory('','requests',0) as players")).rows[0].players[0].id,users[0]);await pg.query('select friend_action($1,$2)',[users[0],'accept']);}finally{await pg.exec('reset role');}
 const created=await call(users[0],{action:'create',mode:'standard',variant:'chess',name:'Friendly game',friend:users[1],timeControlSeconds:180});assert.equal(created.status,200,JSON.stringify(created.data));const game=created.data;
 assert.equal(game.settings.invitedFriend,users[1]);assert.equal((await pg.query('select count(*) from room_lobby where id=$1',[game.id])).rows[0].count,0);
 assert.equal((await command(users[2],game,'join')).status,400);assert.equal((await command(users[1],game,'join')).status,200);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='${users[1]}';`);
 try{await assert.rejects(()=>pg.query("insert into friendships(sender,recipient) values($1,$2)",[users[1],users[2]]),/permission denied/);await pg.query('select friend_action($1,$2)',[users[0],'remove']);assert.deepEqual((await pg.query("select player_directory('','friends',0) as players")).rows[0].players,[]);}finally{await pg.exec('reset role');}
});
