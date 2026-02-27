# app/models/location.py
from sqlmodel import SQLModel, Field

class DriverLocation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    driver_id: int = Field(foreign_key="user.id")
    lat: float
    lng: float
    is_online:bool=Field(default=True)
    updated_at: str | None = None
