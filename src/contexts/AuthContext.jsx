// This file is no longer in use, but we'll keep it to avoid breaking imports if referenced elsewhere unexpectedly.
// All authentication logic is now handled by SupabaseAuthContext.
import React, { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
      // Fallback for components that might still be using this, though they shouldn't be.
      console.warn("Attempted to use the deprecated AuthContext. Please use SupabaseAuthContext.");
  }
  return context;
}

export function AuthProvider({ children }) {
    const value = {
        user: null,
        isAuthenticated: false,
        loading: true,
        login: () => console.error("Login function from deprecated AuthContext was called."),
        register: () => console.error("Register function from deprecated AuthContext was called."),
        logout: () => console.error("Logout function from deprecated AuthContext was called."),
        updateUser: () => console.error("UpdateUser function from deprecated AuthContext was called."),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}