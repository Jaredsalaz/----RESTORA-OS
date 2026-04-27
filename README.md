# 🍽️ RESTORA OS — Sistema de Gestión Inteligente para Restaurantes
### Plan de Arquitectura y Desarrollo — Versión 1.0

---

## 📌 RESUMEN EJECUTIVO

**Restora OS** es una plataforma SaaS multi-tenant para la gestión integral de restaurantes.
Diseñada con una interfaz táctil moderna, pensada para meseros, cocina, administración y dueños
de negocio. El sistema se comercializa mediante suscripciones mensuales/anuales, con un modelo
de roles jerárquico: **Super Admin → Admin Empresa → Gerente Restaurante → Mesero / Cocina**.

---

## 🏢 MODELO DE NEGOCIO (SaaS Multi-Tenant)

### Jerarquía de usuarios

```
SUPER ADMIN (Nosotros — dueños del sistema)
 └── EMPRESA / CLIENTE (Ej: Cadena de restaurantes "Grupo Moctezuma")
      └── RESTAURANTE (Sucursal física con su propia config)
           ├── GERENTE / ADMIN RESTAURANTE
           ├── CAJERO
           ├── MESERO
           └── COCINA / BAR
```

### Planes de suscripción (ejemplos sugeridos)

| Plan       | Restaurantes | Usuarios | Soporte    | Precio sugerido |
|------------|-------------|----------|------------|-----------------|
| Starter    | 1           | 10       | Email      | $599 MXN/mes    |
| Business   | 3           | 30       | Chat 24/7  | $1,499 MXN/mes  |
| Enterprise | Ilimitados  | Ilimitados| Dedicado  | A cotizar       |

---

## 🏛️ ARQUITECTURA GENERAL (Hexagonal / Ports & Adapters)

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│        Interfaz táctil — Tablet / Pantalla grande            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                  API GATEWAY / NGINX                         │
│           Auth JWT · Rate Limiting · SSL/TLS                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              BACKEND — PYTHON (FastAPI)                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              CAPA DE APLICACIÓN (Use Cases)          │   │
│  │  OrderService · PaymentService · MenuService · etc.  │   │
│  └──────────┬──────────────────────────────┬───────────┘   │
             │                              │                │
│  ┌──────────▼────────┐        ┌────────────▼─────────────┐  │
│  │ PUERTOS PRIMARIOS │        │   PUERTOS SECUNDARIOS    │  │
│  │  (Driving Ports)  │        │   (Driven Ports)         │  │
│  │  REST Controllers │        │  DB Repo · Email · SMS   │  │
│  │  WebSocket Events │        │  Payment Gateway · Cache │  │
│  └───────────────────┘        └──────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              DOMINIO (Entities + Rules)              │   │
│  │   Order · Table · Product · Invoice · User · etc.   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│           INFRAESTRUCTURA (Docker Compose)                   │
│   PostgreSQL · Redis · MinIO · RabbitMQ · Nginx             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ ESTRUCTURA DEL PROYECTO

