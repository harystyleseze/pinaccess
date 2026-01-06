'use client';

import React, { useState, useCallback } from 'react';
import Navigation from '@/components/layout/Navigation';
import FileUpload from '@/components/ui/FileUpload';
import { validateEthereumAddressDetailed, validateSafeString } from '@/lib/validation';
import { validateAndConvertPrice, formatUsdAmount } from '@/lib/pricing';

interface FormData {
  file: File | null;
  name: string;
  price: number;
  walletAddress: string;
  description: string;
}

interface FormErrors {
  file?: string;
  name?: string;
  price?: string;
  walletAddress?: string;
  description?: string;
}

interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  currentStep: 'uploading' | 'creating-payment' | 'monetizing' | 'complete';
  error?: string;
  success?: boolean;
  gatewayUrl?: string;
}

export default function UploadPage() {
  const [formData, setFormData] = useState<FormData>({
    file: null,
    name: '',
    price: 0,
    walletAddress: '',
    description: ''
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    uploadProgress: 0,
    currentStep: 'uploading'
  });

  // File selection handler
  const handleFileSelect = useCallback((file: File) => {
    setFormData(prev => ({
      ...prev,
      file,
      name: prev.name || file.name.replace(/\.[^/.]+$/, '') // Remove extension for default name
    }));
    
    // Clear file-related errors
    setFormErrors(prev => {
      const { file: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Form field handlers
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, name: value }));
    
    // Clear name errors on change
    if (formErrors.name) {
      setFormErrors(prev => {
        const { name: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData(prev => ({ ...prev, price: value }));
    
    // Clear price errors on change
    if (formErrors.price) {
      setFormErrors(prev => {
        const { price: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleWalletChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, walletAddress: value }));
    
    // Clear wallet errors on change
    if (formErrors.walletAddress) {
      setFormErrors(prev => {
        const { walletAddress: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, description: value }));
    
    // Clear description errors on change
    if (formErrors.description) {
      setFormErrors(prev => {
        const { description: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // File validation
    if (!formData.file) {
      errors.file = 'Please select a file to upload';
    }

    // Name validation
    const nameValidation = validateSafeString(formData.name, 100);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error;
    } else if (formData.name.trim().length === 0) {
      errors.name = 'Document name is required';
    }

    // Price validation
    const priceValidation = validateAndConvertPrice(formData.price);
    if (!priceValidation.isValid) {
      errors.price = priceValidation.error;
    }

    // Wallet address validation
    const walletValidation = validateEthereumAddressDetailed(formData.walletAddress);
    if (!walletValidation.isValid) {
      errors.walletAddress = walletValidation.error;
    }

    // Description validation (optional but if provided, must be safe)
    if (formData.description.trim().length > 0) {
      const descValidation = validateSafeString(formData.description, 500);
      if (!descValidation.isValid) {
        errors.description = descValidation.error;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if form is valid for publish button
  const isFormValid = (): boolean => {
    return !!(
      formData.file &&
      formData.name.trim().length > 0 &&
      formData.price > 0 &&
      formData.walletAddress.trim().length > 0 &&
      validateEthereumAddressDetailed(formData.walletAddress).isValid &&
      validateAndConvertPrice(formData.price).isValid
    );
  };

  // Upload and monetization process
  const handlePublish = async () => {
    if (!validateForm()) {
      return;
    }

    setUploadState({
      isUploading: true,
      uploadProgress: 0,
      currentStep: 'uploading'
    });

    try {
      // Step 1: Upload file
      setUploadState(prev => ({ ...prev, uploadProgress: 10 }));
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', formData.file!);
      uploadFormData.append('creator', formData.name);
      uploadFormData.append('description', formData.description);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      });

      const uploadResult = await uploadResponse.json();
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      setUploadState(prev => ({ ...prev, uploadProgress: 40, currentStep: 'creating-payment' }));

      // Step 2: Create payment instruction using creator's wallet address
      const priceValidation = validateAndConvertPrice(formData.price);
      if (!priceValidation.isValid) {
        throw new Error('Invalid price configuration');
      }

      const paymentResponse = await fetch('/api/payment-instruction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `Payment for ${formData.name}`,
          description: `Access to ${formData.name}`,
          payment_requirements: [
            {
              asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
              pay_to: formData.walletAddress,
              network: "base-sepolia",
              description: `Payment of $${formData.price} for ${formData.name}`,
              max_amount_required: priceValidation.usdcAmount!
            }
          ]
        })
      });

      const paymentResult = await paymentResponse.json();
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment instruction creation failed');
      }

      setUploadState(prev => ({ ...prev, uploadProgress: 70, currentStep: 'monetizing' }));

      // Step 3: Attach CID to payment instruction
      const attachResponse = await fetch('/api/attach-cid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cid: uploadResult.data.cid,
          paymentInstructionId: paymentResult.data.id
        })
      });

      const attachResult = await attachResponse.json();
      
      if (!attachResult.success) {
        throw new Error(attachResult.error || 'Document monetization failed');
      }

      // Success!
      setUploadState({
        isUploading: false,
        uploadProgress: 100,
        currentStep: 'complete',
        success: true,
        gatewayUrl: attachResult.data.gatewayUrl
      });

    } catch (error) {
      console.error('Upload process failed:', error);
      setUploadState({
        isUploading: false,
        uploadProgress: 0,
        currentStep: 'uploading',
        error: error instanceof Error ? error.message : 'Upload failed. Please try again.'
      });
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      file: null,
      name: '',
      price: 0,
      walletAddress: '',
      description: ''
    });
    setFormErrors({});
    setUploadState({
      isUploading: false,
      uploadProgress: 0,
      currentStep: 'uploading'
    });
  };

  const acceptedFileTypes = [
    'application/pdf',
    'application/epub+zip',
    'application/x-mobipocket-ebook',
    'text/plain'
  ];

  const maxFileSize = 50 * 1024 * 1024; // 50MB

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto section-padding py-8">
        {/* Header */}
        <div className="mb-12 text-center animate-fade-in">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Upload Document</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Upload your document, set a price, and create a monetized link for buyers.
          </p>
        </div>

        {/* Success State */}
        {uploadState.success && uploadState.gatewayUrl && (
          <div className="mb-12 p-8 status-success rounded-2xl border animate-slide-up">
            <div className="flex items-center mb-6">
              <svg className="w-8 h-8 text-green-500 mr-3 icon-clean" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h3 className="text-2xl font-bold text-green-800">🎉 Document Published Successfully!</h3>
            </div>
            <p className="text-green-700 mb-6 text-lg">
              Your document has been uploaded and monetized. Share this link with buyers:
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                value={uploadState.gatewayUrl}
                readOnly
                className="flex-1 px-4 py-3 border border-green-300 rounded-xl bg-white text-sm font-mono"
              />
              <button
                onClick={() => navigator.clipboard.writeText(uploadState.gatewayUrl!)}
                className="btn-success px-6 py-3"
              >
                📋 Copy Link
              </button>
            </div>
            <button
              onClick={handleReset}
              className="mt-6 btn-secondary px-6 py-3"
            >
              📤 Upload Another Document
            </button>
          </div>
        )}

        {/* Error State */}
        {uploadState.error && (
          <div className="mb-12 p-8 status-error rounded-2xl border animate-slide-up">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-red-500 mr-3 icon-clean" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 font-semibold text-lg">⚠️ {uploadState.error}</p>
            </div>
          </div>
        )}

        {/* Upload Form */}
        {!uploadState.success && (
          <div className="card-gradient p-8 animate-slide-up">
            <form onSubmit={(e) => { e.preventDefault(); handlePublish(); }} className="space-y-8">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document File
                </label>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  acceptedTypes={acceptedFileTypes}
                  maxSize={maxFileSize}
                  isUploading={uploadState.isUploading}
                />
                {formErrors.file && (
                  <p className="mt-2 text-sm text-red-600">{formErrors.file}</p>
                )}
              </div>

              {/* Document Name */}
              <div className="animate-slide-up">
                <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-3">
                  📝 Document Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  disabled={uploadState.isUploading}
                  className={`form-input focus-ring ${formErrors.name ? 'form-input-error error-shake' : ''} ${uploadState.isUploading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Enter a descriptive name for your document"
                />
                {formErrors.name && (
                  <p className="mt-2 text-sm text-red-600 font-medium animate-slide-down">⚠️ {formErrors.name}</p>
                )}
              </div>

              {/* Price */}
              <div className="animate-slide-up">
                <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-3">
                  💰 Price (USD)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-lg">$</span>
                  </div>
                  <input
                    type="number"
                    id="price"
                    min="0.01"
                    max="10000"
                    step="0.01"
                    value={formData.price || ''}
                    onChange={handlePriceChange}
                    disabled={uploadState.isUploading}
                    className={`form-input focus-ring pl-10 ${formErrors.price ? 'form-input-error error-shake' : ''} ${uploadState.isUploading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {formData.price > 0 && (
                  <p className="mt-2 text-sm text-gray-500 animate-fade-in">
                    💳 Buyers will pay {formatUsdAmount(formData.price)} in USDC
                  </p>
                )}
                {formErrors.price && (
                  <p className="mt-2 text-sm text-red-600 font-medium animate-slide-down">⚠️ {formErrors.price}</p>
                )}
              </div>

              {/* Wallet Address */}
              <div className="animate-slide-up">
                <label htmlFor="wallet" className="block text-sm font-semibold text-gray-700 mb-3">
                  🔗 Your Wallet Address
                </label>
                <input
                  type="text"
                  id="wallet"
                  value={formData.walletAddress}
                  onChange={handleWalletChange}
                  disabled={uploadState.isUploading}
                  className={`form-input focus-ring font-mono ${formErrors.walletAddress ? 'form-input-error error-shake' : ''} ${uploadState.isUploading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="0x..."
                />
                <p className="mt-2 text-sm text-gray-500">
                  🌐 USDC payments will be sent to this address on Base Sepolia network
                </p>
                {formErrors.walletAddress && (
                  <p className="mt-2 text-sm text-red-600 font-medium animate-slide-down">⚠️ {formErrors.walletAddress}</p>
                )}
              </div>

              {/* Description (Optional) */}
              <div className="animate-slide-up">
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-3">
                  📄 Description (Optional)
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleDescriptionChange}
                  disabled={uploadState.isUploading}
                  className={`form-input focus-ring resize-none ${formErrors.description ? 'form-input-error error-shake' : ''} ${uploadState.isUploading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Optional description for your document"
                />
                {formErrors.description && (
                  <p className="mt-2 text-sm text-red-600 font-medium animate-slide-down">⚠️ {formErrors.description}</p>
                )}
              </div>

              {/* Progress Indicator */}
              {uploadState.isUploading && (
                <div className="space-y-4 animate-slide-up">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                      {uploadState.currentStep === 'uploading' && '📤 Uploading document...'}
                      {uploadState.currentStep === 'creating-payment' && '💳 Creating payment instruction...'}
                      {uploadState.currentStep === 'monetizing' && '🔗 Setting up monetization...'}
                    </span>
                    <span className="text-gray-600 font-semibold">{uploadState.uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-500 ease-out animate-pulse-gentle"
                      style={{ width: `${uploadState.uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    ⏳ Please wait while we process your document...
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-6 animate-slide-up">
                <button
                  type="submit"
                  disabled={!isFormValid() || uploadState.isUploading}
                  className={`${
                    isFormValid() && !uploadState.isUploading
                      ? 'btn-primary hover:scale-105 transform transition-all duration-200'
                      : 'btn-pill bg-gray-300 text-gray-500 cursor-not-allowed'
                  } px-8 py-4 text-lg font-semibold shadow-lg`}
                >
                  {uploadState.isUploading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      ⏳ Publishing...
                    </>
                  ) : (
                    '🚀 Publish Document'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}