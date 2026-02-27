from sqlmodel import SQLModel, Field

class Booking(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    pickup: str
    drop: str
    user_id: str

class BookingCreate(SQLModel):
    pickup: str
    drop: str
    user_id: str
