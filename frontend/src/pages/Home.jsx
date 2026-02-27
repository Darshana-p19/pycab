// pages/Home.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Home() {
  const [user, setUser] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) {
        loadHistory(data.user.id);
      } else {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const loadHistory = async (userId) => {
    try {
      const res = await fetch(`http://localhost:8000/rides/history/${userId}`);
      const data = await res.json();

      if (!Array.isArray(data)) {
        console.error("Backend returned error:", data);
        setRides([]);
        return;
      }

      setRides(data);
    } catch (err) {
      console.error("History fetch failed:", err);
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

const downloadReceiptAlternative = async (rideId) => {
  try {
    // Just open in new tab without auth
    window.open(`http://localhost:8000/receipts/${rideId}/download`, '_blank');
  } catch (error) {
    console.error('Error:', error);
    
    // Create a fake receipt as fallback
    const text = `
      PYCAB RIDE RECEIPT
      ==================
      
      Ride ID: ${rideId}
      Date: ${new Date().toLocaleDateString()}
      Amount: ₹250.00
      Status: PAID
      
      Thank you for riding with PyCab!
      
      This is a placeholder receipt.
      Actual receipt generation is being fixed.
    `;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${rideId}.txt`;
    a.click();
    
    alert('Placeholder receipt downloaded. Backend is being fixed.');
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <Navbar user={user} />
        <div className="flex justify-center items-center h-64 pt-24">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <Navbar user={user} />
      
      <div className="pt-24 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Welcome to PyCab
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
              Fast, reliable rides at your fingertips. Book a ride in seconds.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate("/book")}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl text-lg font-bold transition-all transform hover:scale-105"
              >
                🚕 Book a Ride
              </button>
              {!user && (
                <button
                  onClick={() => navigate("/login")}
                  className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-xl text-lg font-bold transition-all"
                >
                  👤 Sign In
                </button>
              )}
            </div>
          </div>

          {/* Ride History */}
          <div className="bg-white/10 p-8 rounded-2xl border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">📜 Your Ride History</h2>
              {user && rides.length > 0 && (
                <button
                  onClick={() => navigate("/rides")}
                  className="text-gray-400 hover:text-white transition"
                >
                  View All Rides →
                </button>
              )}
            </div>

            {!user ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👤</div>
                <h3 className="text-xl font-bold mb-2">Sign in to view your rides</h3>
                <p className="text-gray-400 mb-6">Login to see your ride history and book new rides</p>
                <button
                  onClick={() => navigate("/login")}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg"
                >
                  Sign In Now
                </button>
              </div>
            ) : rides.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚕</div>
                <h3 className="text-xl font-bold mb-2">No rides yet</h3>
                <p className="text-gray-400 mb-6">Book your first ride to get started!</p>
                <button
                  onClick={() => navigate("/book")}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg"
                >
                  Book Your First Ride
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rides.slice(0, 6).map((ride) => (
                  <div key={ride.id} className="bg-gray-800/30 p-6 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            ride.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            ride.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {ride.status?.toUpperCase()}
                          </span>
                          <span className="text-gray-500 text-sm">#{ride.id}</span>
                        </div>
                        <div className="text-2xl font-bold text-green-400">₹{ride.estimated_price}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          {new Date(ride.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-400">From</div>
                          <div className="font-medium truncate">{ride.pickup_address}</div>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3"></div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-400">To</div>
                          <div className="font-medium truncate">{ride.drop_address}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-black/30 p-2 rounded-lg">
                        <div className="text-xs text-gray-400">Distance</div>
                        <div className="font-bold">{ride.estimated_distance_km?.toFixed(1)} km</div>
                      </div>
                      <div className="bg-black/30 p-2 rounded-lg">
                        <div className="text-xs text-gray-400">Payment</div>
                        <div className={`font-bold ${ride.payment_status === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                          {ride.payment_status?.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {ride.payment_status === 'paid' && (
                        <button
                          onClick={() => downloadReceiptAlternative(ride.id)}
                          className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-sm transition-all"
                        >
                          📥 Receipt
                        </button>
                      )}
                      {ride.status === 'completed' && (
                        <button
                          onClick={() => navigate(`/rate/${ride.id}`)}
                          className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 rounded-lg text-sm"
                        >
                          ⭐ Rate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {user && rides.length > 0 && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-blue-900/30 to-blue-700/30 p-6 rounded-xl">
                <div className="text-3xl font-bold mb-2">{rides.length}</div>
                <div className="text-gray-400">Total Rides</div>
              </div>
              <div className="bg-gradient-to-r from-green-900/30 to-green-700/30 p-6 rounded-xl">
                <div className="text-3xl font-bold mb-2">
                  ₹{rides.reduce((sum, ride) => sum + (parseFloat(ride.estimated_price) || 0), 0).toFixed(2)}
                </div>
                <div className="text-gray-400">Total Spent</div>
              </div>
              <div className="bg-gradient-to-r from-purple-900/30 to-purple-700/30 p-6 rounded-xl">
                <div className="text-3xl font-bold mb-2">
                  {Math.round(rides.reduce((sum, ride) => sum + (ride.estimated_distance_km || 0), 0))} km
                </div>
                <div className="text-gray-400">Distance Traveled</div>
              </div>
              <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-700/30 p-6 rounded-xl">
                <div className="text-3xl font-bold mb-2">
                  {rides.filter(r => r.status === 'completed').length}
                </div>
                <div className="text-gray-400">Completed Rides</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
