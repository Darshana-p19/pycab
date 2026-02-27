// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = localStorage.getItem('is_admin') === 'true';
  const adminToken = localStorage.getItem('admin_token');
  
  // Check if route requires admin access
  if (adminOnly) {
    if (!adminToken || !isAdmin) {
      // Redirect to admin login with return URL
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    return children;
  }
  
  // Regular protected route
  if (!user.id) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}