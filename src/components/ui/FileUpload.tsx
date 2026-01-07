'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Check, AlertTriangle } from 'lucide-react';
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
      const validationResult: FileValidationResult = await validateFile(file);

      if (!validationResult.isValid) {
        setValidationError(validationResult.error || 'File validation failed');
        return;
      }

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
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
          ${isDragActive || dragActive
            ? 'border-[var(--brand-teal)] bg-[var(--primary-light)]'
            : 'border-[var(--border)] hover:border-[var(--brand-teal)] hover:bg-[var(--surface-elevated)]'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          ${validationError ? 'border-[var(--error)] bg-[var(--error-light)]' : ''}
        `}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-2 border-[var(--brand-teal)] border-t-transparent rounded-full spinner mb-4" />
            <p className="text-[var(--text-secondary)]">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-fade-in">
            <Upload
              className={`w-12 h-12 mb-4 ${
                isDragActive || dragActive ? 'text-[var(--brand-teal)]' : 'text-[var(--text-muted)]'
              }`}
            />

            {isDragActive || dragActive ? (
              <p className="text-[var(--brand-teal)] font-medium">Drop your file here</p>
            ) : (
              <>
                <p className="text-[var(--text-secondary)] mb-2">
                  <span className="font-medium text-[var(--brand-teal)]">Click to upload</span>
                  {' '}or drag and drop
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  PDF, EPUB, MOBI, TXT up to {Math.round(maxSize / (1024 * 1024))}MB
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="mt-4 p-4 status-error rounded-xl animate-slide-up flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{validationError}</p>
        </div>
      )}

      {/* File Information Display */}
      {selectedFile && fileInfo && !validationError && (
        <div className="mt-4 p-4 status-success rounded-xl animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">{fileInfo.name}</p>
                <p className="text-sm opacity-80">
                  {formatFileSize(fileInfo.size)} · {fileInfo.type}
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-2 rounded-full hover:bg-black/10 transition-colors"
              type="button"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
