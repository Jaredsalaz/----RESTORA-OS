-- Init script for PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- TABLA: companies (Super Admin gestiona esto)
-- ============================================
CREATE TABLE companies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    rfc         VARCHAR(20),
    plan        VARCHAR(50) NOT NULL DEFAULT 'starter',
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    logo_url    TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    expires_at  TIMESTAMPTZ,
    settings    JSONB DEFAULT '{}'
);

-- ============================================
-- TABLA: restaurants
-- ============================================
CREATE TABLE restaurants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID REFERENCES companies(id),
    name          VARCHAR(200) NOT NULL,
    address       TEXT,
    phone         VARCHAR(20),
    timezone      VARCHAR(50) DEFAULT 'America/Mexico_City',
    currency      VARCHAR(3) DEFAULT 'MXN',
    logo_url      TEXT,
    tax_rate      DECIMAL(5,2) DEFAULT 16.00,  -- IVA
    settings      JSONB DEFAULT '{}'
);

-- ============================================
-- TABLA: users
-- ============================================
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID REFERENCES companies(id),
    restaurant_id UUID REFERENCES restaurants(id),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name     VARCHAR(200) NOT NULL,
    role          VARCHAR(30) NOT NULL,  -- superadmin|admin|manager|waiter|kitchen|cashier
    pin_code      TEXT,                  -- PIN táctil para meseros (bcrypt hash)
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLA: tables (mesas)
-- ============================================
CREATE TABLE tables (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id),
    name          VARCHAR(50) NOT NULL,  -- "Mesa 1", "Terraza 3"
    section       VARCHAR(100),          -- "Interior", "Terraza", "Bar"
    capacity      INT DEFAULT 4,
    status        VARCHAR(20) DEFAULT 'available',  -- available|occupied|reserved|cleaning
    qr_code       TEXT,
    position_x    INT,                   -- Para el mapa del salón
    position_y    INT
);

-- ============================================
-- TABLA: categories y products
-- ============================================
CREATE TABLE categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id),
    name          VARCHAR(100) NOT NULL,
    icon          VARCHAR(50),
    color         VARCHAR(7),
    sort_order    INT DEFAULT 0,
    is_active     BOOLEAN DEFAULT true
);

CREATE TABLE products (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id  UUID REFERENCES restaurants(id),
    category_id    UUID REFERENCES categories(id),
    name           VARCHAR(200) NOT NULL,
    description    TEXT,
    price          DECIMAL(10,2) NOT NULL,
    image_url      TEXT,
    sku            VARCHAR(100),
    is_available   BOOLEAN DEFAULT true,
    prep_time_min  INT DEFAULT 10,
    tags           TEXT[],               -- ['sin gluten','vegano','picante']
    modifiers      JSONB DEFAULT '[]',   -- modificadores/extras
    sort_order     INT DEFAULT 0
);

-- ============================================
-- TABLA: orders (comandas)
-- ============================================
CREATE TABLE orders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id),
    table_id      UUID REFERENCES tables(id),
    waiter_id     UUID REFERENCES users(id),
    order_number  SERIAL,               -- Número visible "Comanda #042"
    status        VARCHAR(30) DEFAULT 'open',
    -- open | in_progress | ready | delivered | paid | cancelled
    notes         TEXT,
    guests        INT DEFAULT 1,
    subtotal      DECIMAL(10,2),
    discount      DECIMAL(10,2) DEFAULT 0,
    tax           DECIMAL(10,2),
    total         DECIMAL(10,2),
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now(),
    closed_at     TIMESTAMPTZ
);

-- ============================================
-- TABLA: order_items
-- ============================================
CREATE TABLE order_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      UUID REFERENCES orders(id),
    product_id    UUID REFERENCES products(id),
    product_name  VARCHAR(200),          -- Snapshot del nombre
    unit_price    DECIMAL(10,2),         -- Snapshot del precio
    quantity      INT NOT NULL DEFAULT 1,
    modifiers     JSONB DEFAULT '[]',    -- Opciones seleccionadas
    notes         TEXT,                  -- "Sin cebolla"
    status        VARCHAR(20) DEFAULT 'pending',
    -- pending | preparing | ready | delivered | cancelled
    sent_to_kitchen_at TIMESTAMPTZ,
    prepared_at   TIMESTAMPTZ
);

-- ============================================
-- TABLA: invoices (tickets / facturas)
-- ============================================
CREATE TABLE invoices (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID REFERENCES orders(id),
    restaurant_id  UUID REFERENCES restaurants(id),
    invoice_number VARCHAR(50) UNIQUE,   -- "REST-2024-000001"
    subtotal       DECIMAL(10,2),
    discount       DECIMAL(10,2) DEFAULT 0,
    tax            DECIMAL(10,2),
    total          DECIMAL(10,2),
    payment_method VARCHAR(30),          -- cash|card|transfer|split
    status         VARCHAR(20) DEFAULT 'issued',
    digital_signature TEXT,             -- Firma digital SHA-256
    cfdi_uuid      VARCHAR(100),         -- UUID CFDI para facturación MX
    issued_at      TIMESTAMPTZ DEFAULT now(),
    pdf_url        TEXT
);

-- ============================================
-- TABLA: payments
-- ============================================
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID REFERENCES invoices(id),
    amount          DECIMAL(10,2) NOT NULL,
    method          VARCHAR(30),
    reference       VARCHAR(200),        -- ID externo del gateway
    gateway         VARCHAR(50),         -- stripe|conekta|cash
    status          VARCHAR(20),         -- pending|completed|failed|refunded
    processed_at    TIMESTAMPTZ
);

-- ============================================
-- TABLA: financial_summary (precalculada para reportes)
-- ============================================
CREATE TABLE daily_summaries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id   UUID REFERENCES restaurants(id),
    date            DATE NOT NULL,
    total_orders    INT DEFAULT 0,
    total_revenue   DECIMAL(12,2) DEFAULT 0,
    total_tax       DECIMAL(12,2) DEFAULT 0,
    total_discount  DECIMAL(12,2) DEFAULT 0,
    cash_total      DECIMAL(12,2) DEFAULT 0,
    card_total      DECIMAL(12,2) DEFAULT 0,
    avg_ticket      DECIMAL(10,2) DEFAULT 0,
    top_products    JSONB DEFAULT '[]',
    UNIQUE(restaurant_id, date)
);

-- ============================================
-- TABLA: audit_logs
-- ============================================
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    action      VARCHAR(100),
    entity      VARCHAR(50),
    entity_id   UUID,
    details     JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ DEFAULT now()
);
