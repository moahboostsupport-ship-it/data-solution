-- 001_initial_schema.sql
-- DATA SOLUTION – Initial database schema
-- Creates: packages, orders, payments, audit_logs, admin_users
-- Includes updated_at triggers for orders and packages

-- ============================================================
-- Helper function: auto-update updated_at column
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- packages
-- ============================================================
CREATE TABLE IF NOT EXISTS packages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  category            text NOT NULL CHECK (category IN ('bingwa_data', 'sms', 'minutes', 'highlighted', 'tunukiwa')),
  price               integer NOT NULL CHECK (price > 0),
  description         text,
  validity            text NOT NULL,
  active              boolean DEFAULT true,
  featured            boolean DEFAULT false,
  purchase_frequency  text DEFAULT 'buy_once' CHECK (purchase_frequency IN ('buy_once', 'buy_many')),
  start_time          time,   -- for time-based availability (e.g., '00:00')
  end_time            time,   -- (e.g., '15:59')
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packages_active_category ON packages (active, category);

DROP TRIGGER IF EXISTS packages_updated_at ON packages;
CREATE TRIGGER packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        text UNIQUE NOT NULL,
  customer_phone      text NOT NULL,
  package_id          uuid REFERENCES packages(id),
  package_name        text NOT NULL,
  amount              integer NOT NULL CHECK (amount > 0),
  payment_status      text NOT NULL DEFAULT 'awaiting_payment'
                        CHECK (payment_status IN ('awaiting_payment', 'payment_verification', 'payment_confirmed', 'processing', 'completed', 'failed', 'cancelled')),
  fulfillment_status  text NOT NULL DEFAULT 'pending'
                        CHECK (fulfillment_status IN ('pending', 'processing', 'completed', 'failed')),
  provider_reference  text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number   ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at     ON orders (created_at);

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- payments
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                uuid REFERENCES orders(id) ON DELETE CASCADE,
  provider                text NOT NULL DEFAULT 'mpesa',
  provider_transaction_id text UNIQUE NOT NULL,  -- prevents duplicate processing
  receipt_number          text,
  amount                  integer NOT NULL CHECK (amount > 0),
  currency                text DEFAULT 'KES',
  status                  text NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'verified', 'failed', 'reversed')),
  verified_at             timestamptz,
  credited_at             timestamptz,
  raw_reference           jsonb,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id               ON payments (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_tx_id  ON payments (provider_transaction_id);

-- ============================================================
-- audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text NOT NULL,  -- 'order_created', 'payment_verified', 'admin_login', 'payment_webhook_received', 'fulfillment_attempt', 'suspicious_request', 'admin_action'
  actor       text,            -- 'system', 'admin', 'customer', or admin email
  entity_type text,
  entity_id   text,
  details     jsonb,
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

-- ============================================================
-- admin_users
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz DEFAULT now()
);
