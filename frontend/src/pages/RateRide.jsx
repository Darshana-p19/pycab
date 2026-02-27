import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";

export default function RateRide() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [ride, setRide] = useState(null);
  const [rating, setRating] = useState(5);
  const [driverRating, setDriverRating] = useState(5); // ✅ ADDED missing state
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      
      if (userData.user) {
        await loadRideDetails(rideId);
      } else {
        navigate("/login");
      }
    };
    
    loadData();
  }, [rideId, navigate]);

  const loadRideDetails = async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/rides/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRide(data);
      } else {
        setMessage("❌ Ride not found");
      }
    } catch (error) {
      console.error("Error loading ride:", error);
      setMessage("❌ Failed to load ride details");
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async (e) => {
    e.preventDefault();
    
    if (!rating) {
      setMessage("Please select a rating");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:8000/ratings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ride_id: parseInt(rideId),
          rider_id: user.id,               // ✅ actual user ID from Supabase
          rating: rating,
          review: review || null
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage("✅ Thank you for your rating!");
        setTimeout(() => {
          navigate("/rides");
        }, 2000);
      } else {
        setMessage(`❌ Error: ${data.detail || "Failed to submit rating"}`);
      }
    } catch (error) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-24">
        <Navbar user={user} />
        <div className="flex justify-center items-center h-64">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-24 px-4">
      <Navbar user={user} />
      
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Rate Your Ride</h1>
          <p className="text-gray-400 mt-2">Share your experience with us</p>
        </div>

        {ride && (
          <div className="bg-white/10 p-6 rounded-2xl mb-6 border border-white/20">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚕</span>
              </div>
              <div>
                <h3 className="font-bold">Ride #{ride.id}</h3>
                <p className="text-sm text-gray-400">
                  {ride.pickup_address} → {ride.drop_address}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400">Distance</p>
                <p className="font-bold">{ride.estimated_distance_km} km</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400">Amount</p>
                <p className="font-bold text-green-400">₹{ride.estimated_price}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/10 p-8 rounded-2xl border border-white/20">
          <form onSubmit={submitRating} className="space-y-6">
            {/* Star Rating */}
            <div>
              <label className="block text-lg font-medium mb-4">
                How was your ride?
              </label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-4xl focus:outline-none transition-transform hover:scale-110"
                  >
                    {star <= rating ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
              <div className="text-center mt-2">
                <span className="text-gray-400">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </span>
              </div>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-lg font-medium mb-2">
                Your Review (Optional)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share details about your ride experience..."
                className="w-full h-32 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-400 mt-1">
                {review.length}/500 characters
              </div>
            </div>

            {/* Driver Rating (if applicable) */}
            {ride?.driver_id && (
              <div>
                <label className="block text-lg font-medium mb-2">
                  Rate Your Driver
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="text-2xl focus:outline-none"
                      onClick={() => setDriverRating(star)}
                    >
                      {star <= driverRating ? "🚗" : "🚙"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('✅') 
                  ? 'bg-green-900/30 border border-green-500 text-green-400' 
                  : 'bg-red-900/30 border border-red-500 text-red-400'
              }`}>
                {message}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate("/rides")}
                className="flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-800 transition"
              >
                {submitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}