```
restora-os/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic/                         # Migraciones de BD
│   └── src/
│       ├── main.py                      # Punto de entrada FastAPI
│       ├── config.py                    # Settings con pydantic-settings
│       │
│       ├── domain/                      # 🔴 NÚCLEO — sin dependencias externas
│       │   ├── entities/
│       │   │   ├── order.py
│       │   │   ├── product.py
│       │   │   ├── table.py
│       │   │   ├── invoice.py
│       │   │   ├── user.py
│       │   │   ├── restaurant.py
│       │   │   └── company.py
│       │   ├── value_objects/
│       │   │   ├── money.py
│       │   │   ├── order_status.py
│       │   │   └── payment_method.py
│       │   ├── repositories/            # Interfaces (Puertos)
│       │   │   ├── order_repository.py
│       │   │   ├── product_repository.py
│       │   │   └── ...
│       │   └── events/
│       │       ├── order_placed.py
│       │       └── payment_completed.py
│       │
│       ├── application/                 # 🟡 CASOS DE USO
│       │   ├── orders/
│       │   │   ├── create_order.py
│       │   │   ├── update_order_item.py
│       │   │   ├── close_order.py
│       │   │   └── split_bill.py
│       │   ├── payments/
│       │   │   ├── process_payment.py
│       │   │   └── issue_invoice.py
│       │   ├── menu/
│       │   │   ├── manage_product.py
│       │   │   └── manage_category.py
│       │   ├── tables/
│       │   │   └── manage_table.py
│       │   ├── reports/
│       │   │   ├── daily_sales.py
│       │   │   └── financial_summary.py
│       │   └── auth/
│       │       ├── login.py
│       │       └── manage_users.py
│       │
│       ├── adapters/                    # 🟢 ADAPTADORES (Infraestructura)
│       │   ├── api/                     # Driving — REST + WebSocket
│       │   │   ├── v1/
│       │   │   │   ├── auth.py
│       │   │   │   ├── orders.py
│       │   │   │   ├── menu.py
│       │   │   │   ├── tables.py
│       │   │   │   ├── payments.py
│       │   │   │   ├── reports.py
│       │   │   │   ├── companies.py     # Super Admin
│       │   │   │   └── restaurants.py   # Admin
│       │   │   └── websockets/
│       │   │       └── kitchen_ws.py    # Tiempo real cocina
│       │   │
│       │   ├── persistence/             # Driven — SQLAlchemy + PostgreSQL
│       │   │   ├── models/              # ORM Models
│       │   │   ├── repositories/        # Implementaciones concretas
│       │   │   └── migrations/
│       │   │
│       │   ├── cache/                   # Redis
│       │   │   └── redis_cache.py
│       │   │
│       │   ├── payments/
│       │   │   ├── stripe_adapter.py
│       │   │   ├── conekta_adapter.py   # Pago mexicano
│       │   │   └── cash_adapter.py
│       │   │
│       │   ├── notifications/
│       │   │   ├── email_adapter.py
│       │   │   └── sms_adapter.py
│       │   │
│       │   └── storage/
│       │       └── minio_adapter.py     # Imágenes de menú, logos
│       │
│       └── shared/
│           ├── exceptions.py
│           ├── pagination.py
│           ├── security/
│           │   ├── jwt_handler.py
│           │   ├── digital_signature.py # Firma digital para tickets
│           │   └── encryption.py
│           └── audit_log.py
│
├── frontend/
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       │
│       ├── apps/                        # Apps por rol
│       │   ├── waiter/                  # App Mesero (táctil)
│       │   ├── kitchen/                 # App Cocina (display)
│       │   ├── cashier/                 # App Caja
│       │   ├── admin/                   # App Admin restaurante
│       │   └── superadmin/              # App Super Admin
│       │
│       ├── components/
│       │   ├── ui/                      # Design system base
│       │   ├── orders/
│       │   ├── menu/
│       │   ├── tables/
│       │   ├── payments/
│       │   └── reports/
│       │
│       ├── hooks/
│       ├── stores/                      # Zustand
│       ├── services/                    # API calls
│       └── types/
│
└── infra/
    ├── nginx/
    ├── postgres/
    └── scripts/
```

---

## 🗄️ ESQUEMA DE BASE DE DATOS (PostgreSQL)

### Multi-tenant con schema por empresa (o row-level security)

```sql
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
    pin_code      VARCHAR(6),            -- PIN táctil para meseros
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
```

---

## 🧩 MÓDULOS DEL SISTEMA

### 1. 📋 MÓDULO DE COMANDAS (Core)

**Pantalla táctil del mesero — el corazón del sistema**

Flujo completo:
```
Mesero selecciona mesa → Abre comanda → Selecciona productos
→ Personaliza items (modificadores, notas) → Envía a cocina
→ Cocina prepara y marca "listo" → Mesero entrega
→ Cierra comanda → Genera ticket → Cobra → Imprime
```

Funcionalidades:
- Selección visual de mesas con mapa del salón en tiempo real
- Menú táctil con categorías, fotos y precios
- Modificadores por producto (ej: "término del filete", "sin gluten")
- Notas por item y por comanda completa
- División de cuenta entre comensales (split bill)
- Transferir mesa o comanda entre meseros
- Comandas simultáneas por mesero
- Historial de comandas del turno
- Modo offline básico (PWA con cache local)

### 2. 🍳 MÓDULO DE COCINA (KDS — Kitchen Display System)

