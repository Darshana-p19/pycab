from fastapi import APIRouter
from models.booking import BookingCreate

router = APIRouter()

@router.post("/create")
async def create_booking(data: BookingCreate):
    # Normally you save to DB, but for testing we return the same data
    return data.dict()
