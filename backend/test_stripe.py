import stripe
import os
from dotenv import load_dotenv

load_dotenv()

# Get and verify the key
secret_key = os.getenv("STRIPE_SECRET_KEY")
print(f"Key being used: {secret_key[:20]}...")  # Show first 20 chars for verification
print(f"Key length: {len(secret_key) if secret_key else 0}")

stripe.api_key = secret_key

# Test creating a payment intent
try:
    intent = stripe.PaymentIntent.create(
        amount=5000,  # 50.00 INR
        currency='inr',
        description="Test payment",
    )
    print(f"✓ PaymentIntent created: {intent.id}")
    print(f"✓ Client secret: {intent.client_secret}")
except stripe.error.AuthenticationError as e:
    print(f"✗ Authentication Error: {e}")
    print("\nTroubleshooting steps:")
    print("1. Check your .env file has STRIPE_SECRET_KEY")
    print("2. Make sure key starts with 'sk_test_'")
    print("3. Try copying the key again from Stripe Dashboard")
except Exception as e:
    print(f"✗ Error: {e}")