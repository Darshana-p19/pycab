import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import RideMap from "../components/RideMap";
import Navbar from "../components/Navbar";

export default function BookRide() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // User
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);

  // Form
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [pickupCoords, setPickupCoords] = useState({ lat: 19.0760, lng: 72.8777 });
  const [dropCoords, setDropCoords] = useState({ lat: 19.2183, lng: 72.9781 });

  // Autocomplete suggestions
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropSuggestions, setShowDropSuggestions] = useState(false);

  // Refs for click-outside detection
  const pickupRef = useRef();
  const dropRef = useRef();

  // Ride details
  const [rideDetails, setRideDetails] = useState(null);
  const [history, setHistory] = useState([]);
  const [suggestions] = useState([
    { id: 1, name: "Airport", address: "Mumbai Airport, Andheri", lat: 19.0896, lng: 72.8656 },
    { id: 2, name: "Railway Station", address: "Mumbai CST, Fort", lat: 18.9400, lng: 72.8356 },
    { id: 3, name: "Shopping Mall", address: "Phoenix Marketcity, Kurla", lat: 19.0708, lng: 72.8798 },
    { id: 4, name: "University", address: "IIT Bombay, Powai", lat: 19.1334, lng: 72.9133 },
    { id: 5, name: "Beach", address: "Juhu Beach, Juhu", lat: 19.1075, lng: 72.8263 },
  ]);

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setUserId(data.user?.id);

      if (data.user) {
        fetchRideHistory(data.user.id);
      } else {
        navigate("/login");
      }
    };
    loadUser();
  }, []);

  // Fetch ride history
  const fetchRideHistory = async (uid) => {
    try {
      const response = await fetch(`http://localhost:8000/rides/history/${uid}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.slice(0, 3));
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  // --- Autocomplete logic ---
  const fetchSuggestions = async (query, type) => {
    if (query.length < 3) {
      type === "pickup" ? setPickupSuggestions([]) : setDropSuggestions([]);
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1`,
        {
          headers: { "User-Agent": "PyCabApp/1.0" }, // required by Nominatim
        }
      );
      const data = await response.json();
      const formatted = data.map((item) => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));
      if (type === "pickup") {
        setPickupSuggestions(formatted);
        setShowPickupSuggestions(true);
      } else {
        setDropSuggestions(formatted);
        setShowDropSuggestions(true);
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    }
  };

  // Debounce function
  const debounceTimer = useRef(null);
  const handlePickupChange = (e) => {
    const value = e.target.value;
    setPickup(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value, "pickup");
    }, 500);
  };

  const handleDropChange = (e) => {
    const value = e.target.value;
    setDrop(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value, "drop");
    }, 500);
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion, type) => {
    if (type === "pickup") {
      setPickup(suggestion.display_name);
      setPickupCoords({ lat: suggestion.lat, lng: suggestion.lon });
      setShowPickupSuggestions(false);
    } else {
      setDrop(suggestion.display_name);
      setDropCoords({ lat: suggestion.lat, lng: suggestion.lon });
      setShowDropSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickupRef.current && !pickupRef.current.contains(event.target)) {
        setShowPickupSuggestions(false);
      }
      if (dropRef.current && !dropRef.current.contains(event.target)) {
        setShowDropSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Geocode using Nominatim (fallback if user doesn't select a suggestion)
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}&limit=1`,
        { headers: { "User-Agent": "PyCabApp/1.0" } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    } catch (err) {
      console.error("Geocoding error:", err);
    }
    return null;
  };

  // Get estimate (with geocoding if needed)
  const getEstimate = async () => {
    if (!pickup || !drop) {
      setError("Please enter both pickup and drop locations");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // If coordinates are not set (user typed without selecting), geocode them
      let pCoords = pickupCoords;
      let dCoords = dropCoords;

      // Check if the current coordinates correspond to the entered text
      // This is a simple heuristic – you might improve it by storing a flag when suggestion is selected
      if (!pCoords.lat || Math.abs(pCoords.lat - 19.0760) < 0.001) {
        const geocoded = await geocodeAddress(pickup);
        if (geocoded) pCoords = geocoded;
      }
      if (!dCoords.lat || Math.abs(dCoords.lat - 19.2183) < 0.001) {
        const geocoded = await geocodeAddress(drop);
        if (geocoded) dCoords = geocoded;
      }

      setPickupCoords(pCoords);
      setDropCoords(dCoords);

      const response = await fetch("http://localhost:8000/rides/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup_lat: pCoords.lat,
          pickup_lng: pCoords.lng,
          drop_lat: dCoords.lat,
          drop_lng: dCoords.lng,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to get estimate");

      setRideDetails({
        pickup,
        drop,
        pickupCoords: pCoords,
        dropCoords: dCoords,
        ...data,
        user_id: userId,
      });

      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Book ride
  const confirmAndBook = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/rides/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          pickup_address: pickup,
          drop_address: drop,
          pickup_lat: pickupCoords.lat,
          pickup_lng: pickupCoords.lng,
          drop_lat: dropCoords.lat,
          drop_lng: dropCoords.lng,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to book ride");

      setRideDetails((prev) => ({ ...prev, ride_id: data.ride_id }));
      setStep(3);
      fetchRideHistory(userId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle payment
  const processPayment = () => {
    navigate(`/payment/${rideDetails.ride_id}`, {
      state: { rideDetails: { ...rideDetails, user_id: userId } },
    });
  };

  // Reset
  const resetBooking = () => {
    setStep(1);
    setPickup("");
    setDrop("");
    setRideDetails(null);
    setError("");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <Navbar user={user} />

      <div className="max-w-6xl mx-auto">
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-6">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${step >= stepNum ? "bg-blue-600" : "bg-gray-700"}
                    ${step === stepNum ? "ring-4 ring-blue-400" : ""}
                  `}
                >
                  {stepNum}
                </div>
                <span className="mt-2 text-sm">
                  {stepNum === 1 ? "Locations" : stepNum === 2 ? "Confirm" : "Payment"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-lg">
            <div className="flex items-center">
              <span className="text-red-400 mr-2">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Step 1: Location Selection */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="bg-white/10 p-8 rounded-2xl border border-white/20">
                <h2 className="text-2xl font-bold mb-6">Book Your Ride 🚗</h2>

                <div className="space-y-6">
                  {/* Pickup with autocomplete */}
                  <div ref={pickupRef} className="relative">
                    <label className="block mb-2">Pickup Location</label>
                    <input
                      type="text"
                      placeholder="Enter pickup address"
                      className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={pickup}
                      onChange={handlePickupChange}
                      onFocus={() => pickupSuggestions.length > 0 && setShowPickupSuggestions(true)}
                    />
                    {showPickupSuggestions && pickupSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {pickupSuggestions.map((s, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm"
                            onClick={() => selectSuggestion(s, "pickup")}
                          >
                            {s.display_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Drop with autocomplete */}
                  <div ref={dropRef} className="relative">
                    <label className="block mb-2">Drop Location</label>
                    <input
                      type="text"
                      placeholder="Enter drop address"
                      className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={drop}
                      onChange={handleDropChange}
                      onFocus={() => dropSuggestions.length > 0 && setShowDropSuggestions(true)}
                    />
                    {showDropSuggestions && dropSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {dropSuggestions.map((s, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm"
                            onClick={() => selectSuggestion(s, "drop")}
                          >
                            {s.display_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={getEstimate}
                    disabled={loading || !pickup || !drop}
                    className="w-full mt-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 transition text-lg font-semibold"
                  >
                    {loading ? "Calculating..." : "Get Estimate"}
                  </button>
                </div>
              </div>

              {/* Real-time Map Display */}
              <div className="mt-6 bg-white/10 p-4 rounded-2xl">
                <RideMap pickup={pickupCoords} drop={dropCoords} isLive={true} />
                <div className="mt-4 text-center text-gray-300">
                  <p>📍 {pickup || "Pickup location not selected"}</p>
                  <p className="mt-2">🏁 {drop || "Drop location not selected"}</p>
                </div>
              </div>
            </div>

            {/* Sidebar - History & Suggestions */}
            <div className="space-y-6">
              {/* Ride History */}
              <div className="bg-white/10 p-6 rounded-2xl border border-white/20">
                <h3 className="text-lg font-bold mb-4">📜 Ride History</h3>
                {history.length > 0 ? (
                  <div className="space-y-4">
                    {history.map((ride) => (
                      <div key={ride.id} className="p-3 bg-gray-800/50 rounded-lg">
                        <div className="font-medium truncate">{ride.pickup_address}</div>
                        <div className="text-sm text-gray-400 truncate">→ {ride.drop_address}</div>
                        <div className="flex justify-between text-sm mt-2">
                          <span className="text-green-400">₹{ride.estimated_price}</span>
                          <span className="text-gray-500">{ride.estimated_distance_km} km</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    <p>No ride history yet</p>
                    <p className="text-sm mt-1">Book your first ride!</p>
                  </div>
                )}
              </div>

              {/* Popular Destinations */}
              <div className="bg-white/10 p-6 rounded-2xl border border-white/20">
                <h3 className="text-lg font-bold mb-4">💡 Popular Destinations</h3>
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => {
                        setDrop(suggestion.address);
                        setDropCoords({ lat: suggestion.lat, lng: suggestion.lng });
                      }}
                      className="w-full p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-left transition-all"
                    >
                      <div className="flex items-center">
                        <span className="mr-3 text-lg">
                          {suggestion.id === 1
                            ? "✈️"
                            : suggestion.id === 2
                            ? "🚉"
                            : suggestion.id === 3
                            ? "🛍️"
                            : suggestion.id === 4
                            ? "🎓"
                            : "🏖️"}
                        </span>
                        <div>
                          <div className="font-medium">{suggestion.name}</div>
                          <div className="text-sm text-gray-400 truncate">{suggestion.address}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Confirm Ride */}
        {step === 2 && rideDetails && (
          <div className="max-w-2xl mx-auto bg-white/10 p-8 rounded-2xl border border-white/20">
            <h2 className="text-2xl font-bold mb-6">Confirm Your Ride</h2>

            <div className="space-y-6">
              <div className="bg-gray-800/50 p-6 rounded-xl">
                <div className="flex items-start space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white">📍</span>
                    </div>
                    <div className="w-0.5 h-8 bg-gray-600 my-1"></div>
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white">🏁</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="mb-6">
                      <h3 className="text-gray-400 text-sm mb-1">PICKUP</h3>
                      <p className="text-lg">{rideDetails.pickup}</p>
                    </div>
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">DROP</h3>
                      <p className="text-lg">{rideDetails.drop}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-4">Ride Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Distance</span>
                    <span className="font-semibold">{rideDetails.distance_km} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Time</span>
                    <span className="font-semibold">~{Math.round(rideDetails.distance_km * 2)} mins</span>
                  </div>
                  <div className="pt-4 border-t border-white/20">
                    <div className="flex justify-between items-center text-2xl">
                      <span>Total Fare</span>
                      <span className="font-bold text-green-400">₹{rideDetails.estimated_price}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                >
                  Back
                </button>
                <button
                  onClick={confirmAndBook}
                  disabled={loading}
                  className="flex-1 py-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-700 transition"
                >
                  {loading ? "Booking..." : "Confirm & Book"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment Ready */}
        {step === 3 && rideDetails && (
          <div className="max-w-2xl mx-auto bg-white/10 p-8 rounded-2xl border border-white/20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold">Ride Booked Successfully! 🎉</h2>
              <p className="text-gray-400 mt-2">Ride ID: #{rideDetails.ride_id}</p>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-xl mb-6">
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-green-400">₹{rideDetails.estimated_price}</div>
                <div className="text-gray-400">Total amount to pay</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Pickup</span>
                  <span>{rideDetails.pickup}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Drop</span>
                  <span>{rideDetails.drop}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Distance</span>
                  <span>{rideDetails.distance_km} km</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={processPayment}
                className="w-full py-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-xl font-bold"
              >
                Proceed to Payment
              </button>
              <button
                onClick={resetBooking}
                className="w-full py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
              >
                Book Another Ride
              </button>
              <div className="text-center pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400">
                  Your ride will start immediately after successful payment
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}