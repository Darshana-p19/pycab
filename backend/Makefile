# Makefile
.PHONY: help install test run build deploy clean

help:
	@echo "PyCab - Ride Hailing Service"
	@echo ""
	@echo "Commands:"
	@echo "  install     Install dependencies"
	@echo "  test        Run tests"
	@echo "  run         Run development server"
	@echo "  run-celery  Run Celery worker"
	@echo "  build       Build Docker images"
	@echo "  deploy      Deploy with Docker Compose"
	@echo "  logs        View logs"
	@echo "  clean       Clean up Docker resources"
	@echo "  db-migrate  Run database migrations"
	@echo "  db-reset    Reset database (WARNING: deletes all data)"

install:
	pip install -r requirements.txt

test:
	python -m pytest tests/ -v --tb=short

run:
	uvicorn main:app --reload --host 0.0.0.0 --port 8000

run-celery:
	celery -A celery_app.celery worker --loglevel=info

build:
	docker-compose build

deploy:
	docker-compose up -d
	@sleep 5
	docker-compose exec backend alembic upgrade head

logs:
	docker-compose logs -f

clean:
	docker-compose down -v
	docker system prune -f

db-migrate:
	alembic revision --autogenerate -m "$(message)"
	alembic upgrade head

db-reset:
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? (y/n): " confirm && [ $${confirm:-n} = y ]
	alembic downgrade base
	alembic upgrade head

# Production deployment targets
production-build:
	docker build -t pycab-backend:latest .

production-push:
	docker tag pycab-backend:latest your-registry/pycab-backend:latest
	docker push your-registry/pycab-backend:latest

production-deploy:
	@echo "Deploying to production..."
	# Add your production deployment commands here
	# Example: kubectl apply -f k8s/