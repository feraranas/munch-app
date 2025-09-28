#!/bin/bash

# Database seeding script for development
# This script can be run to populate the database with sample data

set -e

# Configuration
if [ "$DATABASE_TYPE" = "postgres" ]; then
    export PGPASSWORD="munch_password"
    DB_CMD="psql -h postgres -U munch_user -d munch_app_dev"
else
    DB_CMD="sqlite3 munch_app.db"
fi

echo "Seeding database with sample data..."

# Sample QR Sessions
echo "Creating sample QR sessions..."

if [ "$DATABASE_TYPE" = "postgres" ]; then
    $DB_CMD <<EOF
INSERT INTO qr_sessions (id, qr_image_data, table_number, created_at, updated_at) VALUES
('qr-table-001', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'Table 1', EXTRACT(EPOCH FROM NOW()), EXTRACT(EPOCH FROM NOW())),
('qr-table-002', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'Table 2', EXTRACT(EPOCH FROM NOW()), EXTRACT(EPOCH FROM NOW())),
('qr-table-003', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'Table 3', EXTRACT(EPOCH FROM NOW()), EXTRACT(EPOCH FROM NOW()))
ON CONFLICT (id) DO NOTHING;
EOF
else
    $DB_CMD <<EOF
INSERT OR IGNORE INTO qr_sessions (id, qr_image_data, table_number, created_at, updated_at) VALUES
('qr-table-001', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'Table 1', strftime('%s', 'now'), strftime('%s', 'now')),
('qr-table-002', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'Table 2', strftime('%s', 'now'), strftime('%s', 'now')),
('qr-table-003', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'Table 3', strftime('%s', 'now'), strftime('%s', 'now'));
EOF
fi

# Sample Orders
echo "Creating sample orders..."

if [ "$DATABASE_TYPE" = "postgres" ]; then
    $DB_CMD <<EOF
INSERT INTO orders (id, qr_session, items, total, status, created_at) VALUES
('order-001', 'qr-table-001', '[{"id":"burger","menuId": "burguer_0001","name":"Classic Burger","price":12.99,"quantity":1}]', 25.98, 'open', EXTRACT(EPOCH FROM NOW())),
('order-002', 'qr-table-002', '[{"id":"pizza","menuId": "pizza_0001","name":"Margherita Pizza","price":14.99,"quantity":1},{"id":"drink","name":"Coke","price":2.99,"quantity":2}]', 20.97, 'paid', EXTRACT(EPOCH FROM NOW())),
('order-003', 'qr-table-003', '[{"id":"salad","menuId": "salad_0001","name":"Caesar Salad","price":9.99,"quantity":1}]', 9.99, 'open', EXTRACT(EPOCH FROM NOW()))
ON CONFLICT (id) DO NOTHING;
EOF
else
    $DB_CMD <<EOF
INSERT OR IGNORE INTO orders (id, qr_session, items, total, status, created_at) VALUES
('order-001', 'qr-table-001', '[{"id":"burger","name":"Classic Burger","price":12.99,"quantity":2}]', 25.98, 'open', strftime('%s', 'now')),
('order-002', 'qr-table-002', '[{"id":"pizza","name":"Margherita Pizza","price":14.99,"quantity":1},{"id":"drink","name":"Coke","price":2.99,"quantity":2}]', 20.97, 'paid', strftime('%s', 'now')),
('order-003', 'qr-table-003', '[{"id":"salad","name":"Caesar Salad","price":9.99,"quantity":1}]', 9.99, 'open', strftime('%s', 'now'));
EOF
fi

if [ "$DATABASE_TYPE" = "postgres" ]; then
    unset PGPASSWORD
fi

echo "Database seeding completed successfully!"
echo "Created 3 QR sessions and 3 sample orders."
