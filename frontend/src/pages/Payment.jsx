import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";

export default function Payment() {
  const { rideId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [rideDetails, setRideDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [showReceiptLink, setShowReceiptLink] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) {
      localStorage.setItem('admin_token', 'admin-secret-token');
      console.log("Admin token set for development");
    }

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (data.user) {
        setEmailInput(data.user.email || "");
      }
    };

    loadUser();

    // Get ride details from navigation state
    if (location.state?.rideDetails) {
      setRideDetails(location.state.rideDetails);
      setLoading(false);
    } else {
      fetchRideDetails(rideId);
    }
  }, [rideId, location]);

  const fetchRideDetails = async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/rides/${id}`);
      if (response.ok) {
        const ride = await response.json();
        setRideDetails(ride);
      }
    } catch (err) {
      console.error("Error fetching ride:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();

    if (!cardNumber || !expiry || !cvc) {
      setMessage("Please fill in all card details");
      return;
    }

    setProcessing(true);
    setMessage("Processing payment...");

    try {
      // Step 1: Process payment
      const response = await fetch(`http://localhost:8000/payments/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ride_id: rideId,
          amount: rideDetails?.estimated_price || 250
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ Payment successful! Generating receipt...");

        try {
          // Step 2: Update ride status
          await updateRideStatus();

          // Step 3: Generate receipt
          const receiptResponse = await fetch(`http://localhost:8000/receipts/${rideId}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: emailInput || user?.email
            })
          });

          if (receiptResponse.ok) {
            setMessage("✅ Payment successful! Receipt generated.");
            setShowReceiptLink(true);
            setShowEmailInput(false);

            // Redirect after 5 seconds
            setTimeout(() => {
              navigate("/rides");
            }, 5000);
          } else {
            throw new Error("Failed to generate receipt");
          }

        } catch (updateError) {
          console.error("Update error:", updateError);
          setMessage("✅ Payment successful! Receipt generation may be delayed.");
          setShowReceiptLink(true);
        }

      } else {
        setMessage(`Payment failed: ${data.detail || "Please try again"}`);
      }
    } catch (err) {
      setMessage(`Payment error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const updateRideStatus = async () => {
    const adminToken = localStorage.getItem('admin_token') || 'admin-secret-token';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    };

    try {
      // 1. Mark ride as completed
      const statusRes = await fetch(`http://localhost:8000/admin/rides/${rideId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'completed' })
      });
      if (!statusRes.ok) throw new Error('Failed to update ride status');

      // 2. Mark payment as paid
      const paymentRes = await fetch(`http://localhost:8000/admin/rides/${rideId}/payment-status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ payment_status: 'paid' })
      });
      if (!paymentRes.ok) throw new Error('Failed to update payment status');

      console.log('✅ Ride & payment status updated');
      return true;
    } catch (error) {
      console.error('❌ Update failed:', error);
      return false;
    }
  };

  const adminUpdateRideStatus = async () => {
    try {
      const adminToken = localStorage.getItem('admin_token') || 'admin-secret-token';

      const response = await fetch(`http://localhost:8000/admin/rides/${rideId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'completed' })
      });

      if (response.ok) {
        console.log("Ride status updated via admin");
        return true;
      }
    } catch (error) {
      console.error("Admin update failed:", error);
    }
    return false;
  };

  // old
  // const downloadReceipt = async () => {
  //   try {
  //     window.open(`http://localhost:8000/receipts/${rideId}/download`, '_blank');
  //   } catch (error) {
  //     console.error("Error downloading receipt:", error);
  //     alert("Failed to download receipt");
  //   }
  // };

  const downloadReceipt = async () => {
    try {
      const response = await fetch(`http://localhost:8000/receipts/${rideId}/download`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pycab_receipt_${rideId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('❌ Download error:', error);
      alert(`Download failed: ${error.message}`);
    }
  };

  const sendReceiptToEmail = async () => {
    if (!emailInput) {
      alert("Please enter email address");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/receipts/${rideId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput })
      });

      if (response.ok) {
        alert("✅ Receipt sent to your email!");
        setShowEmailInput(false);
      } else {
        alert("Failed to send email");
      }
    } catch (error) {
      console.error("Email error:", error);
      alert("Failed to send email");
    }
  };


  const generateHTMLReceipt = () => {
    if (!rideDetails) return;

    // Normalize field names – works with both navigation state and API response
    const pickup = rideDetails.pickup_address || rideDetails.pickup || 'Not specified';
    const drop = rideDetails.drop_address || rideDetails.drop || 'Not specified';
    const distance = rideDetails.estimated_distance_km || rideDetails.distance_km || '0';
    const amount = rideDetails.estimated_price || rideDetails.price || '0';
    const status = rideDetails.status || 'Completed';
    const date = rideDetails.created_at
      ? new Date(rideDetails.created_at).toLocaleString()
      : new Date().toLocaleString();

    const receiptContent = `
    <html>
      <head>
        <title>PyCab Receipt #${rideId}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #4F46E5; margin-bottom: 10px; }
          .detail-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
          .label { font-weight: bold; color: #666; }
          .total { font-size: 24px; font-weight: bold; color: #10B981; margin: 30px 0; text-align: center; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🚕 PyCab</div>
          <h1>Ride Receipt</h1>
          <p>Receipt #${rideId} | ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="details">
          <div class="detail-row"><span class="label">Pickup:</span><span>${pickup}</span></div>
          <div class="detail-row"><span class="label">Drop:</span><span>${drop}</span></div>
          <div class="detail-row"><span class="label">Distance:</span><span>${distance} km</span></div>
          <div class="detail-row"><span class="label">Status:</span><span style="color:green; font-weight:bold;">${status}</span></div>
          <div class="detail-row"><span class="label">Payment Status:</span><span style="color:green; font-weight:bold;">Paid</span></div>
          <div class="detail-row"><span class="label">Date:</span><span>${date}</span></div>
        </div>
        <div class="total">Total Amount: ₹${amount}</div>
        <div class="footer">
          <p>Thank you for choosing PyCab!</p>
          <p>For any queries, contact support@pycab.com</p>
          <p>Receipt generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
    </html>
  `;

    const receiptWindow = window.open('', '_blank');
    receiptWindow.document.write(receiptContent);
    receiptWindow.document.close();
    receiptWindow.focus();
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-24">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="text-xl">Loading payment details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-24 px-4">
      <Navbar />

      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Complete Payment</h1>
        <p className="text-gray-400 text-center mb-8">Secure payment for your ride</p>

        <div className="bg-white/10 p-8 rounded-2xl border border-white/20">
          {/* Ride Summary */}
          {rideDetails && (
            <div className="mb-8 p-4 bg-gray-800/50 rounded-xl">
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-green-400 mb-2">₹{rideDetails.estimated_price}</div>
                <div className="text-gray-400">Total amount</div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Ride ID:</span>
                  <span>#{rideDetails.id || rideDetails.ride_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pickup:</span>
                  <span className="text-right">{rideDetails.pickup_address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Drop:</span>
                  <span className="text-right">{rideDetails.drop_address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Distance:</span>
                  <span>{rideDetails.estimated_distance_km} km</span>
                </div>
              </div>
            </div>
          )}

          {/* Email Input (for receipt) */}
          {showEmailInput && (
            <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
              <h3 className="font-bold mb-2">📧 Send Receipt to Email</h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
                />
                <button
                  onClick={sendReceiptToEmail}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Payment Form */}
          <form onSubmit={handlePayment} className="space-y-6">
            <div>
              <label className="block mb-2">Card Number</label>
              <input
                type="text"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                maxLength="19"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">Expiry Date</label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block mb-2">CVC</label>
                <input
                  type="text"
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  maxLength="3"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-4 rounded-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-800 transition text-xl font-bold"
            >
              {processing ? 'Processing...' : `Pay ₹${rideDetails?.estimated_price || "250"}`}
            </button>

            {message && (
              <div className={`p-4 rounded-lg ${message.includes('success') ? 'bg-green-900/30 border border-green-500 text-green-400' : 'bg-red-900/30 border border-red-500 text-red-400'}`}>
                {message}
              </div>
            )}

            {showReceiptLink && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={downloadReceipt}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
                  >
                    📥 Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={generateHTMLReceipt}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium"
                  >
                    📄 View Receipt
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailInput(!showEmailInput)}
                  className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium"
                >
                  📧 Send to Email
                </button>
              </div>
            )}

            {/* Test Card Info */}
            <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-500/50">
              <h3 className="font-bold mb-2">💳 Test Card Details</h3>
              <p className="text-sm text-gray-300">
                Card: <span className="font-mono">4242 4242 4242 4242</span>
              </p>
              <p className="text-sm text-gray-300">
                Date: <span className="font-mono">Any future date (MM/YY)</span>
              </p>
              <p className="text-sm text-gray-300">
                CVC: <span className="font-mono">Any 3 digits</span>
              </p>
            </div>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate("/book")}
              className="text-gray-400 hover:text-white"
            >
              ← Back to Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}