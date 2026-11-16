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
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
type Member = { id: string; team: "w" | "b" | null };
function fresh(variant: string, count = 2) {
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
    if (Number(req.headers.get("content-length") || 0) > 100000)
      throw Error("Request too large.");
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign in to play online." }, 401);
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token);
    if (authError || !user)
      return json({ error: "Sign in to play online." }, 401);
    const uid = user.id;
    const { data: profile } = await db
      .from("profiles")
      .select("banned")
      .eq("id", uid)
      .single();
    if (!profile || profile.banned)
      return json({ error: "Account unavailable." }, 403);
    const body = await req.json();
    const action = body.action;
    if (action === "create") {
      if (!["standard", "throne", "vote", "team"].includes(body.mode))
        throw Error("Unknown game mode.");
      const { count } = await db
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("host", uid)
        .gt("created_at", new Date(Date.now() - 3600000).toISOString());
      if ((count || 0) >= 10)
        throw Error("Room limit reached. Use an existing room.");
      const variant =
        body.mode === "vote"
          ? "chess"
          : ["chess", "dropping", "chaos", "random"].includes(body.variant)
            ? body.variant
            : "chess";
      if (body.bot && variant !== "chess")
        throw Error("Online team bots currently use standard chess.");
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
          state: fresh(variant, Math.max(1, Math.min(4, +body.dropCount || 2))),
          members: [{ id: uid, team: "w" }],
          settings: {
            bot: body.mode === "team" && body.bot === true,
            dropCount: Math.max(1, Math.min(4, +body.dropCount || 2)),
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
    const { data: r, error } = await db
      .from("rooms")
      .select("*")
      .eq("id", body.room)
      .single();
    if (error || !r) throw Error("Room not found.");
    let members = r.members as Member[],
      queue = r.queue as string[],
      state = r.state,
      status = r.status,
      deadline = r.deadline,
      marks = r.marks;
    const me = members.find((m) => m.id === uid),
      turn = state.fen.split(" ")[1];
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
            : members.filter((m) => m.team === "w").length <=
                members.filter((m) => m.team === "b").length
              ? "w"
              : "b";
        } else if (!members.some((m) => m.team === "w")) team = "w";
        else if (!members.some((m) => m.team === "b")) team = "b";
        members = [...members, { id: uid, team }];
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
        status = state.result === "*" ? "playing" : "finished";
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
    if (action === "finish") {
      if (r.mode !== "throne") throw Error("Finish is available in Throne.");
      members = members.filter((m) => m.id !== uid);
      queue = queue.filter((id) => id !== uid);
      let seated = members.filter((m) => m.team);
      if (!seated.some((m) => m.team === "w") && seated.length)
        seated[0].team = "w";
      while (seated.length < 2 && queue.length) {
        const id = queue.shift()!;
        const m = members.find((m) => m.id === id);
        if (m) {
          m.team = seated.some((m) => m.team === "w") ? "b" : "w";
          seated.push(m);
        }
      }
      state = fresh(r.variant, r.settings.dropCount);
      status = seated.length === 2 ? "playing" : "waiting";
      return json(await commit());
    }
    if (
      !me.team ||
      (!["resign", "draw"].includes(action) && me.team !== turn) ||
      status !== "playing" ||
      state.result !== "*"
    )
      throw Error("It is not your team’s turn.");
    if (
      ["move", "vote", "resign", "draw"].includes(action) &&
      body.revision !== r.revision
    )
      throw Error("Position changed. Try again.");
    if (action === "move" || action === "vote") {
      const next =
        r.variant === "chess"
          ? standardApply(state, String(body.move))
          : specialApply(
              state,
              body.specialAction || { type: "move", move: String(body.move) },
            );
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
      marks = [];
    } else if (action === "draw") {
      if (!r.settings.bot || r.mode !== "team")
        throw Error("Draw offers are available against the computer.");
      state = { ...state, result: "1/2-1/2" };
    } else if (action === "resign") {
      state = { ...state, result: me.team === "w" ? "0-1" : "1-0" };
    } else throw Error("Unknown action.");
    if (
      r.settings.bot &&
      state.result === "*" &&
      state.fen.split(" ")[1] === "b"
    ) {
      const move = simpleBot(state);
      if (move) state = standardApply(state, move);
    }
    const finishedState = state,
      finishedMembers = members.map((m) => ({ ...m }));
    if (state.result !== "*") status = "finished";
    if (state.result !== "*" && r.mode === "throne") {
      const winner = members.find(
        (m) => m.team === (state.result === "0-1" ? "b" : "w"),
      );
      members = members.map((m) => ({
        ...m,
        team: m.id === winner?.id ? "w" : null,
      }));
      const next = queue.shift();
      if (next) {
        const challenger = members.find((m) => m.id === next);
        if (challenger) challenger.team = "b";
      }
      state = {
        ...fresh(r.variant, r.settings.dropCount),
        lastResult: finishedState.result,
        lastWinner: winner?.id,
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
        const { error } = await db.rpc("rate_game", {
          p_room: r.id,
          p_key: finishedState.gameKey,
          p_white: w.id,
          p_black: b.id,
          p_result: finishedState.result,
        });
        if (error) console.error("Rating update failed", error);
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
