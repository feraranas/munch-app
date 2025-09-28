# Munch App Development Makefile

.PHONY: help dev dev-postgres dev-sqlite build clean migrate seed logs

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
	@echo "Local PostgreSQL database setup complete!"

# Run schema migration on local database
migrate-local:
	@echo "Running schema migration on local database..."
	psql -h localhost -U munch_user -d munch_app_dev -f backend/migrations/001_initial_schema.sql
	@echo "Schema migration complete!"
