# routes/payments.py
from fastapi import APIRouter, HTTPException, Request,Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
import stripe
import os
from typing import Dict
import json
from db import get_session
from tasks.receipt_task import send_receipt_email
from datetime import datetime

router = APIRouter(prefix="/payments", tags=["Payments"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@router.post("/initiate/{ride_id}")
async def initiate_payment(ride_id: int, session: AsyncSession = Depends(get_session)):
    """Get ride price and create payment intent"""
    from sqlmodel import select
    from models.ride import Ride
    
    # Get ride details
    result = await session.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if not ride.estimated_price:
        raise HTTPException(status_code=400, detail="Ride price not calculated")
    
    # Create payment intent
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(ride.estimated_price * 100),  # Convert to paise
            currency='inr',
            metadata={'ride_id': ride_id},
            description=f"Payment for ride #{ride_id}",
        )
        
        # Update ride with payment intent ID
        ride.payment_intent_id = intent.id
        session.add(ride)
        await session.commit()
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": ride.estimated_price,
            "ride_id": ride_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/create-payment-intent")
async def create_payment_intent(payload: Dict):
    """Create a Stripe PaymentIntent for a ride"""
    try:
        ride_id = payload.get("ride_id")
        amount = payload.get("amount", 100)  # Default 100 INR
        
        if not ride_id:
            raise HTTPException(status_code=400, detail="ride_id is required")
        
        # Create PaymentIntent
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Convert to paise
            currency='inr',
            metadata={'ride_id': ride_id},
            description=f"Payment for ride #{ride_id}",
        )
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "status": intent.status
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# @router.post("/webhook")
# async def stripe_webhook(request: Request, session: AsyncSession = Depends(get_session)):
#     """Handle Stripe webhooks for payment events"""
#     payload = await request.body()
#     sig_header = request.headers.get('stripe-signature')
    
#     try:
#         event = stripe.Webhook.construct_event(
#             payload, sig_header, STRIPE_WEBHOOK_SECRET
#         )
#     except ValueError as e:
#         raise HTTPException(status_code=400, detail="Invalid payload")
#     except stripe.error.SignatureVerificationError as e:
#         raise HTTPException(status_code=400, detail="Invalid signature")
    
#     # Handle the event
#     if event['type'] == 'payment_intent.succeeded':
#         payment_intent = event['data']['object']
#         ride_id = payment_intent['metadata'].get('ride_id')
        
#         # Update ride status
#         from sqlmodel import select, update
#         from models.ride import Ride
        
#         # Get the ride
#         result = await session.execute(select(Ride).where(Ride.id == ride_id))
#         ride = result.scalar_one_or_none()
        
#         if ride:
#             # Update ride status
#             ride.payment_status = "paid"
#             ride.status = "completed"
#             session.add(ride)
#             await session.commit()
            
#             # Generate and send receipt
#             from tasks.receipt_task import send_receipt_email
            
#             # Prepare ride data for receipt
#             ride_data = {
#                 "id": ride.id,
#                 "user_id": ride.user_id,
#                 "pickup": ride.pickup_address,
#                 "drop": ride.drop_address,
#                 "distance": ride.estimated_distance_km,
#                 "amount": ride.estimated_price,
#                 "created_at": ride.created_at.isoformat() if ride.created_at else None
#             }
            
#             # Send receipt email (async via Celery)
#             # Note: For now, we'll just print. In production, uncomment the celery task
#             print(f"📧 Receipt email would be sent for ride {ride.id}")
#             # send_receipt_email.delay(ride.user_email, ride_data)
            
#             print(f"✅ Payment succeeded and ride {ride_id} marked as completed")
            
#     elif event['type'] == 'payment_intent.payment_failed':
#         payment_intent = event['data']['object']
#         ride_id = payment_intent['metadata'].get('ride_id')
        
#         # Update ride status to failed
#         from sqlmodel import select
#         from models.ride import Ride
        
#         result = await session.execute(select(Ride).where(Ride.id == ride_id))
#         ride = result.scalar_one_or_none()
        
#         if ride:
#             ride.payment_status = "failed"
#             session.add(ride)
#             await session.commit()
#             print(f"❌ Payment failed for ride {ride_id}")
    
#     return JSONResponse(status_code=200, content={"status": "success"})

@router.post("/webhook")
async def stripe_webhook(request: Request, session: AsyncSession = Depends(get_session)):
    """Handle Stripe webhooks for payment events"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        print(f"❌ Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        print(f"❌ Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        ride_id = payment_intent['metadata'].get('ride_id')
        
        print(f"✅ Payment succeeded for ride {ride_id}")
        
        # Update ride status
        from sqlmodel import select, update
        from models.ride import Ride
        
        try:
            # Get the ride
            result = await session.execute(select(Ride).where(Ride.id == ride_id))
            ride = result.scalar_one_or_none()
            
            if ride:
                # Update ride status
                ride.payment_status = "paid"
                ride.status = "completed"
                ride.updated_at = datetime.utcnow()
                session.add(ride)
                await session.commit()
                
                # Get user email
                result = await session.execute(select(User).where(User.id == ride.user_id))
                user = result.scalar_one_or_none()
                
                if user:
                    # Generate and send receipt
                    ride_data = {
                        "id": ride.id,
                        "user_id": ride.user_id,
                        "user_email": user.email,
                        "pickup": ride.pickup_address,
                        "drop": ride.drop_address,
                        "distance": ride.estimated_distance_km,
                        "amount": ride.estimated_price,
                        "created_at": ride.created_at.isoformat() if ride.created_at else None,
                        "payment_method": "Stripe",
                        "transaction_id": payment_intent.get('id', 'N/A')
                    }
                    
                    # Send receipt email via Celery
                    send_receipt_email.delay(user.email, ride_data)
                    print(f"📧 Receipt email queued for ride {ride_id}")
                else:
                    print(f"⚠️ User not found for ride {ride_id}")
                
                print(f"✅ Ride {ride_id} marked as completed")
            else:
                print(f"⚠️ Ride {ride_id} not found")
                
        except Exception as e:
            print(f"❌ Error updating ride {ride_id}: {e}")
            traceback.print_exc()
            
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        ride_id = payment_intent['metadata'].get('ride_id')
        
        # Update ride status to failed
        from sqlmodel import select
        from models.ride import Ride
        
        result = await session.execute(select(Ride).where(Ride.id == ride_id))
        ride = result.scalar_one_or_none()
        
        if ride:
            ride.payment_status = "failed"
            session.add(ride)
            await session.commit()
            print(f"❌ Payment failed for ride {ride_id}")
    
    return JSONResponse(status_code=200, content={"status": "success"})

async def update_ride_payment_status(ride_id: int, status: str, payment_intent_id: str):
    """Update ride payment status in database"""
    # This function needs database access
    # You'll need to import your session and models
    from sqlmodel.ext.asyncio.session import AsyncSession
    from sqlmodel import select
    from db import get_session
    from models.ride import Ride
    
    # In a real app, you'd use dependency injection
    # For now, create a simple update
    print(f"Updating ride {ride_id} to status: {status}")
    return True

@router.get("/status/{payment_intent_id}")
async def get_payment_status(payment_intent_id: str):
    """Check payment status"""
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return {
            "status": intent.status,
            "amount": intent.amount / 100,  # Convert back from paise
            "currency": intent.currency,
            "ride_id": intent.metadata.get('ride_id')
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))