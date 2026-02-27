// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import Navbar from '../components/Navbar';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [filteredRides, setFilteredRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const adminToken = localStorage.getItem('admin_token') || '';
  const [showTokenInput, setShowTokenInput] = useState(!adminToken);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);

  // Admin login
  const handleAdminLogin = () => {
    navigate('/admin/login');
  };


  const fetchRides = async () => {
    try {
      const adminToken = localStorage.getItem('admin_token');
      console.log('📤 Sending admin token:', adminToken);
      if (!adminToken) {
        setShowTokenInput(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await fetch('http://localhost:8000/admin/rides', {
        headers: {
          'X-Admin-Token': adminToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, response.statusText, errorText);
        alert(`Error ${response.status}: ${errorText}`);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setRides(data);
        setFilteredRides(data);
      } else {
        // Show the actual error from backend
        let errorMsg = `Failed to fetch rides (${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) { }
        alert(`Error: ${errorMsg}`);
        console.error('API Error:', response.status, response.statusText);

        // **DO NOT** fallback to mock data – it hides real problems
        // Remove the mock fallback entirely
      }
    } catch (error) {
      console.error('Network Error:', error);
      alert('Cannot connect to backend. Make sure the server is running on http://localhost:8000');
    } finally {
      setLoading(false);
    }
  };

  // Add this mock data generator function
  const generateMockRides = () => {
    const statuses = ["requested", "accepted", "ongoing", "completed", "cancelled"];
    const paymentStatuses = ["pending", "paid", "failed", "refunded"];
    const addresses = [
      "123 Main St, New York",
      "456 Park Ave, Manhattan",
      "789 Broadway, Brooklyn",
      "101 Central Park, NYC"
    ];

    const mockRides = [];
    for (let i = 1; i <= 20; i++) {
      const ride = {
        id: `ride_${i}`,
        user_id: `user_${Math.floor(Math.random() * 1000)}`,
        user_email: `user${i}@example.com`,
        user_phone: `+1-555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        user_name: `User ${i}`,
        pickup_address: addresses[Math.floor(Math.random() * addresses.length)],
        drop_address: addresses[Math.floor(Math.random() * addresses.length)],
        estimated_price: Math.floor(Math.random() * 500) + 50,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        payment_status: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
        payment_method: ["cash", "card", "upi"][Math.floor(Math.random() * 3)],
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        driver_name: Math.random() > 0.5 ? `Driver ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}` : null,
        distance: Math.random() * 50 + 2,
        duration: Math.floor(Math.random() * 120) + 10
      };
      mockRides.push(ride);
    }
    return mockRides;
  };

  // old
  // Also mock the stats fetch
  // const fetchStats = async () => {
  //   try {
  //     const adminToken = localStorage.getItem('admin_token');
  //     const response = await fetch('http://localhost:8000/admin/stats', {
  //       headers: {
  //         'X-Admin-Token': adminToken,
  //         'Content-Type': 'application/json'
  //       }
  //     });

  //     if (response.ok) {
  //       const data = await response.json();
  //       setStats(data);
  //     } else {
  //       // Fallback mock stats
  //       setStats({
  //         total_rides: 50,
  //         today_rides: 8,
  //         total_revenue: 12500.50,
  //         pending_payments: 12
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error fetching stats:", error);
  //     // Fallback mock stats
  //     setStats({
  //       total_rides: 50,
  //       today_rides: 8,
  //       total_revenue: 12500.50,
  //       pending_payments: 12
  //     });
  //   }
  // };

  const fetchStats = async () => {
    try {
      const adminToken = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:8000/admin/stats', {
        headers: { 'X-Admin-Token': adminToken }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        const error = await response.json();
        console.error('Stats error:', error);
        // Optionally set default stats
        setStats({ total_rides: 0, today_rides: 0, total_revenue: 0, pending_payments: 0 });
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
      setStats({ total_rides: 0, today_rides: 0, total_revenue: 0, pending_payments: 0 });
    }
  };

  // Add a test button to debug
  <div className="flex gap-3">
    <button
      onClick={() => {
        console.log('Admin Token:', localStorage.getItem('admin_token'));
        console.log('Is Admin:', localStorage.getItem('is_admin'));
        fetchRides();
      }}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
    >
      Test Fetch
    </button>
    <button
      onClick={fetchRides}
      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
    >
      Refresh
    </button>
    <button
      onClick={() => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('is_admin');
        setShowTokenInput(true);
      }}
      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
    >
      Logout
    </button>
  </div>

  const updateRideStatus = async (rideId, newStatus) => {
    console.log('Sending status:', newStatus);
    if (!window.confirm(`Change status to "${newStatus}"?`)) return;

    try {
      const adminToken = localStorage.getItem('admin_token');
      const response = await fetch(`http://localhost:8000/admin/rides/${rideId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken
        },
        body: JSON.stringify({ status: newStatus })
      });

      console.log('Response status:', response.status);
      const text = await response.text();
      console.log('Response body:', text);

      if (response.ok) {
        alert("Status updated successfully!");
        fetchRides();   // refresh the list
      } else {
        alert("Failed to update status: " + text);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert("Error updating status");
    }
  };

  // Update payment status
  const updatePaymentStatus = async (rideId, newPaymentStatus) => {
    if (!window.confirm(`Change payment status to "${newPaymentStatus}"?`)) return;

    try {
      const adminToken = localStorage.getItem('admin_token');
      const response = await fetch(`http://localhost:8000/admin/rides/${rideId}/payment-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken
        },
        body: JSON.stringify({ payment_status: newPaymentStatus })
      });

      if (response.ok) {
        alert("Payment status updated successfully!");
        fetchRides();
      } else {
        alert("Failed to update payment status");
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Error updating payment status");
    }
  };

  // Filter rides
  useEffect(() => {
    let filtered = rides;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ride => ride.status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(ride => ride.payment_status === paymentFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ride =>
        ride.id.toString().includes(term) ||
        (ride.user_id && ride.user_id.toLowerCase().includes(term)) ||
        (ride.pickup_address && ride.pickup_address.toLowerCase().includes(term)) ||
        (ride.drop_address && ride.drop_address.toLowerCase().includes(term))
      );
    }

    setFilteredRides(filtered);
  }, [rides, statusFilter, paymentFilter, searchTerm]);

  // Check authentication on mount
  useEffect(() => {
    if (adminToken) {
      fetchRides();
    }
  }, []);

  if (showTokenInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-2 p-2">
        {/* <Navbar /> */}
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700">
            <h2 className="text-2xl font-bold mb-6">Admin Login Required</h2>
            <p className="text-gray-400 mb-6">You need to login as admin to access this page</p>
            <button
              onClick={handleAdminLogin}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
            >
              Go to Admin Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* <Navbar /> */}

      <div className="pt-24 px-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400">Manage rides and payments</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchRides}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowTokenInput(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm mb-1">Search</label>
            <input
              type="text"
              placeholder="Search rides..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
            >
              <option value="all">All Statuses</option>
              <option value="requested">Requested</option>
              <option value="driver_assigned">Accepted</option>
              <option value="in_progress">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Payment Status</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
            >
              <option value="all">All Payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter('all');
                setPaymentFilter('all');
                setSearchTerm('');
              }}
              className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Stats */}
        {rides.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
              <div className="text-sm text-gray-400">Cancelled Rides</div>
            </div>
          </div>
        )}

        {/* Rides Table */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="py-3 px-4 text-left">Ride ID</th>
                  <th className="py-3 px-4 text-left">User ID</th>
                  <th className="py-3 px-4 text-left">Pickup</th>
                  <th className="py-3 px-4 text-left">Drop</th>
                  <th className="py-3 px-4 text-left">Amount</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Payment</th>
                  <th className="py-3 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredRides.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-gray-400">
                      No rides found
                    </td>
                  </tr>
                ) : (
                  filteredRides.map((ride) => (
                    <tr key={ride.id} className="border-t border-gray-700 hover:bg-gray-800/70">
                      <td className="py-3 px-4">#{ride.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-300">{ride.user_id?.slice(0, 8)}...</td>
                      <td className="py-3 px-4 max-w-xs truncate">{ride.pickup_address}</td>
                      <td className="py-3 px-4 max-w-xs truncate">{ride.drop_address}</td>
                      <td className="py-3 px-4 font-bold text-green-400">₹{ride.estimated_price}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${ride.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            ride.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                              ride.status === 'ongoing' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-yellow-500/20 text-yellow-400'
                            }`}>
                            {ride.status}
                          </span>
                          <select
                            value={ride.status}
                            onChange={(e) => updateRideStatus(ride.id, e.target.value)}
                            className="text-xs bg-gray-900 border border-gray-700 rounded px-1 py-0.5"
                          >
                            <option value="requested">Requested</option>
                            <option value="driver_assigned">Accepted</option>   {/* ✅ changed */}
                            <option value="in_progress">Ongoing</option>        {/* ✅ changed */}
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${ride.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' :
                            ride.payment_status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              ride.payment_status === 'refunded' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-yellow-500/20 text-yellow-400'
                            }`}>
                            {ride.payment_status}
                          </span>
                          <select
                            value={ride.payment_status}
                            onChange={(e) => updatePaymentStatus(ride.id, e.target.value)}
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
                            onClick={() => navigate(`/rides/${ride.id}`)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                          >
                            View
                          </button>
                          <button
                            onClick={() => window.open(`http://localhost:8000/receipts/${ride.id}/download`, '_blank')}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
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

        {/* Admin Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
            <h3 className="font-bold mb-2">Payment Management</h3>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  const response = await fetch('http://localhost:8000/admin/pending-payments?hours=48', {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                  });
                  const data = await response.json();
                  alert(`Found ${data.length} pending payments in last 48 hours`);
                }}
                className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm"
              >
                Check Pending Payments
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('Clean up payments older than 7 days?')) {
                    const response = await fetch('http://localhost:8000/admin/cleanup-stuck-payments?days_old=7', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${adminToken}` }
                    });
                    const data = await response.json();
                    alert(data.message);
                  }
                }}
                className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
              >
                Cleanup Stuck Payments
              </button>
            </div>
          </div>

          <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
            <h3 className="font-bold mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const rideId = prompt("Enter Ride ID to generate receipt:");
                  if (rideId) {
                    window.open(`http://localhost:8000/receipts/${rideId}/download`, '_blank');
                  }
                }}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
              >
                Generate Receipt
              </button>
              <button
                onClick={() => {
                  const rideId = prompt("Enter Ride ID to send email:");
                  const email = prompt("Enter email address:");
                  if (rideId && email) {
                    fetch(`http://localhost:8000/receipts/${rideId}/send-email`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    }).then(() => alert('Email sent!'));
                  }
                }}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
              >
                Send Receipt Email
              </button>
            </div>
          </div>

          <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
            <h3 className="font-bold mb-2">Reports</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const paidRides = rides.filter(r => r.payment_status === 'paid');
                  const totalRevenue = paidRides.reduce((sum, ride) => sum + parseFloat(ride.estimated_price || 0), 0);
                  alert(`Total Revenue: ₹${totalRevenue.toFixed(2)}\nPaid Rides: ${paidRides.length}`);
                }}
                className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm"
              >
                Revenue Report
              </button>
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayRides = rides.filter(r => r.created_at.includes(today));
                  alert(`Today's Rides: ${todayRides.length}\nCompleted: ${todayRides.filter(r => r.status === 'completed').length}`);
                }}
                className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm"
              >
                Today's Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}