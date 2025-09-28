# PostgreSQL Setup and Migration Guide

This guide covers setting up PostgreSQL for local development and migrating from SQLite to PostgreSQL.

## Table of Contents

1. [Local PostgreSQL Setup](#local-postgresql-setup)
2. [Database Schema Migration](#database-schema-migration)
3. [Backend Configuration](#backend-configuration)
4. [Docker Setup](#docker-setup)
5. [Migration Scripts](#migration-scripts)
6. [Development Workflow](#development-workflow)
7. [Troubleshooting](#troubleshooting)

## Local PostgreSQL Setup

### Install PostgreSQL on macOS

```bash
# Using Homebrew (recommended)
brew install postgresql@15

# Add to PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Or use the Makefile
make install-postgres
```

### Start PostgreSQL Service

```bash
# Start PostgreSQL service
brew services start postgresql@15

# Or start manually for current session
pg_ctl -D /opt/homebrew/var/postgresql@15 start
```

### Create Database and User

```bash
# Method 1: Manual setup
psql postgres
CREATE DATABASE munch_app_dev;
CREATE USER munch_user WITH PASSWORD 'munch_password';
GRANT ALL PRIVILEGES ON DATABASE munch_app_dev TO munch_user;

# Connect to the database and grant schema permissions
\c munch_app_dev
GRANT CREATE, USAGE ON SCHEMA public TO munch_user;
GRANT ALL ON SCHEMA public TO munch_user;
\q

# Method 2: Using Makefile
make setup-local-db
```

###Troubleshooting tips
```bash
# Check a user exists
psql -d postgres -c "\du"

# Check what permisions are set
psql -d postgres -c "\l"

# Check schema-level permissions
psql -d munch_app_dev -c "\dn+"

# Grant permissions
psql -d munch_app_dev -c "GRANT CREATE ON SCHEMA public TO munch_user; GRANT USAGE ON SCHEMA public TO munch_user;"

# Stop background process
pkill -f "go run"
```

### Test Connection

```bash
psql -h localhost -U munch_user -d munch_app_dev
```

## Database Schema Migration

### Apply Schema to PostgreSQL

```bash
# Method 1: Manual
psql -h localhost -U munch_user -d munch_app_dev -f backend/migrations/001_initial_schema.sql

# Method 2: Using Makefile
make migrate-local
```

### Migrate Data from SQLite

```bash
# Run the migration script
cd backend
./scripts/migrate_sqlite_to_postgres.sh

# Or use Makefile
make migrate
```

## Backend Configuration

The backend now supports both SQLite and PostgreSQL through environment variables:

### Environment Variables

```bash
# For PostgreSQL
export DATABASE_TYPE=postgres
export DATABASE_URL="postgres://munch_user:munch_password@localhost:5432/munch_app_dev?sslmode=disable"

# For SQLite (default)
export DATABASE_TYPE=sqlite
export DATABASE_URL="munch_app.db"
```

### Configuration Structure

The `config/config.go` file now includes:

```go
type Config struct {
    APIPort      int
    FrontendURL  string
    APIURL       string
    DatabaseURL  string
    DatabaseType string // "sqlite" or "postgres"
}
```

### Database Connection

The `initDB()` function automatically selects the appropriate driver:

```go
switch app.Config.DatabaseType {
case "postgres":
    dialector = postgres.Open(app.Config.DatabaseURL)
case "sqlite":
    dialector = sqlite.Open(app.Config.DatabaseURL)
default:
    return fmt.Errorf("unsupported database type: %s", app.Config.DatabaseType)
}
```

## Docker Setup

### PostgreSQL Service

The `docker-compose.yml` now includes a PostgreSQL service:

```yaml
postgres:
  container_name: postgres
  image: postgres:15-alpine
  restart: always
  ports:
    - "5432:5432"
  environment:
    - POSTGRES_DB=munch_app_dev
    - POSTGRES_USER=munch_user
    - POSTGRES_PASSWORD=munch_password
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./backend/migrations:/docker-entrypoint-initdb.d
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U munch_user -d munch_app_dev"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Backend Service Updates

The backend service now includes PostgreSQL environment variables:

```yaml
environment:
  - DATABASE_TYPE=postgres
  - DATABASE_URL=postgres://munch_user:munch_password@postgres:5432/munch_app_dev?sslmode=disable
depends_on:
  - postgres
  - datadog-agent
```

### Persistent Volume

PostgreSQL data is persisted using a Docker volume:

```yaml
volumes:
  postgres_data:
```

## Migration Scripts

### Docker Migration Script

`backend/scripts/docker-migrate.sh` handles migration within Docker containers:

- Waits for PostgreSQL to be ready
- Checks for existing SQLite data
- Exports data from SQLite
- Imports data to PostgreSQL
- Cleans up temporary files

### Local Migration Script

`backend/scripts/migrate_sqlite_to_postgres.sh` handles local migration:

- Exports data from local SQLite database
- Imports data to local PostgreSQL database
- Verifies migration success

### Database Seeding

`backend/scripts/seed-database.sh` populates the database with sample data:

- Creates sample QR sessions
- Creates sample orders
- Works with both SQLite and PostgreSQL

## Development Workflow

### Using Makefile Commands

```bash
# Start with PostgreSQL
make dev-postgres

# Start with SQLite (original)
make dev-sqlite

# Build images
make build

# Run migration
make migrate

# Seed database
make seed

# View logs
make logs

# Clean up
make clean
```

### Manual Docker Commands

```bash
# Start with PostgreSQL
docker-compose up --build

# Start specific services
docker-compose up postgres backend

# Run migration inside container
docker-compose exec backend ./scripts/docker-migrate.sh

# Seed database
docker-compose exec backend ./scripts/seed-database.sh

# Access PostgreSQL shell
docker-compose exec postgres psql -U munch_user -d munch_app_dev
```

### Local Development

```bash
# Set environment for PostgreSQL
export DATABASE_TYPE=postgres
export DATABASE_URL="postgres://munch_user:munch_password@localhost:5432/munch_app_dev?sslmode=disable"

# Run backend locally
cd backend
go run .

# Or set environment for SQLite
export DATABASE_TYPE=sqlite
export DATABASE_URL="munch_app.db"
```

## Running Migrations and Seeds in Docker

### Initial Setup

When you first start the Docker environment:

1. PostgreSQL container starts and creates the database
2. Schema is automatically applied from `backend/migrations/001_initial_schema.sql`
3. Backend connects to PostgreSQL and runs GORM auto-migration

### Manual Migration

```bash
# Run migration script inside backend container
docker-compose exec backend ./scripts/docker-migrate.sh

# Or run locally
make migrate
```

### Seeding Data

```bash
# Seed database with sample data
docker-compose exec backend ./scripts/seed-database.sh

# Or using Makefile
make seed
```

### Accessing Database

```bash
# Access PostgreSQL shell in Docker
docker-compose exec postgres psql -U munch_user -d munch_app_dev

# Access from host machine
psql -h localhost -U munch_user -d munch_app_dev
```

## Troubleshooting

### Common Issues

1. **Permission denied for schema public**
   ```bash
   # Error: permission denied for schema public
   # Fix: Grant schema permissions to munch_user
   psql -d munch_app_dev -c "GRANT CREATE, USAGE ON SCHEMA public TO munch_user;"
   
   # Or use the fix script
   make fix-permissions
   ```

2. **PostgreSQL not starting**
   ```bash
   # Check if port 5432 is in use
   lsof -i :5432
   
   # Stop existing PostgreSQL
   brew services stop postgresql@15
   ```

2. **Connection refused**
   ```bash
   # Check PostgreSQL status
   brew services list | grep postgresql
   
   # Restart PostgreSQL
   brew services restart postgresql@15
   ```

3. **Permission denied**
   ```bash
   # Fix PostgreSQL permissions
   sudo chown -R $(whoami) /opt/homebrew/var/postgresql@15
   ```

4. **Docker volume issues**
   ```bash
   # Remove and recreate volumes
   docker-compose down -v
   docker-compose up --build
   ```

### Database Verification

```bash
# Check tables exist
psql -h localhost -U munch_user -d munch_app_dev -c "\dt"

# Check data
psql -h localhost -U munch_user -d munch_app_dev -c "SELECT COUNT(*) FROM qr_sessions;"
psql -h localhost -U munch_user -d munch_app_dev -c "SELECT COUNT(*) FROM orders;"
```

### Backend Logs

```bash
# Check backend logs
docker-compose logs backend

# Follow logs
docker-compose logs -f backend
```

## Environment Variables Reference

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DATABASE_TYPE` | Database type | `sqlite` | `postgres` |
| `DATABASE_URL` | Database connection string | `munch_app.db` | `postgres://user:pass@host:5432/db?sslmode=disable` |
| `API_PORT` | Backend API port | `8080` | `8080` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | `http://localhost:3000` |
| `API_URL` | Backend API URL | `http://localhost:8080` | `http://localhost:8080` |

## File Structure

```
munch-app/
├── backend/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── scripts/
│   │   ├── migrate_sqlite_to_postgres.sh
│   │   ├── docker-migrate.sh
│   │   └── seed-database.sh
│   ├── config/
│   │   └── config.go
│   ├── main.go
│   ├── go.mod
│   └── go.sum
├── docker-compose.yml
├── Makefile
└── README.PostgreSQL.md
```

This setup provides a complete PostgreSQL integration while maintaining backward compatibility with SQLite for development flexibility.
