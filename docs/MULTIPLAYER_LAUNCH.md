# Launch NovaChess multiplayer for $0

Use **Supabase Free** for accounts, validated games, chat and rankings. For the largest free static audience, use **Cloudflare Pages Free** for the Vite site. Your existing GitHub Pages deployment also works, so you can launch there first and move the frontend later. No Node server, VPS, paid domain, or subscription is required to start.

The repository is prepared; it is **not connected to a live multiplayer project yet**. You need to create your own accounts and supply the configuration below. Do not send passwords, Supabase personal access tokens, OAuth client secrets, or service-role keys in chat.

## 1. Create one Supabase Free project

1. Open [Supabase](https://supabase.com/dashboard) and sign up, using GitHub if convenient.
2. Create a **Free organization/project** named NovaChess. Choose a database region close to your expected players. Use a strong database password and save it privately.
3. Wait for the project to finish starting.
4. Find the **Project URL** and **Publishable key** in the project's Connect/API Keys screen. A legacy `anon` key also works. Use the publishable key, not a secret/service-role key.
5. Note the **project reference**: the 20-character name before `.supabase.co` in the project URL.

Start with a new, empty project for this workflow. It installs all migrations, including room permissions, chat moderation, Vote Chess scheduling and Throne statistics. You do not need to paste SQL or install the Supabase CLI on your computer.

## 2. Give GitHub the deployment configuration

In [repository Actions variables](https://github.com/Louis2495/NovaChess_website/settings/variables/actions), add:

| Variable | Value |
|---|---|
| `SUPABASE_PROJECT_REF` | Your 20-character project reference |
| `VITE_SUPABASE_URL` | `https://YOUR_REFERENCE.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your public publishable/anon key |

In [repository Actions secrets](https://github.com/Louis2495/NovaChess_website/settings/secrets/actions), add:

| Secret | Value |
|---|---|
| `SUPABASE_DB_PASSWORD` | The database password from project creation |
| `SUPABASE_ACCESS_TOKEN` | A personal token generated at [Supabase account access tokens](https://supabase.com/dashboard/account/tokens) |

These secrets let the setup workflow deploy your project. Backend changes on `main` also trigger it automatically. They are not included in the website. Limit access to repository write permissions; the workflow runs only from `main` and does not run on pull requests.

## 3. Run the setup workflow

1. In repository **Settings → Pages**, keep **Source: GitHub Actions**.
2. Open [Actions → Set up multiplayer](https://github.com/Louis2495/NovaChess_website/actions/workflows/deploy-backend.yml).
3. Click **Run workflow**, select `main`, and run it.
4. Wait for the backend and website jobs to turn green.

To apply the NovaChess account email templates, select **Apply the NovaChess account email templates** when running the workflow manually. This uses the Supabase Management API and requires a token authorized to update Auth configuration. Routine deployments preserve the project’s existing email templates.

It validates configuration, runs backend tests, applies migrations, deploys the `chess` Edge Function, checks that unsigned game actions are rejected, and rebuilds the GitHub Pages website with your public configuration. It also schedules one-minute Vote Chess finalization, daily 30-day chat cleanup, and old-vote cleanup. No browser needs to stay open for Vote Chess to advance.

If this step fails, share the failed step and error text, with credentials removed. Do not repeatedly rerun old SQL files manually against a partially configured database.

## 4. Choose the website host

**Matein4 on GitHub Pages:** In the repository's **Settings → Pages**, keep **GitHub Actions** as the source and set the custom domain to `matein4.com`. At your DNS provider, point the apex domain to GitHub Pages using [GitHub's documented DNS records](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain). Once the DNS check passes and GitHub issues the certificate, enable **Enforce HTTPS**. The workflow reads the configured Pages path before building, so it serves from `/` on the custom domain and from `/NovaChess_website/` on the default project URL. If you set the domain after a build, rerun **Deploy website**.

**Recommended for a larger free audience:** create a [Cloudflare account](https://dash.cloudflare.com/), then open **Workers & Pages → Create → Pages → Connect to Git**. Select `Louis2495/NovaChess_website` and configure:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Repository root |
| `NODE_VERSION` | `24` |
| `VITE_BASE_PATH` | `/` |
| `VITE_SUPABASE_URL` | The same Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | The same public publishable/anon key |

Save and deploy. Cloudflare gives you a free `https://YOUR_NAME.pages.dev/` address and deploys future GitHub pushes automatically. Set these variables in Cloudflare's **production** build environment. Never put the database password, personal token or service-role key in Cloudflare's Vite settings.

`VITE_BASE_PATH=/` is important on Cloudflare. The GitHub Pages workflow gets its base path from GitHub Pages settings. All current assets are below Cloudflare Pages' 25 MiB-per-file limit. The included `_headers` file adds browser caching for hashed assets, and service-worker updates reuse unchanged files.

## 5. Enable free sign-in

In Supabase **Authentication → URL Configuration**:

- Set **Site URL** to `https://matein4.com/` once the custom domain serves the site. For the default GitHub Pages URL, include the repository path.
- Add that exact URL to **Redirect URLs**. If keeping both hosts, add both production URLs.

For public signup without email-delivery costs, enable **Google sign-in**:

1. Open **Authentication → Sign In / Providers → Google** in Supabase. Copy the callback URL shown there; it normally ends in `/auth/v1/callback`.
2. In [Google Cloud Console](https://console.cloud.google.com/), create a project and configure **Google Auth Platform/OAuth consent** for external users. Use the basic email/profile/OpenID scopes.
3. Create a **Web application OAuth client**. Add your website's origin under authorized JavaScript origins; use an origin such as `https://matein4.com` without a repository path. Add the Supabase callback as an authorized redirect URI.
4. Copy the Google client ID and client secret into the Supabase Google provider settings and enable it. Keep the client secret in Supabase.
5. Publish the Google OAuth app when opening to everyone. Google's Testing mode restricts sign-in to the test users you add; follow any verification requirements Google displays.
6. In Supabase, you can disable the **Email** provider if you want Google-only signup. NovaChess automatically shows enabled Google/GitHub buttons and hides the email form when Email is disabled. No new frontend setting is needed.

[Official Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google) has the current screen names. GitHub OAuth is also supported and is a quick alternative for an initial group with GitHub accounts: [official GitHub setup](https://supabase.com/docs/guides/auth/social-login/auth-github).

If you prefer email/password instead, configure a real SMTP provider for public users and leave email confirmation enabled. Supabase's built-in mail service is restricted and is not a public-signup mail service. A private alpha can use manually created test accounts; disabling email confirmation does not verify those email addresses.

## 6. Test with two people, then appoint a moderator

Use two separate browsers/profiles with **two different accounts**:

1. Sign in from Profile and save a screen name and country.
2. Open Play (Online is selected by default). Other game types are in Variants; Throne, Vote Chess and Team Chess are under Variants → Online.
3. Click Play online from both accounts to join a waiting game. You can also use Invite friends to share a direct game link. Play moves and confirm both boards still match after refreshing.
4. Test resigning, drawing, and an illegal/out-of-turn move. Test chat from both accounts.
5. Use a third account to test Throne's queue. Test Team Chess invitations/arrows. Vote Chess closes votes on the one-minute scheduler after its 24-hour period.

In Supabase SQL Editor, make your account a chat moderator:

```sql
insert into public.chat_moderators(user_id)
values ('YOUR_AUTH_USER_ID')
on conflict do nothing;
```

The app has message reporting, moderator removal/bans, audit records and server-side spam limits. You still need to review reports. Keep the public link unannounced until the two-account test works.

## What the free plan can support

Published allowances checked against Supabase's official pricing/docs source and Cloudflare's official docs:

| Resource | Supabase Free allowance |
|---|---|
| Realtime connections at once | 200 |
| Realtime messages | 2 million/month |
| Realtime message throughput | 100/second |
| Auth monthly active users | 50,000 |
| Database | 500 MB |
| Uncached backend egress | 5 GB/month |
| Edge Function calls | 500,000/month |

These are separate limits, not a promise that 50,000 users can play at once. A rough connection ceiling is **100 two-player games simultaneously**, before spectators, chat-only users, extra tabs and other limits. An inactive static visitor or local bot game does not need a multiplayer connection. One browser tab normally shares one connection across its room/chat channels.

Actual sustainable capacity depends on move frequency, average game length, chat audience, payload size and shared database CPU. Global chat sends one delivered message per listener and can consume throughput/monthly limits quickly. Check **Usage → Realtime, Egress, Database and Edge Functions** regularly. Free projects can pause after inactivity, so resume a paused project from the dashboard; a free plan is not an always-on availability guarantee.

Cloudflare Pages' **static asset requests are free and unlimited**; no Pages Function or Cloudflare Worker is required for this frontend. Static hosting does not remove Supabase's backend limits. A custom domain is optional.

The changes in this repository reduce costs by subscribing only to an opened room, using a small indexed lobby view with visible-tab polling, caching player profiles, applying chat events incrementally, and copying unchanged offline assets between releases. Room/game rules remain server-validated.

Stay on Free while actual usage fits. Supabase Pro currently starts at **$25/month**, with 500 included peak connections and 5 million messages; additional resources can cost more. Keep its spend cap enabled if you upgrade. Sustained thousands of simultaneous players are a later scaling project; evaluate room-based hibernating WebSockets on Cloudflare Durable Objects or a maintained dedicated server when real usage justifies the engineering/operations cost. This repository currently uses Supabase multiplayer, not that alternative architecture.

Sources: [Supabase pricing](https://supabase.com/pricing), [Realtime limits](https://supabase.com/docs/guides/realtime/limits), [Realtime billing](https://supabase.com/docs/guides/realtime/pricing), [Cloudflare Pages static pricing](https://developers.cloudflare.com/pages/functions/pricing/#static-asset-requests), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

## After this is live

Backend/migration changes on `main` automatically run **Set up multiplayer**. You can still run it manually to retry or perform the initial setup. Normal frontend pushes deploy through GitHub Pages and, if connected, Cloudflare Pages. The scheduled database jobs persist without rerunning the workflow. The backend workflow never changes your Supabase billing plan.

You can share the public project URL and publishable key with the maintainer to check browser configuration. Keep deployment credentials in GitHub Actions secrets. After launch, the live two-account check and actual usage monitoring are still necessary; the repository tests use controlled backend/WebSocket fixtures and cannot certify a project that has not been created.

All computer variants are also listed under Variants → Online, after Throne, Vote Chess and Team Chess. Bughouse waits for four players and assigns a board/color to each; captured pieces go to the teammate on the other board. Online Speedrun times each player’s own turns and does not add records to the computer-Elo speedrun chart. Blindfold text alone accepts typed moves. The setup workflow pins Supabase CLI 2.72.9 and uses Docker bundling so the authoritative Fairy-Stockfish WASM is included as a static file; npm ci prepares those files automatically. No local working-directory or hosting setting changes are needed.

## Live play, clocks and Throne

Play → Online offers 3, 5 and 10 minutes plus 3+2 (3 minutes by default); matchmaking pairs matching controls. Clocks start when both players join. The server validates time and moves; live clients claim expiry immediately, and a minute-level database job finishes expired games even if both browsers close. These controls apply to standard online games; Vote Chess keeps its one-day voting period.

Throne has scoped chat and an illustrated header. Completed results remain visible across automatic reseating; Continue dismisses the result. Finish leaves both the game and queue, and queued spectators leaving do not reset the board. The Games statistic counts completed games for both participants, backed by result records and older available history. Basic chat moderation is available to the owner, and the database honors existing bans and enforces spam limits.

Committed moves use private database broadcasts with server-enforced receive-only policies; older installations fall back to Postgres updates. Local previews are immediate but never sent to opponents until validated. Native live replies retain initial/current FENs plus moves; full histories stay in the database. Cached signing-key validation and a combined trusted room read reduce per-move network round trips without bypassing account bans or move validation. Actual latency still depends on player connections, service region and load.