- Pantalla grande en cocina con comandas en tiempo real (WebSocket)
- Vista por área: cocina caliente / cocina fría / bar
- Temporizador por comanda (alerta visual si se pasa del tiempo)
- Botón "Listo" por item o por comanda completa
- Historial del turno
- Cola de preparación con prioridad
- Sonido de alerta al llegar nueva comanda

### 3. 💳 MÓDULO DE PAGOS Y COBRANZA

- Métodos: efectivo, tarjeta (Stripe/Conekta), transferencia, voucher
- División de cuenta (por persona, por item, porcentajes)
- Aplicación de descuentos y cortesías (con autorización de gerente)
- Propinas configurables
- Generación de ticket simplificado (impresión térmica)
- Generación de factura CFDI (para México — SAT compatible)
- Firma digital en cada ticket (SHA-256 + RSA)
- Historial de pagos por turno/día

### 4. 🎟️ MÓDULO DE TICKETS Y FACTURACIÓN

Ticket de venta:
```
┌─────────────────────────────────┐
│      🍽️  RESTORA OS             │
│   Restaurante "La Paloma"       │
│   RFC: XAXX010101000            │
│                                 │
│  Mesa: 12    Mesero: Carlos R.  │
│  Fecha: 24/04/2026  14:32       │
│  Comanda #: 042                 │
│─────────────────────────────────│
│  2x Tacos Pastor     $180.00   │
│  1x Agua fresca       $35.00   │
│  1x Postre día        $65.00   │
│─────────────────────────────────│
│  Subtotal:           $280.00   │
│  IVA (16%):           $44.80   │
│  TOTAL:              $324.80   │
│─────────────────────────────────│
│  PAGO: Tarjeta ✓               │
│  Cambio: $0.00                  │
│                                 │
│  *** GRACIAS POR SU VISITA ***  │
│  Firma: a3f9b2...              │
└─────────────────────────────────┘
```

Factura electrónica (CFDI 4.0 para México):
- Integración con PAC (Proveedor Autorizado de Certificación)
- Timbrado en línea
- Envío por email al cliente
- PDF descargable y XML del CFDI

### 5. 📊 MÓDULO DE REPORTES Y FINANZAS

Reportes disponibles:
- Ventas del día / semana / mes / rango personalizado
- Ventas por mesero (ranking de desempeño)
- Productos más vendidos (top 10, bottom 10)
- Análisis de horarios pico
- Tiempo promedio de atención por mesa
- Reporte de descuentos y cortesías
- Flujo de caja (efectivo vs tarjeta vs transferencia)
- Cierre de turno con desglose completo
- Exportar a Excel / PDF
- Dashboard con gráficas en tiempo real

### 6. 🗺️ MÓDULO DE MESAS Y SALÓN

- Mapa visual e interactivo del restaurante
- Colores por estado: libre (verde), ocupada (rojo), reservada (amarillo), limpieza (azul)
- Configuración drag-and-drop de la distribución del salón
- Múltiples secciones: interior, terraza, bar, privado
- QR por mesa para ordenar desde móvil del cliente (futuro)

### 7. 🍽️ MÓDULO DE MENÚ Y CATÁLOGO

- Gestión de categorías con íconos y colores
- Productos con foto, descripción, precio, tiempo de preparación
- Modificadores agrupados (ej: "Términos": crudo/medio/bien cocido)
- Activar/desactivar producto por día u horario
- Precios especiales (happy hour, fin de semana)
- Menú del día configurable
- Alérgenos y etiquetas (vegano, sin gluten, picante)

### 8. 👥 MÓDULO DE USUARIOS Y ROLES

| Rol          | Permisos clave                                            |
|--------------|-----------------------------------------------------------|
| Super Admin  | Gestionar empresas, planes, suscripciones, sistema global |
| Admin Empresa| Gestionar restaurantes de su empresa, usuarios admin       |
| Gerente      | Config restaurante, reportes, turnos, descuentos          |
| Cajero       | Cobrar, emitir tickets, ver comandas                      |
| Mesero       | Crear/editar comandas de sus mesas asignadas              |
| Cocina       | Ver y actualizar estado de items en preparación           |

- Autenticación con email + contraseña (login web)
- Login rápido por PIN táctil (4-6 dígitos para meseros en tablet)
- JWT con refresh tokens
- Sesiones por turno con registro de entrada/salida

### 9. 🔔 MÓDULO DE NOTIFICACIONES EN TIEMPO REAL

