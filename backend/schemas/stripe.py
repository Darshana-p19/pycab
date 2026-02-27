# Create new file: schemas/payment.py
from pydantic import BaseModel
from typing import Optional

class PaymentIntentCreate(BaseModel):
    ride_id: int
    amount: float  # Amount in local currency (INR)

class PaymentWebhook(BaseModel):
    id: str
    type: str
    data: dict
