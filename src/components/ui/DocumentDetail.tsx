'use client'

import { useState } from 'react'
import { Document } from '@/lib/types'

interface DocumentDetailProps {
  document: Document
  onClose: () => void
  onCopyUrl: (url: string) => void
}

export default function DocumentDetail({ document, onClose, onCopyUrl }: DocumentDetailProps) {
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      onCopyUrl(text)
      setCopySuccess(type)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'monetized':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'uploaded':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getMimeTypeIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('epub')) return '📚'
    if (mimeType.includes('text')) return '📝'
    return '📄'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="card-gradient max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{getMimeTypeIcon(document.mimeType)}</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{document.name}</h2>
              <p className="text-sm text-gray-500">📋 Document Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span className={`px-6 py-3 rounded-full text-sm font-semibold border ${getStatusColor(document.metadata.status)}`}>
              ✨ {document.metadata.status.charAt(0).toUpperCase() + document.metadata.status.slice(1)}
            </span>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                📄 Basic Information
              </h3>
              
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-500 mb-1">File Name</label>
                  <p className="text-sm text-gray-900 font-medium">{document.name}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-500 mb-1">File Size</label>
                  <p className="text-sm text-gray-900 font-medium">📊 {formatFileSize(document.size)}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-500 mb-1">MIME Type</label>
                  <p className="text-sm text-gray-900 font-mono">{document.mimeType}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Upload Date</label>
                  <p className="text-sm text-gray-900">📅 {formatDate(document.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                🏷️ Metadata
              </h3>
              
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Creator</label>
                  <p className="text-sm text-gray-900 font-medium">👤 {document.metadata.creator}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <p className="text-sm text-gray-900 font-medium">⚡ {document.metadata.status}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Upload Timestamp</label>
                  <p className="text-sm text-gray-900">⏰ {formatDate(document.metadata.uploadTimestamp)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* IPFS Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              🌐 IPFS Information
            </h3>
            
            <div className="status-info rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-blue-700 mb-2">🔗 Content ID (CID)</label>
                  <p className="text-sm text-blue-900 font-mono break-all">{document.cid}</p>
                </div>
                <button
                  onClick={() => handleCopy(document.cid, 'cid')}
                  className="ml-3 btn-primary px-3 py-2 text-xs"
                >
                  {copySuccess === 'cid' ? '✅ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Monetization Information */}
          {document.isMonetized && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                💰 Monetization Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {document.price && (
                  <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                    <label className="block text-sm font-medium text-green-700 mb-1">💵 Price</label>
                    <p className="text-sm text-green-900 font-semibold">
                      ${document.price.usd} USD ({document.price.usdc} USDC)
                    </p>
                  </div>
                )}
                
                {document.paymentInstructionId && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <label className="block text-sm font-medium text-purple-700 mb-1">🎫 Payment ID</label>
                    <p className="text-sm text-purple-900 font-mono">{document.paymentInstructionId}</p>
                  </div>
                )}
              </div>

              {document.walletAddress && (
                <div className="status-info rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium text-blue-700 mb-2">🔗 Payment Wallet Address</label>
                      <p className="text-sm text-blue-900 font-mono break-all">{document.walletAddress}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(document.walletAddress!, 'wallet')}
                      className="ml-3 btn-accent px-3 py-2 text-xs"
                    >
                      {copySuccess === 'wallet' ? '✅ Copied' : '📋 Copy'}
                    </button>
                  </div>
                </div>
              )}

              {document.gatewayUrl && (
                <div className="status-success rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium text-green-700 mb-2">🌐 Gateway URL</label>
                      <p className="text-sm text-green-900 font-mono break-all">{document.gatewayUrl}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(document.gatewayUrl!, 'gateway')}
                      className="ml-3 btn-success px-3 py-2 text-xs"
                    >
                      {copySuccess === 'gateway' ? '✅ Copied' : '📋 Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              ❌ Close
            </button>
            {document.gatewayUrl && (
              <button
                onClick={() => handleCopy(document.gatewayUrl!, 'gateway')}
                className="btn-primary"
              >
                {copySuccess === 'gateway' ? '✅ URL Copied' : '🔗 Copy Gateway URL'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}