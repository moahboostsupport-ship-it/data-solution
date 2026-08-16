-- 004_create_admin.sql
-- DATA SOLUTION – Create initial admin user
--
-- IMPORTANT: The password_hash below is a PLACEHOLDER and will NOT work for login.
-- After deploying this migration, set the real password hash via one of:
--   1. The admin-auth Supabase Edge Function (recommended) — it hashes the
--      password with bcrypt/scrypt and updates this row.
--   2. Manually via the Supabase SQL Editor, e.g.:
--        UPDATE admin_users
--        SET password_hash = '<bcrypt_hash_from_your_hashing_tool>'
--        WHERE email = 'admin@datasolution.co.ke';
--
-- The placeholder hash is NOT a valid credential and exists only so the row
-- exists and can be updated later.

INSERT INTO admin_users (email, password_hash)
VALUES (
  'admin@datasolution.co.ke',
  '$2a$10$PLACEHOLDER_REPLACE_WITH_REAL_BCRYPT_HASH______________'
)
ON CONFLICT (email) DO NOTHING;
