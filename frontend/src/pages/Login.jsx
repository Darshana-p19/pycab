// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const navigate = useNavigate();

  // Check if we're already logged in
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      console.log("Already logged in:", data.session.user.email);
      navigate("/");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDebugInfo(null);

    console.log("Attempting login with:", { email, password });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        console.error("Login error:", error);
        
        // Check if user needs to sign up first
        if (error.message.includes("Invalid login credentials")) {
          setError("❌ No account found with this email. Please sign up first.");
          
          // Offer to create account
          if (window.confirm("No account found. Would you like to create one?")) {
            await handleSignUp();
          }
        } else {
          setError(`Error: ${error.message}`);
        }
      } else {
        console.log("✅ Login successful:", data);
        setDebugInfo({
          userId: data.user?.id,
          email: data.user?.email,
          session: !!data.session
        });
        
        // Create user profile in backend if needed
        await createUserProfile(data.user);
        
        // Navigate home
        navigate("/");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            first_name: "User",
            last_name: "Account"
          }
        }
      });

      if (error) {
        setError(`Sign up failed: ${error.message}`);
      } else {
        if (data.user?.identities?.length === 0) {
          // User already exists
          setError("✅ Account already exists! Please log in instead.");
        } else {
          setError("✅ Account created! Please check your email to confirm.");
          // Create user profile in backend
          await createUserProfile(data.user);
        }
      }
    } catch (err) {
      setError(`Sign up error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (user) => {
    try {
      // Create user profile in your backend database
      const response = await fetch("http://localhost:8000/users/create-from-supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabase_uid: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || "User",
          last_name: user.user_metadata?.last_name || "Account"
        })
      });

      if (!response.ok) {
        console.log("Note: User profile creation may have failed, but auth succeeded");
      }
    } catch (err) {
      console.log("Could not create user profile:", err);
    }
  };

  const testWithDemoAccount = async () => {
    setEmail("demo@example.com");
    setPassword("demopassword123");
    
    // Auto-submit after a delay
    setTimeout(() => {
      document.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true }));
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
        <h1 className="text-4xl font-bold text-white text-center mb-3">
          Welcome Back
        </h1>
        <p className="text-gray-300 text-center mb-6">
          {debugInfo ? `Logged in as: ${debugInfo.email}` : "Log in to continue"}
        </p>

        {error && (
          <div className={`p-4 rounded-lg mb-4 text-center ${
            error.includes("✅") ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input
              type="email"
              placeholder="Email address"
              className="w-full p-4 rounded-xl bg-white/20 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              className="w-full p-4 rounded-xl bg-white/20 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 shadow-lg disabled:opacity-50"
          >
            {loading ? "Processing..." : "Login"}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleSignUp}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold hover:from-purple-700 hover:to-pink-600 transition-all duration-300"
          >
            Create New Account
          </button>

          <button
            onClick={testWithDemoAccount}
            className="w-full py-2 text-sm text-gray-400 hover:text-white"
          >
            Use Demo Account (demo@example.com / demopassword123)
          </button>

          <button
            onClick={async () => {
              const { data } = await supabase.auth.getSession();
              alert(`Session: ${JSON.stringify(data, null, 2)}`);
            }}
            className="w-full text-sm text-gray-400 hover:text-white"
          >
            Debug: Check Current Session
          </button>
        </div>

        <p className="text-center text-gray-400 mt-6">
          Don't have an account?{" "}
          <span
            className="text-indigo-400 hover:underline cursor-pointer"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>

        {debugInfo && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}