import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Verify and refresh current user profile on load
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        } catch {
          // Token invalid or expired, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password });
    if (res.success && res.data) {
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return userData;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
