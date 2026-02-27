# security/middleware.py
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import time
import json

async def request_validation_middleware(request: Request, call_next):
    """Middleware for request validation and logging"""
    
    # Start timer
    start_time = time.time()
    
    # Check content type for POST/PUT requests
    if request.method in ["POST", "PUT", "PATCH"]:
        content_type = request.headers.get("content-type", "")
        if not content_type.startswith("application/json"):
            return JSONResponse(
                status_code=415,
                content={"detail": "Unsupported Media Type. Use application/json"}
            )
    
    try:
        response = await call_next(request)
        
        # Calculate request time
        process_time = time.time() - start_time
        
        # Log request (in production, use proper logging)
        print(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.2f}s")
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unhandled error in request: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )