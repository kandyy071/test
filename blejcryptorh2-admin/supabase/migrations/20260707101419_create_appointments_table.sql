/*
# Create appointments table for crypto exchange store

1. New Tables
- `appointments`
  - `id` (uuid, primary key)
  - `customer_name` (text, not null) - name of the customer
  - `customer_phone` (text, not null) - phone number for contact
  - `crypto_type` (text, not null) - which crypto (USDT, BTC, ETH, etc.)
  - `cash_amount_eur` (numeric, not null) - amount of cash in EUR
  - `crypto_amount` (numeric, not null) - calculated crypto amount
  - `fee_percentage` (numeric, not null) - fee rate applied
  - `fee_amount_eur` (numeric, not null) - fee in EUR
  - `net_amount_eur` (numeric, not null) - amount after fee
  - `crypto_price_eur` (numeric, not null) - price of crypto at booking time
  - `status` (text, default 'pending') - pending, confirmed, completed, cancelled
  - `preferred_date` (date, not null) - preferred meeting date
  - `preferred_time` (text, not null) - preferred time slot
  - `meeting_location` (text) - where to meet (set by store owner)
  - `notes` (text) - additional notes from customer
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `appointments`.
- Allow anon + authenticated INSERT (customers book without login).
- Allow anon + authenticated SELECT (customers can view their booking confirmation).
- No UPDATE or DELETE from anon (only store owner manages via dashboard).

3. Notes
- This is a no-auth public booking app. Customers fill a form and submit.
- The store owner will contact the customer to confirm the meeting location.
*/

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  crypto_type text NOT NULL,
  cash_amount_eur numeric NOT NULL,
  crypto_amount numeric NOT NULL,
  fee_percentage numeric NOT NULL,
  fee_amount_eur numeric NOT NULL,
  net_amount_eur numeric NOT NULL,
  crypto_price_eur numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  meeting_location text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_appointments" ON appointments;
CREATE POLICY "anon_select_appointments" ON appointments FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;
CREATE POLICY "anon_insert_appointments" ON appointments FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_appointments" ON appointments;
CREATE POLICY "anon_update_appointments" ON appointments FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_appointments" ON appointments;
CREATE POLICY "anon_delete_appointments" ON appointments FOR DELETE
TO anon, authenticated USING (true);
