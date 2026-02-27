// pages/ReceiptHistory.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function ReceiptHistory() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Mock user ID - replace with actual auth
  const userId = "c0694c35-6bc6-483a-95bb-701a0b88987d";

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      // Fetch ride history (paid rides)
      const response = await fetch(`http://localhost:8000/rides/history/${userId}`);
      
      if (response.ok) {
        const rides = await response.json();
        
        // Filter only paid rides
        const paidRides = rides.filter(ride => ride.payment_status === "paid");
        
        // Check receipt availability for each ride
        const receiptsWithStatus = await Promise.all(
          paidRides.map(async (ride) => {
            try {
              const receiptResponse = await fetch(`http://localhost:8000/receipts/${ride.id}/status`);
              if (receiptResponse.ok) {
                const receiptStatus = await receiptResponse.json();
                return { ...ride, receipt_available: receiptStatus.receipt_available };
              }
            } catch (error) {
              console.error("Error checking receipt:", error);
            }
            return { ...ride, receipt_available: false };
          })
        );
        
        setReceipts(receiptsWithStatus);
      }
    } catch (error) {
      console.error("Error fetching receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = (rideId) => {
    window.open(`http://localhost:8000/receipts/${rideId}/download`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-24">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="text-xl">Loading receipts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-24 px-4">
      <Navbar />
      
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Receipts & Invoices</h1>
            <p className="text-gray-400 mt-2">Download receipts for your completed rides</p>
          </div>
          <button
            onClick={() => navigate("/book")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Book New Ride
          </button>
        </div>

        {receipts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📄</div>
            <h2 className="text-xl font-bold mb-2">No Receipts Yet</h2>
            <p className="text-gray-400">Complete a ride to generate your first receipt</p>
            <button
              onClick={() => navigate("/book")}
              className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Book Your First Ride
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="bg-white/10 p-6 rounded-xl border border-white/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-900/30 rounded-full flex items-center justify-center">
                        <span className="text-2xl">📄</span>
                      </div>
                      <div>
                        <h3 className="font-bold">Receipt #{receipt.id}</h3>
                        <p className="text-sm text-gray-400">
                          {receipt.pickup_address} → {receipt.drop_address}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Amount</p>
                        <p className="font-bold text-green-400">₹{receipt.estimated_price}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Distance</p>
                        <p className="font-bold">{receipt.estimated_distance_km} km</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Date</p>
                        <p className="font-bold">
                          {new Date(receipt.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Status</p>
                        <p className="font-bold text-green-400">✅ Paid</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 md:mt-0">
                    {receipt.receipt_available ? (
                      <button
                        onClick={() => downloadReceipt(receipt.id)}
                        className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-lg font-medium"
                      >
                        Download Receipt
                      </button>
                    ) : (
                      <button
                        onClick={() => downloadReceipt(receipt.id)}
                        className="w-full md:w-auto px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                      >
                        Generate Receipt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-white"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}