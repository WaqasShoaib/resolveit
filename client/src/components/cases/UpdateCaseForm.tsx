'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { casesAPI } from '@/lib/api/cases';

interface UpdateCaseData {
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
  priority: string;
  notes: string;
  status: string;
  createdAt: string;
}

const UpdateCaseForm: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState<UpdateCaseData>({
    title: '',
    description: '',
    caseType: 'family',
    priority: 'medium',
    notes: '',
    oppositeParty: {
      name: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        zipCode: '',
      },
    },
  });

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (caseId) {
      fetchCaseDetails();
    }
  }, [caseId]);


  // Replace your fetchCaseDetails function with this debug version:

  const fetchCaseDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await casesAPI.getCaseById(caseId);
      const case_data = response.data.case;
      
      // DEBUG: Log the complete user object to see its structure
      console.log('🔍 COMPLETE USER DEBUG:');
      console.log('Full user object:', user);
      console.log('User keys:', user ? Object.keys(user) : 'user is null/undefined');
      console.log('User.id:', user?.id);
      console.log('User._id:', (user as any)?._id);
      console.log('Case complainant._id:', case_data.complainant._id);
      
      // Try both _id and id properties for user
      const userIdFromId = user?.id?.toString();
      const userIdFrom_Id = (user as any)?._id?.toString();
      const complainantIdStr = case_data.complainant._id?.toString();
      
      console.log('Comparison attempts:');
      console.log('  user.id vs complainant._id:', userIdFromId, '===', complainantIdStr, '→', userIdFromId === complainantIdStr);
      console.log('  user._id vs complainant._id:', userIdFrom_Id, '===', complainantIdStr, '→', userIdFrom_Id === complainantIdStr);
      
      // Use whichever user ID property exists
      const userIdStr = userIdFromId || userIdFrom_Id;
      
      console.log('Final userIdStr:', userIdStr);
      console.log('Authorization check:', userIdStr === complainantIdStr);
      
      // Check if user is authorized to edit this case
      if (!userIdStr || userIdStr !== complainantIdStr) {
        console.log('❌ Authorization failed:', { userIdStr, complainantIdStr });
        setError('You are not authorized to edit this case.');
        return;
      }

      console.log('✅ Frontend authorization passed!');

      setCaseData(case_data);
      
      // Rest of your code...
      setFormData({
        title: case_data.title,
        description: case_data.description,
        caseType: case_data.caseType,
        priority: case_data.priority,
        notes: case_data.notes || '',
        oppositeParty: {
          name: case_data.oppositeParty.name,
          email: case_data.oppositeParty.email,
          phone: case_data.oppositeParty.phone,
          address: {
            street: case_data.oppositeParty.address.street,
            city: case_data.oppositeParty.address.city,
            zipCode: case_data.oppositeParty.address.zipCode,
          },
        },
      });
    } catch (error: any) {
      console.error('Error fetching case details:', error);
      setError(error.response?.data?.message || 'Failed to load case details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('oppositeParty.')) {
      const field = name.split('.')[1];
      if (field.startsWith('address.')) {
        const addressField = field.split('.')[1];
        setFormData({
          ...formData,
          oppositeParty: {
            ...formData.oppositeParty,
            address: {
              ...formData.oppositeParty.address,
              [addressField]: value,
            },
          },
        });
      } else {
        setFormData({
          ...formData,
          oppositeParty: {
            ...formData.oppositeParty,
            [field]: value,
          },
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    // Basic validation
    if (!formData.title || formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters long';
    }

    if (!formData.description || formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters long';
    }

    if (!formData.oppositeParty.name || formData.oppositeParty.name.trim().length < 2) {
      newErrors.oppositePartyName = 'Opposite party name is required';
    }

    if (!formData.oppositeParty.email || !/\S+@\S+\.\S+/.test(formData.oppositeParty.email)) {
      newErrors.oppositePartyEmail = 'Valid email is required';
    }

    if (!formData.oppositeParty.phone || formData.oppositeParty.phone.trim().length < 10) {
      newErrors.oppositePartyPhone = 'Valid phone number is required';
    }

    if (!formData.oppositeParty.address.street.trim()) {
      newErrors.oppositePartyStreet = 'Street address is required';
    }

    if (!formData.oppositeParty.address.city.trim()) {
      newErrors.oppositePartyCity = 'City is required';
    }

    if (!formData.oppositeParty.address.zipCode.trim()) {
      newErrors.oppositePartyZipCode = 'Zip code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      await casesAPI.updateCase(caseId, formData);
      setSuccessMessage('Case updated successfully!');
      
      // Redirect back to case details after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard/cases/${caseId}`);
      }, 2000);
    } catch (error: any) {
      console.error('Update case error:', error);
      setError(error.response?.data?.message || 'Failed to update case');
    } finally {
      setIsSubmitting(false);
    }
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
                <h1 className="text-3xl font-bold text-gray-900">Update Case</h1>
                <p className="mt-1 text-lg text-gray-600">
                  Case #{caseData?.caseNumber} - {caseData?.title}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {successMessage}
                </div>
              )}

              {/* Basic Case Information */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">
                  📝 Case Information
                </h2>

                <div>
                  <label htmlFor="title" className="form-label">
                    Case Title *
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    className="form-input"
                    placeholder="Brief title of your case"
                    value={formData.title}
                    onChange={handleChange}
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label htmlFor="description" className="form-label">
                    Case Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    required
                    className="form-textarea"
                    placeholder="Provide a detailed description of your case..."
                    value={formData.description}
                    onChange={handleChange}
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="caseType" className="form-label">
                      Case Type *
                    </label>
                    <select
                      id="caseType"
                      name="caseType"
                      required
                      className="form-input"
                      value={formData.caseType}
                      onChange={handleChange}
                    >
                      <option value="family">Family</option>
                      <option value="business">Business</option>
                      <option value="criminal">Criminal</option>
                      <option value="civil">Civil</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="priority" className="form-label">
                      Priority Level *
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      required
                      className="form-input"
                      value={formData.priority}
                      onChange={handleChange}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="form-label">
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    className="form-textarea"
                    placeholder="Any additional information or special circumstances..."
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Opposite Party Information */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">
                  👤 Opposite Party Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="oppositeParty.name" className="form-label">
                      Full Name *
                    </label>
                    <input
                      id="oppositeParty.name"
                      name="oppositeParty.name"
                      type="text"
                      required
                      className="form-input"
                      placeholder="John Smith"
                      value={formData.oppositeParty.name}
                      onChange={handleChange}
                    />
                    {errors.oppositePartyName && <p className="text-red-500 text-sm mt-1">{errors.oppositePartyName}</p>}
                  </div>

                  <div>
                    <label htmlFor="oppositeParty.email" className="form-label">
                      Email Address *
                    </label>
                    <input
                      id="oppositeParty.email"
                      name="oppositeParty.email"
                      type="email"
                      required
                      className="form-input"
                      placeholder="john@example.com"
                      value={formData.oppositeParty.email}
                      onChange={handleChange}
                    />
                    {errors.oppositePartyEmail && <p className="text-red-500 text-sm mt-1">{errors.oppositePartyEmail}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="oppositeParty.phone" className="form-label">
                    Phone Number *
                  </label>
                  <input
                    id="oppositeParty.phone"
                    name="oppositeParty.phone"
                    type="tel"
                    required
                    className="form-input"
                    placeholder="+1234567890"
                    value={formData.oppositeParty.phone}
                    onChange={handleChange}
                  />
                  {errors.oppositePartyPhone && <p className="text-red-500 text-sm mt-1">{errors.oppositePartyPhone}</p>}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Address</h3>
                  
                  <div>
                    <label htmlFor="oppositeParty.address.street" className="form-label">
                      Street Address *
                    </label>
                    <input
                      id="oppositeParty.address.street"
                      name="oppositeParty.address.street"
                      type="text"
                      required
                      className="form-input"
                      placeholder="123 Main Street"
                      value={formData.oppositeParty.address.street}
                      onChange={handleChange}
                    />
                    {errors.oppositePartyStreet && <p className="text-red-500 text-sm mt-1">{errors.oppositePartyStreet}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="oppositeParty.address.city" className="form-label">
                        City *
                      </label>
                      <input
                        id="oppositeParty.address.city"
                        name="oppositeParty.address.city"
                        type="text"
                        required
                        className="form-input"
                        placeholder="New York"
                        value={formData.oppositeParty.address.city}
                        onChange={handleChange}
                      />
                      {errors.oppositePartyCity && <p className="text-red-500 text-sm mt-1">{errors.oppositePartyCity}</p>}
                    </div>

                    <div>
                      <label htmlFor="oppositeParty.address.zipCode" className="form-label">
                        Zip Code *
                      </label>
                      <input
                        id="oppositeParty.address.zipCode"
                        name="oppositeParty.address.zipCode"
                        type="text"
                        required
                        className="form-input"
                        placeholder="10001"
                        value={formData.oppositeParty.address.zipCode}
                        onChange={handleChange}
                      />
                      {errors.oppositePartyZipCode && <p className="text-red-500 text-sm mt-1">{errors.oppositePartyZipCode}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/cases/${caseId}`)}
                  className="btn-secondary w-full sm:w-auto"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full sm:w-auto"
                >
                  {isSubmitting ? 'Updating Case...' : 'Update Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateCaseForm;