from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class RideStatus(str, Enum):
    REQUESTED = "requested"
    DRIVER_ASSIGNED = "driver_assigned"
    DRIVER_ARRIVED = "driver_arrived"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    REQUIRES_ACTION = "requires_action"

class Ride(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str
    pickup_address: str
    drop_address: str
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float
    
    estimated_distance_km: Optional[float] = None
    actual_distance_km:Optional[float]=None
    estimated_price: Optional[float] = None
    final_price:Optional[float]=None
    
    # status: str = Field(default="requested")
    # payment_intent_id: Optional[str] = None
    # payment_status: str = "pending"
    # driver_id: Optional[int] = Field(default=None, foreign_key="user.id")
    assigned_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    status: str = Field(default=RideStatus.REQUESTED.value)
    driver_id: Optional[int] = Field(default=None)

     # New payment fields
    payment_intent_id: Optional[str] = None
    # payment_status: str = "pending"  # pending, paid, failed, refunded
    payment_status: str = Field(default=PaymentStatus.PENDING)
    payment_amount: Optional[float] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None