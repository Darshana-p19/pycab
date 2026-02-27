# models/promo.py
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class PromoCode(SQLModel, table=True):
    """Model for promotional codes"""
    id: Optional[int] = Field(default=None, primary_key=True)
    
    code: str = Field(index=True, unique=True)
    discount_type: str = Field(default="percentage")  # "percentage" or "fixed"
    discount_value: float  # 10 for 10% or ₹100 for fixed
    
    max_uses: Optional[int] = None
    used_count: int = Field(default=0)
    
    valid_from: datetime
    valid_until: datetime
    
    is_active: bool = Field(default=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)