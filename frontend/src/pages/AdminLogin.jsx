// src/pages/AdminLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // Default admin passwords for development
    const validPasswords = ["admin123", "admin-secret-token", "admin"];

    if (validPasswords.includes(password)) {
      localStorage.setItem('admin_token', 'admin-secret-token');
      localStorage.setItem('is_admin', 'true');
      alert("✅ Admin logged in successfully!");
      navigate("/admin");
      localStorage.setItem('admin_token', 'pycab-admin-20260204121501-W_grgKNKnHwXabNvpNgd');
    } else {
      setError("Invalid admin password");
    }
  };

  // Logout function
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_username');
      navigate('/admin/login');
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-24 px-4">
      {/* <Navbar /> */}

      <div className="max-w-md mx-auto mt-10">
        <div className="bg-white/10 p-8 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block mb-2">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter admin password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500 text-red-400 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
            >
              Login as Admin
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2"
            >
              <span>🚪</span>
              Logout
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}