Tecnología: WebSockets (FastAPI + Redis Pub/Sub)

Eventos:
- Nueva comanda → notifica cocina inmediatamente
- Item listo → notifica al mesero
- Mesa libre → actualiza mapa del salón
- Alerta de tiempo excedido en preparación
- Pago completado → actualiza contadores del cajero

---

## 🖥️ DISEÑO DE INTERFAZ (UI/UX)

### Principios de diseño táctil

- Botones grandes (mínimo 48x48px) para uso con dedos
- Fuente legible desde 60cm de distancia (mínimo 16px)
- Alto contraste para ambientes con poca luz
- Sin menús hamburguesa — navegación directa siempre visible
- Confirmaciones claras para acciones destructivas
- Feedback háptico en dispositivos compatibles
- Dark mode disponible para cocina

### Stack de diseño

```
TailwindCSS v3      → Sistema de utilidades
Radix UI            → Componentes accesibles headless
Framer Motion       → Animaciones táctiles fluidas
Zustand             → Estado global del cliente
React Query         → Cache y sincronización con API
Socket.IO Client    → WebSockets
React Hook Form     → Formularios rápidos
Recharts            → Gráficas de reportes
```

### Vistas principales

```
/waiter/            → App mesero (táctil, pantalla completa)
  ├── /tables        → Mapa del salón
  ├── /order/:id     → Comanda activa
  └── /menu          → Selección de productos

/kitchen/           → KDS cocina (pantalla grande, sin autenticación manual)
/cashier/           → App cajero
/admin/             → Panel administrativo del restaurante
/superadmin/        → Panel global del sistema
```

---

## 🐳 INFRAESTRUCTURA CON DOCKER

### docker-compose.yml

```yaml
version: '3.9'

services:
  # ─── Base de Datos ───────────────────────────────
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: restora_db
      POSTGRES_USER: restora
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  # ─── Cache y Pub/Sub ─────────────────────────────
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

  # ─── Backend API ─────────────────────────────────
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://restora:${POSTGRES_PASSWORD}@postgres/restora_db
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      SECRET_KEY: ${SECRET_KEY}
      ENVIRONMENT: production
    depends_on:
      - postgres
      - redis
    ports:
      - "8000:8000"

  # ─── Frontend ────────────────────────────────────
  frontend:
    build: ./frontend
    ports:
      - "3000:80"

  # ─── Proxy reverso ───────────────────────────────
  nginx:
    image: nginx:alpine
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./infra/nginx/ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend

  # ─── Almacenamiento de archivos ──────────────────
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  # ─── Monitoreo ───────────────────────────────────
  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@restora.com
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
    ports:
      - "5050:80"
    profiles: ["dev"]

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## 🔐 SEGURIDAD (Fase 2)

### Autenticación y autorización

- JWT (access token 15min + refresh token 7 días)
- Login por PIN táctil (hasheado con bcrypt)
- RBAC (Role-Based Access Control) por endpoint
- Row-Level Security en PostgreSQL por tenant

### Firma digital en tickets

```python
# Cada ticket firmado con RSA-SHA256
import hashlib, base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

def sign_invoice(invoice_data: dict, private_key) -> str:
    payload = json.dumps(invoice_data, sort_keys=True).encode()
    signature = private_key.sign(payload, padding.PKCS1v15(), hashes.SHA256())
    return base64.b64encode(signature).decode()

def verify_invoice(invoice_data: dict, signature: str, public_key) -> bool:
    payload = json.dumps(invoice_data, sort_keys=True).encode()
    sig_bytes = base64.b64decode(signature)
    try:
        public_key.verify(sig_bytes, payload, padding.PKCS1v15(), hashes.SHA256())
        return True
    except Exception:
        return False
