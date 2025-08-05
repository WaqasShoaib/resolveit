'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, authAPI, RegisterData, UpdateProfileData } from '@/lib/api/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  register: (userData: RegisterData) => Promise<{ status: string; data: { user: User; token: string } }>;
  logout: () => void;
  updateProfile: (userData: UpdateProfileData) => Promise<{ status: string; data: { user: User } }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
        
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        // Invalid stored user data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await authAPI.register(userData);
      // Auto-login after successful registration
      login(response.data.token, response.data.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    // Redirect to home page after logout
    window.location.href = '/';
  };

  const updateProfile = async (userData: UpdateProfileData) => {
    try {
      const response = await authAPI.updateProfile(userData);
      // Update user state with new data
      setUser(response.data.user);
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response;
    } catch (error) {
      throw error;
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      updateProfile, 
      isLoading, 
      isAuthenticated 
    }}>
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