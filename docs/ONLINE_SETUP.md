# Connect online features on a small budget

The Vite website stays static and can remain on GitHub Pages. Supabase supplies accounts, Postgres, Realtime and the game-validation Edge Function. Start with its **Free** plan; no separately hosted Node server is needed. Quotas and inactivity pausing apply, so check the current Supabase dashboard before inviting a large audience. Do not enable a paid upgrade unless you want it.

The site is fully usable for local chess, bots, lessons and puzzles without this setup. Multiplayer, global chat and online rankings show their disconnected state until configured; they do not simulate other players or manufacture leaderboard entries.

## One-time setup

1. Create a Free project at [Supabase](https://supabase.com/dashboard). Save the project reference, project URL and **anon/publishable** key from the project’s API settings.
2. In **SQL Editor**, run [the migration](../supabase/migrations/202611160001_online.sql). It creates the database, row-level security, Realtime publication, chat rate limits and server-only game/rating functions. Then run [chat moderation](../supabase/migrations/202611160002_chat_moderation.sql).
3. In **Database → Extensions**, enable **pg_cron**. Then run:

   ```sql
   select cron.schedule(
     'novachess-votes',
     '* * * * *',
     'select public.close_due_votes()'
   );
   ```

   Vote Chess ballots last exactly 24 hours in the database. The scheduler applies the winning move on the next minute tick, even when no browsers are open. The first ballot for a tied move wins. If nobody votes, a new 24-hour ballot begins.

4. Install/use the [Supabase CLI](https://supabase.com/docs/guides/cli). From this repository:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REFERENCE
   npx supabase functions deploy chess --no-verify-jwt
   ```

   The function itself validates every bearer token with Supabase Auth before handling a request. `--no-verify-jwt` avoids reliance on the gateway’s legacy signing-key check; it does **not** make game actions anonymous. The function’s `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by Supabase. Never put a service-role key in a `VITE_` variable.

5. In **Authentication → URL Configuration**, set your deployed site URL and allow its redirect URL, including the repository path. For example:

   ```text
   https://louis2495.github.io/NovaChess_website/
   ```

   Enable email/password sign-in. Users create/sign into accounts from **Profile**. Supabase’s built-in test email service has recipient/rate restrictions; for public signups, connect a mail provider through Auth’s SMTP settings and keep email confirmation enabled. For a private alpha, you can temporarily disable email confirmation to test without mail costs; those addresses will not be verified. Check the provider’s current free quota before opening public signup.

6. For local development, copy `.env.example` to `.env.local` and fill in the public URL/key. Restart Vite. For GitHub Pages, set these **repository Actions variables** under Settings → Secrets and variables → Actions → Variables:

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```

   Run the existing **Deploy website** workflow. These two values are public browser configuration; database permissions protect the data.

## Verify after connecting

Use two separate browser sessions and create accounts. Set unique usernames and countries in Profile.

- **Chess:** join the same room, play both colors, and verify illegal moves and out-of-turn moves are rejected.
- **Throne:** join with a third account to enter the queue. The winner stays, the queued player becomes the challenger, and **Finish** releases the seat. A draw leaves the incumbent on the throne.
- **Vote Chess:** users are assigned to balanced teams. Each member can change their own vote. For a quick deployment smoke test, move that test room’s `deadline` into the past in SQL Editor and run `select public.close_due_votes()`; do not change the one-day production rule.
- **Team chess:** teammates can play their side’s moves and share square marks/arrows. Copy the room URL to invite friends. A team can play another team or a standard-chess computer opponent. Shared room data is public to signed-in players.
- **Chat:** send, report and delete messages. Users can delete their own messages. Reports appear in the `reports` table for the owner to review.
- **Rankings:** five completed rated human standard/Throne games qualify a player. Bot, team and voting games do not inflate ratings. Global and country percentiles use the actual qualified population.

## Owner controls and costs

Review reports in the dashboard. Set `profiles.banned = true` to prevent an account from chatting or playing; remove offending messages as needed. Built-in text rendering does not interpret messages as HTML. Authenticated chat is limited to four messages per ten seconds. Room creation is limited per account. Add CAPTCHA in Supabase Auth if public signup attracts abuse.

Realtime connection and message quotas are the likely first limits for a busy community. Keep the Free plan until observed use justifies changing it. You can delete old chat messages periodically; game data remains separate. The following optional daily task keeps 90 days of chat:

```sql
select cron.schedule('novachess-chat-retention', '30 3 * * *',
  $$delete from public.messages where created_at < now() - interval '90 days'$$);
```

## Federation records

Attach official profile URLs or IDs in **Profile → Federation profiles**. The records and any manually entered ratings are saved with the browser profile and shown in **Stats → Rankings**. Manually entered values are labelled separately from fetched records.

FIDE lookup uses the documented public [Lichess FIDE API](https://lichess.org/api#tag/FIDE/operation/fidePlayerGet). **USCF lookup requires a server:** US Chess blocks the browser request from GitHub Pages. It does not require user sign-in, an anon key, a database migration or a paid plan.

### Set up USCF lookup without installing anything

1. Create a free project at [Supabase](https://supabase.com/dashboard). Keep the database password private.
2. In the project, open **Edge Functions → Deploy a new function → Via Editor**. Name it `federation-records`.
3. Replace the example code with the entire contents of [federation-records-dashboard.ts](../supabase/federation-records-dashboard.ts), then deploy it.
4. In the function's settings, turn **Verify JWT** off. This endpoint reads only public federation records and accepts only validated IDs and fixed federation sources.
5. Copy the function URL, such as `https://PROJECT.supabase.co/functions/v1/federation-records`. Set that URL in the `url` field of [public/federation-lookup.json](../public/federation-lookup.json) and push. Alternatively, configure `VITE_FEDERATION_LOOKUP_URL` as a GitHub Actions repository variable; the deploy workflow passes it to Vite.
6. In NovaChess, enter a real USCF ID in Profile and click Load. Verify the returned name and ratings against the official record. An invalid ID or an unavailable upstream must show an error rather than an empty successful result.

You can share the **public function URL** with the site maintainer to finish step 5. Do not share your database password, service-role key or access token.

For CLI users:

```sh
npx supabase login
npx supabase functions deploy federation-records --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

The function caches records for six hours. Rebuild the standalone editor file after changing the parser or handler with `npm run prepare:federations`. The public record's live availability still depends on US Chess; the parser must be checked against a live member after deployment. Manual entry remains available during outages.

## Global chat moderation

Global chat is a separate panel available throughout the site. It uses the existing public project URL/key and authenticated Realtime messages. Without a connection it allows drafting but does not pretend to publish a message.

After applying both SQL migrations, create your account and save your username in Profile. From the SQL editor, assign a moderator:

```sql
insert into public.chat_moderators(user_id)
select id from public.profiles where username = 'YOUR_USERNAME'
on conflict do nothing;
```

Members can report messages and delete their own. Moderators can see reported messages, delete posts, and ban senders; every moderation action is recorded in the protected audit table. Users cannot grant themselves moderator access. Posting enforces length limits, repeat-message rejection, link-spam limits, per-user rate limits and bans on the server. No automated classifier or round-the-clock human moderation is claimed.
