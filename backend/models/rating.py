# # models/rating.py
# from sqlmodel import SQLModel, Field, Relationship
# from typing import Optional
# from datetime import datetime

# class Rating(SQLModel, table=True):
#     """Model for ride ratings and reviews"""
#     id: Optional[int] = Field(default=None, primary_key=True)
    
#     # Relationships
#     ride_id: int = Field(foreign_key="ride.id", index=True)
#     rider_id: str  # User who is rating
#     driver_id: Optional[str] = None  # Driver being rated (if applicable)
    
#     # Rating details
#     rating: int = Field(ge=1, le=5)  # 1-5 stars
#     review: Optional[str] = None  # Optional text review
    
#     # Timestamps
#     created_at: datetime = Field(default_factory=datetime.utcnow)
    
#     class Config:
#         table_name = "ratings"

# models/rating.py - Add payment status validation
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime

class Rating(SQLModel, table=True):
    """Model for ride ratings and reviews"""
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relationships
    ride_id: int = Field(foreign_key="ride.id", index=True)
    rider_id: str  # User who is rating
    driver_id: Optional[str] = None  # Driver being rated
    
    # Rating details
    rating: int = Field(ge=1, le=5)  # 1-5 stars
    review: Optional[str] = None
    
    # Payment verification
    can_rate: bool = Field(default=False)  # Only true if payment completed
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        table_name = "ratings"