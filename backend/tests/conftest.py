# tests/conftest.py
import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
import os
from unittest.mock import AsyncMock, MagicMock, patch

# Set test database URL
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"

# Mock external services before importing app
import sys
sys.modules['stripe'] = MagicMock()
sys.modules['celery'] = MagicMock()
sys.modules['fastapi_mail'] = MagicMock()

# Mock specific classes
stripe_mock = MagicMock()
stripe_mock.PaymentIntent.create = AsyncMock(return_value=MagicMock(
    id="pi_test_123",
    client_secret="secret_test_123",
    status="requires_payment_method"
))
sys.modules['stripe'] = stripe_mock

# Now import the app
from main import app
from db import get_session

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def test_db():
    """Create test database tables"""
    engine = create_async_engine(
        "sqlite+aiosqlite:///./test.db",
        echo=False,
        future=True
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    
    await engine.dispose()
    # Clean up test database file
    if os.path.exists("test.db"):
        os.remove("test.db")

@pytest.fixture(scope="function")
async def async_client(test_db):
    """Create test client with overridden dependencies"""
    
    # Create session factory for test database
    async_session_factory = sessionmaker(
        test_db, class_=AsyncSession, expire_on_commit=False
    )
    
    # Override get_session dependency
    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        async with async_session_factory() as session:
            yield session
    
    app.dependency_overrides[get_session] = override_get_session
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()

@pytest.fixture
def mock_user():
    """Create a mock user for testing"""
    return {
        "id": "test_user_123",
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User"
    }

@pytest.fixture
def mock_ride_data():
    """Create mock ride data for testing"""
    return {
        "pickup_lat": 19.0760,
        "pickup_lng": 72.8777,
        "drop_lat": 19.2183,
        "drop_lng": 72.9781,
        "pickup_address": "Mumbai, Maharashtra",
        "drop_address": "Pune, Maharashtra"
    }

# Mock email sending
@pytest.fixture(autouse=True)
def mock_email():
    with patch('tasks.email_tasks.send_receipt_email') as mock:
        mock.delay = MagicMock()
        yield mock