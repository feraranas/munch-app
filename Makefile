# Munch App Development Makefile

.PHONY: help dev dev-postgres dev-sqlite build clean migrate seed logs smoke-payments

# Default target
help:
	@echo "Munch App Development Commands:"
	@echo ""
	@echo "  dev-postgres    - Start development environment with PostgreSQL"
	@echo "  dev-sqlite      - Start development environment with SQLite"
	@echo "  build           - Build all Docker images"
	@echo "  migrate         - Run database migration from SQLite to PostgreSQL"
	@echo "  seed            - Seed database with sample data"
	@echo "  logs            - Show logs from all services"
	@echo "  clean           - Stop and remove all containers and volumes"
	@echo "  smoke-payments  - Opt-in Stagehand diner smoke (not CI). Needs live app, Stripe, OpenAI, stripe CLI."
	@echo "  fix-permissions - Fix PostgreSQL permissions for munch_user"
	@echo "  help            - Show this help message"

# Start development with PostgreSQL
dev-postgres:
	@echo "Starting development environment with PostgreSQL..."
	docker-compose up --build

# Start development with SQLite (original setup)
dev-sqlite:
	@echo "Starting development environment with SQLite..."
	DATABASE_TYPE=sqlite docker-compose up --build

# Build all images
build:
	@echo "Building all Docker images..."
	docker-compose build

# Run migration from SQLite to PostgreSQL
migrate:
	@echo "Running database migration..."
	cd backend && ./scripts/migrate_sqlite_to_postgres.sh

# Seed database with sample data
seed:
	@echo "Seeding database with sample data..."
	docker-compose exec backend ./scripts/seed-database.sh

# Show logs
logs:
	docker-compose logs -f

# Clean up everything
clean:
	@echo "Cleaning up containers and volumes..."
	docker-compose down -v
	docker system prune -f

# Install PostgreSQL locally (macOS)
install-postgres:
	@echo "Installing PostgreSQL on macOS..."
	@echo "This will install PostgreSQL using Homebrew"
	brew install postgresql@15
	@echo "Adding PostgreSQL to PATH..."
	@echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$$PATH"' >> ~/.zshrc
	@echo "Please run 'source ~/.zshrc' to update your PATH"

# Setup local PostgreSQL database
setup-local-db:
	@echo "Setting up local PostgreSQL database..."
	brew services start postgresql@15
	createdb munch_app_dev
	psql munch_app_dev -c "CREATE USER munch_user WITH PASSWORD 'munch_password';"
	psql munch_app_dev -c "GRANT ALL PRIVILEGES ON DATABASE munch_app_dev TO munch_user;"
	psql munch_app_dev -c "GRANT ALL ON SCHEMA public TO munch_user;"
	psql munch_app_dev -c "GRANT CREATE ON SCHEMA public TO munch_user;"
	psql munch_app_dev -c "GRANT USAGE ON SCHEMA public TO munch_user;"
	psql munch_app_dev -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO munch_user;"
	psql munch_app_dev -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO munch_user;"
	@echo "Local PostgreSQL database setup complete!"

# Fix PostgreSQL permissions
fix-permissions:
	@echo "Fixing PostgreSQL permissions..."
	cd backend && ./scripts/fix-postgres-permissions.sh

# Opt-in payment UI smoke. Fail only on API oracles (paid_item_ids, $10 hint via DOM/API).
# Requires: frontend :3000, backend :8080, backend/.env (STRIPE_* + OPENAI_API_KEY), `stripe login`.
# Not a PR gate — iframe/CLI/Chrome flakes are not product regressions.
smoke-payments:
	@test -f backend/.env || (echo "backend/.env missing"; exit 1)
	@cd scripts/stagehand && npm install && npm run smoke

# Run schema migration on local database
migrate-local:
	@echo "Running schema migration on local database..."
	psql -h localhost -U munch_user -d munch_app_dev -f backend/migrations/001_initial_schema.sql
	@echo "Schema migration complete!"
