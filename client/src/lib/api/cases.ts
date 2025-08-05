import apiClient from './client';

export interface CreateCaseData {
  title: string;
  description: string;
  caseType: string;
  oppositeParty: {
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      zipCode: string;
    };
  };
  isInCourt: boolean;
  courtDetails?: {
    caseNumber: string;
    courtName: string;
    firNumber: string;
    policeStation: string;
  };
  priority: string;
  notes: string;
}

export interface CaseDocument {
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Case {
  _id: string;
  caseNumber: string;
  title: string;
  description: string;
  caseType: string;
  complainant: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  oppositeParty: {
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      zipCode: string;
    };
  };
  isInCourt: boolean;
  courtDetails?: {
    caseNumber: string;
    courtName: string;
    firNumber: string;
    policeStation: string;
  };
  status: string;
  documents: CaseDocument[];
  witnesses: any[];
  panelMembers: any[];
  priority: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CasesResponse {
  status: string;
  message: string;
  data: {
    cases: Case[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalCases: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface CaseResponse {
  status: string;
  message: string;
  data: {
    case: Case;
  };
}

export const casesAPI = {
  // Get all cases for the authenticated user
  getCases: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    caseType?: string;
    search?: string;
  }): Promise<CasesResponse> => {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.caseType) queryParams.append('caseType', params.caseType);
    if (params?.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/cases?${queryString}` : '/cases';
    
    const response = await apiClient.get(url);
    return response.data;
  },

  // Get specific case by ID
  getCaseById: async (caseId: string): Promise<CaseResponse> => {
    const response = await apiClient.get(`/cases/${caseId}`);
    return response.data;
  },

  // Create new case with file upload
  createCase: async (caseData: CreateCaseData, files?: FileList): Promise<CaseResponse> => {
    const formData = new FormData();
    
    // Add case data
    formData.append('caseData', JSON.stringify(caseData));
    
    // Add files if provided
    if (files) {
      for (let i = 0; i < files.length; i++) {
        formData.append('documents', files[i]);
      }
    }
    
    const response = await apiClient.post('/cases', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update case details
  updateCase: async (caseId: string, caseData: {
    title: string;
    description: string;
    caseType: string;
    priority: string;
    notes: string;
    oppositeParty: {
      name: string;
      email: string;
      phone: string;
      address: {
        street: string;
        city: string;
        zipCode: string;
      };
    };
  }): Promise<CaseResponse> => {
    const response = await apiClient.put(`/cases/${caseId}`, caseData);
    return response.data;
  },

  // Update case status
  updateCaseStatus: async (caseId: string, status: string): Promise<CaseResponse> => {
    const response = await apiClient.put(`/cases/${caseId}/status`, { status });
    return response.data;
  },

  // Add documents to existing case (KEEP ONLY THIS ONE)
  addDocuments: async (caseId: string, formData: FormData): Promise<CaseResponse> => {
    const response = await apiClient.post(`/cases/${caseId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete case (admin only)
  deleteCase: async (caseId: string): Promise<{ status: string; message: string }> => {
    const response = await apiClient.delete(`/cases/${caseId}`);
    return response.data;
  },

  // Get case statistics
  getCaseStats: async (): Promise<{
    status: string;
    data: {
      totalCases: number;
      activeCases: number;
      resolvedCases: number;
      pendingCases: number;
      casesByStatus: { [key: string]: number };
      casesByType: { [key: string]: number };
    };
  }> => {
    const response = await apiClient.get('/cases/stats');
    return response.data;
  },

  // Admin: Get all cases
  getAllCases: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    caseType?: string;
    search?: string;
  }): Promise<CasesResponse> => {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.caseType) queryParams.append('caseType', params.caseType);
    if (params?.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/admin/cases?${queryString}` : '/admin/cases';
    
    const response = await apiClient.get(url);
    return response.data;
  },
};