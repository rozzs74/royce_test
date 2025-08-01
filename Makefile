# CV Validator Makefile

# Load environment variables from .env.config
include .env.config
export

# Default target
.DEFAULT_GOAL := help

# Help command
help: ## Show this help message
	@echo "CV Validator - Available Commands:"
	@echo "=================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Development commands
up: ## Start the application with Docker Compose
	@echo "🚀 Starting CV Validator..."
	@docker-compose up -d
	@echo "✅ Application started!"
	@echo "📱 Frontend: http://localhost:3000"
	@echo "📱 Backend:  http://localhost:3001"

down: ## Stop the application
	@echo "🛑 Stopping CV Validator..."
	@docker-compose down

restart: ## Restart the application
	@echo "🔄 Restarting CV Validator..."
	@docker-compose restart

logs: ## Show logs (follow mode)
	@docker-compose logs -f

logs-backend: ## Show backend logs
	@docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	@docker-compose logs -f frontend

# Build commands
build: ## Build Docker images
	@echo "🔨 Building Docker images..."
	@docker-compose build

rebuild: ## Rebuild and start fresh
	@echo "🔨 Rebuilding application..."
	@docker-compose down
	@docker-compose build --no-cache
	@docker-compose up -d

# Database commands
db-reset: ## Reset database (removes volumes)
	@echo "⚠️  Resetting database..."
	@docker-compose down -v
	@echo "✅ Database reset complete"

# Utility commands
ps: ## Show running containers
	@docker-compose ps

shell-backend: ## Open shell in backend container
	@docker exec -it cv-validator-backend sh

shell-frontend: ## Open shell in frontend container
	@docker exec -it cv-validator-frontend sh

clean: ## Clean up everything (containers, volumes, images)
	@echo "🧹 Cleaning up..."
	@docker-compose down -v --rmi all
	@echo "✅ Cleanup complete"

# Development shortcuts
dev: up logs ## Start and show logs

stop: down ## Alias for down

# Debug commands
debug-backend: ## Check backend health and endpoints
	@echo "🔍 Checking backend health..."
	@curl -s http://localhost:3001/health | jq '.' || echo "❌ Backend not responding"
	@echo ""
	@echo "📋 Testing upload endpoint..."
	@curl -s -X POST http://localhost:3001/api/upload || echo "❌ Upload endpoint not responding"

test-upload: ## Test file upload with a dummy file
	@echo "📤 Testing file upload..."
	@echo "Creating test PDF..."
	@echo "%PDF-1.4" > test.pdf
	@echo "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj" >> test.pdf
	@echo "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj" >> test.pdf
	@echo "3 0 obj<</Type/Page/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>>endobj" >> test.pdf
	@echo "4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Times-Roman>>endobj" >> test.pdf
	@echo "xref 0 5 trailer<</Size 5/Root 1 0 R>> startxref 0 %%EOF" >> test.pdf
	@curl -X POST -F "cv=@test.pdf" http://localhost:3001/api/upload
	@rm -f test.pdf

# Installation commands
install-backend: ## Install backend dependencies locally
	@cd backend && npm install --legacy-peer-deps

install-frontend: ## Install frontend dependencies locally
	@cd frontend && npm install --legacy-peer-deps

install: install-backend install-frontend ## Install all dependencies locally

# Check commands
check-env: ## Check if .env.config exists
	@if [ ! -f .env.config ]; then \
		echo "❌ .env.config file not found!"; \
		exit 1; \
	else \
		echo "✅ .env.config file found"; \
	fi

check-docker: ## Check if Docker is running
	@docker info > /dev/null 2>&1 || (echo "❌ Docker is not running!" && exit 1)
	@echo "✅ Docker is running"

check: check-env check-docker ## Run all checks

.PHONY: help up down restart logs logs-backend logs-frontend build rebuild db-reset ps shell-backend shell-frontend clean dev stop debug-backend test-upload install-backend install-frontend install check-env check-docker check 