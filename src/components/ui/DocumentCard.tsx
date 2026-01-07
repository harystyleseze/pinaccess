'use client'

import { useState } from 'react'
import { Copy, Check, Eye } from 'lucide-react'
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
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'monetized':
        return 'badge-success'
      case 'uploaded':
        return 'badge-info'
      case 'error':
        return 'badge-error'
      default:
        return 'badge-neutral'
    }
  }

  return (
    <div className="card p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
            {document.name}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {formatFileSize(document.size)} · {formatDate(document.createdAt)}
          </p>
        </div>
        <span className={`badge ${getStatusBadge(document.metadata.status)}`}>
          {document.metadata.status}
        </span>
      </div>

      {/* Document Info */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Creator</span>
          <span className="text-[var(--text-primary)] font-medium">{document.metadata.creator}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">CID</span>
          <span className="text-[var(--text-secondary)] font-mono text-xs truncate max-w-[180px]">
            {document.cid}
          </span>
        </div>
        {document.isMonetized && document.price && (
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Price</span>
            <span className="text-[var(--success)] font-semibold">
              ${document.price.usd}
            </span>
          </div>
        )}
      </div>

      {/* Gateway URL */}
      {document.gatewayUrl && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--primary-light)]">
          <p className="text-xs text-[var(--text-muted)] mb-1">Gateway URL</p>
          <p className="text-sm text-[var(--brand-teal)] font-mono truncate">
            {document.gatewayUrl}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewDetails(document.id)}
          className="btn-secondary btn-sm flex-1"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        {document.gatewayUrl && (
          <button
            onClick={handleCopyUrl}
            className={`btn-sm ${copySuccess ? 'btn-success' : 'btn-primary'}`}
          >
            {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copySuccess ? 'Copied' : 'Copy URL'}
          </button>
        )}
      </div>
    </div>
  )
}
