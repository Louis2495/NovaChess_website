# Online setup

Start with the [step-by-step $0 multiplayer launch guide](MULTIPLAYER_LAUNCH.md). It covers creating a Supabase Free project, one-click GitHub Actions backend deployment, optional Cloudflare Pages hosting, Google/GitHub sign-in without SMTP costs, two-account verification, moderation and realistic free-plan limits.

The repository is ready for deployment but is not connected to a live project until you supply your own project configuration. The **Set up multiplayer** workflow applies all database migrations and scheduled jobs; do not also rerun the original SQL files manually.

For local development, copy `.env.example` to `.env.local` and fill in your public URL/key. Restart Vite. Public browser settings are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `VITE_BASE_PATH=/` is for a root-hosted site such as Cloudflare Pages; The GitHub Pages workflow selects the base path from the configured Pages URL. Never use service-role/secret keys in Vite settings.

After deployment, `npm run check:online` checks Auth, database accessibility and rejection of unsigned game actions. Supply `SUPABASE_PROJECT_REF` and the two public Vite settings in your shell environment. It is a smoke check, not a substitute for two signed-in players testing a real game.

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

After applying the SQL migrations, create your account and save your username in Profile. From the SQL editor, assign a moderator:

```sql
insert into public.chat_moderators(user_id)
select id from public.profiles where username = 'YOUR_USERNAME'
on conflict do nothing;
```

Members can report messages and delete their own. Moderators can see reported messages, delete posts, and ban senders; every moderation action is recorded in the protected audit table. Users cannot grant themselves moderator access. Posting enforces length limits, repeat-message rejection, link-spam limits, per-user rate limits and bans on the server. No automated classifier or round-the-clock human moderation is claimed.

### Throne statistics

Apply `supabase/migrations/202611170001_throne_time.sql` and redeploy the `chess` function. The database records reign start/end times in the same transaction as room transitions. Consecutive wins and draws keep the reigning champion's clock running; losing or clicking Finish ends it. A challenger leaving does not end the incumbent's reign. Existing reigns begin counting when this migration is applied; earlier durations cannot be reconstructed. Stats reads only the signed-in player's reigns. Local Speedrun records need no backend.

The On the Throne Time/Games toggle also requires `202611170002_throne_games.sql`. Games counts completed games played as the incumbent, including draws and the game that ends a reign. The initial game that wins the seat is not counted as an incumbent game. Historical counts before this migration cannot be reconstructed.
