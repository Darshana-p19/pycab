from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from db import get_session
from models.user import User
from models.location import DriverLocation

router = APIRouter(prefix="/driver", tags=["Driver"])

@router.post("/online/{user_id}")
async def set_online(user_id: int, lat: float, lng: float, session: AsyncSession = Depends(get_session)):
    # Check if the user is a driver
    result = await session.execute(select(User).where(User.id == user_id, User.role == "driver"))
    user = result.scalar_one_or_none()
    if not user:
        return {"error": "User not found or not a driver"}
    
    # Check if there's an existing DriverLocation for this driver
    result = await session.execute(select(DriverLocation).where(DriverLocation.driver_id == user_id))
    driver_location = result.scalar_one_or_none()
    
    if driver_location:
        driver_location.lat = lat
        driver_location.lng = lng
        driver_location.is_online = True
    else:
        driver_location = DriverLocation(driver_id=user_id, lat=lat, lng=lng, is_online=True)
    
    session.add(driver_location)
    await session.commit()
    return {"status": "online", "driver_id": user_id, "location": {"lat": lat, "lng": lng}}

@router.post("/offline/{user_id}")
async def set_offline(user_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(DriverLocation).where(DriverLocation.driver_id == user_id))
    driver_location = result.scalar_one_or_none()
    if driver_location:
        driver_location.is_online = False
        session.add(driver_location)
        await session.commit()
    return {"status": "offline"}