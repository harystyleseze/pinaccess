'use client'

import { useState } from 'react'
import { Document } from '@/lib/types'

interface DocumentCardProps {
  document: Document
  onCopyUrl: (url: string) => void
  onViewDetails: (id: string) => void
}

export default function DocumentCard({ document, onCopyUrl, onViewDetails }: DocumentCardProps) {
  const [copySuccess, setCopySuccess] = useState(false)

  const handleCopyUrl = async () => {
    if (!document.gatewayUrl) return
    
    try {
      await navigator.clipboard.writeText(document.gatewayUrl)
      onCopyUrl(document.gatewayUrl)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'monetized':
        return 'text-green-600 bg-green-50'
      case 'uploaded':
        return 'text-blue-600 bg-blue-50'
      case 'error':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getMimeTypeIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('epub')) return '📚'
    if (mimeType.includes('text')) return '📝'
    return '📄'
  }

  return (
    <div className="card-gradient p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-3xl animate-bounce-gentle">{getMimeTypeIcon(document.mimeType)}</span>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 truncate max-w-xs">
              {document.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              📊 {formatFileSize(document.size)} • 📅 {formatDate(document.createdAt)}
            </p>
          </div>
        </div>
        <span className={`px-4 py-2 rounded-full text-xs font-semibold animate-fade-in ${getStatusColor(document.metadata.status)}`}>
          {document.metadata.status}
        </span>
      </div>

      {/* Document Info */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 font-medium">👤 Creator:</span>
          <span className="text-gray-900 font-semibold">{document.metadata.creator}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 font-medium">🔗 CID:</span>
          <span className="text-gray-900 font-mono text-xs truncate max-w-xs">
            {document.cid}
          </span>
        </div>
        {document.isMonetized && document.price && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">💰 Price:</span>
            <span className="text-gray-900 font-semibold">
              ${document.price.usd} ({document.price.usdc} USDC)
            </span>
          </div>
        )}
        {document.walletAddress && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">🔗 Wallet:</span>
            <span className="text-gray-900 font-mono text-xs truncate max-w-xs">
              {document.walletAddress}
            </span>
          </div>
        )}
      </div>

      {/* Gateway URL */}
      {document.gatewayUrl && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-600 mb-2 font-medium">🔗 Gateway URL:</p>
              <p className="text-sm text-blue-900 font-mono truncate">
                {document.gatewayUrl}
              </p>
            </div>
            <button
              onClick={handleCopyUrl}
              className={`ml-4 px-4 py-2 text-xs transition-all duration-200 transform hover:scale-105 ${
                copySuccess ? 'btn-success' : 'btn-primary'
              }`}
            >
              {copySuccess ? '✅ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onViewDetails(document.id)}
          className="flex-1 btn-secondary text-sm transform hover:scale-105 transition-all duration-200"
        >
          👁️ View Details
        </button>
        {document.gatewayUrl && (
          <button
            onClick={handleCopyUrl}
            className={`text-sm transform hover:scale-105 transition-all duration-200 ${
              copySuccess ? 'btn-success' : 'btn-accent'
            }`}
          >
            {copySuccess ? '✅ URL Copied' : '🔗 Copy URL'}
          </button>
        )}
      </div>
    </div>
  )
}