import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../apis/auth.api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore session on mount
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const res = await authApi.getMe();
        if (mounted && res.success && res.user) {
          setUser(res.user);
        }
      } catch (err) {
        // Not authenticated yet, perfectly normal on initial load
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await authApi.login({ email, password });
      if (res.success && res.user) {
        setUser(res.user);
        return { success: true, user: res.user };
      }
      throw new Error(res.message || 'Login failed');
    } catch (err) {
      const message = err.message || 'Login failed. Please check credentials.';
      setError(message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout API warning:', err);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    refreshUser,
    isAdmin: user?.role === 'admin',
    isProjectManager: user?.role === 'project_manager',
    isTeamMember: user?.role === 'team_member',
    isViewer: user?.role === 'viewer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
