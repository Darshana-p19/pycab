# routes/promos.py
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from datetime import datetime
from typing import Optional

from db import get_session
from models.promo import PromoCode
from pydantic import BaseModel

router = APIRouter(prefix="/promos", tags=["Promo Codes"])

class PromoApply(BaseModel):
    code: str
    ride_amount: float

class PromoCreate(BaseModel):
    code: str
    discount_type: str = "percentage"
    discount_value: float
    max_uses: Optional[int] = None
    valid_from: datetime
    valid_until: datetime

@router.post("/apply")
async def apply_promo_code(
    promo_data: PromoApply,
    session: AsyncSession = Depends(get_session)
):
    """Apply a promo code to a ride"""
    result = await session.execute(
        select(PromoCode).where(PromoCode.code == promo_data.code)
    )
    promo = result.scalar_one_or_none()
    
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    # Check validity
    now = datetime.utcnow()
    if not promo.is_active:
        raise HTTPException(status_code=400, detail="Promo code is inactive")
    
    if now < promo.valid_from or now > promo.valid_until:
        raise HTTPException(status_code=400, detail="Promo code expired")
    
    if promo.max_uses and promo.used_count >= promo.max_uses:
        raise HTTPException(status_code=400, detail="Promo code usage limit reached")
    
    # Calculate discount
    if promo.discount_type == "percentage":
        discount = (promo.discount_value / 100) * promo_data.ride_amount
    else:  # fixed
        discount = min(promo.discount_value, promo_data.ride_amount)
    
    final_amount = max(0, promo_data.ride_amount - discount)
    
    # Increment usage
    promo.used_count += 1
    session.add(promo)
    await session.commit()
    
    return {
        "success": True,
        "code": promo.code,
        "discount_type": promo.discount_type,
        "discount_applied": discount,
        "original_amount": promo_data.ride_amount,
        "final_amount": final_amount
    }

@router.post("/create", dependencies=[Depends(is_admin)])  # Add admin check
async def create_promo_code(
    promo_data: PromoCreate,
    session: AsyncSession = Depends(get_session)
):
    """Create a new promo code (admin only)"""
    # Check if code already exists
    existing = await session.execute(
        select(PromoCode).where(PromoCode.code == promo_data.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Promo code already exists")
    
    promo = PromoCode(**promo_data.dict())
    session.add(promo)
    await session.commit()
    await session.refresh(promo)
    
    return {"message": "Promo code created successfully", "promo": promo}