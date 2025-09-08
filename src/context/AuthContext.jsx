 import React, { createContext, useContext, useState, useEffect } from 'react';

// API base URL
const API_BASE_URL = 'http://localhost:5000/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check for stored authentication on app load
    const checkStoredAuth = () => {
      try {
        // Get current role from URL or default to customer
        const currentRole = getCurrentRoleFromPath();
        const roleKey = getRoleStorageKey(currentRole);
        
        const storedUser = localStorage.getItem(`${roleKey}_user`);
        const storedRole = localStorage.getItem(`${roleKey}_role`);
        const storedToken = localStorage.getItem(`${roleKey}_token`);
        
        if (storedUser && storedRole && storedToken) {
          const parsedUser = JSON.parse(storedUser);
            
          // Validate token is not expired
          try {
            const tokenPayload = JSON.parse(atob(storedToken.split('.')[1]));
            const currentTime = Date.now() / 1000;
            
            if (tokenPayload.exp && tokenPayload.exp > currentTime) {
              // Token is valid
              setUser(parsedUser);
              setRole(storedRole);
              setToken(storedToken);
              setIsAuthenticated(true);
              console.log(`✅ Authentication restored for ${storedRole} from localStorage`);
            } else {
              // Token expired, clear storage
              console.log(`⚠️ Token expired for ${storedRole}, clearing stored auth`);
              clearRoleStorage(storedRole);
            }
          } catch (tokenError) {
            console.error('Error parsing token:', tokenError);
            // Clear corrupted token data
            clearRoleStorage(storedRole);
          }
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        // Clear corrupted data
        clearAllRoleStorage();
      } finally {
        setAuthChecked(true);
      }
    };
    
    checkStoredAuth();
  }, []);

  // Helper function to get current role from URL path
  const getCurrentRoleFromPath = () => {
    const path = window.location.pathname;
    if (path.includes('/admin') && !path.includes('/super-admin')) return 'admin';
    if (path.includes('/super-admin')) return 'superadmin';
    return 'customer';
  };

  // Helper function to get storage key prefix for role
  const getRoleStorageKey = (role) => {
    switch (role) {
      case 'admin': return 'admin_auth';
      case 'superadmin': return 'superadmin_auth';
      default: return 'customer_auth';
    }
  };

  // Helper function to clear storage for specific role
  const clearRoleStorage = (role) => {
    const roleKey = getRoleStorageKey(role);
    localStorage.removeItem(`${roleKey}_user`);
    localStorage.removeItem(`${roleKey}_role`);
    localStorage.removeItem(`${roleKey}_token`);
  };

  // Helper function to clear all role storage
  const clearAllRoleStorage = () => {
    ['customer', 'admin', 'superadmin'].forEach(role => {
      clearRoleStorage(role);
    });
  };
  const login = (userData, userRole, authToken) => {
    console.log('🔐 Logging in user:', userData.name, 'Role:', userRole);
    
    // Clear any existing session for this role
    clearRoleStorage(userRole);
    
    // Store auth data with role-specific keys
    const roleKey = getRoleStorageKey(userRole);
    
    setUser(userData);
    setRole(userRole);
    setToken(authToken);
    setIsAuthenticated(true);
    localStorage.setItem(`${roleKey}_user`, JSON.stringify(userData));
    localStorage.setItem(`${roleKey}_role`, userRole);
    localStorage.setItem(`${roleKey}_token`, authToken);
  };

  const logout = () => {
    console.log(`🚪 Logging out ${role} user`);
    
    // Only clear storage for current role
    if (role) {
      clearRoleStorage(role);
    }
    
    setUser(null);
    setRole(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  // Switch between role sessions
  const switchRole = (targetRole) => {
    const roleKey = getRoleStorageKey(targetRole);
    const storedUser = localStorage.getItem(`${roleKey}_user`);
    const storedRole = localStorage.getItem(`${roleKey}_role`);
    const storedToken = localStorage.getItem(`${roleKey}_token`);
    
    if (storedUser && storedRole && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const tokenPayload = JSON.parse(atob(storedToken.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (tokenPayload.exp && tokenPayload.exp > currentTime) {
          setUser(parsedUser);
          setRole(storedRole);
          setToken(storedToken);
          setIsAuthenticated(true);
          console.log(`✅ Switched to ${targetRole} session`);
          return true;
        } else {
          clearRoleStorage(targetRole);
        }
      } catch (error) {
        clearRoleStorage(targetRole);
      }
    }
    return false;
  };
  // API helper function
  const apiCall = async (endpoint, options = {}) => {
    setIsLoading(true);
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      // Handle network errors gracefully
      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: 'Network error occurred' }));
        
        // Only logout on authentication errors, not on other errors
        if (response.status === 401 && data.message && data.message.includes('token')) {
          console.log(`🔒 Token expired or invalid for ${role}, logging out`);
          logout();
        }
        throw new Error(data.message || `API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ API call successful: ${endpoint}`, data.success ? 'Success' : 'Failed');
      return data;
    } catch (error) {
      // Handle network connection errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.warn('⚠️ Network connection error - backend may not be running:', endpoint);
        throw new Error('Unable to connect to server. Please ensure the backend is running.');
      }
      
      // Log other errors for debugging
      if (!error.message.includes('fetch') && !error.message.includes('Network')) {
        console.error(`API call error for ${endpoint}:`, error);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    role,
    token,
    isAuthenticated,
    isLoading,
    authChecked,
    login,
    logout,
    switchRole,
    apiCall
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};