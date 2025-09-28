#!/bin/bash

# Docker migration script
# This script runs inside the Docker container to migrate data from SQLite to PostgreSQL

set -e

echo "Starting Docker migration process..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres -p 5432 -U munch_user -d munch_app_dev; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is ready!"

# Check if SQLite database exists and has data
if [ -f "/app/munch_app.db" ]; then
    echo "Found existing SQLite database, checking for data..."
    
    # Check if there's data to migrate
    QR_COUNT=$(sqlite3 /app/munch_app.db "SELECT COUNT(*) FROM qr_sessions;" 2>/dev/null || echo "0")
    ORDER_COUNT=$(sqlite3 /app/munch_app.db "SELECT COUNT(*) FROM orders;" 2>/dev/null || echo "0")
    
    if [ "$QR_COUNT" -gt 0 ] || [ "$ORDER_COUNT" -gt 0 ]; then
        echo "Found data to migrate: $QR_COUNT QR sessions, $ORDER_COUNT orders"
        
        # Export data from SQLite
        echo "Exporting QR Sessions..."
        sqlite3 /app/munch_app.db <<EOF > /tmp/qr_sessions.sql
.mode insert qr_sessions
SELECT * FROM qr_sessions;
EOF

        echo "Exporting Orders..."
        sqlite3 /app/munch_app.db <<EOF > /tmp/orders.sql
.mode insert orders
SELECT * FROM orders;
EOF

        # Import data to PostgreSQL
        export PGPASSWORD="munch_password"
        
        if [ -s /tmp/qr_sessions.sql ]; then
            echo "Importing QR Sessions to PostgreSQL..."
            psql -h postgres -U munch_user -d munch_app_dev -f /tmp/qr_sessions.sql
        fi
        
        if [ -s /tmp/orders.sql ]; then
            echo "Importing Orders to PostgreSQL..."
            psql -h postgres -U munch_user -d munch_app_dev -f /tmp/orders.sql
        fi
        
        # Clean up
        rm -f /tmp/qr_sessions.sql /tmp/orders.sql
        unset PGPASSWORD
        
        echo "Migration completed successfully!"
    else
        echo "No data found in SQLite database to migrate."
    fi
else
    echo "No SQLite database found, starting fresh with PostgreSQL."
fi

echo "Docker migration process completed!"
