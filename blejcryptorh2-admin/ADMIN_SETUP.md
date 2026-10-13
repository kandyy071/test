# Admin Panel Setup — BlejCryptorh.com

This adds a password-protected admin dashboard at **`/admin`** for managing
appointments, crypto swaps, live chat replies, and fee settings. It does
**not** touch the public site's look or behavior.

## 1. Run the new database migration

A new migration file was added:
`supabase/migrations/20261013080000_admin_panel_access.sql`

Apply it the same way you've applied the others (Supabase CLI `supabase db push`,
or paste its contents into the Supabase SQL Editor and run it). It:
- Lets a logged-in admin update/delete appointments
- Lets a logged-in admin reply in the chat widget
- Locks down crypto_swaps so only a logged-in admin can change status/addresses
  (previously any site visitor could edit any swap — now tightened)
- Creates an `app_settings` table seeded with your current fee numbers

## 2. Create your admin login (Supabase dashboard)

1. Supabase Dashboard → **Authentication → Users → Add user**
2. Create yourself an account with your email + a password
3. Supabase Dashboard → **Authentication → Settings** → turn **OFF**
   "Allow new users to sign up" (this is a single-admin app — nobody else
   should be able to create an account)

That's it — no code changes needed for auth itself, it's just your email/password.

## 3. Build & verify locally

I wasn't able to run `npm install` / `npm run build` in this session (no
registry access from this sandbox), so please run this once before deploying:

```bash
npm install
npm run typecheck
npm run build
```

If `typecheck` reports anything, paste it back to me and I'll fix it
immediately — the admin code follows the same patterns as the rest of the
app, so I don't expect surprises, but I'd rather you catch it than a user.

## 4. Deploy

Nothing special — same deploy process as today (your `public/_redirects`
already has the Netlify SPA fallback `/* /index.html 200`, so `/admin`
will load correctly once deployed).

## 5. Using it

Go to `https://blejcryptorh.com/admin`, log in, and you'll see four tabs:

- **Rezervimet** — appointments: filter by status, update status, set the
  meeting location
- **Swaps** — crypto swaps: filter by status, update status, edit deposit
  address/network and the tx hash
- **Chat** — see every chat session, open a thread, reply as support
  (replies appear live in the visitor's chat widget)
- **Tarifat** — edit the calculator's fee tiers and the swap exchange/coin
  fee percentages. These are read live by the public calculator and swap
  widgets (cached 60s client-side), so a change here shows up on the site
  without a redeploy.

The admin route isn't linked anywhere in the public nav, and `robots.txt`
now disallows `/admin` from being indexed.
