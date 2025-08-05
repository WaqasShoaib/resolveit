'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { casesAPI } from '@/lib/api/cases';

interface CaseDocument {
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface Case {
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

const CaseDetails: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (caseId) {
      fetchCaseDetails();
    }
  }, [caseId]);

  const fetchCaseDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await casesAPI.getCaseById(caseId);
      setCaseData(response.data.case);
    } catch (error: any) {
      console.error('Error fetching case details:', error);
      setError(error.response?.data?.message || 'Failed to load case details');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    const statusClasses: { [key: string]: string } = {
      'registered': 'bg-blue-100 text-blue-800',
      'under_review': 'bg-yellow-100 text-yellow-800',
      'awaiting_response': 'bg-orange-100 text-orange-800',
      'accepted': 'bg-green-100 text-green-800',
      'panel_created': 'bg-purple-100 text-purple-800',
      'mediation_in_progress': 'bg-indigo-100 text-indigo-800',
      'resolved': 'bg-emerald-100 text-emerald-800',
      'unresolved': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800',
    };
    
    return `${baseClasses} ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`;
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      'low': 'text-green-600',
      'medium': 'text-yellow-600',
      'high': 'text-red-600',
      'urgent': 'text-red-700 font-bold',
    };
    return colors[priority] || 'text-gray-600';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('doc')) return '📝';
    return '📁';
  };

  const handleDownloadFile = (fileName: string) => {
    const link = document.createElement('a');
    link.href = `/api/cases/documents/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <div className="bg-white shadow-lg rounded-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={() => router.push('/dashboard/cases')}
              className="btn-primary"
            >
              Back to Cases
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Case not found</p>
          <button 
            onClick={() => router.push('/dashboard/cases')}
            className="btn-primary"
          >
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <button
                    onClick={() => router.push('/dashboard/cases')}
                    className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <span className="text-xl">←</span>
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{caseData.title}</h1>
                    <p className="mt-1 text-lg text-gray-600">
                      Case #{caseData.caseNumber}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 lg:mt-0 lg:ml-4 flex flex-col sm:flex-row gap-3">
                <span className={getStatusBadge(caseData.status)}>
                  {caseData.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`inline-flex items-center px-3 py-1 text-sm font-medium ${getPriorityColor(caseData.priority)}`}>
                  🔥 {caseData.priority.toUpperCase()} PRIORITY
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              <p className="text-gray-700 text-lg leading-relaxed">{caseData.description}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-0 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'parties', label: 'Parties', icon: '👥' },
                { id: 'documents', label: 'Documents', icon: '📁' },
                { id: 'timeline', label: 'Timeline', icon: '⏰' },
                { id: 'legal', label: 'Legal Status', icon: '⚖️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Case Type</h3>
                    <p className="text-blue-800 text-lg capitalize">{caseData.caseType}</p>
                  </div>
                  <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">Created</h3>
                    <p className="text-green-800 text-lg">{new Date(caseData.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-purple-50 border-l-4 border-purple-400 p-6 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">Documents</h3>
                    <p className="text-purple-800 text-lg">{caseData.documents.length} files</p>
                  </div>
                  <div className="bg-orange-50 border-l-4 border-orange-400 p-6 rounded-lg">
                    <h3 className="font-semibold text-orange-900 mb-2">Last Updated</h3>
                    <p className="text-orange-800 text-lg">{new Date(caseData.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {caseData.notes && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="mr-2">📝</span>
                      Additional Notes
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{caseData.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Parties Tab */}
            {activeTab === 'parties' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Complainant */}
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="font-bold text-blue-900 mb-4 flex items-center text-xl">
                      <span className="mr-2">👤</span>
                      Complainant
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-blue-800">Name:</span>
                        <span className="ml-2 text-blue-700">{caseData.complainant.name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-800">Email:</span>
                        <span className="ml-2 text-blue-700">{caseData.complainant.email}</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-800">Phone:</span>
                        <span className="ml-2 text-blue-700">{caseData.complainant.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Opposite Party */}
                  <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                    <h3 className="font-bold text-red-900 mb-4 flex items-center text-xl">
                      <span className="mr-2">👤</span>
                      Opposite Party
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-red-800">Name:</span>
                        <span className="ml-2 text-red-700">{caseData.oppositeParty.name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-red-800">Email:</span>
                        <span className="ml-2 text-red-700">{caseData.oppositeParty.email}</span>
                      </div>
                      <div>
                        <span className="font-medium text-red-800">Phone:</span>
                        <span className="ml-2 text-red-700">{caseData.oppositeParty.phone}</span>
                      </div>
                      <div className="pt-2">
                        <span className="font-medium text-red-800">Address:</span>
                        <div className="text-red-700 mt-1">
                          <p>{caseData.oppositeParty.address.street}</p>
                          <p>{caseData.oppositeParty.address.city}, {caseData.oppositeParty.address.zipCode}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-8">
                {caseData.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {caseData.documents.map((doc, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-3 mb-3">
                          <span className="text-3xl">{getFileIcon(doc.fileType)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate" title={doc.originalName}>
                              {doc.originalName}
                            </p>
                            <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadFile(doc.fileName)}
                          className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          📥 Download
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">📁</span>
                    </div>
                    <p className="text-xl text-gray-500">No documents uploaded yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white text-lg shadow-md">
                      📝
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-medium text-gray-900">Case Registered</p>
                      <p className="text-sm text-gray-500">
                        {new Date(caseData.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white text-lg shadow-md">
                      📅
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-medium text-gray-900">Last Updated</p>
                      <p className="text-sm text-gray-500">
                        {new Date(caseData.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Legal Tab */}
            {activeTab === 'legal' && (
              <div className="space-y-6">
                <div className={`rounded-lg p-6 border ${caseData.isInCourt ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <h3 className={`font-bold mb-4 text-xl flex items-center ${caseData.isInCourt ? 'text-red-900' : 'text-green-900'}`}>
                    <span className="mr-2">⚖️</span>
                    Court/Legal Status
                  </h3>
                  
                  <div className="mb-4">
                    <p className="text-lg">
                      <span className="font-medium">Case pending in court/police:</span>
                      <span className={`ml-2 font-bold ${caseData.isInCourt ? 'text-red-600' : 'text-green-600'}`}>
                        {caseData.isInCourt ? '🚨 YES' : '✅ NO'}
                      </span>
                    </p>
                  </div>

                  {caseData.isInCourt && caseData.courtDetails && (
                    <div className="bg-white rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium text-gray-700">Court Case Number:</p>
                          <p className="text-gray-600">{caseData.courtDetails.caseNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Court Name:</p>
                          <p className="text-gray-600">{caseData.courtDetails.courtName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">FIR Number:</p>
                          <p className="text-gray-600">{caseData.courtDetails.firNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Police Station:</p>
                          <p className="text-gray-600">{caseData.courtDetails.policeStation || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!caseData.isInCourt && (
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-green-700 font-medium">
                        ✅ This case is not currently pending in any court or police station, making it suitable for mediation through our platform.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/cases')}
              className="btn-secondary w-full sm:w-auto"
            >
              ← Back to Cases
            </button>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {user?.id === caseData.complainant._id && (
                <>
                  <button 
                    onClick={() => router.push(`/dashboard/cases/${caseId}/documents`)}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    📎 Add Documents
                  </button>
                  <button 
                    onClick={() => router.push(`/dashboard/cases/${caseId}/edit`)}
                    className="btn-primary w-full sm:w-auto"
                  >
                    ✏️ Update Case
                  </button>
                </>
              )}
              
              {user?.role === 'admin' && (
                <button className="btn-primary w-full sm:w-auto">
                  🛠️ Manage Case
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CaseDetails;