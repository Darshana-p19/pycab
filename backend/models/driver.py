from sqlmodel import SQLModel, Field
from typing import Optional

class Driver(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    is_online: bool = False