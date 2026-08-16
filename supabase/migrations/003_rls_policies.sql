-- 003_rls_policies.sql
-- DATA SOLUTION – Row Level Security policies
-- Security model:
--   packages    : public SELECT (active only); service_role for writes
--   orders      : public lookup via SECURITY DEFINER fn; service_role for writes
--   payments    : service_role only (NEVER public)
--   audit_logs  : service_role only (NEVER public)
--   admin_users : service_role only (NEVER public)

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE packages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECURITY DEFINER function: get_order_by_number
-- Lets a customer look up their own order by order_number + phone.
-- Runs with the function owner's privileges, bypassing RLS.
-- ============================================================
CREATE OR REPLACE FUNCTION get_order_by_number(p_order_number text, p_phone text)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM orders
  WHERE order_number   = p_order_number
    AND customer_phone  = p_phone;
END;
$$;

-- Grant execute to anon and authenticated roles (public lookup)
REVOKE ALL ON FUNCTION get_order_by_number(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_order_by_number(text, text) TO anon, authenticated;

-- ============================================================
-- packages policies
-- ============================================================
-- Public can SELECT active packages
DROP POLICY IF EXISTS packages_public_select ON packages;
CREATE POLICY packages_public_select
  ON packages FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- service_role can SELECT all (including inactive)
DROP POLICY IF EXISTS packages_service_select ON packages;
CREATE POLICY packages_service_select
  ON packages FOR SELECT
  TO service_role
  USING (true);

-- service_role only: INSERT
DROP POLICY IF EXISTS packages_service_insert ON packages;
CREATE POLICY packages_service_insert
  ON packages FOR INSERT
  TO service_role
  WITH CHECK (true);

-- service_role only: UPDATE
DROP POLICY IF EXISTS packages_service_update ON packages;
CREATE POLICY packages_service_update
  ON packages FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- service_role only: DELETE
DROP POLICY IF EXISTS packages_service_delete ON packages;
CREATE POLICY packages_service_delete
  ON packages FOR DELETE
  TO service_role
  USING (true);

-- ============================================================
-- orders policies
-- ============================================================
-- Public cannot directly SELECT orders (use get_order_by_number function instead).
-- service_role can SELECT all orders.
DROP POLICY IF EXISTS orders_service_select ON orders;
CREATE POLICY orders_service_select
  ON orders FOR SELECT
  TO service_role
  USING (true);

-- service_role only: INSERT
DROP POLICY IF EXISTS orders_service_insert ON orders;
CREATE POLICY orders_service_insert
  ON orders FOR INSERT
  TO service_role
  WITH CHECK (true);

-- service_role only: UPDATE
DROP POLICY IF EXISTS orders_service_update ON orders;
CREATE POLICY orders_service_update
  ON orders FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- payments policies (service_role ONLY — never public)
-- ============================================================
DROP POLICY IF EXISTS payments_service_select ON payments;
CREATE POLICY payments_service_select
  ON payments FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS payments_service_insert ON payments;
CREATE POLICY payments_service_insert
  ON payments FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS payments_service_update ON payments;
CREATE POLICY payments_service_update
  ON payments FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- audit_logs policies (service_role ONLY — never public)
-- ============================================================
DROP POLICY IF EXISTS audit_logs_service_insert ON audit_logs;
CREATE POLICY audit_logs_service_insert
  ON audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS audit_logs_service_select ON audit_logs;
CREATE POLICY audit_logs_service_select
  ON audit_logs FOR SELECT
  TO service_role
  USING (true);

-- ============================================================
-- admin_users policies (service_role ONLY — never public)
-- ============================================================
DROP POLICY IF EXISTS admin_users_service_select ON admin_users;
CREATE POLICY admin_users_service_select
  ON admin_users FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS admin_users_service_insert ON admin_users;
CREATE POLICY admin_users_service_insert
  ON admin_users FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS admin_users_service_update ON admin_users;
CREATE POLICY admin_users_service_update
  ON admin_users FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS admin_users_service_delete ON admin_users;
CREATE POLICY admin_users_service_delete
  ON admin_users FOR DELETE
  TO service_role
  USING (true);
