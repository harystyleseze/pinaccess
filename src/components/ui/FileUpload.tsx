'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { validateFile, type FileValidationResult } from '@/lib/validation';
import { type FileUploadProps } from '@/lib/types';

export default function FileUpload({
  onFileSelect,
  acceptedTypes,
  maxSize,
  isUploading
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setValidationError(null);
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors?.[0]?.code === 'file-too-large') {
        setValidationError(`File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`);
      } else if (rejection.errors?.[0]?.code === 'file-invalid-type') {
        setValidationError('Invalid file type. Only PDF and ebook formats are allowed.');
      } else {
        setValidationError('File upload failed. Please try again.');
      }
      return;
    }

    if (acceptedFiles.length === 0) {
      return;
    }

    const file = acceptedFiles[0];
    
    try {
      // Perform comprehensive validation
      const validationResult: FileValidationResult = await validateFile(file);
      
      if (!validationResult.isValid) {
        setValidationError(validationResult.error || 'File validation failed');
        return;
      }

      // File is valid
      setSelectedFile(file);
      setFileInfo(validationResult.fileInfo || null);
      onFileSelect(file);
      
    } catch (error) {
      console.error('File validation error:', error);
      setValidationError('Unable to validate file. Please try again.');
    }
  }, [onFileSelect, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize,
    multiple: false,
    disabled: isUploading,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileInfo(null);
    setValidationError(null);
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 transform hover:scale-[1.02]
          ${isDragActive || dragActive 
            ? 'border-primary bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg animate-pulse-gentle' 
            : 'border-gray-300 hover:border-primary hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          ${validationError ? 'border-red-300 bg-gradient-to-br from-red-50 to-pink-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="flex flex-col items-center animate-pulse-gentle">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-6"></div>
            <p className="text-gray-600 text-lg font-medium">⏳ Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-fade-in">
            {/* Upload Icon */}
            <svg 
              className={`w-16 h-16 mb-6 icon-clean transition-colors duration-200 ${
                isDragActive || dragActive ? 'text-primary' : 'text-gray-400'
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
              />
            </svg>
            
            {isDragActive || dragActive ? (
              <div className="animate-bounce-gentle">
                <p className="text-primary font-semibold text-lg">📁 Drop your file here</p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-3 text-lg">
                  <span className="font-semibold text-primary hover:text-primary-hover transition-colors cursor-pointer">
                    📤 Click to upload
                  </span>
                  {' '}or drag and drop
                </p>
                <p className="text-sm text-gray-500">
                  📄 PDF, EPUB, MOBI, TXT files up to {Math.round(maxSize / (1024 * 1024))}MB
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="mt-6 p-4 status-error rounded-xl animate-slide-up error-shake">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-500 mr-3 icon-clean" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-red-700 font-medium">⚠️ {validationError}</p>
          </div>
        </div>
      )}

      {/* File Information Display */}
      {selectedFile && fileInfo && !validationError && (
        <div className="mt-6 p-6 status-success rounded-xl animate-slide-up success-flash">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-500 mr-3 icon-clean animate-bounce-gentle" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-green-800 font-semibold">✅ {fileInfo.name}</p>
                <p className="text-green-600 text-sm">
                  📊 {formatFileSize(fileInfo.size)} • {fileInfo.type}
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-2 rounded-full hover:bg-gray-100 transform hover:scale-110"
              type="button"
              title="Remove file"
            >
              <svg className="w-5 h-5 icon-clean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}