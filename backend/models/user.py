# app/models/user.py

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    first_name: str = Field(index=True)
    last_name: str = Field(index=True)

    email: str = Field(unique=True, index=True)

    hashed_password: str

    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    role: str = Field(default="customer")  # customer, driver, admin

# app/models/user.py
# from sqlmodel import SQLModel, Field
# from typing import Optional
# from datetime import datetime

# class UserProfile(SQLModel, table=True):
#     """Store additional user info, not for authentication"""
#     id: Optional[int] = Field(default=None, primary_key=True)
#     supabase_uid: str = Field(unique=True, index=True)  # Supabase user ID
#     email: str = Field(unique=True, index=True)
#     first_name: str
#     last_name: str
#     phone: Optional[str] = None
#     created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
#     role: str = Field(default="customer")  # customer, driver, admin
    
#     # Remove hashed_password - Supabase handles authentication