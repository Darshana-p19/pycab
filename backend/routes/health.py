# routes/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import redis
import os
from datetime import datetime
import psutil

from db import get_session

router = APIRouter(tags=["Health"])

# Initialize Redis client if available
try:
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        decode_responses=True
    )
    REDIS_AVAILABLE = True
except:
    REDIS_AVAILABLE = False

@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "pycab-backend"
    }

@router.get("/health/detailed")
async def detailed_health_check(session: AsyncSession = Depends(get_session)):
    """Detailed health check with dependencies"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Check database
    try:
        await session.execute(text("SELECT 1"))
        health_status["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": "N/A"
        }
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Check Redis
    if REDIS_AVAILABLE:
        try:
            start = datetime.now()
            redis_client.ping()
            response_time = (datetime.now() - start).total_seconds() * 1000
            
            health_status["checks"]["redis"] = {
                "status": "healthy",
                "response_time_ms": round(response_time, 2)
            }
        except Exception as e:
            health_status["checks"]["redis"] = {
                "status": "unhealthy",
                "error": str(e)
            }
            health_status["status"] = "degraded"
    else:
        health_status["checks"]["redis"] = {
            "status": "not_configured",
            "message": "Redis not configured"
        }
    
    # System metrics
    health_status["system"] = {
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage('/').percent
    }
    
    return health_status

@router.get("/metrics")
async def metrics_endpoint():
    """Basic metrics endpoint (for monitoring)"""
    return {
        "requests_processed": 0,  # You'd increment this in middleware
        "active_connections": 0,
        "error_rate": 0.0,
        "uptime_seconds": 0,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/readiness")
async def readiness_probe():
    """Kubernetes readiness probe"""
    return {"status": "ready"}

@router.get("/liveness")
async def liveness_probe():
    """Kubernetes liveness probe"""
    return {"status": "alive"}