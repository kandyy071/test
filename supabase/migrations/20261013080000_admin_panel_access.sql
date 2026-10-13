/*
# Admin panel access: RLS updates + app_settings table

## Problem
There is currently no admin UI. Store owner management of appointments,
crypto swaps, and chat support is intended to go through a logged-in
Supabase Auth session (the `authenticated` role), but:
- `appointments` has no UPDATE/DELETE policy at all (dropped in a prior
  migration), so even a logged-in admin cannot change a booking's status.
- `chat_messages` has no INSERT/UPDATE policy for `authenticated`, so an
  admin cannot reply to a visitor from the dashboard.
- `crypto_swaps` currently allows UPDATE/DELETE for `anon` as well as
  `authenticated`, which means any site visitor could tamper with any
  swap's status, deposit address, or tx hash. That is tightened here.

This migration assumes the ONLY accounts that can authenticate are the
store owner's — public sign-up must be disabled in Supabase Auth settings
(Authentication > Settings > "Allow new users to sign up" = off). See
ADMIN_SETUP.md for the full setup steps.

## Changes

### appointments
- Add UPDATE policy for `authenticated` only (admin changes status /
  sets meeting_location).
- Add DELETE policy for `authenticated` only.
- anon SELECT/INSERT are unchanged.

### chat_messages
- Add INSERT policy for `authenticated` only (admin sends replies as
  sender = 'support').
- Add UPDATE policy for `authenticated` only.
- anon SELECT is unchanged; anon still cannot write directly (writes from
  the public widget's own messages continue to go through the chat-send
  edge function with the service role key).

### crypto_swaps
- DROP the existing anon/authenticated UPDATE and DELETE policies that
  used USING (true) for both roles.
- Re-add UPDATE and DELETE restricted to `authenticated` only.
- anon SELECT/INSERT are unchanged (customers still create + poll their
  own swap via the public widget).

### app_settings (new)
- Simple key/value table for numbers the admin can tune without a
  redeploy (service fee tiers, swap fees, non-USDT markup).
- Public SELECT (the calculator/swap widgets read live values), UPDATE
  restricted to `authenticated` only. No public INSERT/DELETE — rows are
  seeded here and only ever updated.
*/

-- appointments: allow admin (authenticated) to update/delete
DROP POLICY IF EXISTS "authenticated_update_appointments" ON appointments;
CREATE POLICY "authenticated_update_appointments" ON appointments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_appointments" ON appointments;
CREATE POLICY "authenticated_delete_appointments" ON appointments FOR DELETE
  TO authenticated USING (true);

-- chat_messages: allow admin (authenticated) to insert replies + update
DROP POLICY IF EXISTS "authenticated_insert_chat_messages" ON chat_messages;
CREATE POLICY "authenticated_insert_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_chat_messages" ON chat_messages;
CREATE POLICY "authenticated_update_chat_messages" ON chat_messages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- crypto_swaps: tighten — only admin can update/delete
DROP POLICY IF EXISTS "anon_update_swaps" ON crypto_swaps;
DROP POLICY IF EXISTS "anon_delete_swaps" ON crypto_swaps;

DROP POLICY IF EXISTS "authenticated_update_swaps" ON crypto_swaps;
CREATE POLICY "authenticated_update_swaps" ON crypto_swaps FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_swaps" ON crypto_swaps;
CREATE POLICY "authenticated_delete_swaps" ON crypto_swaps FOR DELETE
  TO authenticated USING (true);

-- app_settings: editable fee configuration
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value numeric NOT NULL,
  label text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_settings" ON app_settings;
CREATE POLICY "public_select_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_update_settings" ON app_settings;
CREATE POLICY "authenticated_update_settings" ON app_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

INSERT INTO app_settings (key, value, label) VALUES
  ('calc_tier1_max_eur', 100, 'Llogaritësi: pragu i tarifës fikse (EUR)'),
  ('calc_tier1_fixed_fee_eur', 6, 'Llogaritësi: tarifa fikse nën pragun 1 (EUR)'),
  ('calc_tier2_max_eur', 1500, 'Llogaritësi: pragu i tarifës 5% (EUR)'),
  ('calc_tier2_pct', 5, 'Llogaritësi: tarifa % deri në pragun 2'),
  ('calc_tier3_max_eur', 4000, 'Llogaritësi: pragu i tarifës 4.5% (EUR)'),
  ('calc_tier3_pct', 4.5, 'Llogaritësi: tarifa % deri në pragun 3'),
  ('calc_tier4_pct', 4, 'Llogaritësi: tarifa % mbi pragun 3'),
  ('calc_markup_other_pct', 1, 'Llogaritësi: shtesë çmimi për crypto jo-USDT (%)'),
  ('swap_exchange_fee_pct', 5, 'Swap: tarifa e shkëmbimit (%)'),
  ('swap_coin_fee_pct', 0.6, 'Swap: tarifa e rrjetit/monedhës (%)')
ON CONFLICT (key) DO NOTHING;
