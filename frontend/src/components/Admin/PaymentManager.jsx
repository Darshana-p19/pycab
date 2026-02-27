import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const PaymentManager = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const adminToken = localStorage.getItem('admin_token') || 'admin-secret-token';
  
  // Check if user is admin
  const isAdmin = localStorage.getItem('is_admin') === 'true';
  const userRole = localStorage.getItem('user_role');

  useEffect(() => {
    // Redirect if not admin
    if (!isAdmin && userRole !== 'admin') {
      navigate('/');
      return;
    }
    
    fetchAllRides();
  }, [navigate, isAdmin, userRole]);

  const fetchAllRides = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try multiple endpoints - use the same one as your AdminDashboard
      const endpoints = [
        'http://localhost:8000/admin/rides',
        'http://localhost:8000/rides/all',
        'http://localhost:8000/rides'
      ];
      
      let ridesData = [];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying to fetch rides from: ${endpoint}`);
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${adminToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (Array.isArray(data)) {
              ridesData = data;
            } else if (data.rides && Array.isArray(data.rides)) {
              ridesData = data.rides;
            } else {
              ridesData = [];
            }
            break;
          }
        } catch (err) {
          console.log(`Endpoint ${endpoint} failed:`, err.message);
        }
      }
      
      if (ridesData.length === 0) {
        // Try to get rides from user history as fallback
        try {
          const userResponse = await fetch('http://localhost:8000/rides/history/all');
          if (userResponse.ok) {
            const userData = await userResponse.json();
            ridesData = Array.isArray(userData) ? userData : [];
          }
        } catch (userErr) {
          console.log('User history endpoint failed:', userErr.message);
        }
      }
      
      setRides(ridesData);
      
    } catch (error) {
      console.error('Error fetching rides:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (rideId, status) => {
    if (!window.confirm(`Change status to "${status}"?`)) return;
    
    try {
      const response = await fetch(`http://localhost:8000/admin/rides/${rideId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        alert('Status updated successfully!');
        fetchAllRides();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const handleUpdatePaymentStatus = async (rideId, paymentStatus) => {
    if (!window.confirm(`Change payment status to "${paymentStatus}"?`)) return;
    
    try {
      const response = await fetch(`http://localhost:8000/admin/rides/${rideId}/payment-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ payment_status: paymentStatus })
      });
      
      if (response.ok) {
        alert('Payment status updated successfully!');
        fetchAllRides();
      } else {
        alert('Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Error updating payment status');
    }
  };

  const handleGenerateReceipt = (rideId) => {
    window.open(`http://localhost:8000/receipts/${rideId}/download`, '_blank');
  };

  const handleCleanup = async () => {
    try {
      // Find and mark old pending payments as completed
      const oldDate = new Date(Date.now() - 7 * 86400000).toISOString();
      
      const pendingRides = rides.filter(ride => 
        ride.status === 'requested' && 
        new Date(ride.created_at) < oldDate
      );
      
      if (pendingRides.length === 0) {
        alert('No stuck payments found');
        return;
      }
      
      if (window.confirm(`Clean up ${pendingRides.length} stuck payments?`)) {
        for (const ride of pendingRides) {
          try {
            await fetch(`http://localhost:8000/admin/rides/${ride.id}/status`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
              },
              body: JSON.stringify({ 
                status: 'cancelled',
                payment_status: 'failed'
              })
            });
          } catch (err) {
            console.log(`Failed to update ride ${ride.id}:`, err);
          }
        }
        alert(`Cleaned up ${pendingRides.length} stuck payments`);
        fetchAllRides();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('Error during cleanup');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white pt-24 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-24 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Payment & Ride Management</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
            <p className="font-bold">⚠️ Note:</p>
            <p>{error}</p>
          </div>
        )}
        
        <div className="mb-6 space-x-4">
          <button
            onClick={handleCleanup}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
          >
            Cleanup Stuck Payments (7+ days)
          </button>
          <button
            onClick={fetchAllRides}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Refresh
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
          >
            Go to Admin Dashboard
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-900/30 p-4 rounded-xl">
            <div className="text-2xl font-bold">{rides.length}</div>
            <div className="text-sm text-gray-400">Total Rides</div>
          </div>
          <div className="bg-green-900/30 p-4 rounded-xl">
            <div className="text-2xl font-bold">
              {rides.filter(r => r.payment_status === 'paid').length}
            </div>
            <div className="text-sm text-gray-400">Paid Rides</div>
          </div>
          <div className="bg-yellow-900/30 p-4 rounded-xl">
            <div className="text-2xl font-bold">
              {rides.filter(r => r.payment_status === 'pending').length}
            </div>
            <div className="text-sm text-gray-400">Pending Payments</div>
          </div>
          <div className="bg-red-900/30 p-4 rounded-xl">
            <div className="text-2xl font-bold">
              {rides.filter(r => r.status === 'cancelled').length}
            </div>
            <div className="text-sm text-gray-400">Cancelled</div>
          </div>
        </div>

        {/* Rides Table */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="py-3 px-4 text-left">Ride ID</th>
                  <th className="py-3 px-4 text-left">User</th>
                  <th className="py-3 px-4 text-left">Amount</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Payment</th>
                  <th className="py-3 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rides.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400">
                      No rides found
                    </td>
                  </tr>
                ) : (
                  rides.map((ride) => (
                    <tr key={ride.id} className="border-t border-gray-700 hover:bg-gray-800/70">
                      <td className="py-3 px-4">#{ride.id}</td>
                      <td className="py-3 px-4 text-sm">
                        {ride.user_id ? ride.user_id.slice(0, 8) + '...' : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-bold">₹{ride.estimated_price || ride.amount || 0}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            ride.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            ride.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                            ride.status === 'ongoing' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {ride.status || 'pending'}
                          </span>
                          <select
                            value={ride.status || 'requested'}
                            onChange={(e) => handleUpdateStatus(ride.id, e.target.value)}
                            className="text-xs bg-gray-900 border border-gray-700 rounded px-1 py-0.5"
                          >
                            <option value="requested">Requested</option>
                            <option value="accepted">Accepted</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            ride.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' :
                            ride.payment_status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            ride.payment_status === 'refunded' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {ride.payment_status || 'pending'}
                          </span>
                          <select
                            value={ride.payment_status || 'pending'}
                            onChange={(e) => handleUpdatePaymentStatus(ride.id, e.target.value)}
                            className="text-xs bg-gray-900 border border-gray-700 rounded px-1 py-0.5"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGenerateReceipt(ride.id)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                            disabled={!ride.payment_status || ride.payment_status !== 'paid'}
                          >
                            Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentManager;