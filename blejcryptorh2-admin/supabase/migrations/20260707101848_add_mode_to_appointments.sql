/*
# Add mode column to appointments table

1. Modified Tables
- `appointments`
  - Add `mode` (text, not null, default 'buy') - whether the customer wants to buy or sell crypto

2. Security
- No changes to existing RLS policies.

3. Notes
- The mode column tracks whether the appointment is for buying or selling crypto.
- Uses IF NOT EXISTS to be idempotent.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'mode'
  ) THEN
    ALTER TABLE appointments ADD COLUMN mode text NOT NULL DEFAULT 'buy';
  END IF;
END $$;
