# Account administration and passwords

After the automatic **Set up multiplayer** deployment turns green, sign in as **louisanderson477@gmail.com**, then open **Profile → Admin**. The migration pins the account ID belonging to that already-confirmed email. The tab shows usernames, emails, signup dates, last sign-ins and providers, with search, pages and **Send reset**. Other accounts cannot read the directory or grant themselves administrator access, even by calling the database directly or using a matching display name. Changing to a different email or banning the owner account disables access.

Passwords are hashed by Supabase Auth. NovaChess never stores a plaintext copy, retrieves password hashes, or provides an owner password-viewing feature. **Send reset** emails the user a one-time link; they choose their own new password.

## Password recovery

- Password inputs have a Show/Hide eye button, including signup and replacement passwords.
- **Sign in → Forgot password?** sends a generic confirmation without confirming whether an account exists.
- The recovery email opens the site's root with a token hash. The app removes the token from the visible URL, verifies it with Supabase, then displays a new-password/confirmation form. Expired/used links cannot update a password. No original browser or existing session is required.
- The backend workflow updates only the recovery email subject/template through the Supabase Management API, using the existing GitHub deployment secret. Its `Site URL` must remain the production NovaChess address configured during launch. Existing SMTP settings, signup providers and email-confirmation policies are preserved.
- Email delivery still uses your Supabase mail settings. For users outside your Supabase team, configure a production SMTP provider under **Authentication → Email/SMTP**; Supabase's default sender is restricted. See [the launch guide](MULTIPLAYER_LAUNCH.md#5-enable-free-sign-in).

If your Admin tab is missing after a successful deployment, confirm that you signed into the exact email above, then sign out/in once. If the account was deleted and recreated, the old account-ID grant deliberately does not transfer. Restore it only from the Supabase SQL Editor:

```sql
insert into public.site_admins(user_id)
select id from auth.users
where lower(email)='louisanderson477@gmail.com'
  and email_confirmed_at is not null
on conflict do nothing;
```

Never grant browser roles write access to `site_admins`, expose a service-role key, or store passwords in profiles.
