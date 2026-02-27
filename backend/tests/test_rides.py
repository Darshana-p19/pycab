# tests/test_rides.py
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def test_estimate_ride():
    """Test ride estimation"""
    response = client.post(
        "/rides/estimate",
        json={
            "pickup_lat": 19.0760,
            "pickup_lng": 72.8777,
            "drop_lat": 19.2183,
            "drop_lng": 72.9781
        }
    )
    
    assert response.status_code == 200
    assert "distance_km" in response.json()
    assert "estimated_price" in response.json()

def test_request_ride():
    """Test ride booking"""
    response = client.post(
        "/rides/request",
        json={
            "user_id": "test_user_123",
            "pickup_address": "Mumbai",
            "drop_address": "Pune",
            "pickup_lat": 19.0760,
            "pickup_lng": 72.8777,
            "drop_lat": 19.2183,
            "drop_lng": 72.9781
        }
    )
    
    assert response.status_code == 200
    assert "ride_id" in response.json()

def test_ride_history():
    """Test fetching ride history"""
    response = client.get("/rides/history/test_user_123")
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)