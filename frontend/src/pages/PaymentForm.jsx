// components/PaymentForm.jsx
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function PaymentForm({ rideId, amount }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // 1. Get client secret from backend
      const response = await fetch(`http://localhost:8000/payments/initiate/${rideId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to initiate payment");
      }

      // 2. Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      });

      if (error) {
        setMessage(`Payment failed: ${error.message}`);
      } else if (paymentIntent.status === 'succeeded') {
        setMessage('Payment successful! Redirecting...');
        
        // Update ride status in backend
        await fetch(`http://localhost:8000/rides/${rideId}/complete`, {
          method: 'POST',
        });
        
        // Redirect to success page after 2 seconds
        setTimeout(() => {
          navigate(`/ride-success/${rideId}`);
        }, 2000);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block mb-2">Card Details</label>
        <div className="border border-gray-600 p-4 rounded-lg bg-gray-900/50">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  '::placeholder': {
                    color: '#a0aec0',
                  },
                },
              },
            }}
          />
        </div>
      </div>
      
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-4 rounded-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-800 transition text-xl font-bold"
      >
        {loading ? 'Processing...' : `Pay ₹${amount}`}
      </button>
      
      {message && (
        <div className={`p-4 rounded-lg ${message.includes('success') ? 'bg-green-900/30 border border-green-500 text-green-400' : 'bg-red-900/30 border border-red-500 text-red-400'}`}>
          {message}
        </div>
      )}

      <div className="text-center text-gray-400 text-sm">
        <p>💳 Payments are secure and encrypted</p>
        <p className="mt-1">Powered by Stripe</p>
      </div>
    </form>
  );
}

export default PaymentForm;