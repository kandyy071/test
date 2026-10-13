/*
# Add social media column to appointments table

1. Modified Tables
- `appointments`
  - Add `social_handle` (text, nullable) - customer's Instagram or Facebook handle for contact

2. Security
- No changes to existing RLS policies.

3. Notes
- The social_handle column stores the customer's Instagram or Facebook username
  so the store owner can contact them via social media in addition to phone.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'social_handle'
  ) THEN
    ALTER TABLE appointments ADD COLUMN social_handle text;
  END IF;
END $$;
