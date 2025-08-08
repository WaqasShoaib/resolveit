'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { casesAPI } from '@/lib/api/cases';

interface Case {
  _id: string;
  caseNumber: string;
  title: string;
  complainant: {
    _id: string;
    name: string;
  };
  documents: any[];
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const AddDocumentsForm: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [selectedFiles, setSelectedFiles] = useState<FileWithProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // File validation constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_FILES = 5;
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'video/mp4', 'video/avi', 'video/mov',
    'audio/mp3', 'audio/wav', 'audio/m4a',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

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
      const case_data = response.data.case;
      
      // Check if user is authorized
      const userIdStr = user?.id?.toString() || (user as any)?._id?.toString();
      const complainantIdStr = case_data.complainant._id?.toString();

      if (!userIdStr || userIdStr !== complainantIdStr) {
        setError('You are not authorized to add documents to this case.');
        return;
      }

      setCaseData(case_data);
    } catch (error: any) {
      console.error('Error fetching case details:', error);
      setError(error.response?.data?.message || 'Failed to load case details');
    } finally {
      setIsLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size cannot exceed 10MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type not allowed. Allowed types: Images, Videos, Audio, PDF, Word documents`;
    }
    
    return null;
  };

  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (selectedFiles.length + fileArray.length > MAX_FILES) {
      setError(`You can only upload a maximum of ${MAX_FILES} files`);
      return;
    }

    const validFiles: FileWithProgress[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        // Check for duplicates
        const isDuplicate = selectedFiles.some(sf => sf.file.name === file.name && sf.file.size === file.size);
        if (!isDuplicate) {
          validFiles.push({
            file,
            progress: 0,
            status: 'pending'
          });
        }
      }
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      setError('');
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [selectedFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Create FormData
      const formData = new FormData();
      
      selectedFiles.forEach(fileItem => {
        formData.append('documents', fileItem.file);
      });

      // Update file status to uploading
      setSelectedFiles(prev => 
        prev.map(f => ({ ...f, status: 'uploading' as const, progress: 50 }))
      );

      // Upload files
      await casesAPI.addDocuments(caseId, formData);

      // Update file status to success
      setSelectedFiles(prev => 
        prev.map(f => ({ ...f, status: 'success' as const, progress: 100 }))
      );

      setSuccessMessage(`${selectedFiles.length} document(s) uploaded successfully!`);
      
      // Redirect back to case details after 3 seconds
      setTimeout(() => {
        router.push(`/dashboard/cases/${caseId}`);
      }, 3000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setSelectedFiles(prev => 
        prev.map(f => ({ 
          ...f, 
          status: 'error' as const, 
          progress: 0,
          error: error.response?.data?.message || 'Upload failed'
        }))
      );
      setError(error.response?.data?.message || 'Failed to upload documents');
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('doc')) return '📝';
    return '📁';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  if (error && !caseData) {
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/dashboard/cases/${caseId}`)}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl">←</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Add Documents</h1>
                <p className="mt-1 text-lg text-gray-600">
                  Case #{caseData?.caseNumber} - {caseData?.title}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-6">
            
            {/* Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                <pre className="whitespace-pre-wrap text-sm">{error}</pre>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
                {successMessage}
              </div>
            )}

            {/* Current Documents Count */}
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                This case currently has <span className="font-medium">{caseData?.documents.length || 0}</span> documents.
                You can add up to <span className="font-medium">{MAX_FILES}</span> more documents at once.
              </p>
            </div>

            {/* File Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="space-y-4">
                <div className="text-6xl">📎</div>
                <div>
                  <p className="text-xl font-medium text-gray-900">
                    Drop files here or click to browse
                  </p>
                  <p className="text-gray-600 mt-1">
                    Supports: Images, Videos, Audio, PDF, Word documents
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum file size: 10MB per file
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.mp3,.wav,.m4a,.pdf,.doc,.docx"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="btn-primary cursor-pointer"
                  >
                    📁 Browse Files
                  </label>
                </div>
              </div>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Selected Files ({selectedFiles.length})
                </h3>
                
                <div className="space-y-3">
                  {selectedFiles.map((fileItem, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <span className="text-2xl">{getFileIcon(fileItem.file.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {fileItem.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(fileItem.file.size)}
                          </p>
                          
                          {/* Progress Bar */}
                          {fileItem.status === 'uploading' && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${fileItem.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Status */}
                          {fileItem.status === 'success' && (
                            <p className="text-xs text-green-600 mt-1">✅ Uploaded successfully</p>
                          )}
                          
                          {fileItem.status === 'error' && (
                            <p className="text-xs text-red-600 mt-1">❌ {fileItem.error}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {fileItem.status === 'success' && (
                          <span className="text-green-500 text-xl">✅</span>
                        )}
                        {fileItem.status === 'error' && (
                          <span className="text-red-500 text-xl">❌</span>
                        )}
                        {fileItem.status === 'uploading' && (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                        )}
                        {fileItem.status === 'pending' && (
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 text-xl"
                            title="Remove file"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t mt-8">
              <button
                onClick={() => router.push(`/dashboard/cases/${caseId}`)}
                className="btn-secondary w-full sm:w-auto"
              >
                Cancel
              </button>
              
              <div className="flex gap-3 w-full sm:w-auto">
                {selectedFiles.length > 0 && selectedFiles.some(f => f.status === 'pending') && (
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    Clear All
                  </button>
                )}
                
                <button
                  onClick={uploadFiles}
                  disabled={selectedFiles.length === 0 || isUploading || selectedFiles.every(f => f.status !== 'pending')}
                  className="btn-primary w-full sm:w-auto"
                >
                  {isUploading ? 'Uploading...' : `Upload ${selectedFiles.filter(f => f.status === 'pending').length} File(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDocumentsForm;