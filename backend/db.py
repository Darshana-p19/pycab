from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
import socket

load_dotenv()
socket.setdefaulttimeout(30)

# Get the original DATABASE_URL from environment
original_url = os.environ["DATABASE_URL"]

# Convert the URL to use asyncpg driver for async operations
if original_url.startswith("postgresql://"):
    DATABASE_URL = original_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif original_url.startswith("postgresql+psycopg2://"):
    DATABASE_URL = original_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
elif original_url.startswith("postgresql+asyncpg://"):
    DATABASE_URL = original_url
else:
    # For any other driver, replace the driver with asyncpg
    parts = original_url.split("://", 1)
    if len(parts) == 2 and parts[0].startswith("postgresql+"):
        parts[0] = "postgresql+asyncpg"
        DATABASE_URL = "://".join(parts)
    else:
        DATABASE_URL = original_url

# Print the URL for debugging (remove in production)
print(f"Using DATABASE_URL: {DATABASE_URL}")

# ✅ Automatically handle SSL for Supabase vs local Postgres
ssl_mode = "require" if "supabase" in DATABASE_URL else None

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
    connect_args={"ssl": ssl_mode}  # use SSL only for cloud DB
)

SessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_session():
    async with SessionLocal() as session:
        yield session

async def init_db():
    from models.base import SQLModelBase
    from models.ride import Ride
    from models.user import User
    from models.location import DriverLocation
    from models.booking import Booking
    
    async with engine.begin() as conn:
        await conn.run_sync(SQLModelBase.metadata.create_all)