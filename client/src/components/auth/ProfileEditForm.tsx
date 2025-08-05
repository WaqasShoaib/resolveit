'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/api/auth';

const ProfileEditForm: React.FC = () => {
  const { user, login } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male' as 'male' | 'female' | 'other',
    address: {
      street: '',
      city: '',
      zipCode: '',
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Load current user data when component mounts
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        age: user.age?.toString() || '',
        gender: (user.gender as 'male' | 'female' | 'other') || 'male', // Fixed type casting
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          zipCode: user.address?.zipCode || '',
        },
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value,
        },
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

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    if (!formData.age || parseInt(formData.age) < 18 || parseInt(formData.age) > 120) {
      newErrors.age = 'Age must be between 18 and 120';
    }

    if (!formData.address.street.trim()) {
      newErrors.street = 'Street address is required';
    }

    if (!formData.address.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.address.zipCode.trim()) {
      newErrors.zipCode = 'Zip code is required';
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
    setErrors({});
    setSuccessMessage('');

    try {
      const updateData = {
        ...formData,
        age: parseInt(formData.age),
      };

      const response = await authAPI.updateProfile(updateData);
      
      // Update the user context with new data
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        login(currentToken, response.data.user);
      }

      setSuccessMessage('Profile updated successfully!');
      
      // Optional: Redirect back to profile view after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/profile');
      }, 2000);

    } catch (error: any) {
      console.error('Profile update error:', error);
      
      if (error.response?.data?.errors) {
        const apiErrors: any = {};
        error.response.data.errors.forEach((err: any) => {
          apiErrors[err.field] = err.message;
        });
        setErrors(apiErrors);
      } else {
        setErrors({ general: error.response?.data?.message || 'Failed to update profile' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center">
        <p className="text-gray-600">Loading user information...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
          <p className="mt-1 text-sm text-gray-600">
            Update your personal information below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}

          {/* Read-only fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label text-gray-500">Email (Cannot be changed)</label>
              <div className="form-input bg-gray-100 text-gray-600 cursor-not-allowed">
                {user.email}
              </div>
            </div>

            <div>
              <label className="form-label text-gray-500">Phone (Cannot be changed)</label>
              <div className="form-input bg-gray-100 text-gray-600 cursor-not-allowed">
                {user.phone}
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div>
            <label htmlFor="name" className="form-label">
              Full Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="form-input"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="age" className="form-label">
                Age *
              </label>
              <input
                id="age"
                name="age"
                type="number"
                required
                min="18"
                max="120"
                className="form-input"
                placeholder="25"
                value={formData.age}
                onChange={handleChange}
              />
              {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
            </div>

            <div>
              <label htmlFor="gender" className="form-label">
                Gender *
              </label>
              <select
                id="gender"
                name="gender"
                required
                className="form-input"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Address Information</h3>
            
            <div>
              <label htmlFor="address.street" className="form-label">
                Street Address *
              </label>
              <input
                id="address.street"
                name="address.street"
                type="text"
                required
                className="form-input"
                placeholder="123 Main Street"
                value={formData.address.street}
                onChange={handleChange}
              />
              {errors.street && <p className="text-red-500 text-sm mt-1">{errors.street}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="address.city" className="form-label">
                  City *
                </label>
                <input
                  id="address.city"
                  name="address.city"
                  type="text"
                  required
                  className="form-input"
                  placeholder="New York"
                  value={formData.address.city}
                  onChange={handleChange}
                />
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
              </div>

              <div>
                <label htmlFor="address.zipCode" className="form-label">
                  Zip Code *
                </label>
                <input
                  id="address.zipCode"
                  name="address.zipCode"
                  type="text"
                  required
                  className="form-input"
                  placeholder="10001"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                />
                {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>}
              </div>
            </div>
          </div>

          {/* Account Status Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Account Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Email Status:</span>
                <span className={`ml-2 ${user.isEmailVerified ? 'text-green-600' : 'text-red-600'}`}>
                  {user.isEmailVerified ? '✓ Verified' : '✗ Not Verified'}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Phone Status:</span>
                <span className={`ml-2 ${user.isPhoneVerified ? 'text-green-600' : 'text-red-600'}`}>
                  {user.isPhoneVerified ? '✓ Verified' : '✗ Not Verified'}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Account Role:</span>
                <span className="ml-2 text-blue-900 capitalize">{user.role}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard/profile')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditForm;