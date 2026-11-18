-- Older versions stored OTPs in a required plaintext `otp` column.
-- The Spring Boot backend stores only BCrypt hashes, so keep the legacy
-- column optional and erase any historical plaintext values.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'otps'
          AND column_name = 'otp'
    ) THEN
        ALTER TABLE otps ALTER COLUMN otp DROP NOT NULL;
        UPDATE otps SET otp = NULL WHERE otp IS NOT NULL;
    END IF;
END $$;

-- Legacy rows cannot be verified by the hash-only Java service.
UPDATE otps
SET verified = TRUE
WHERE otp_hash IS NULL
  AND verified = FALSE;
