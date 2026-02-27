from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class Driver(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str  # Supabase user uuid
    name: str
    is_online: bool = False
    lat: float = 0
    lng: float = 0
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Ride(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)   # Supabase UUID
    pickup_address: str
    drop_address: str
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float
    estimated_distance_km: Optional[float] = None
    estimated_price: Optional[float] = None
    status: str = "requested"