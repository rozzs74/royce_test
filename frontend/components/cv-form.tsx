'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { api } from '@/lib/trpc';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  skills: string;
  experience: string;
}

export function CVForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>();
  const submitCV = api.cv.submitCV.useMutation();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const error = rejectedFiles[0].errors[0];
        if (error.code === 'file-too-large') {
          alert('File is too large. Maximum size is 10MB.');
        } else if (error.code === 'file-invalid-type') {
          alert('Invalid file type. Only PDF files are allowed.');
        }
        return;
      }
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    }
  });

  const onSubmit = async (data: FormData) => {
    if (!file) {
      alert('Please upload a CV PDF file');
      return;
    }

    setIsUploading(true);
    setValidationResult(null);

    try {
      // Upload file
      const formData = new FormData();
      formData.append('cv', file);

      const uploadResponse = await fetch(`http://localhost:3001/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadResult = await uploadResponse.json();

      // Submit CV data with file path
      const result = await submitCV.mutateAsync({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        skills: data.skills.split(',').map(s => s.trim()).filter(s => s.length > 0),
        experience: data.experience,
        pdfPath: uploadResult.path,
      });

      setValidationResult(result.validationResult);

      if (result.validationResult.isValid) {
        reset();
        setFile(null);
      }
    } catch (error) {
      console.error('Error submitting CV:', error);
      alert('Failed to submit CV. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">CV Validator</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('fullName', { 
              required: 'Full name is required',
              minLength: {
                value: 2,
                message: 'Full name must be at least 2 characters'
              },
              maxLength: {
                value: 100,
                message: 'Full name must not exceed 100 characters'
              },
              pattern: {
                value: /^[a-zA-Z\s'-]+$/,
                message: 'Full name can only contain letters, spaces, hyphens, and apostrophes'
              }
            })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.fullName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="John Doe"
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            type="email"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="john@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            {...register('phone', { 
              required: 'Phone number is required',
              pattern: {
                value: /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/,
                message: 'Invalid phone number format'
              },
              minLength: {
                value: 10,
                message: 'Phone number must be at least 10 digits'
              },
              maxLength: {
                value: 20,
                message: 'Phone number must not exceed 20 characters'
              }
            })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="+1234567890"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Skills (comma-separated) <span className="text-red-500">*</span>
          </label>
          <input
            {...register('skills', { 
              required: 'At least one skill is required',
              validate: {
                hasSkills: (value) => {
                  const skills = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                  return skills.length > 0 || 'Please enter at least one skill';
                },
                validSkills: (value) => {
                  const skills = value.split(',').map(s => s.trim());
                  const invalidSkills = skills.filter(s => s.length > 0 && !/^[a-zA-Z0-9\s\.\-\+\#\/]+$/.test(s));
                  return invalidSkills.length === 0 || 'Skills can only contain letters, numbers, and common symbols';
                }
              }
            })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.skills ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="JavaScript, React, Node.js"
          />
          {errors.skills && (
            <p className="mt-1 text-sm text-red-600">{errors.skills.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Separate multiple skills with commas</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Experience <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('experience', { 
              required: 'Experience is required',
              minLength: {
                value: 50,
                message: 'Please provide at least 50 characters describing your experience'
              },
              maxLength: {
                value: 2000,
                message: 'Experience description must not exceed 2000 characters'
              }
            })}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.experience ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Describe your work experience..."
          />
          {errors.experience && (
            <p className="mt-1 text-sm text-red-600">{errors.experience.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Minimum 50 characters required ({register('experience').value?.length || 0}/2000)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CV Upload (PDF) <span className="text-red-500">*</span>
          </label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${file ? 'bg-green-50 border-green-500' : ''}
              ${!file && isUploading ? 'border-red-500' : ''}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div>
                <p className="text-green-600 font-medium">✓ {file.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-xs text-gray-400 mt-2">Click to replace</p>
              </div>
            ) : isDragActive ? (
              <p className="text-blue-600">Drop the CV here...</p>
            ) : (
              <div>
                <p className="text-gray-600">Drag & drop your CV here, or click to select</p>
                <p className="text-sm text-gray-400 mt-2">PDF files only, max 10MB</p>
              </div>
            )}
          </div>
          {!file && (
            <p className="mt-1 text-sm text-red-600">Please upload your CV in PDF format</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isUploading || submitCV.isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isUploading || submitCV.isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : 'Submit & Validate'}
        </button>
      </form>

      {validationResult && (
        <div className={`mt-8 p-6 rounded-lg ${validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h2 className={`text-xl font-semibold mb-4 ${validationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
            Validation Result: {validationResult.isValid ? '✓ Success' : '✗ Failed'}
          </h2>
          
          {validationResult.matches && (
            <div className="space-y-2">
              {Object.entries(validationResult.matches).map(([field, matches]) => (
                <div key={field} className="flex items-start">
                  <span className={`mr-2 mt-0.5 ${matches ? 'text-green-600' : 'text-red-600'}`}>
                    {matches ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                    {validationResult.details?.[field] && (
                      <p className="text-sm text-gray-600 mt-1">
                        {validationResult.details[field]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {validationResult.overallSummary && (
            <p className="mt-4 text-gray-700">{validationResult.overallSummary}</p>
          )}
        </div>
      )}
    </div>
  );
} 