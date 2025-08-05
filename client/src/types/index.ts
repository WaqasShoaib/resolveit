export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'panel_member';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street: string;
    city: string;
    zipCode: string;
  };
  photo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Case {
  _id: string;
  caseNumber: string;
  title: string;
  description: string;
  caseType: 'family' | 'business' | 'criminal' | 'civil' | 'other';
  status: 'registered' | 'under_review' | 'awaiting_response' | 'accepted' | 
          'witness_nomination' | 'panel_formation' | 'mediation_in_progress' | 
          'resolved' | 'unresolved' | 'cancelled';
  complainant: User;
  oppositeParty: {
    name: string;
    email?: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      zipCode: string;
    };
  };
  documents: CaseDocument[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isInCourt: boolean;
  courtDetails?: {
    caseNumber: string;
    courtName: string;
    firNumber?: string;
    policeStation?: string;
  };
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDocument {
  _id: string;
  fileName: string;
  originalName: string;
  fileType: 'image' | 'video' | 'audio' | 'document';
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  error?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}