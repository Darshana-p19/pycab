import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Navbar({ user }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
    navigate('/login');
  };

  return (
    <nav className="bg-gradient-to-r from-slate-900 to-purple-900 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold">🚕 PyCab</span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center space-x-6">
          <Link
            to="/"
            className="hover:text-yellow-300 transition-colors font-medium"
          >
            Home
          </Link>

          <Link
            to="/book"
            className="hover:text-yellow-300 transition-colors font-medium"
          >
            Book Ride
          </Link>

          {user && (
            <Link
              to="/rides"
              className="hover:text-yellow-300 transition-colors font-medium"
            >
              My Rides
            </Link>
          )}

          <Link
            to="/about"
            className="hover:text-yellow-300 transition-colors font-medium"
          >
            About
          </Link>

          <Link
            to="/contact"
            className="hover:text-yellow-300 transition-colors font-medium"
          >
            Contact
          </Link>
        </div>

        {/* User Section */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden md:inline text-sm font-medium">
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg border border-white hover:bg-white hover:text-black transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}