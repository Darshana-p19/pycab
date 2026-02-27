# supabase_client.py
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print(f"✅ Supabase client initialized with URL: {SUPABASE_URL[:30]}...")

# Test connection
try:
    # Simple test query
    response = supabase.table("rides").select("id", count="exact").limit(1).execute()
    print(f"✅ Supabase connection test successful")
except Exception as e:
    print(f"⚠️  Supabase connection test failed: {e}")
    print(f"⚠️  Make sure your Supabase URL and key are correct")
    print(f"⚠️  URL: {SUPABASE_URL}")
    print(f"⚠️  Key (first 10 chars): {SUPABASE_KEY[:10]}...")