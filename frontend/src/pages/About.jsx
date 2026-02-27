// pages/About.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";

export default function About() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    loadUser();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <Navbar user={user} />
      
      <div className="pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">About PyCab</h1>
            <p className="text-gray-400 text-lg">Revolutionizing transportation with technology</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white/10 p-8 rounded-2xl border border-white/20">
              <div className="text-4xl mb-4">🚕</div>
              <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
              <p className="text-gray-300">
                To provide safe, reliable, and affordable transportation for everyone. 
                We connect riders with drivers in real-time, making city travel seamless.
              </p>
            </div>

            <div className="bg-white/10 p-8 rounded-2xl border border-white/20">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold mb-4">Fast & Reliable</h3>
              <p className="text-gray-300">
                Average pickup time under 5 minutes. Real-time tracking, 
                estimated fares, and multiple payment options for your convenience.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-8 rounded-2xl mb-12">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
            <div className="space-y-4 text-gray-300">
              <p>
                Founded in 2024, PyCab started with a simple idea: making transportation 
                more accessible and efficient. Today, we serve thousands of customers 
                daily across multiple cities.
              </p>
              <p>
                Our platform uses advanced algorithms to match riders with the nearest 
                available drivers, ensuring minimal wait times and optimal routes.
              </p>
              <p>
                Safety is our top priority. All drivers undergo thorough background checks, 
                and every ride is tracked with GPS. We're committed to creating a secure 
                environment for both riders and drivers.
              </p>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold mb-8">Ready to Ride?</h2>
            <a
              href="/book"
              className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl text-lg font-bold transition-all transform hover:scale-105"
            >
              Book Your First Ride
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}