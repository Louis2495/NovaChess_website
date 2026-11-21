import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("repertoire shares require friendship and only the recipient can read or respond", async () => {
  const pg = new PGlite();
  const sender = "11111111-1111-4111-8111-111111111111";
  const recipient = "22222222-2222-4222-8222-222222222222";
  const stranger = "33333333-3333-4333-8333-333333333333";
  try {
    await pg.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        'select nullif(current_setting(''test.actor'', true), '''')::uuid';
      create table public.profiles (id uuid primary key, username text, screen_name text);
      create table public.friendships (sender uuid, recipient uuid, status text);
      create function public.active_online_account(actor uuid) returns boolean language sql stable as
        'select exists (select 1 from public.profiles where id = actor)';
    `);
    for (const [id, name] of [[sender, "Sender"], [recipient, "Recipient"], [stranger, "Stranger"]]) {
      await pg.query("insert into public.profiles values ($1, $2, $2)", [id, name]);
    }
    await pg.query("insert into public.friendships values ($1, $2, 'accepted'), ($1, $3, 'pending')",
      [recipient, sender, stranger]);
    await pg.exec(readFileSync(new URL("../../supabase/migrations/202611180019_repertoire_shares.sql", import.meta.url), "utf8"));
    const asUser = id => pg.query("select set_config('test.actor', $1, false)", [id]);
    const inbox = async () => (await pg.query("select public.repertoire_share_inbox() as inbox")).rows[0].inbox;
    const send = id => pg.query("select public.send_repertoire_share($1, $2)", [id, "1. e4 *"]);
    const respond = (id, accept) => pg.query("select public.respond_repertoire_share($1, $2)", [id, accept]);
    await pg.exec("set role anon");
    await assert.rejects(inbox(), /permission denied/);
    await pg.exec("set role authenticated");
    await asUser(sender);
    await assert.rejects(send(stranger), /friends list/);
    await send(recipient);
    await send(recipient);
    assert.deepEqual(await inbox(), []);
    await assert.rejects(pg.query("select * from public.repertoire_shares"), /permission denied/);

    await asUser(recipient);
    const [accepted, rejected] = await inbox();
    assert.equal(accepted.username, "Sender");
    assert.equal(accepted.pgn, "1. e4 *");
    await asUser(stranger);
    assert.deepEqual(await inbox(), []);
    await assert.rejects(respond(accepted.id, true), /no longer available/);

    await asUser(recipient);
    await respond(accepted.id, true);
    await respond(accepted.id, true);
    await assert.rejects(respond(accepted.id, false), /no longer available/);
    await respond(rejected.id, false);
    assert.deepEqual(await inbox(), []);
  } finally {
    await pg.close();
  }
});
