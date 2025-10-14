#!/bin/bash
# Script to create default admin user in the database
# This generates a proper bcrypt hash for the password

set -e

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
ADMIN_PASSWORD="${DEFAULT_ADMIN_PASSWORD:-admin123}"
DATABASE_URL="${DATABASE_URL:-postgres://munch_user:munch_password@localhost:5432/munch_app_dev?sslmode=disable}"

# Generate bcrypt hash using Go
HASH=$(go run <<'EOF'
package main

import (
    "fmt"
    "os"
    "golang.org/x/crypto/bcrypt"
)

func main() {
    password := os.Args[1]
    hash, err := bcrypt.GenerateFromPassword([]byte(password), 10)
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error generating hash: %v\n", err)
        os.Exit(1)
    }
    fmt.Print(string(hash))
}
EOF
 "$ADMIN_PASSWORD")

echo "Generated password hash for admin user"
echo "Password: $ADMIN_PASSWORD"
echo ""

# Insert into database
echo "Creating admin user in database..."

# Extract database details from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

export PGPASSWORD="$DB_PASS"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<SQL
-- Insert or update admin user
INSERT INTO users (id, username, password_hash, role, created_at, updated_at)
VALUES (
    'admin-default-001',
    'admin',
    '$HASH',
    'staff',
    EXTRACT(EPOCH FROM NOW()),
    EXTRACT(EPOCH FROM NOW())
)
ON CONFLICT (username) 
DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    updated_at = EXTRACT(EPOCH FROM NOW());
SQL

echo "✅ Admin user created/updated successfully!"
echo "   Username: admin"
echo "   Password: $ADMIN_PASSWORD"
echo ""
echo "⚠️  IMPORTANT: Change this password in production!"

