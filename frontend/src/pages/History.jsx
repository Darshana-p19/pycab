// pages/History.jsx
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function History() {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    const sample = [
      { id: 1, pickup: "Airport", drop: "City Center", date: "2025-11-02" },
      { id: 2, pickup: "Home", drop: "Mall", date: "2025-11-01" },
      { id: 3, pickup: "Office", drop: "Railway Station", date: "2025-10-29" },
    ];
    setRides(sample);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-24 px-4">
      <Navbar />

      <h2 className="text-3xl font-bold text-center mb-8">Ride History 📜</h2>

      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        {rides.map((r) => (
          <div
            key={r.id}
            className="bg-white/10 backdrop-blur-lg p-5 rounded-xl border border-white/10 hover:bg-white/20 transition cursor-pointer"
          >
            <p className="text-lg">
              <span className="font-semibold text-blue-400">Pickup:</span> {r.pickup}
            </p>
            <p className="text-lg">
              <span className="font-semibold text-blue-400">Drop:</span> {r.drop}
            </p>
            <p className="text-sm text-gray-300 mt-2">{r.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
