#!/bin/bash
# deploy.sh
# Deployment script for PyCab

set -e  # Exit on error

echo "🚀 PyCab Deployment Script"
echo "=========================="

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "⚠️  No .env file found. Using defaults."
fi

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Function to check if port is available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $1 is already in use"
        return 1
    fi
    return 0
}

# Check required ports
echo "🔍 Checking ports..."
check_port 5432 || exit 1
check_port 6379 || exit 1
check_port 8000 || exit 1

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Some services failed to start"
    docker-compose logs
    exit 1
fi

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec backend alembic upgrade head

# Run tests
echo "🧪 Running tests..."
docker-compose exec backend python -m pytest tests/ -v

# Show service information
echo "📊 Deployment Summary"
echo "===================="
echo "✅ Services deployed successfully!"
echo ""
echo "📦 Service URLs:"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo "   - Health Check: http://localhost:8000/health"
echo ""
echo "🔧 Database:"
echo "   - Host: localhost:5432"
echo "   - Database: pycab"
echo "   - User: pycab_user"
echo ""
echo "🛠️  Management Commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   View service status: docker-compose ps"
echo ""
echo "🎉 Deployment completed successfully!"