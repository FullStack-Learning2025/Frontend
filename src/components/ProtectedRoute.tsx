import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles: string[];
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  redirectPath = '/login',
}) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C3AED]"></div>
      </div>
    );
  }

  // Redirect to appropriate dashboard if user is on root path
  useEffect(() => {
    if (isAuthenticated && location.pathname === '/') {
      if (role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else if (role === 'teacher') {
        window.location.href = '/teacher/dashboard';
      } else if (role === 'student') {
        window.location.href = '/student/dashboard';
      }
    }
  }, [isAuthenticated, location.pathname, role]);

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Check if user has the required role
  if (role && allowedRoles.includes(role)) {
    // User has an allowed role, render the child routes
    return <Outlet />;
  }

  // User is authenticated but doesn't have the required role
  // Redirect based on their actual role to prevent unauthorized access
  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />;
  } else if (role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }

  // Fallback to login if something is wrong
  return <Navigate to={redirectPath} replace />;
};

export default ProtectedRoute;
