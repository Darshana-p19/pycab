from fastapi import APIRouter, HTTPException, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
from typing import List, Optional
from datetime import datetime

from db import get_session
from models.rating import Rating
from models.ride import Ride, PaymentStatus
from pydantic import BaseModel

router = APIRouter(prefix="/ratings", tags=["Ratings"])

class RatingCreate(BaseModel):
    ride_id: int
    rating: int
    review: Optional[str] = None

class RatingResponse(BaseModel):
    id: int
    ride_id: int
    rating: int
    review: Optional[str]
    created_at: datetime

@router.post("/")
async def create_rating(
    rating_data: RatingCreate,
    session: AsyncSession = Depends(get_session),
    user_id: str = "demo_user"  # In real app, get from auth token
):
    """Submit a rating for a completed and paid ride"""
    
    # Check if ride exists and is completed AND paid
    result = await session.execute(
        select(Ride).where(Ride.id == rating_data.ride_id)
    )
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    # Check both status and payment
    if ride.status != "completed":
        raise HTTPException(status_code=400, detail="Can only rate completed rides")
    
    if ride.payment_status != PaymentStatus.PAID:
        raise HTTPException(
            status_code=400, 
            detail="Can only rate rides that have been paid for"
        )
    
    # Check if user already rated this ride
    existing = await session.execute(
        select(Rating).where(
            Rating.ride_id == rating_data.ride_id,
            Rating.rider_id == user_id
        )
    )
    
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already rated this ride")
    
    # Create rating
    rating = Rating(
        ride_id=rating_data.ride_id,
        rider_id=user_id,
        rating=rating_data.rating,
        review=rating_data.review,
        can_rate=True  # Payment verified
    )
    
    session.add(rating)
    await session.commit()
    await session.refresh(rating)
    
    return {
        "success": True,
        "message": "Rating submitted successfully",
        "rating": rating
    }

@router.get("/ride/{ride_id}/check-eligible")
async def check_rating_eligibility(
    ride_id: int, 
    session: AsyncSession = Depends(get_session)
):
    """Check if a ride is eligible for rating (completed and paid)"""
    result = await session.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    eligible = (
        ride.status == "completed" and 
        ride.payment_status == PaymentStatus.PAID
    )
    
    return {
        "ride_id": ride_id,
        "eligible": eligible,
        "status": ride.status,
        "payment_status": ride.payment_status,
        "can_rate": eligible
    }
    
@router.get("/eligibility/{ride_id}")
async def check_rating_eligibility(
    ride_id: int, 
    session: AsyncSession = Depends(get_session)
):
    """Check if a ride is eligible for rating"""
    from sqlmodel import select
    from models.ride import Ride
    
    result = await session.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride:
        return {
            "eligible": False,
            "reason": "Ride not found"
        }
    
    # Check conditions for rating
    if ride.status != "completed":
        return {
            "eligible": False,
            "reason": "Ride is not completed"
        }
    
    if ride.payment_status != "paid":
        return {
            "eligible": False,
            "reason": "Payment not completed"
        }
    
    # Check if already rated
    rating_result = await session.execute(
        select(Rating).where(Rating.ride_id == ride_id)
    )
    existing_rating = rating_result.scalar_one_or_none()
    
    if existing_rating:
        return {
            "eligible": False,
            "reason": "Already rated",
            "existing_rating": {
                "rating": existing_rating.rating,
                "review": existing_rating.review
            }
        }
    
    return {
        "eligible": True,
        "ride_id": ride_id,
        "user_id": ride.user_id,
        "driver_id": ride.driver_id,
        "status": ride.status,
        "payment_status": ride.payment_status
    }