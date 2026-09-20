-- Catalog of sellable menu items. Prices live here so menu changes do not require a code deploy.
-- Toppings are stored as a JSON array: [{"name":"...","price":1.5}, ...]

CREATE TABLE IF NOT EXISTS menu_items (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    toppings TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())
);

CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order ON menu_items(sort_order);

CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed current hardcoded catalog (idempotent). Go startup seed covers sqlite / existing volumes.
INSERT INTO menu_items (id, name, price, toppings, sort_order) VALUES
('tacos_pastor', 'Tacos al Pastor (3)', 12.99, '[{"name":"Extra Piña","price":1.5},{"name":"Guacamole","price":2},{"name":"Crema","price":0.75}]', 1),
('enchiladas_verdes', 'Enchiladas Verdes', 14.99, '[]', 2),
('tacos_carnitas', 'Tacos de Carnitas (3)', 11.99, '[{"name":"Guacamole","price":2},{"name":"Crema","price":0.75},{"name":"Queso Extra","price":1.25}]', 3),
('burrito_pollo', 'Burrito de Pollo', 13.99, '[{"name":"Guacamole","price":2},{"name":"Queso Extra","price":1.25},{"name":"Jalapeños","price":0.5}]', 4),
('quesadilla_queso', 'Quesadilla de Queso', 9.99, '[{"name":"Hongos","price":1.5},{"name":"Rajas","price":1},{"name":"Queso Extra","price":1.25}]', 5),
('cerveza_corona', 'Cerveza Corona', 4.50, '[]', 6),
('cerveza_modelo', 'Cerveza Modelo', 4.50, '[]', 7),
('agua_horchata', 'Agua de Horchata', 3.99, '[]', 8),
('agua_jamaica', 'Agua de Jamaica', 3.99, '[]', 9),
('flan_napolitano', 'Flan Napolitano', 6.99, '[]', 10),
('tres_leches', 'Tres Leches', 7.99, '[]', 11),
('churros', 'Churros (6)', 5.99, '[]', 12)
ON CONFLICT (id) DO NOTHING;
