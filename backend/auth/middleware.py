from fastapi import Request, HTTPException
from jose import jwt
import os

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

async def verify_auth(request: Request):
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = auth_header.replace("Bearer ", "")

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        request.state.user = decoded
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")
