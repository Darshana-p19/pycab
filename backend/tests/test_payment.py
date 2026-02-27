# test_payment.py
import asyncio
import httpx
import stripe
import os
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

async def test_complete_payment_flow():
    """Test the complete payment flow"""
    async with httpx.AsyncClient() as client:
        print("1. Creating a ride...")
        
        # Create a ride
        ride_data = {
            "user_id": "test_user_456",
            "pickup_address": "Bangalore Airport",
            "drop_address": "MG Road",
            "pickup_lat": 13.1989,
            "pickup_lng": 77.7068,
            "drop_lat": 12.9716,
            "drop_lng": 77.5946
        }
        
        ride_response = await client.post(
            "http://localhost:8000/rides/request",
            json=ride_data
        )
        
        if ride_response.status_code != 200:
            print(f"Failed to create ride: {ride_response.text}")
            return
        
        ride_info = ride_response.json()
        ride_id = ride_info["ride_id"]
        price = ride_info["estimated_price"]
        
        print(f"Created ride #{ride_id} with price: ₹{price}")
        
        print("\n2. Creating payment intent...")
        
        # Create payment intent
        payment_response = await client.post(
            f"http://localhost:8000/payments/initiate/{ride_id}"
        )
        
        if payment_response.status_code != 200:
            print(f"Failed to create payment intent: {payment_response.text}")
            return
        
        payment_info = payment_response.json()
        payment_intent_id = payment_info["payment_intent_id"]
        client_secret = payment_info["client_secret"]
        
        print(f"Payment Intent ID: {payment_intent_id}")
        
        print("\n3. Simulating successful payment with test card...")
        
        try:
            # Simulate payment confirmation (this would be done by Stripe.js in frontend)
            # In backend testing, we can confirm directly
            payment_intent = stripe.PaymentIntent.confirm(
                payment_intent_id,
                payment_method='pm_card_visa',  # Test card
                return_url='http://localhost:5173/success'  # Your frontend URL
            )
            
            print(f"Payment status: {payment_intent.status}")
            print(f"Payment amount: ₹{payment_intent.amount / 100}")
            
        except Exception as e:
            print(f"Payment failed: {e}")
            
        print("\n4. Checking payment status via API...")
        
        # Check payment status
        status_response = await client.get(
            f"http://localhost:8000/payments/status/{payment_intent_id}"
        )
        
        if status_response.status_code == 200:
            status_info = status_response.json()
            print(f"Payment Status: {status_info['status']}")
            print(f"Amount: ₹{status_info['amount']}")
            print(f"Ride ID: {status_info.get('ride_id')}")
        else:
            print(f"Failed to get status: {status_response.text}")
        
        print("\n5. Checking ride details...")
        
        # Get ride details to see if payment status updated
        ride_detail_response = await client.get(
            f"http://localhost:8000/rides/{ride_id}"
        )
        
        if ride_detail_response.status_code == 200:
            ride_detail = ride_detail_response.json()
            print(f"Ride #{ride_detail['id']}")
            print(f"Payment Status: {ride_detail.get('payment_status', 'N/A')}")
            print(f"Payment Intent ID: {ride_detail.get('payment_intent_id', 'N/A')}")
        else:
            print(f"Failed to get ride details: {ride_detail_response.text}")

if __name__ == "__main__":
    asyncio.run(test_complete_payment_flow())