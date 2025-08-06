'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { casesAPI, CaseData } from '@/lib/api/cases';
import FileUpload from '@/components/ui/FileUpload';

const CaseRegistrationForm: React.FC = () => {
  const [formData, setFormData] = useState<CaseData>({
    title: '',
    description: '',
    caseType: 'family',
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
    isInCourt: false,
    courtDetails: {
      caseNumber: '',
      courtName: '',
      firNumber: '',
      policeStation: '',
    },
    priority: 'medium',
    notes: '',
  });

  const [files, setFiles] = useState<FileList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [submitError, setSubmitError] = useState('');

  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('oppositeParty.address.')) {
      const addressField = name.split('.')[2];
      setFormData({
        ...formData,
        oppositeParty: {
          ...formData.oppositeParty,
          address: {
            ...formData.oppositeParty.address!,
            [addressField]: value,
          },
        },
      });
    } else if (name.startsWith('oppositeParty.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        oppositeParty: {
          ...formData.oppositeParty,
          [field]: value,
        },
      });
    } else if (name.startsWith('courtDetails.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        courtDetails: {
          ...formData.courtDetails!,
          [field]: value,
        },
      });
    } else if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.title || formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters long';
    }

    if (!formData.description || formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters long';
    }

    if (!formData.oppositeParty.name) {
      newErrors.oppositePartyName = 'Opposite party name is required';
    }

    if (formData.isInCourt) {
      if (!formData.courtDetails?.caseNumber) {
        newErrors.courtCaseNumber = 'Court case number is required';
      }
      if (!formData.courtDetails?.courtName) {
        newErrors.courtName = 'Court name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSubmitError('');

    try {
      // Add detailed logging
      console.log('=== CASE SUBMISSION DEBUG ===');
      console.log('Form data being sent:', formData);
      console.log('Files being sent:', files);
      
      // Log FormData contents (for debugging)
      if (files) {
        console.log('Files details:');
        for (let i = 0; i < files.length; i++) {
          console.log(`File ${i}:`, {
            name: files[i].name,
            type: files[i].type,
            size: files[i].size
          });
        }
      }
      
      const response = await casesAPI.createCase(formData, files || undefined);
      
      console.log('✅ Case created successfully:', response);
      
      // Success - redirect to cases list or show success message
      router.push('/dashboard/cases');
    } catch (error: any) {
      console.error('❌ Case registration error:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('❌ Error response status:', error.response.status);
        console.error('❌ Error response data:', error.response.data);
        console.error('❌ Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('❌ Error request:', error.request);
      } else {
        console.error('❌ Error message:', error.message);
      }
      
      if (error.response?.data?.errors) {
        const apiErrors: any = {};
        error.response.data.errors.forEach((err: any) => {
          apiErrors[err.field] = err.message;
        });
        setErrors(apiErrors);
      } else {
        setSubmitError(error.response?.data?.message || error.message || 'Failed to register case');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Register New Case</h1>
          <p className="mt-1 text-sm text-gray-600">
            Provide details about your dispute and upload relevant evidence
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {submitError}
            </div>
          )}

          {/* Basic Case Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Case Information</h3>
            
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
                placeholder="Brief description of your case"
                value={formData.title}
                onChange={handleChange}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label htmlFor="description" className="form-label">
                Detailed Description *
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                required
                className="form-input"
                placeholder="Provide a detailed description of the dispute, including timeline and key issues"
                value={formData.description}
                onChange={handleChange}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Priority Level
                </label>
                <select
                  id="priority"
                  name="priority"
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
          </div>

          {/* Opposite Party Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Opposite Party Information</h3>
            
            <div>
              <label htmlFor="oppositeParty.name" className="form-label">
                Name *
              </label>
              <input
                id="oppositeParty.name"
                name="oppositeParty.name"
                type="text"
                required
                className="form-input"
                placeholder="Full name of the opposite party"
                value={formData.oppositeParty.name}
                onChange={handleChange}
              />
              {errors.oppositePartyName && <p className="text-red-500 text-sm mt-1">{errors.oppositePartyName}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="oppositeParty.email" className="form-label">
                  Email (Optional)
                </label>
                <input
                  id="oppositeParty.email"
                  name="oppositeParty.email"
                  type="email"
                  className="form-input"
                  placeholder="email@example.com"
                  value={formData.oppositeParty.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="oppositeParty.phone" className="form-label">
                  Phone (Optional)
                </label>
                <input
                  id="oppositeParty.phone"
                  name="oppositeParty.phone"
                  type="tel"
                  className="form-input"
                  placeholder="+1234567890"
                  value={formData.oppositeParty.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="oppositeParty.address.street" className="form-label">
                Street Address (Optional)
              </label>
              <input
                id="oppositeParty.address.street"
                name="oppositeParty.address.street"
                type="text"
                className="form-input"
                placeholder="123 Main Street"
                value={formData.oppositeParty.address?.street}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="oppositeParty.address.city" className="form-label">
                  City (Optional)
                </label>
                <input
                  id="oppositeParty.address.city"
                  name="oppositeParty.address.city"
                  type="text"
                  className="form-input"
                  placeholder="New York"
                  value={formData.oppositeParty.address?.city}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="oppositeParty.address.zipCode" className="form-label">
                  Zip Code (Optional)
                </label>
                <input
                  id="oppositeParty.address.zipCode"
                  name="oppositeParty.address.zipCode"
                  type="text"
                  className="form-input"
                  placeholder="10001"
                  value={formData.oppositeParty.address?.zipCode}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Legal Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Legal Status</h3>
            
            <div className="flex items-center">
              <input
                id="isInCourt"
                name="isInCourt"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={formData.isInCourt}
                onChange={handleChange}
              />
              <label htmlFor="isInCourt" className="ml-2 block text-sm text-gray-900">
                This case is currently pending in court or with police
              </label>
            </div>

            {formData.isInCourt && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label htmlFor="courtDetails.caseNumber" className="form-label">
                    Case/FIR Number *
                  </label>
                  <input
                    id="courtDetails.caseNumber"
                    name="courtDetails.caseNumber"
                    type="text"
                    className="form-input"
                    placeholder="CV-2025-001234"
                    value={formData.courtDetails?.caseNumber}
                    onChange={handleChange}
                  />
                  {errors.courtCaseNumber && <p className="text-red-500 text-sm mt-1">{errors.courtCaseNumber}</p>}
                </div>

                <div>
                  <label htmlFor="courtDetails.courtName" className="form-label">
                    Court/Police Station Name *
                  </label>
                  <input
                    id="courtDetails.courtName"
                    name="courtDetails.courtName"
                    type="text"
                    className="form-input"
                    placeholder="Superior Court of Justice"
                    value={formData.courtDetails?.courtName}
                    onChange={handleChange}
                  />
                  {errors.courtName && <p className="text-red-500 text-sm mt-1">{errors.courtName}</p>}
                </div>

                <div>
                  <label htmlFor="courtDetails.firNumber" className="form-label">
                    FIR Number (if applicable)
                  </label>
                  <input
                    id="courtDetails.firNumber"
                    name="courtDetails.firNumber"
                    type="text"
                    className="form-input"
                    placeholder="FIR-2025-123"
                    value={formData.courtDetails?.firNumber}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="courtDetails.policeStation" className="form-label">
                    Police Station (if applicable)
                  </label>
                  <input
                    id="courtDetails.policeStation"
                    name="courtDetails.policeStation"
                    type="text"
                    className="form-input"
                    placeholder="Central Police Station"
                    value={formData.courtDetails?.policeStation}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Evidence & Documents</h3>
            <p className="text-sm text-gray-600">
              Upload relevant documents, images, videos, or audio files that support your case
            </p>
            
            <FileUpload
              onFilesChange={setFiles}
              maxFiles={5}
              maxFileSize={10}
              className="w-full"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="form-label">
              Additional Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="form-input"
              placeholder="Any additional information that might be helpful"
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Registering Case...' : 'Register Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaseRegistrationForm;