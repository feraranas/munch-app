#!/bin/bash

# Fix PostgreSQL permissions for munch_user
# Run this script if you encounter permission denied errors

set -e

echo "Fixing PostgreSQL permissions for munch_user..."

# Check if user exists
USER_EXISTS=$(psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='munch_user'")
if [ "$USER_EXISTS" != "1" ]; then
    echo "Creating munch_user..."
    psql -d postgres -c "CREATE USER munch_user WITH PASSWORD 'munch_password';"
fi

# Check if database exists
DB_EXISTS=$(psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='munch_app_dev'")
if [ "$DB_EXISTS" != "1" ]; then
    echo "Creating munch_app_dev database..."
    psql -d postgres -c "CREATE DATABASE munch_app_dev;"
fi

# Connect as superuser and grant permissions
psql -d munch_app_dev <<EOF
-- Grant schema permissions
GRANT CREATE ON SCHEMA public TO munch_user;
GRANT USAGE ON SCHEMA public TO munch_user;
GRANT ALL ON SCHEMA public TO munch_user;

-- Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO munch_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO munch_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO munch_user;

-- Make munch_user owner of the database (alternative approach)
-- ALTER DATABASE munch_app_dev OWNER TO munch_user;

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE munch_app_dev TO munch_user;

-- If tables already exist, grant permissions on them
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'GRANT ALL ON TABLE ' || quote_ident(r.tablename) || ' TO munch_user';
    END LOOP;
END\$\$;

-- Grant permissions on sequences
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE 'GRANT ALL ON SEQUENCE ' || quote_ident(r.sequencename) || ' TO munch_user';
    END LOOP;
END\$\$;

\echo 'Permissions fixed successfully!'
EOF

echo "PostgreSQL permissions have been fixed for munch_user."
echo "You can now run the migration script again."
