/*
# Create crypto_swaps table for Crypto-to-Crypto Swap service

## Purpose
Stores every crypto-to-crypto swap transaction for the new Crypto Swap service
on blejcryptorh.com. Each row represents one swap request from a customer.

## New Tables

### crypto_swaps
- `id` (uuid, primary key) — internal unique identifier
- `swap_id` (text, unique) — human-readable swap ID, e.g. SWAP-20261005-0001
- `customer_name` (text, not null) — full name of the customer
- `customer_phone` (text, not null) — phone number
- `send_coin` (text, not null) — coin symbol being sent, e.g. USDT
- `send_network` (text, not null) — network label, e.g. TRC20, BEP20, Native
- `send_amount` (numeric, not null) — amount of send coin
- `receive_coin` (text, not null) — coin symbol being received, e.g. BTC
- `receive_network` (text, not null) — network label for receiving coin
- `receive_amount` (numeric, not null) — final calculated receive amount after fees
- `exchange_rate` (numeric, not null) — raw market rate send/receive
- `exchange_fee_pct` (numeric, default 5) — visible exchange fee percentage
- `coin_fee_pct` (numeric, default 0.6) — internal coin/network fee percentage
- `customer_receiving_address` (text, not null) — customer's wallet address for receiving
- `deposit_address` (text) — BlejCrypto deposit address where customer sends payment
- `deposit_network` (text) — network label for the deposit address
- `transaction_hash` (text) — blockchain transaction hash once payment is detected
- `status` (text, default 'waiting') — one of: waiting, detected, confirming, processing, completed, expired, cancelled
- `created_at` (timestamptz, default now()) — creation timestamp
- `updated_at` (timestamptz, default now()) — last update timestamp

## Security
- RLS enabled on crypto_swaps.
- This is a no-auth (anon-key) app, so all CRUD policies use TO anon, authenticated.
- Swaps are intentionally public (single-tenant service app) — anyone can create a swap,
  view a swap by ID, and update swap status (for admin/manual processing later).
- USING (true) is acceptable because this is a single-tenant app with no sign-in screen.

## Indexes
- Unique index on swap_id for fast lookups
- Index on status for admin queries
*/

CREATE TABLE IF NOT EXISTS crypto_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_id text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  send_coin text NOT NULL,
  send_network text NOT NULL,
  send_amount numeric NOT NULL,
  receive_coin text NOT NULL,
  receive_network text NOT NULL,
  receive_amount numeric NOT NULL,
  exchange_rate numeric NOT NULL,
  exchange_fee_pct numeric NOT NULL DEFAULT 5,
  coin_fee_pct numeric NOT NULL DEFAULT 0.6,
  customer_receiving_address text NOT NULL,
  deposit_address text,
  deposit_network text,
  transaction_hash text,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crypto_swaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_swaps" ON crypto_swaps;
CREATE POLICY "anon_select_swaps"
ON crypto_swaps FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_swaps" ON crypto_swaps;
CREATE POLICY "anon_insert_swaps"
ON crypto_swaps FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_swaps" ON crypto_swaps;
CREATE POLICY "anon_update_swaps"
ON crypto_swaps FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_swaps" ON crypto_swaps;
CREATE POLICY "anon_delete_swaps"
ON crypto_swaps FOR DELETE
TO anon, authenticated USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crypto_swaps_swap_id ON crypto_swaps(swap_id);
CREATE INDEX IF NOT EXISTS idx_crypto_swaps_status ON crypto_swaps(status);
CREATE INDEX IF NOT EXISTS idx_crypto_swaps_created_at ON crypto_swaps(created_at DESC);
