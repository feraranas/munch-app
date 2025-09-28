#!/bin/bash

# Script to migrate data from SQLite to PostgreSQL
# Usage: ./migrate_sqlite_to_postgres.sh

set -e

# Configuration
SQLITE_DB="munch_app.db"
PG_HOST="localhost"
PG_PORT="5432"
PG_USER="munch_user"
PG_PASSWORD="munch_password"
PG_DATABASE="munch_app_dev"

echo "Starting migration from SQLite to PostgreSQL..."

# Check if SQLite database exists
if [ ! -f "$SQLITE_DB" ]; then
    echo "Error: SQLite database file '$SQLITE_DB' not found!"
    exit 1
fi

# Export PostgreSQL password to avoid prompts
export PGPASSWORD="$PG_PASSWORD"

# Create temporary SQL files for data export
TEMP_DIR=$(mktemp -d)
QR_SESSIONS_SQL="$TEMP_DIR/qr_sessions.sql"
ORDERS_SQL="$TEMP_DIR/orders.sql"

echo "Exporting data from SQLite..."

# Export QR Sessions data
sqlite3 "$SQLITE_DB" <<EOF > "$QR_SESSIONS_SQL"
.mode insert qr_sessions
.output '$QR_SESSIONS_SQL'
SELECT * FROM qr_sessions;
.quit
EOF

# Export Orders data
sqlite3 "$SQLITE_DB" <<EOF > "$ORDERS_SQL"
.mode insert orders
.output '$ORDERS_SQL'
SELECT * FROM orders;
.quit
EOF

echo "Importing data to PostgreSQL..."

# Import QR Sessions
if [ -s "$QR_SESSIONS_SQL" ]; then
    echo "Importing QR Sessions..."
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -f "$QR_SESSIONS_SQL"
else
    echo "No QR Sessions data to import"
fi

# Import Orders
if [ -s "$ORDERS_SQL" ]; then
    echo "Importing Orders..."
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -f "$ORDERS_SQL"
else
    echo "No Orders data to import"
fi

# Clean up temporary files
rm -rf "$TEMP_DIR"

echo "Migration completed successfully!"

# Verify data
echo "Verifying migration..."
echo "QR Sessions count:"
psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "SELECT COUNT(*) FROM qr_sessions;"

echo "Orders count:"
psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -c "SELECT COUNT(*) FROM orders;"

unset PGPASSWORD
echo "Migration verification completed!"
