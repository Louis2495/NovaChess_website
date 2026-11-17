declare const EdgeRuntime: {waitUntil(task:Promise<unknown>):void};
import {onlineEngine} from "./engine.ts";
import {freshOnline,applyOnline,onlineVariantIds,specialVariants} from "../../../src/lib/onlineVariants.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { Chess } from "npm:chess.js@1.4.0";
import {
  newSpecial,
  specialApply,
  type SpecialState,
} from "../../../src/lib/specialRules.ts";
const url = Deno.env.get("SUPABASE_URL")!,
  key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, key, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function wireRoom(data:any){
 if(!data?.state || !data?.id || specialVariants.includes(data.variant))return data;
 const compact=(position:any)=>({...position,positions:position.positions?.length>1?[position.positions[0],position.fen]:position.positions});
 return {...data,state:{...compact(data.state),...(data.state.partner?{partner:compact(data.state.partner)}:{})}};
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(wireRoom(data)), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
type Member = { id: string; team: "w" | "b" | null; board?:number };
async function fresh(variant: string, count = 2) {
  if(!["chess",...specialVariants].includes(variant))return {...freshOnline(await onlineEngine(),variant),gameKey:crypto.randomUUID()};
  return variant === "chess"
    ? {
        fen: new Chess().fen(),
        positions: [new Chess().fen()],
        moves: [],
        notation: [],
        result: "*",
        gameKey: crypto.randomUUID(),
      }
    : {
        ...newSpecial(variant as SpecialState["variant"], count),
        gameKey: crypto.randomUUID(),
      };
}
function standardApply(state: any, move: string) {
  const c = new Chess();
  for (const m of state.moves) c.move(m);
  const played = c.move(move);
  if (!played) throw Error("Illegal move.");
  return {
    ...state,
    fen: c.fen(),
    moves: [...state.moves, played.from + played.to + (played.promotion || "")],
    positions: [...state.positions, c.fen()],
    notation: [...state.notation, played.san],
    result: c.isCheckmate()
      ? c.turn() === "w"
        ? "0-1"
        : "1-0"
      : c.isDraw()
        ? "1/2-1/2"
        : "*",
  };
}
function simpleBot(state: any) {
  const c = new Chess(state.fen),
    weights: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  const moves = c.moves({ verbose: true });
  moves.sort(
    (a, b) =>
      (b.captured ? weights[b.captured] : 0) -
      (a.captured ? weights[a.captured] : 0),
  );
  const best = moves.filter(
    (m) =>
      (m.captured ? weights[m.captured] : 0) ===
      (moves[0]?.captured ? weights[moves[0].captured] : 0),
  );
  const m = best[Math.floor(Math.random() * best.length)];
  return m ? m.from + m.to + (m.promotion || "") : "";
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  try {
    const receivedAt=Date.now();
    if (Number(req.headers.get("content-length") || 0) > 100000)
      throw Error("Request too large.");
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign in to play online." }, 401);
    const {data:verified,error:authError}=await db.auth.getClaims(token);
    const uid=verified?.claims?.sub;
    if(authError || !uid || verified?.claims?.role!=="authenticated")return json({error:"Sign in to play online."},401);
    const body=await req.json();
    let action=body.action;
    const finishing=action==="finish";
    if (action === "create") {
      const {data:active}=await db.rpc("active_online_account",{p_actor:uid});
      if(active!==true)return json({error:"Account unavailable."},403);
      if (!["standard", "throne", "vote", "team"].includes(body.mode))
        throw Error("Unknown game mode.");
      const { count } = await db
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("host", uid)
        .gt("created_at", new Date(Date.now() - 3600000).toISOString());
      if ((count || 0) >= 120)
        throw Error("Too many new games. Please try again later.");
      const variant =
        body.mode === "vote"
          ? "chess"
          : onlineVariantIds.includes(body.variant)
            ? body.variant
            : "chess";
      if(body.variant && !onlineVariantIds.includes(body.variant))throw Error("Unknown variant.");
      if (body.bot && variant !== "chess")
        throw Error("Online team bots currently use standard chess.");
      if(body.mode==="standard" && variant==="chess" && body.timeControlSeconds!==undefined && ![60,180,600].includes(body.timeControlSeconds))throw Error("Choose 1, 3 or 10 minutes.");
      const timed=body.mode==="standard" && variant==="chess" && [60,180,600].includes(body.timeControlSeconds);
      const initial=await fresh(variant,Math.max(1,Math.min(4,+body.dropCount||2)));
      if(timed)initial.clock={remaining:{w:body.timeControlSeconds*1000,b:body.timeControlSeconds*1000},startedAt:null};
      const { data, error } = await db
        .from("rooms")
        .insert({
          host: uid,
          name:
            String(body.name || "Chess room")
              .trim()
              .slice(0, 80) || "Chess room",
          mode: body.mode,
          variant,
          state: initial,
          members: [{ id: uid, team: "w", ...(variant === "bughouse" ? {board:0} : {}) }],
          settings: {
            bot: body.mode === "team" && body.bot === true,
            dropCount: Math.max(1, Math.min(4, +body.dropCount || 2)),
            timeControlSeconds:timed?body.timeControlSeconds:0,
          },
          status: body.mode === "team" && body.bot ? "playing" : "waiting",
          deadline:
            body.mode === "vote"
              ? new Date(Date.now() + 86400000).toISOString()
              : null,
        })
        .select()
        .single();
      if (error) throw error;
      return json(data);
    }
    const {data:r,error}=await db.rpc("room_for_action",{p_room:body.room,p_actor:uid});
    if(error || !r)throw error || Error("Game not found.");
    let members = r.members as Member[],
      queue = r.queue as string[],
      state = r.state,
      status = r.status,
      deadline = r.deadline,
      marks = r.marks;
    const me = members.find((m) => m.id === uid),
      turn = (r.variant === "bughouse" && me?.board === 1 ? state.partner.fen : state.fen).split(" ")[1];
    async function commit() {
      const { data, error } = await db.rpc("commit_room", {
        p_id: r.id,
        p_revision: r.revision,
        p_state: state,
        p_members: members,
        p_queue: queue,
        p_status: status,
        p_deadline: deadline,
        p_marks: marks,
      });
      if (error) throw error;
      return data;
    }
    if (action === "join") {
      if (me && r.mode !== "throne") return json(r);
      if (
        me &&
        r.mode === "throne" &&
        !me.team &&
        !members.some((m) => m.team === "b")
      ) {
        me.team = "b";
        queue = queue.filter((id) => id !== uid);
      }
      if (!me) {
        let team: "w" | "b" | null = null;
        if (r.mode === "team" || r.mode === "vote") {
          if (members.length >= 32) throw Error("This team room is full.");
          team = r.settings.bot
            ? "w"
            : r.mode === "team" && (body.team === "w" || body.team === "b")
              ? body.team
              : members.filter((m) => m.team === "w").length <=
                members.filter((m) => m.team === "b").length
              ? "w"
              : "b";
        } else if (!members.some((m) => m.team === "w")) team = "w";
        else if (!members.some((m) => m.team === "b")) team = "b";
        if(r.variant === "bughouse"){
          const seat=[{board:0,team:"w"},{board:0,team:"b"},{board:1,team:"w"},{board:1,team:"b"}].find(s=>!members.some(m=>(m.board||0)===s.board && m.team===s.team));
          if(!seat)throw Error("This game is full.");
          members=[...members,{id:uid,...seat}];
        }else members = [...members, { id: uid, team }];
      }
      if (
        r.mode === "throne" &&
        members.find((m) => m.id === uid)?.team === null &&
        !queue.includes(uid)
      )
        queue.push(uid);
      if (
        members.some((m) => m.team === "w") &&
        (r.settings.bot || members.some((m) => m.team === "b"))
      ) {
        status = r.variant === "bughouse" && members.length < 4 ? "waiting" : state.result === "*" ? "playing" : "finished";
        if(state.clock && status === "playing" && r.status === "waiting")state={...state,clock:{...state.clock,startedAt:Date.now()}};
        if(state.speedrun && status === "playing" && r.status === "waiting")state={...state,speedrun:{...state.speedrun,startedAt:Date.now()}};
        if (r.mode === "vote" && r.status === "waiting")
          deadline = new Date(Date.now() + 86400000).toISOString();
      }
      return json(await commit());
    }
    if (!me) throw Error("Join the room first.");
    if (action === "marks") {
      if (r.mode !== "team" || !me.team)
        throw Error("Only team players can draw shared arrows.");
      if (!Array.isArray(body.marks) || body.marks.length > 64)
        throw Error("Too many marks.");
      marks = body.marks.filter(
        (m: any) =>
          /^[a-h][1-8]$/.test(m.from) &&
          /^[a-h][1-8]$/.test(m.to) &&
          /^#[0-9a-f]{6}$/i.test(m.color),
      );
      return json(await commit());
    }
    if (finishing) {
      if(r.mode!=="throne")throw Error("Finish is available in Throne.");
      if(me.team && status==="playing" && members.filter(m=>m.team).length===2){action="resign";}
      else {
        members=members.filter(m=>m.id!==uid);queue=queue.filter(id=>id!==uid);
        // A spectator leaving must not reset an ongoing game.
        if(me.team){
          const seated=members.filter(m=>m.team);if(seated[0])seated[0].team="w";
          while(seated.length<2 && queue.length){const next=members.find(m=>m.id===queue.shift());if(next){next.team=seated.length?"b":"w";seated.push(next);}}
          state={...await fresh(r.variant,r.settings.dropCount),lastGame:r.state.lastGame,lastWinner:r.state.lastWinner!==uid?r.state.lastWinner:undefined};
          status=seated.length===2?"playing":"waiting";marks=[];deadline=null;
        }
        return json(await commit());
      }
    }
    const clock=state.clock;
    const expired=!!clock && clock.startedAt!==null && clock.remaining[turn]-Math.max(0,receivedAt-clock.startedAt)<=0;
    if(action==="claim_timeout"){
      if(!me.team || status!=="playing" || state.result!=="*" || !expired)throw Error("The clock has not expired.");
    }
    if (
      !me.team ||
      (!["resign", "draw", "claim_timeout"].includes(action) && me.team !== turn) ||
      status !== "playing" ||
      state.result !== "*"
    )
      throw Error("It is not your team’s turn.");
    if (
      !finishing && ["move", "vote", "resign", "draw"].includes(action) &&
      body.revision !== r.revision
    )
      throw Error("Position changed. Try again.");
    if(expired && clock){
      const c=new Chess(state.fen),winner=turn==="w"?"b":"w";
      const pieces=Object.values(c.board().flat().filter(Boolean)).filter((p:any)=>p.color===winner && p.type!=="k");
      state={...state,result:!pieces.length || c.isInsufficientMaterial()?"1/2-1/2":winner==="w"?"1-0":"0-1",clock:{...clock,remaining:{...clock.remaining,[turn]:0},startedAt:null}};
    }else if (action === "move" || action === "vote") {
      const next =
        r.variant === "chess"
          ? standardApply(state, String(body.move))
          : specialVariants.includes(r.variant) ? specialApply(
              state,
              body.specialAction || { type: "move", move: String(body.move) },
            ) : applyOnline(await onlineEngine(),r.variant,state,String(body.move),me.board||0);
      if (r.mode === "vote") {
        if (action !== "vote" || r.variant !== "chess")
          throw Error("Submit a move ballot.");
        const { error } = await db.rpc("cast_vote", {
          p_room: r.id,
          p_revision: state.moves.length,
          p_user: uid,
          p_move: String(body.move),
          p_state: next,
        });
        if (error) throw error;
        return json({ voted: true });
      }
      state = next;
      if(clock)state={...state,clock:{remaining:{...clock.remaining,[turn]:Math.max(0,clock.remaining[turn]-Math.max(0,receivedAt-clock.startedAt))},startedAt:state.result==="*"?Date.now():null}};
      marks = [];
    } else if (action === "draw") {
      if (!r.settings.bot || r.mode !== "team")
        throw Error("Draw offers are available against the computer.");
      state = { ...state, result: "1/2-1/2" };
    } else if (action === "resign") {
      state = { ...state, result: (me.team === "w") !== (r.variant === "bughouse" && me.board === 1) ? "0-1" : "1-0" };
    } else throw Error("Unknown action.");
    if (
      r.settings.bot &&
      state.result === "*" &&
      state.fen.split(" ")[1] === "b"
    ) {
      const move = simpleBot(state);
      if (move) state = standardApply(state, move);
    }
    if(state.result!=="*" && state.clock)state={...state,clock:{...state.clock,startedAt:null}};
    const finishedState = state,
      finishedMembers = members.map((m) => ({ ...m }));
    if (state.result !== "*") status = "finished";
    if (state.result !== "*" && r.mode === "throne" && state.result === "1/2-1/2") {
      state = {...await fresh(r.variant,r.settings.dropCount),lastResult:finishedState.result,lastWinner:r.state.lastWinner,lastGame:{id:r.state.gameKey,result:finishedState.result,white:members.find(m=>m.team==="w")?.id,black:members.find(m=>m.team==="b")?.id,reason:"draw"}};
      status = members.filter(m=>m.team).length === 2 ? "playing" : "waiting";
      deadline=null; marks=[];
    }
    if (finishedState.result !== "*" && finishedState.result !== "1/2-1/2" && r.mode === "throne") {
      const winner = state.result === "1/2-1/2"
        ? members.find(m => m.id === r.state.lastWinner)
        : members.find((m) => m.team === (state.result === "0-1" ? "b" : "w"));
      queue=queue.filter(id=>!finishing || id!==uid);
      members = members.filter(m=>(!finishing || m.id!==uid) && (m.id===winner?.id || queue.includes(m.id))).map((m) => ({
        ...m,
        team: m.id === winner?.id ? "w" : null,
      }));
      const next = queue.shift();
      if (next) {
        const challenger = members.find((m) => m.id === next);
        if (challenger) challenger.team = "b";
      }
      state = {
        ...await fresh(r.variant, r.settings.dropCount),
        lastResult: finishedState.result,
        lastWinner: winner?.id,
        lastGame:{id:r.state.gameKey,result:finishedState.result,white:finishedMembers.find(m=>m.team==="w")?.id,black:finishedMembers.find(m=>m.team==="b")?.id,reason:finishing?"left":action==="resign"?"resignation":"checkmate",resignedBy:action==="resign"?uid:undefined},
      };
      status = next ? "playing" : "waiting";
      deadline = null;
      marks = [];
    }
    const result = await commit();
    if (
      finishedState.result !== "*" &&
      ["standard", "throne"].includes(r.mode) &&
      r.variant === "chess" &&
      !r.settings.bot
    ) {
      const w = finishedMembers.find((m) => m.team === "w"),
        b = finishedMembers.find((m) => m.team === "b");
      if (w && b) {
        const ratingTask = db.rpc("rate_game", {
          p_room: r.id,
          p_key: finishedState.gameKey,
          p_white: w.id,
          p_black: b.id,
          p_result: finishedState.result,
        }).then(({error})=>{if(error)console.error("Rating update failed",error.message);});
        if(typeof EdgeRuntime!=="undefined")EdgeRuntime.waitUntil(ratingTask);else await ratingTask;
      }
    }
    return json(result);
  } catch (e) {
    return json(
      {
        error:
          e && typeof e === "object" && "message" in e
            ? String(e.message)
            : String(e),
      },
      400,
    );
  }
});
