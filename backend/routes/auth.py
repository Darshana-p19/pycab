from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
import os

# Load env variables
load_dotenv()

router = APIRouter(prefix="/auth", tags=["Auth"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# We will create the client only when needed
_supabase = None

def get_supabase():
    global _supabase
    if _supabase is None:
        # Check if we have the required environment variables
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            raise HTTPException(status_code=500, detail="Supabase credentials not configured")
        from supabase import create_client
        _supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _supabase

# ----------------- Schemas -----------------

class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# ----------------- Routes -----------------

@router.post("/register")
def register(user: RegisterRequest):
    supabase = get_supabase()  # This will raise HTTPException if not configured

    try:
        # Create user in Supabase Auth
        res = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
        })

        if res.user is None:
            raise HTTPException(status_code=400, detail="Registration failed")

        # Save extra profile info
        supabase.table("profiles").insert({
            "id": res.user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
        }).execute()

        return {"message": "User registered successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
def login(user: LoginRequest):
    supabase = get_supabase()  # This will raise HTTPException if not configured

    try:
        res = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })

        if res.user is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return {
            "message": "Login successful",
            "access_token": res.session.access_token
        }

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")