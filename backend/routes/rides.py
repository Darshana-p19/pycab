from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import List, Dict,Optional
import math
import httpx
import os
import logging
from datetime import datetime
import stripe
import traceback
from db import get_session
from models.ride import Ride

# router = APIRouter(prefix="/rides")
router=APIRouter()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
OSRM_BASE = os.getenv("OSRM_URL", "http://router.project-osrm.org")

# -------------------------
# Helpers
# -------------------------
def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*(math.sin(dlambda/2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

async def route_distance_km_osrm(pickup, drop):
    lon1, lat1 = pickup["lng"], pickup["lat"]
    lon2, lat2 = drop["lng"], drop["lat"]
    url = f"{OSRM_BASE}/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url)
    if r.status_code != 200:
        raise RuntimeError("OSRM request failed")
    data = r.json()
    distance_m = data["routes"][0]["distance"]
    return distance_m / 1000.0

# -------------------------
# Estimate Ride
# -------------------------
@router.post("/estimate")
async def estimate_ride(payload: Dict):
    try:
        pickup_lat = float(payload["pickup_lat"])
        pickup_lng = float(payload["pickup_lng"])
        drop_lat = float(payload["drop_lat"])
        drop_lng = float(payload["drop_lng"])
    except Exception:
        raise HTTPException(status_code=400, detail="pickup/drop lat/lng required")

    try:
        distance_km = await route_distance_km_osrm(
            {"lat": pickup_lat, "lng": pickup_lng},
            {"lat": drop_lat, "lng": drop_lng},
        )
    except Exception:
        distance_km = haversine_km(pickup_lat, pickup_lng, drop_lat, drop_lng)

    base = float(os.getenv("BASE_FARE", "50"))
    per_km = float(os.getenv("PER_KM", "10"))
    price = round(base + per_km * distance_km, 2)

    return {
        "distance_km": round(distance_km, 2),
        "estimated_price": price
    }

@router.post("/request")
async def request_ride(payload: dict, session: AsyncSession = Depends(get_session)):
    """Create a new ride"""
    try:
        # Extract and validate payload
        required_fields = ["user_id", "pickup_lat", "pickup_lng", "drop_lat", "drop_lng"]
        for field in required_fields:
            if field not in payload:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Missing required field: {field}"
                )
        
        user_id = str(payload["user_id"])
        pickup_lat = float(payload["pickup_lat"])
        pickup_lng = float(payload["pickup_lng"])
        drop_lat = float(payload["drop_lat"])
        drop_lng = float(payload["drop_lng"])
        pickup_address = str(payload.get("pickup_address", "Not specified"))
        drop_address = str(payload.get("drop_address", "Not specified"))
        
        # Calculate distance
        try:
            distance_km = await route_distance_km_osrm(
                {"lat": pickup_lat, "lng": pickup_lng},
                {"lat": drop_lat, "lng": drop_lng},
            )
        except Exception as e:
            logger.warning(f"OSRM failed, using haversine: {e}")
            distance_km = haversine_km(pickup_lat, pickup_lng, drop_lat, drop_lng)
        
        # Calculate price
        base = float(os.getenv("BASE_FARE", "50"))
        per_km = float(os.getenv("PER_KM", "10"))
        price = round(base + per_km * distance_km, 2)
        
        # Create ride object
        ride = Ride(
            user_id=user_id,
            pickup_address=pickup_address,
            drop_address=drop_address,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            drop_lat=drop_lat,
            drop_lng=drop_lng,
            estimated_distance_km=distance_km,
            estimated_price=price,
            payment_amount=price,
            status="requested"
        )
        
        # Save to database
        session.add(ride)
        await session.commit()
        await session.refresh(ride)
        
        logger.info(f"✅ Ride created: ID {ride.id} for user {user_id}")
        
        return {
            "ride_id": ride.id,
            "distance_km": round(distance_km, 2),
            "estimated_price": price,
            "pickup_address": pickup_address,
            "drop_address": drop_address,
            "status": "created",
            "payment_required": True
        }
        
    except ValueError as e:
        logger.error(f"Value error in request_ride: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid data: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in request_ride: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to create ride: {str(e)}"
        )

@router.get("/history/{user_id}", response_model=List[Ride])
async def ride_history(user_id: str, session: AsyncSession = Depends(get_session)):
    stmt = select(Ride).where(Ride.user_id == user_id).order_by(Ride.id.desc())
    result = await session.execute(stmt)
    rides = result.scalars().all()
    return rides

@router.get("/{ride_id}")
async def get_ride(ride_id: int, session: AsyncSession = Depends(get_session)):
    """Get specific ride details – handles None values safely"""
    try:
        result = await session.execute(select(Ride).where(Ride.id == ride_id))
        ride = result.scalar_one_or_none()
        
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")
        
        # Convert to dict with safe None handling
        return {
            "id": ride.id,
            "user_id": ride.user_id,
            "pickup_address": ride.pickup_address,
            "drop_address": ride.drop_address,
            "pickup_lat": ride.pickup_lat,
            "pickup_lng": ride.pickup_lng,
            "drop_lat": ride.drop_lat,
            "drop_lng": ride.drop_lng,
            "estimated_distance_km": ride.estimated_distance_km,
            "estimated_price": ride.estimated_price,
            "status": ride.status,
            "payment_status": ride.payment_status,
            "payment_amount": ride.payment_amount,
            "created_at": ride.created_at.isoformat() if ride.created_at else None,
            "updated_at": ride.updated_at.isoformat() if ride.updated_at else None,
            "completed_at": ride.completed_at.isoformat() if ride.completed_at else None,
            "driver_id": ride.driver_id,
            "payment_intent_id": ride.payment_intent_id
        }
        
    except Exception as e:
        logger.error(f"Error getting ride {ride_id}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get ride: {str(e)}"
        )

@router.post("/complete/{ride_id}")
async def complete_ride(
    ride_id: int,
    actual_distance_km: Optional[float] = None,
    session: AsyncSession = Depends(get_session)
):
    """Mark a ride as completed"""
    result = await session.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride.status == "completed":
        raise HTTPException(status_code=400, detail="Ride already completed")
    
    # Update ride details
    ride.status = "completed"
    ride.completed_at = datetime.utcnow()
    ride.updated_at = datetime.utcnow()
    
    if actual_distance_km:
        ride.actual_distance_km = actual_distance_km
        # Recalculate price if needed
        if actual_distance_km != ride.estimated_distance_km:
            base = float(os.getenv("BASE_FARE", "50"))
            per_km = float(os.getenv("PER_KM", "10"))
            ride.final_price = round(base + per_km * actual_distance_km, 2)
    
    # Update payment if it was pre-paid
    if ride.payment_status == "pending" and ride.payment_intent_id:
        try:
            # Capture the payment
            stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
            stripe.PaymentIntent.capture(ride.payment_intent_id)
            ride.payment_status = "paid"
        except Exception as e:
            # Payment might already be captured
            pass
    
    session.add(ride)
    await session.commit()
    
    return {
        "message": "Ride completed successfully",
        "ride_id": ride_id,
        "status": "completed",
        "payment_status": ride.payment_status
    }
    
@router.get("/debug/{ride_id}")
async def debug_ride(ride_id: int, session: AsyncSession = Depends(get_session)):
    """Debug endpoint for ride details"""
    try:
        logger.info(f"Debug: Querying ride {ride_id}")
        
        # Get the ride
        result = await session.execute(select(Ride).where(Ride.id == ride_id))
        ride = result.scalar_one_or_none()
        
        if not ride:
            return {"error": "Ride not found", "ride_id": ride_id}
        
        # Test 3: Convert to dict to avoid serialization issues
        ride_dict = {
            "id": ride.id,
            "user_id": ride.user_id,
            "pickup_address": ride.pickup_address,
            "drop_address": ride.drop_address,
            "estimated_price": ride.estimated_price,
            "status": ride.status
        }
        
        return {"success": True, "ride": ride_dict}
        
    except Exception as e:
        logger.error(f"Debug error: {e}")
        logger.error(traceback.format_exc())
        return {"error": str(e), "type": type(e).__name__, "ride_id": ride_id}