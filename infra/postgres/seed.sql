-- Seed script for RESTORA OS
-- Asegúrate de correr esto DESPUÉS de init.sql

-- NOTA: Utilizamos la extensión pgcrypto (ya habilitada en init.sql) para generar 
-- los hashes bcrypt de las contraseñas usando crypt('password', gen_salt('bf'))

-- Ejecutar este ALTER por si ya habías creado la base de datos con VARCHAR(6)
ALTER TABLE users ALTER COLUMN pin_code TYPE TEXT;

-- 1. Insertar una Empresa (Company)
INSERT INTO companies (id, name, rfc, plan, status)
VALUES (
    'a1111111-1111-1111-1111-111111111111', 
    'Grupo Moctezuma', 
    'GUMO010101000', 
    'enterprise', 
    'active'
);

-- 2. Insertar un Restaurante (Sucursal)
INSERT INTO restaurants (id, company_id, name, address, phone, timezone, currency)
VALUES (
    'b2222222-2222-2222-2222-222222222222', 
    'a1111111-1111-1111-1111-111111111111', 
    'La Paloma - Sucursal Centro', 
    'Av. Reforma 123, Centro', 
    '5551234567', 
    'America/Mexico_City', 
    'MXN'
);

-- 3. Insertar Usuarios (Super Admin, Admin Restaurante, Mesero)
-- Password para todos: 'password123'
-- PIN para el mesero: '1234' (almacenado como hash bcrypt)

INSERT INTO users (id, company_id, restaurant_id, email, password_hash, full_name, role, pin_code)
VALUES 
    -- Super Admin (Tiene acceso global, no asociado a un restaurante específico)
    (
        'c3333333-3333-3333-3333-333333333333', 
        'a1111111-1111-1111-1111-111111111111', 
        NULL, 
        'superadmin@restora.com', 
        crypt('password123', gen_salt('bf')), 
        'Super Admin Restora', 
        'superadmin', 
        NULL
    ),
    -- Admin Empresa (Gerente general del Grupo Moctezuma)
    (
        'c4444444-4444-4444-4444-444444444444', 
        'a1111111-1111-1111-1111-111111111111', 
        NULL, 
        'admin@grupomoctezuma.com', 
        crypt('password123', gen_salt('bf')), 
        'Admin Moctezuma', 
        'admin', 
        NULL
    ),
    -- Gerente del Restaurante 'La Paloma'
    (
        'd4444444-4444-4444-4444-444444444444', 
        'a1111111-1111-1111-1111-111111111111', 
        'b2222222-2222-2222-2222-222222222222', 
        'gerente@lapaloma.com', 
        crypt('password123', gen_salt('bf')), 
        'Gerente La Paloma', 
        'manager', 
        NULL
    ),
    -- Mesero de 'La Paloma' (Usa PIN para login en Tablet)
    (
        'e5555555-5555-5555-5555-555555555555', 
        'a1111111-1111-1111-1111-111111111111', 
        'b2222222-2222-2222-2222-222222222222', 
        'mesero1@lapaloma.com', 
        crypt('password123', gen_salt('bf')), 
        'Carlos Rodríguez (Mesero)', 
        'waiter', 
        crypt('1234', gen_salt('bf'))
    );

-- 4. Insertar Mesas (Tables)
INSERT INTO tables (restaurant_id, name, section, capacity, status)
VALUES 
    ('b2222222-2222-2222-2222-222222222222', 'Mesa 1', 'Interior', 4, 'available'),
    ('b2222222-2222-2222-2222-222222222222', 'Mesa 2', 'Interior', 2, 'available'),
    ('b2222222-2222-2222-2222-222222222222', 'Terraza 1', 'Terraza', 4, 'available'),
    ('b2222222-2222-2222-2222-222222222222', 'Terraza 2', 'Terraza', 6, 'available'),
    ('b2222222-2222-2222-2222-222222222222', 'Barra 1', 'Bar', 1, 'available');

-- 5. Insertar Categorías de Menú
INSERT INTO categories (id, restaurant_id, name, icon, color, sort_order)
VALUES 
    ('f6666666-6666-6666-6666-666666666661', 'b2222222-2222-2222-2222-222222222222', 'Bebidas Frías', 'Coffee', '#3b82f6', 1),
    ('f6666666-6666-6666-6666-666666666662', 'b2222222-2222-2222-2222-222222222222', 'Plato Principal', 'Pizza', '#ef4444', 2),
    ('f6666666-6666-6666-6666-666666666663', 'b2222222-2222-2222-2222-222222222222', 'Postres', 'IceCream', '#f59e0b', 3);

-- 6. Insertar Productos de Menú
INSERT INTO products (restaurant_id, category_id, name, description, price, prep_time_min, tags)
VALUES 
    -- Bebidas
    ('b2222222-2222-2222-2222-222222222222', 'f6666666-6666-6666-6666-666666666661', 'Agua Fresca de Jamaica', 'Refrescante agua de jamaica natural', 45.00, 2, ARRAY['frío', 'sin azúcar']),
    ('b2222222-2222-2222-2222-222222222222', 'f6666666-6666-6666-6666-666666666661', 'Limonada Mineral', 'Limonada preparada con agua mineral', 55.00, 5, ARRAY['frío']),
    -- Platos principales
    ('b2222222-2222-2222-2222-222222222222', 'f6666666-6666-6666-6666-666666666662', 'Tacos al Pastor (Orden)', 'Orden de 5 tacos al pastor con piña', 180.00, 10, ARRAY['carne', 'picante']),
    ('b2222222-2222-2222-2222-222222222222', 'f6666666-6666-6666-6666-666666666662', 'Hamburguesa Clásica', 'Carne de res 200g, queso cheddar, tocino', 220.00, 15, ARRAY['carne']),
    -- Postres
    ('b2222222-2222-2222-2222-222222222222', 'f6666666-6666-6666-6666-666666666663', 'Pastel de Chocolate', 'Rebanada de pastel de chocolate amargo', 95.00, 5, ARRAY['dulce']);

-- FIN DEL SEED
