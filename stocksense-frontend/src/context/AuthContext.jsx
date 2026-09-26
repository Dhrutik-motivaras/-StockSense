import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('stocksense_access_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('stocksense_user');
    const savedToken = localStorage.getItem('stocksense_access_token');
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await api.post('auth/login/', { username, password });
    const { user: userData, tokens } = res.data;
    localStorage.setItem('stocksense_access_token', tokens.access);
    localStorage.setItem('stocksense_refresh_token', tokens.refresh);
    localStorage.setItem('stocksense_user', JSON.stringify(userData));
    setUser(userData);
    setToken(tokens.access);
    return userData;
  };

  const register = async (formData) => {
    const res = await api.post('auth/register/', formData);
    const { user: userData, tokens } = res.data;
    localStorage.setItem('stocksense_access_token', tokens.access);
    localStorage.setItem('stocksense_refresh_token', tokens.refresh);
    localStorage.setItem('stocksense_user', JSON.stringify(userData));
    setUser(userData);
    setToken(tokens.access);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('stocksense_access_token');
    localStorage.removeItem('stocksense_refresh_token');
    localStorage.removeItem('stocksense_user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
