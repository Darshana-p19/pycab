import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import RideMap from '../components/RideMap';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function RidesPage() {
  const [user, setUser] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadUserAndRides = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      
      if (userData.user) {
        await loadRideHistory(userData.user.id);
      }
    };
    
    loadUserAndRides();
  }, []);

  const loadRideHistory = async (userId) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/rides/history/${userId}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setRides(data);
      } else {
        setRides([]);
      }
    } catch (err) {
      console.error("Failed to load rides:", err);
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async (rideId) => {
    try {
      const response = await fetch(`http://localhost:8000/receipts/${rideId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download receipt');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${rideId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('✅ Receipt downloaded successfully!');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Calculate total spent
  const totalSpent = rides.reduce((sum, ride) => {
    const price = parseFloat(ride.estimated_price) || 0;
    return sum + price;
  }, 0).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <Navbar user={user} />
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Rides</h1>
            <p className="text-gray-400 mt-2">View your ride history and receipts</p>
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <button
              onClick={() => navigate("/book")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105"
            >
              🚕 Book New Ride
            </button>
            <button
              onClick={loadRideHistory}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-xl flex items-center gap-2 transition-colors"
            >
              <span>🔄</span>
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {rides.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-900/30 to-blue-700/30 p-6 rounded-xl">
              <div className="text-3xl font-bold mb-2">{rides.length}</div>
              <div className="text-gray-400">Total Rides</div>
            </div>
            <div className="bg-gradient-to-r from-green-900/30 to-green-700/30 p-6 rounded-xl">
              <div className="text-3xl font-bold mb-2">₹{totalSpent}</div>
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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : rides.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50">
            <div className="text-6xl mb-4">🚕</div>
            <h2 className="text-2xl font-bold mb-2">No rides yet</h2>
            <p className="text-gray-400 mb-6">Book your first ride to get started!</p>
            <button
              onClick={() => navigate("/book")}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-8 py-3 rounded-xl font-bold text-lg transition-all"
            >
              Book Your First Ride
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rides.map((ride) => (
              <div 
                key={ride.id} 
                className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-xl"
              >
                {/* Header with ID and Status */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ride.status)}`}>
                        {ride.status?.toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-sm">
                        #{ride.id}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">₹{ride.estimated_price}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">
                      {new Date(ride.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(ride.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>

                {/* Locations */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mt-1">
                      <span className="text-blue-400">📍</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-400">Pickup</div>
                      <div className="font-medium truncate">{ride.pickup_address}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mt-1">
                      <span className="text-red-400">🎯</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-400">Drop</div>
                      <div className="font-medium truncate">{ride.drop_address}</div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-900/50 p-4 rounded-xl">
                    <div className="text-sm text-gray-400 mb-1">Distance</div>
                    <div className="text-xl font-bold">{ride.estimated_distance_km?.toFixed(1)} km</div>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-xl">
                    <div className="text-sm text-gray-400 mb-1">Payment</div>
                    <div className={`text-xl font-bold ${getPaymentStatusColor(ride.payment_status)}`}>
                      {ride.payment_status?.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-6">
                  {ride.payment_status === 'paid' && (
                    <button
                      onClick={() => downloadReceipt(ride.id)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-xl transition-all font-medium"
                    >
                      📥 Download Receipt
                    </button>
                  )}
                  
                  {ride.status === 'completed' && (
                    <button
                      onClick={() => navigate(`/rate/${ride.id}`)}
                      className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 py-3 rounded-xl transition-all font-medium"
                    >
                      ⭐ Rate Ride
                    </button>
                  )}
                </div>

                {/* Map */}
                {ride.pickup_lat && ride.drop_lat && (
                  <div className="mt-4">
                    <div className="h-48 rounded-xl overflow-hidden border border-gray-700">
                      <RideMap
                        pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
                        drop={{ lat: ride.drop_lat, lng: ride.drop_lng }}
                      />
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                <div className="mt-6 pt-6 border-t border-gray-700/50">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {ride.driver_id && (
                      <div>
                        <div className="text-gray-400">Driver ID</div>
                        <div className="font-medium text-blue-300">#{ride.driver_id}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-gray-400">Payment Method</div>
                      <div className="font-medium">{ride.payment_method || 'Card'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state when no rides */}
        {!loading && rides.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🚕</div>
            <h2 className="text-2xl font-bold mb-2">No rides yet</h2>
            <p className="text-gray-400 mb-6">Book your first ride to get started!</p>
            <button
              onClick={() => navigate("/book")}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-8 py-3 rounded-xl font-bold text-lg transition-all"
            >
              Book Your First Ride
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} PyCab. All rights reserved. | Fast, Safe, Reliable Rides</p>
      </footer>
    </div>
  );
}