DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'fee_mode'
  ) THEN
    ALTER TABLE appointments ADD COLUMN fee_mode text NOT NULL DEFAULT 'included';
  END IF;
END $$;
