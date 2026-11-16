# Connect online features on a small budget

The Vite website stays static and can remain on GitHub Pages. Supabase supplies accounts, Postgres, Realtime and the game-validation Edge Function. Start with its **Free** plan; no separately hosted Node server is needed. Quotas and inactivity pausing apply, so check the current Supabase dashboard before inviting a large audience. Do not enable a paid upgrade unless you want it.

The site is fully usable for local chess, bots, lessons and puzzles without this setup. Multiplayer, global chat and online rankings show their disconnected state until configured; they do not simulate other players or manufacture leaderboard entries.

## One-time setup

1. Create a Free project at [Supabase](https://supabase.com/dashboard). Save the project reference, project URL and **anon/publishable** key from the project’s API settings.
2. In **SQL Editor**, run [the migration](../supabase/migrations/202611160001_online.sql). It creates the database, row-level security, Realtime publication, chat rate limits and server-only game/rating functions.
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

FIDE lookup uses the documented public [Lichess FIDE API](https://lichess.org/api#tag/FIDE/operation/fidePlayerGet), which mirrors FIDE’s public data. US Chess’s public record can be read directly when its browser-access policy permits it. For browsers blocked by federation CORS policies, deploy the optional read-only proxy into the same Supabase project:

```sh
npx supabase functions deploy federation-records --no-verify-jwt
```

The function needs no database migration or service-role secret. It accepts only validated federation IDs and fixed public upstreams, caches records for six hours, and makes no changes to federation accounts. USCF parsing rejects unreadable rating responses; manual entry remains available if the source changes or is unavailable. Lookup cannot run through this proxy until the function and public Vite Supabase configuration are deployed.

## Validation scope

The migration, permissions, vote scheduler, queue transitions, ratings and Edge Function handler are tested against embedded PostgreSQL using PGlite. Browser tests cover the disconnected state. A live Supabase project, email delivery, deployed Realtime connections and public deployment still require the steps above and the two-session smoke test.
