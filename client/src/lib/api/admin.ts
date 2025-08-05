// /client/src/lib/api/admin.ts
import apiClient from './client';

export interface AdminDashboardStats {
  overview: {
    totalCases: number;
    totalUsers: number;
    activeCases: number;
    resolvedCases: number;
    recentCases: number;
  };
  breakdowns: {
    byStatus: Array<{ _id: string; count: number }>;
    byType: Array<{ _id: string; count: number }>;
    byPriority: Array<{ _id: string; count: number }>;
  };
}

export interface AdminCase {
  _id: string;
  caseNumber: string;
  title: string;
  description: string;
  caseType: string;
  status: string;
  priority: string;
  complainant: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  oppositeParty: {
    name: string;
    email?: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCases?: number;
  totalUsers?: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const adminAPI = {
  // Get dashboard statistics
  getDashboardStats: async (): Promise<{ status: string; data: AdminDashboardStats }> => {
    const response = await apiClient.get('/api/admin/dashboard/stats');
    return response.data;
  },

  // Get all cases for admin
  getAllCases: async (params?: {
    status?: string;
    caseType?: string;
    priority?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ status: string; data: { cases: AdminCase[]; pagination: PaginationInfo } }> => {
    const response = await apiClient.get('/api/admin/cases', { params });
    return response.data;
  },

  // Update case status as admin
  updateCaseStatus: async (
    caseId: string, 
    data: { status: string; notes?: string; adminAction?: string }
  ): Promise<{ status: string; data: { case: AdminCase }; message: string }> => {
    const response = await apiClient.put(`/api/admin/cases/${caseId}/status`, data);
    return response.data;
  },

  // Get all users for admin
  getAllUsers: async (params?: {
    role?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ status: string; data: { users: AdminUser[]; pagination: PaginationInfo } }> => {
    const response = await apiClient.get('/api/admin/users', { params });
    return response.data;
  }
};