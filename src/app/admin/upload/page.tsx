'use client';

import React, { useState, useCallback } from 'react';
import { Check, Copy, AlertCircle, Upload } from 'lucide-react';
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
  const [copySuccess, setCopySuccess] = useState(false);

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

      // Generate shareable URL that points to app's content page (not Pinata gateway)
      // This ensures buyers land on the app's payment UI, not raw Pinata API
      const shareableUrl = `${window.location.origin}/content/${uploadResult.data.cid}`;

      // Success!
      setUploadState({
        isUploading: false,
        uploadProgress: 100,
        currentStep: 'complete',
        success: true,
        gatewayUrl: shareableUrl
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

  // Copy link handler with feedback
  const handleCopyLink = async () => {
    if (!uploadState.gatewayUrl) return;

    try {
      await navigator.clipboard.writeText(uploadState.gatewayUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
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
    <div className="min-h-screen bg-[var(--background)]">
      <Navigation />

      <div className="max-w-4xl mx-auto section-padding py-8">
        {/* Header */}
        <div className="mb-12 text-center animate-fade-in">
          <h1 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">Upload Document</h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
            Upload your document, set a price, and create a monetized link for buyers.
          </p>
        </div>

        {/* Success State */}
        {uploadState.success && uploadState.gatewayUrl && (
          <div className="mb-12 p-8 status-success rounded-2xl border animate-slide-up">
            <div className="flex items-center mb-6">
              <Check className="w-8 h-8 mr-3" />
              <h3 className="text-2xl font-bold">Document Published Successfully!</h3>
            </div>
            <p className="opacity-90 mb-6 text-lg">
              Your document has been uploaded and monetized. Share this link with buyers:
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                value={uploadState.gatewayUrl}
                readOnly
                className="flex-1 px-4 py-3 border border-[var(--success)]/30 rounded-xl bg-[var(--surface)] text-sm font-mono text-[var(--text-primary)]"
              />
              <button
                onClick={handleCopyLink}
                className={`${copySuccess ? 'btn-primary' : 'btn-success'} px-6 py-3 whitespace-nowrap`}
              >
                {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copySuccess ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <button
              onClick={handleReset}
              className="mt-6 btn-secondary px-6 py-3"
            >
              <Upload className="w-4 h-4" />
              Upload Another Document
            </button>
          </div>
        )}

        {/* Error State */}
        {uploadState.error && (
          <div className="mb-12 p-8 status-error rounded-2xl border animate-slide-up">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 mr-3" />
              <p className="font-semibold text-lg">{uploadState.error}</p>
            </div>
          </div>
        )}

        {/* Upload Form */}
        {!uploadState.success && (
          <div className="card p-8 animate-slide-up">
            <form onSubmit={(e) => { e.preventDefault(); handlePublish(); }} className="space-y-8">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Document File
                </label>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  acceptedTypes={acceptedFileTypes}
                  maxSize={maxFileSize}
                  isUploading={uploadState.isUploading}
                />
                {formErrors.file && (
                  <p className="mt-2 text-sm text-[var(--error)]">{formErrors.file}</p>
                )}
              </div>

              {/* Document Name */}
              <div className="animate-slide-up">
                <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Document Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  disabled={uploadState.isUploading}
                  className={`w-full px-4 py-3 border rounded-xl bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--brand-teal)] focus:border-transparent transition-all duration-200 ${
                    formErrors.name ? 'border-[var(--error)] bg-[var(--error-light)]' : 'border-[var(--border)]'
                  } ${uploadState.isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="Enter a descriptive name for your document"
                />
                {formErrors.name && (
                  <p className="mt-2 text-sm text-[var(--error)]">{formErrors.name}</p>
                )}
              </div>

              {/* Price */}
              <div className="animate-slide-up">
                <label htmlFor="price" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Price (USD)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-[var(--text-muted)] text-lg">$</span>
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
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--brand-teal)] focus:border-transparent transition-all duration-200 ${
                      formErrors.price ? 'border-[var(--error)] bg-[var(--error-light)]' : 'border-[var(--border)]'
                    } ${uploadState.isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {formData.price > 0 && (
                  <p className="mt-2 text-sm text-[var(--text-secondary)] animate-fade-in">
                    Buyers will pay {formatUsdAmount(formData.price)} in USDC tokens
                  </p>
                )}
                {formErrors.price && (
                  <p className="mt-2 text-sm text-[var(--error)]">{formErrors.price}</p>
                )}
              </div>

              {/* Wallet Address */}
              <div className="animate-slide-up">
                <label htmlFor="wallet" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Your Wallet Address
                </label>
                <input
                  type="text"
                  id="wallet"
                  value={formData.walletAddress}
                  onChange={handleWalletChange}
                  disabled={uploadState.isUploading}
                  className={`w-full px-4 py-3 border rounded-xl bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] font-mono focus:ring-2 focus:ring-[var(--brand-teal)] focus:border-transparent transition-all duration-200 ${
                    formErrors.walletAddress ? 'border-[var(--error)] bg-[var(--error-light)]' : 'border-[var(--border)]'
                  } ${uploadState.isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="0x..."
                />
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  USDC token payments will be sent to this address on Base Sepolia network
                </p>
                {formErrors.walletAddress && (
                  <p className="mt-2 text-sm text-[var(--error)]">{formErrors.walletAddress}</p>
                )}
              </div>

              {/* Description (Optional) */}
              <div className="animate-slide-up">
                <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleDescriptionChange}
                  disabled={uploadState.isUploading}
                  className={`w-full px-4 py-3 border rounded-xl bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:ring-2 focus:ring-[var(--brand-teal)] focus:border-transparent transition-all duration-200 ${
                    formErrors.description ? 'border-[var(--error)] bg-[var(--error-light)]' : 'border-[var(--border)]'
                  } ${uploadState.isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="Optional description for your document"
                />
                {formErrors.description && (
                  <p className="mt-2 text-sm text-[var(--error)]">{formErrors.description}</p>
                )}
              </div>

              {/* Progress Indicator */}
              {uploadState.isUploading && (
                <div className="space-y-4 animate-slide-up">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)] font-medium flex items-center">
                      <div className="w-4 h-4 border-2 border-[var(--brand-teal)] border-t-transparent rounded-full animate-spin mr-2"></div>
                      {uploadState.currentStep === 'uploading' && 'Uploading document...'}
                      {uploadState.currentStep === 'creating-payment' && 'Creating payment instruction...'}
                      {uploadState.currentStep === 'monetizing' && 'Setting up monetization...'}
                    </span>
                    <span className="text-[var(--text-secondary)] font-semibold">{uploadState.uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[var(--surface-elevated)] rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)] h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${uploadState.uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-[var(--text-muted)] text-center">
                    Please wait while we process your document...
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
                      ? 'btn-primary'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-muted)] cursor-not-allowed rounded-full'
                  } px-8 py-4 text-lg font-semibold`}
                >
                  {uploadState.isUploading ? (
                    <>
                      <div className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-3"></div>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Publish Document
                    </>
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
