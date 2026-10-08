PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  email                TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL DEFAULT 'Administrator',
  password_hash        TEXT NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS frames (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description  TEXT NOT NULL DEFAULT '',
  base_price   REAL NOT NULL CHECK (base_price >= 0),
  material     TEXT NOT NULL DEFAULT '',
  color        TEXT NOT NULL DEFAULT '',
  color_hex    TEXT NOT NULL DEFAULT '#1F1D1B',
  mat_hex      TEXT NOT NULL DEFAULT '#FFFFFF',
  border_style TEXT NOT NULL DEFAULT 'classic' CHECK (border_style IN ('thin','classic','wide','ornate')),
  glass_type   TEXT NOT NULL DEFAULT '',
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_featured  INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_frames_category ON frames(category_id);
CREATE INDEX IF NOT EXISTS idx_frames_active_featured ON frames(is_active, is_featured);

CREATE TABLE IF NOT EXISTS frame_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  frame_id   INTEGER NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  alt        TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_frame_images_frame ON frame_images(frame_id);

CREATE TABLE IF NOT EXISTS frame_sizes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  frame_id    INTEGER NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  width_in    REAL NOT NULL CHECK (width_in > 0),
  height_in   REAL NOT NULL CHECK (height_in > 0),
  extra_price REAL NOT NULL DEFAULT 0 CHECK (extra_price >= 0),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (frame_id, label)
);
CREATE INDEX IF NOT EXISTS idx_frame_sizes_frame ON frame_sizes(frame_id);

CREATE TABLE IF NOT EXISTS customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  phone      TEXT NOT NULL,
  address    TEXT NOT NULL DEFAULT '',
  city       TEXT NOT NULL DEFAULT '',
  pincode    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE TABLE IF NOT EXISTS order_counters (
  year INTEGER PRIMARY KEY,
  last INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code       TEXT NOT NULL UNIQUE,
  customer_id      INTEGER NOT NULL REFERENCES customers(id),
  customer_name    TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT NOT NULL,
  address          TEXT NOT NULL,
  city             TEXT NOT NULL,
  pincode          TEXT NOT NULL,
  notes            TEXT NOT NULL DEFAULT '',
  subtotal         REAL NOT NULL,
  discount         REAL NOT NULL DEFAULT 0,
  coupon_code      TEXT,
  tax              REAL NOT NULL DEFAULT 0,
  delivery_charge  REAL NOT NULL DEFAULT 0,
  total            REAL NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'INR',
  status           TEXT NOT NULL DEFAULT 'Pending'
                   CHECK (status IN ('Pending','Confirmed','Processing','Ready','Out for Delivery','Completed','Cancelled')),
  payment_method   TEXT NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod','store','online')),
  payment_status   TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid','Paid','Refunded','Failed')),
  email_status     TEXT NOT NULL DEFAULT 'not_sent',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);

CREATE TABLE IF NOT EXISTS order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  frame_id      INTEGER REFERENCES frames(id) ON DELETE SET NULL,
  frame_code    TEXT NOT NULL,
  frame_name    TEXT NOT NULL,
  design        TEXT NOT NULL DEFAULT '',
  frame_image   TEXT,
  size_label    TEXT NOT NULL,
  orientation   TEXT NOT NULL DEFAULT 'portrait' CHECK (orientation IN ('portrait','landscape')),
  photo_path    TEXT,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  unit_price    REAL NOT NULL,
  line_total    REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_frame ON order_items(frame_id);

CREATE TABLE IF NOT EXISTS payments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  provider_order_id   TEXT,
  provider_payment_id TEXT,
  amount              REAL NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  status              TEXT NOT NULL DEFAULT 'created',
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

CREATE TABLE IF NOT EXISTS coupons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  percent_off REAL NOT NULL CHECK (percent_off > 0 AND percent_off <= 100),
  min_subtotal REAL NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author     TEXT NOT NULL,
  location   TEXT NOT NULL DEFAULT '',
  rating     INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  body       TEXT NOT NULL,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
