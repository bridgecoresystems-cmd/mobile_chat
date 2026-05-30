-- Runs once on first postgres container start (docker-entrypoint-initdb.d)
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS guards)

ALTER TABLE users ADD COLUMN IF NOT EXISTS email          TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS otp_codes (
  email      TEXT PRIMARY KEY,
  code       TEXT    NOT NULL,
  expires_at BIGINT  NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0
);
