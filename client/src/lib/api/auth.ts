import apiClient from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  address: {
    street: string;
    city: string;
    zipCode: string;
  };
  email: string;
  phone: string;
  password: string;
}

export interface UpdateProfileData {
  name?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street: string;
    city: string;
    zipCode: string;
  };
  phone?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  age?: number;
  gender?: string;
  address?: {
    street: string;
    city: string;
    zipCode: string;
  };
  createdAt?: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async (): Promise<{ status: string; data: { user: User } }> => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (userData: UpdateProfileData): Promise<{ status: string; data: { user: User } }> => {
    const response = await apiClient.put('/auth/profile', userData);
    return response.data;
  },
};