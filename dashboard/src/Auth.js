import React, { createContext, useState, useContext } from 'react';

// Create the AuthContext
const AuthContext = createContext(null);

// AuthProvider Component
export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Login function
  const login = (username, password) => {
    // Simple mock login - replace with actual authentication logic
    if (username === 'admin' && password === 'admin') {
      setIsLoggedIn(true);
      return true;
    }
    return false;
  };

  // Logout function
  const logout = () => {
    setIsLoggedIn(false);
  };

  // Context value
  const authContextValue = {
    isLoggedIn,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}