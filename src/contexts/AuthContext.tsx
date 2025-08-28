import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface User {
  id: string;
  full_name: string;
  display_name: string;
  email: string;
  contact_number: string;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
  is_verified: boolean;
  role: "admin" | "teacher" | "student";
}

interface AuthState {
  user: User | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (userData: { user: User; token: string; role: string }) => void;
  logout: () => void;
  verifyAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_COOKIE = 'auth_token';
const USER_COOKIE = 'auth_user';
const ROLE_COOKIE = 'auth_role';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    role: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Verify authentication with backend
  const verifyAuth = async () => {
    const token = Cookies.get(TOKEN_COOKIE);
    
    if (!token) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/role`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userStr = Cookies.get(USER_COOKIE);
        
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            setAuthState({
              user,
              token,
              role: data.role,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          } catch (error) {
            console.error('Failed to parse user data from cookie:', error);
          }
        }
      } else {
        // Token is invalid, clear cookies
        Cookies.remove(TOKEN_COOKIE);
        Cookies.remove(USER_COOKIE);
        Cookies.remove(ROLE_COOKIE);
      }
    } catch (error) {
      console.error('Failed to verify authentication:', error);
      // Clear cookies on error
      Cookies.remove(TOKEN_COOKIE);
      Cookies.remove(USER_COOKIE);
      Cookies.remove(ROLE_COOKIE);
    }

    setAuthState(prev => ({ ...prev, isLoading: false }));
  };

  // Initialize auth state from cookies and verify with backend on mount
  useEffect(() => {
    const token = Cookies.get(TOKEN_COOKIE);
    const userStr = Cookies.get(USER_COOKIE);
    const role = Cookies.get(ROLE_COOKIE);

    if (token && userStr && role) {
      try {
        const user = JSON.parse(userStr);
        // Set initial state from cookies
        setAuthState({
          user,
          token,
          role,
          isAuthenticated: true,
          isLoading: true,
        });
        // Then verify with backend
        verifyAuth();
      } catch (error) {
        console.error('Failed to parse user data from cookie:', error);
        // Clear invalid cookies
        Cookies.remove(TOKEN_COOKIE);
        Cookies.remove(USER_COOKIE);
        Cookies.remove(ROLE_COOKIE);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = (userData: { user: User; token: string; role: string }) => {
    // Set cookies with expiration (7 days)
    Cookies.set(TOKEN_COOKIE, userData.token, { expires: 7 });
    Cookies.set(USER_COOKIE, JSON.stringify(userData.user), { expires: 7 });
    Cookies.set(ROLE_COOKIE, userData.role, { expires: 7 });

    // Update state
    setAuthState({
      user: userData.user,
      token: userData.token,
      role: userData.role,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = () => {
    // Clear cookies
    Cookies.remove(TOKEN_COOKIE);
    Cookies.remove(USER_COOKIE);
    Cookies.remove(ROLE_COOKIE);

    // Reset state
    setAuthState({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        verifyAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Authentication guard hook
export const useAuthGuard = (allowedRoles: string[]) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  
  return {
    isAuthenticated,
    isAuthorized: isAuthenticated && role ? allowedRoles.includes(role) : false,
    isLoading,
  };
};
