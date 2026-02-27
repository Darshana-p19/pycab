import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "./lib/supabase";
import AdminLogin from "./pages/AdminLogin";
import PaymentManager from "./components/Admin/PaymentManager"
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import ReceiptPage from "./pages/ReceiptPage";

// import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BookRide from "./pages/BookRide";
import Payment from "./pages/Payment";
import RateRide from "./pages/RateRide";
import RidesPage from "./pages/RidesPage";
import About from "./pages/About";
import Contact from "./pages/Contact";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session error:", error);
          if (isMounted.current) {
            setLoading(false);
          }
          return;
        }

        if (isMounted.current) {
          setSession(data.session);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error getting session:", error);
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted.current) {
        setSession(session);
      }
    });

    return () => {
      isMounted.current = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
        {/* <Navbar user={session?.user} /> */}

        <div className="pt-16">
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/" element={session ? <Home /> : <Navigate to="/login" />} />
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!session ? <Register /> : <Navigate to="/" />} />
            <Route path="/book" element={session ? <BookRide /> : <Navigate to="/login" />} />
            <Route path="/payment/:rideId" element={session ? <Payment /> : <Navigate to="/login" />} />
            <Route path="/rate/:rideId" element={session ? <RateRide /> : <Navigate to="/login" />} />
            <Route path="/rides" element={session ? <RidesPage /> : <Navigate to="/login" />} />
            <Route path="/receipt/:rideId" element={session ? <ReceiptPage /> : <Navigate to="/login" />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

             <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}