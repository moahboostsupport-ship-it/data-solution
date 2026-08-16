-- 002_seed_packages.sql
-- DATA SOLUTION – Seed package data
-- Idempotent: uses ON CONFLICT DO NOTHING keyed on (name, category, price)

-- We seed by name+category+price as a natural unique key.
-- A unique index supports the ON CONFLICT clause.
CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_name_category_price
  ON packages (name, category, price);

-- ============================================================
-- Bingwa Data (category: 'bingwa_data', purchase_frequency: 'buy_once')
-- ============================================================
INSERT INTO packages (name, category, price, validity, purchase_frequency, featured, active)
VALUES
  ('750MB',  'bingwa_data', 55, '24 Hours', 'buy_once', false, true),
  ('250MB',  'bingwa_data', 20, '24 Hours', 'buy_once', false, true)
ON CONFLICT (name, category, price) DO NOTHING;

INSERT INTO packages (name, category, price, validity, purchase_frequency, featured, active, start_time, end_time)
VALUES
  ('1GB',    'bingwa_data', 19, '1 Hour', 'buy_once', true, true, '00:00', '15:59')
ON CONFLICT (name, category, price) DO NOTHING;

INSERT INTO packages (name, category, price, validity, purchase_frequency, featured, active)
VALUES
  ('1.5GB',  'bingwa_data', 99, '24 Hours', 'buy_once', true, true),
  ('400MB',  'bingwa_data', 49, '7 Days',  'buy_once', false, true)
ON CONFLICT (name, category, price) DO NOTHING;

-- ============================================================
-- SMS Deals (category: 'sms', purchase_frequency: 'buy_many')
-- ============================================================
INSERT INTO packages (name, category, price, validity, purchase_frequency, featured, active)
VALUES
  ('20 SMS',     'sms',   5,  '24 Hours', 'buy_many', false, true),
  ('200 SMS',    'sms',  10,  '24 Hours', 'buy_many', false, true),
  ('1,000 SMS',  'sms',  30,  '7 Days',  'buy_many', false, true),
  ('1,500 SMS',  'sms', 101, '30 Days',  'buy_many', true,  true)
ON CONFLICT (name, category, price) DO NOTHING;

-- ============================================================
-- Minutes Deals (category: 'minutes', purchase_frequency: 'buy_many')
-- ============================================================
INSERT INTO packages (name, category, price, validity, purchase_frequency, featured, active)
VALUES
  ('45 Minutes',  'minutes', 21, '3 Hours',      'buy_many', false, true),
  ('50 Minutes',  'minutes', 51, 'Till Midnight','buy_many', false, true)
ON CONFLICT (name, category, price) DO NOTHING;

-- ============================================================
-- Highlighted Offer (category: 'highlighted', purchase_frequency: 'buy_many')
-- ============================================================
INSERT INTO packages (name, category, price, validity, purchase_frequency, featured, active)
VALUES
  ('250MB + FREE WhatsApp', 'highlighted', 25, '24 Hours', 'buy_many', true, true)
ON CONFLICT (name, category, price) DO NOTHING;

-- ============================================================
-- Tunukiwa Deals (category: 'tunukiwa', purchase_frequency: 'buy_many')
-- ============================================================
INSERT INTO packages (name, category, price, validity, purchase_frequency, featured, active)
VALUES
  ('1GB',  'tunukiwa', 23,  '1 Hour',  'buy_many', false, true)
ON CONFLICT (name, category, price) DO NOTHING;

INSERT INTO packages (name, category, price, validity, purchase_frequency, featured, active)
VALUES
  ('2GB',  'tunukiwa', 110, '24 Hours', 'buy_many', true, true)
ON CONFLICT (name, category, price) DO NOTHING;
