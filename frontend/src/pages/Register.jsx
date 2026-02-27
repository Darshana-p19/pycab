import { useState, useRef } from "react";  
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  const lastSubmitTime = useRef(0);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    // Cooldown period: 30 seconds (30000 milliseconds)
    const COOLDOWN_PERIOD = 30000;  // ⬅️ Increased to 30 seconds
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTime.current;

    if (timeSinceLastSubmit < COOLDOWN_PERIOD) {
      const remainingTime = Math.ceil((COOLDOWN_PERIOD - timeSinceLastSubmit) / 1000);
      setError(`Please wait ${remainingTime} seconds before trying again.`);
      return;
    }

    if (loading) {
      return;
    }

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    // ⬇️ NEW: Generate a unique test email
    const testEmail = email.includes('+') ? email : `${email.split('@')[0]}+${Date.now()}@${email.split('@')[1]}`;

    console.log("Attempting to sign up with email:", testEmail);

    setLoading(true);
    lastSubmitTime.current = now;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,  // ⬅️ Use the test email
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Supabase signup error:", error);

        // ⬇️ SPECIFIC ERROR HANDLING
        if (error.message.includes('rate limit') || error.status === 429) {
          setError("Too many attempts for this email. Please wait 30 minutes or use a different email.");
        } else if (error.message.includes('already registered')) {
          setError("This email is already registered. Try logging in instead.");
        } else {
          setError(error.message);
        }
      } else {
        console.log("Signup successful, data:", data);
        alert(`Account created! Please check your email ${testEmail} for confirmation.`);
        navigate("/");
      }
    } catch (err) {
      console.error("Unexpected error during signup:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          Create Account
        </h1>
        <p className="text-gray-300 text-center mb-6">
          Join us and get started
        </p>

        {error && (
          <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="First Name"
              className="w-1/2 p-4 rounded-xl bg-white/20 text-white outline-none focus:ring-2 focus:ring-pink-400"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              className="w-1/2 p-4 rounded-xl bg-white/20 text-white outline-none focus:ring-2 focus:ring-pink-400"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <input
            type="email"
            placeholder="Email Address"
            className="w-full p-4 rounded-xl bg-white/20 text-white outline-none focus:ring-2 focus:ring-pink-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-4 rounded-xl bg-white/20 text-white outline-none focus:ring-2 focus:ring-pink-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full p-4 rounded-xl bg-white/20 text-white outline-none focus:ring-2 focus:ring-pink-400"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 shadow-lg"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6">
          Already have an account?{" "}
          <span
            className="text-pink-400 hover:underline cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}