```

### Otras medidas de seguridad

- HTTPS obligatorio en producción (Let's Encrypt)
- Rate limiting por IP y por usuario
- Validación de entrada con Pydantic v2
- Sanitización contra SQL injection (SQLAlchemy ORM)
- Protección CSRF en formularios sensibles
- Logs de auditoría completos para todas las acciones
- Backup automático de BD cada 24h
- Variables sensibles solo en variables de entorno (nunca en código)
- Secretos gestionados con Docker Secrets en producción

---

## 🔌 MÓDULO DE PAGOS Y TRANSACCIONES (Fase 2)

### Gateways integrados

| Gateway   | Uso                         | Región    |
|-----------|-----------------------------|-----------| 
| Stripe    | Tarjetas internacionales    | Global    |
| Conekta   | Tarjetas + OXXO + SPEI      | México    |
| Efectivo  | Flujo interno sin gateway   | Local     |

### Flujo de pago

```
Cliente solicita cuenta
→ Cajero/Mesero abre pantalla de cobro
→ Selecciona método de pago
→ Si tarjeta → Terminal física (Stripe Terminal / Conekta POS)
→ Confirma pago → Se registra en BD
→ Se genera invoice con firma digital
→ Se imprime ticket térmico (o se envía por WhatsApp/email)
→ Mesa queda libre automáticamente
```

### Impresión térmica

- Soporte para impresoras Epson, Star, Bixolon vía protocolo ESC/POS
- Librería: `python-escpos` en backend
- Impresión directa desde navegador via QZ Tray o similar
- Formato: 80mm (estándar restaurante)

---

## 📱 COMPATIBILIDAD DE DISPOSITIVOS

| Dispositivo        | App                    | Resolución mínima |
|--------------------|------------------------|-------------------|
| iPad 10" / Tablet  | Mesero (táctil)        | 1024x768          |
| Monitor 21"+ táctil| Mesero + Cocina        | 1920x1080         |
| iPad Pro 12.9"     | Admin / Caja           | 1024x1366         |
| PC / Mac           | Super Admin / Reportes | 1280x800          |
| TV / Monitor grande| Cocina KDS             | 1920x1080         |

**Modo quiosco (Kiosk Mode):** La app del mesero puede correr en modo quiosco para bloquear
el dispositivo y que solo muestre la aplicación (Chrome Kiosk Mode).

---

## 📡 APIS Y ENDPOINTS PRINCIPALES

```
AUTH
  POST   /api/v1/auth/login
  POST   /api/v1/auth/login-pin
  POST   /api/v1/auth/refresh
  POST   /api/v1/auth/logout

SUPER ADMIN
  GET    /api/v1/companies
  POST   /api/v1/companies
  PUT    /api/v1/companies/:id
  DELETE /api/v1/companies/:id
  GET    /api/v1/subscriptions
  POST   /api/v1/subscriptions/:id/renew

RESTAURANTES
  GET    /api/v1/restaurants
  POST   /api/v1/restaurants
  PUT    /api/v1/restaurants/:id
  GET    /api/v1/restaurants/:id/stats

MESAS
  GET    /api/v1/tables
  POST   /api/v1/tables
  PATCH  /api/v1/tables/:id/status

MENÚ
  GET    /api/v1/categories
  POST   /api/v1/categories
  GET    /api/v1/products
  POST   /api/v1/products
  PATCH  /api/v1/products/:id/toggle-availability

COMANDAS
  GET    /api/v1/orders?status=open
  POST   /api/v1/orders
  GET    /api/v1/orders/:id
  PATCH  /api/v1/orders/:id/items
  POST   /api/v1/orders/:id/send-to-kitchen
  POST   /api/v1/orders/:id/close
  POST   /api/v1/orders/:id/split

PAGOS
  POST   /api/v1/payments/process
  GET    /api/v1/invoices/:id
  GET    /api/v1/invoices/:id/pdf
  POST   /api/v1/invoices/:id/cfdi

REPORTES
  GET    /api/v1/reports/sales?from=&to=
  GET    /api/v1/reports/daily-summary/:date
  GET    /api/v1/reports/top-products
  GET    /api/v1/reports/by-waiter

WEBSOCKETS
  WS     /ws/kitchen/:restaurant_id
  WS     /ws/tables/:restaurant_id
  WS     /ws/orders/:restaurant_id
