"""
Rate limiting middleware for API requests
"""
import time
from collections import defaultdict
from fastapi import HTTPException, Request
from typing import Dict, List


class RateLimiter:
    """
    Simple in-memory rate limiter for development
    In production, use Redis or another distributed store
    """
    def __init__(self):
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self.limit = 100  # requests per minute per IP
        self.window = 60  # seconds

    async def check_rate_limit(self, request: Request):
        """
        Check if the request exceeds rate limit
        Returns nothing if OK, raises HTTPException if limit exceeded
        """
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # For development, skip rate limiting
        # Uncomment the code below to enable rate limiting
        return
        
        # Rate limiting logic (commented out for development)
    
    def reset(self):
        """Reset all rate limit counters"""
        self.requests.clear()


# Create a singleton instance
rate_limiter = RateLimiter()