```

---

## 📋 FASES DE DESARROLLO

---

### 🔵 FASE 1 — Arquitectura Base y Core (Semanas 1–6)

**Objetivo:** Sistema funcional con comandas, menú y mesas.

**Semana 1–2: Setup e infraestructura**
- [ ] Configurar Docker Compose con todos los servicios
- [ ] Configurar FastAPI con estructura hexagonal
- [ ] Configurar Alembic para migraciones
- [ ] Crear tablas base en PostgreSQL
- [ ] Setup de Vite + React + TypeScript + Tailwind
- [ ] CI/CD básico con GitHub Actions
- [ ] Documentación con variables de entorno

**Semana 3–4: Dominio y casos de uso**
- [ ] Entidades del dominio (Order, Product, Table, User)
- [ ] Repositorios e interfaces
- [ ] Casos de uso: crear comanda, agregar item, enviar a cocina
- [ ] API endpoints de comandas con validación Pydantic
- [ ] Sistema JWT completo con refresh tokens
- [ ] Login por PIN táctil

**Semana 5–6: Frontend base**
- [ ] Design system táctil (componentes base)
- [ ] App del mesero: mapa de mesas
- [ ] App del mesero: creación de comandas
- [ ] Pantalla de menú táctil con categorías y productos
- [ ] KDS básico para cocina con WebSocket
- [ ] Pruebas de usabilidad táctil

**Entregable Fase 1:** Sistema con flujo completo mesero → cocina sin pagos.

---

### 🟡 FASE 2 — Pagos, Tickets y Seguridad (Semanas 7–12)

**Objetivo:** Sistema completamente transaccional y seguro.

**Semana 7–8: Módulo de pagos**
- [ ] Adaptador de pagos en efectivo
- [ ] Integración Stripe (tarjeta + terminal)
- [ ] Integración Conekta (México)
- [ ] División de cuenta (split bill)
- [ ] Aplicación de descuentos con autorización

**Semana 9–10: Tickets y facturación**
- [ ] Generación de ticket térmico (PDF + impresión ESC/POS)
- [ ] Firma digital RSA-SHA256 en cada ticket
- [ ] Módulo de facturación CFDI 4.0
- [ ] Integración con PAC (ej: Finkok o SW Sapien)
- [ ] Envío de ticket/factura por email y WhatsApp

**Semana 11–12: Seguridad integral**
- [ ] RBAC completo por endpoint y por tenant
- [ ] Row-Level Security en PostgreSQL
- [ ] Rate limiting y protección DDoS
- [ ] Audit logging completo
- [ ] Backups automáticos
- [ ] Pruebas de penetración básicas
- [ ] HTTPS con certificados Let's Encrypt

**Entregable Fase 2:** Sistema de cobro completo y seguro, listo para producción.

---

### 🟢 FASE 3 — Calidad, Reportes y Super Admin (Semanas 13–18)

**Objetivo:** Plataforma SaaS multi-tenant completa y medida.

**Semana 13–14: Super Admin y multitenancy**
- [ ] Panel Super Admin completo
- [ ] Gestión de empresas y planes
- [ ] Sistema de suscripciones y vencimientos
- [ ] Panel Admin empresa: gestionar restaurantes
- [ ] Onboarding guiado para nuevas empresas

**Semana 15–16: Reportes y finanzas**
- [ ] Dashboard con KPIs en tiempo real
- [ ] Reporte de ventas con filtros y gráficas
- [ ] Cierre de turno automatizado
- [ ] Exportación a Excel y PDF
- [ ] Alertas configurables (stock bajo, metas de venta)

**Semana 17–18: Calidad y auditoría ISO/IEC 25000**
- [ ] Pruebas unitarias (pytest) — cobertura mínima 80%
- [ ] Pruebas de integración por módulo
- [ ] Pruebas E2E con Playwright (flujos principales)
- [ ] Pruebas de carga (Locust) — 100 usuarios concurrentes
- [ ] Evaluación de usabilidad (ISO 25010 — Usability)
- [ ] Documentación de atributos de calidad medidos
- [ ] Corrección de defectos encontrados

**Entregable Fase 3:** Plataforma SaaS lista para venta, auditada y documentada.

---

## 📐 EVALUACIÓN DE CALIDAD — ISO/IEC 25010

| Característica       | Métrica                            | Objetivo        |
|---------------------|------------------------------------|-----------------|
| Funcionalidad        | % de casos de prueba pasados       | ≥ 95%           |
| Rendimiento          | Tiempo de respuesta API            | < 200ms (p95)   |
| Confiabilidad        | Uptime mensual                     | ≥ 99.5%         |
| Usabilidad           | Tareas completadas sin error       | ≥ 90%           |
| Seguridad            | Vulnerabilidades críticas/altas    | 0               |
| Mantenibilidad       | Cobertura de pruebas               | ≥ 80%           |
| Portabilidad         | Dispositivos compatibles probados  | ≥ 5             |
| Escalabilidad        | Usuarios concurrentes sin degradar | 100+            |

---

## 🔧 STACK TECNOLÓGICO COMPLETO

### Backend

| Componente        | Tecnología         | Versión  |
|------------------|--------------------|----------|
| Lenguaje          | Python             | 3.12+    |
| Framework API     | FastAPI            | 0.115+   |
| ORM               | SQLAlchemy         | 2.0      |
| Migraciones       | Alembic            | 1.13+    |
| Validación        | Pydantic v2        | 2.x      |
| Auth              | python-jose + bcrypt |        |
| WebSockets        | FastAPI WebSocket  |          |
| Caché             | Redis (aioredis)   | 7.x      |
| Pagos             | stripe, conekta    |          |
| PDF               | ReportLab / WeasyPrint |       |
| Email             | python-sendgrid    |          |
| Tests             | pytest + httpx     |          |

### Frontend

| Componente        | Tecnología         |
|------------------|--------------------|
| Framework         | React 18           |
| Build             | Vite 5             |
| Lenguaje          | TypeScript 5       |
| Estilos           | TailwindCSS 3      |
| Componentes       | Radix UI + shadcn  |
| Estado            | Zustand 4          |
| Data fetching     | TanStack Query v5  |
| Formularios       | React Hook Form    |
| Animaciones       | Framer Motion      |
| Gráficas          | Recharts           |
| WebSockets        | Socket.IO Client   |
| Tests             | Vitest + Testing Library |

### Infraestructura

| Componente        | Tecnología         |
|------------------|--------------------|
| Contenedores      | Docker + Compose   |
| BD relacional     | PostgreSQL 16      |
| Caché / Pub-Sub   | Redis 7            |
| Storage           | MinIO (S3 compat.) |
| Proxy reverso     | Nginx              |
| SSL               | Let's Encrypt      |
| CI/CD             | GitHub Actions     |
| Monitoring        | Prometheus + Grafana |
| Logs              | Loki + Grafana     |

---

## 💰 ESTIMACIÓN DE ESFUERZO

| Fase             | Duración    | Equipo sugerido                          |
|-----------------|-------------|------------------------------------------|
| Fase 1 (Core)   | 6 semanas   | 2 backend, 2 frontend, 1 UX/UI           |
| Fase 2 (Pagos)  | 6 semanas   | 2 backend, 1 frontend, 1 seguridad       |
| Fase 3 (SaaS)   | 6 semanas   | 1 backend, 1 frontend, 1 QA             |
| **Total**       | **~18 sem** | **MVP completo listo para comercializar**|

---

## 🚀 ROADMAP FUTURO (v2.0)

- 📲 Menú digital QR para que clientes ordenen desde su celular
- 📦 Módulo de inventario y control de almacén
- 🔔 Notificaciones push a meseros (app móvil nativa)
- 📊 Inteligencia artificial: predicción de demanda
- 🤖 Sugerencias automáticas de venta cruzada
- 🎁 Programa de lealtad y puntos
- 📅 Módulo de reservaciones online
- 🌐 App de pedidos en línea (delivery / pick-up)
- 💬 Chat interno entre staff
- 🖨️ Soporte multi-impresora por área (bar, cocina fría/caliente)
- 📱 App nativa iOS/Android para gerentes (React Native)

---

## ✅ CHECKLIST DE LANZAMIENTO

- [ ] Pruebas en dispositivo táctil real (tablet/monitor táctil)
- [ ] Prueba de flujo completo de comanda → cobro → ticket
- [ ] Configuración de al menos un restaurante de prueba
- [ ] Plan de onboarding para nuevos clientes documentado
- [ ] Página de landing con planes y precios
- [ ] Proceso de pago de suscripción funcionando
- [ ] Soporte técnico configurado (email / chat)
- [ ] Backups automáticos verificados
- [ ] Monitoreo de uptime activado (UptimeRobot / Better Uptime)
- [ ] Términos de servicio y política de privacidad redactados
- [ ] Demo disponible con datos de prueba

---

*Restora OS — Plan de Arquitectura v1.0*
*Confidencial — Uso interno del equipo de desarrollo*
