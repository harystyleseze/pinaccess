'use client'

import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{document.name}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">Document Details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--surface-elevated)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span className={`badge ${getStatusBadge(document.metadata.status)}`}>
              {document.metadata.status.charAt(0).toUpperCase() + document.metadata.status.slice(1)}
            </span>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Basic Information
              </h3>

              <div className="space-y-4">
                <div className="p-3 bg-[var(--surface-elevated)] rounded-xl">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">File Name</label>
                  <p className="text-sm text-[var(--text-primary)] font-medium">{document.name}</p>
                </div>

                <div className="p-3 bg-[var(--surface-elevated)] rounded-xl">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">File Size</label>
                  <p className="text-sm text-[var(--text-primary)] font-medium">{formatFileSize(document.size)}</p>
                </div>

                <div className="p-3 bg-[var(--surface-elevated)] rounded-xl">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">MIME Type</label>
                  <p className="text-sm text-[var(--text-primary)] font-mono">{document.mimeType}</p>
                </div>

                <div className="p-3 bg-[var(--surface-elevated)] rounded-xl">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Upload Date</label>
                  <p className="text-sm text-[var(--text-primary)]">{formatDate(document.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Metadata
              </h3>

              <div className="space-y-4">
                <div className="p-3 bg-[var(--surface-elevated)] rounded-xl">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Creator</label>
                  <p className="text-sm text-[var(--text-primary)] font-medium">{document.metadata.creator}</p>
                </div>

                <div className="p-3 bg-[var(--surface-elevated)] rounded-xl">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Status</label>
                  <p className="text-sm text-[var(--text-primary)] font-medium">{document.metadata.status}</p>
                </div>

                <div className="p-3 bg-[var(--surface-elevated)] rounded-xl">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Upload Timestamp</label>
                  <p className="text-sm text-[var(--text-primary)]">{formatDate(document.metadata.uploadTimestamp)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* IPFS Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              IPFS Information
            </h3>

            <div className="p-4 rounded-xl bg-[var(--info-light)] border border-[var(--info)]/20">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-[var(--info)] mb-2">Content ID (CID)</label>
                  <p className="text-sm text-[var(--text-primary)] font-mono break-all">{document.cid}</p>
                </div>
                <button
                  onClick={() => handleCopy(document.cid, 'cid')}
                  className="ml-3 btn-primary btn-sm"
                >
                  {copySuccess === 'cid' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copySuccess === 'cid' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Monetization Information */}
          {document.isMonetized && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Monetization Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {document.price && (
                  <div className="p-3 bg-[var(--success-light)] rounded-xl border border-[var(--success)]/20">
                    <label className="block text-sm font-medium text-[var(--success)] mb-1">Price</label>
                    <p className="text-sm text-[var(--text-primary)] font-semibold">
                      ${document.price.usd} USD ({document.price.usdc} USDC)
                    </p>
                  </div>
                )}

                {document.paymentInstructionId && (
                  <div className="p-3 bg-[var(--primary-light)] rounded-xl border border-[var(--brand-teal)]/20">
                    <label className="block text-sm font-medium text-[var(--brand-teal)] mb-1">Payment ID</label>
                    <p className="text-sm text-[var(--text-primary)] font-mono">{document.paymentInstructionId}</p>
                  </div>
                )}
              </div>

              {document.walletAddress && (
                <div className="p-4 rounded-xl bg-[var(--info-light)] border border-[var(--info)]/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium text-[var(--info)] mb-2">Payment Wallet Address</label>
                      <p className="text-sm text-[var(--text-primary)] font-mono break-all">{document.walletAddress}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(document.walletAddress!, 'wallet')}
                      className="ml-3 btn-secondary btn-sm"
                    >
                      {copySuccess === 'wallet' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copySuccess === 'wallet' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {document.gatewayUrl && (
                <div className="p-4 rounded-xl bg-[var(--success-light)] border border-[var(--success)]/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium text-[var(--success)] mb-2">Gateway URL</label>
                      <p className="text-sm text-[var(--text-primary)] font-mono break-all">{document.gatewayUrl}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(document.gatewayUrl!, 'gateway')}
                      className={`ml-3 btn-sm ${copySuccess === 'gateway' ? 'btn-success' : 'btn-primary'}`}
                    >
                      {copySuccess === 'gateway' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copySuccess === 'gateway' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--border)]">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Close
            </button>
            {document.gatewayUrl && (
              <button
                onClick={() => handleCopy(document.gatewayUrl!, 'gateway')}
                className="btn-primary"
              >
                {copySuccess === 'gateway' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copySuccess === 'gateway' ? 'URL Copied' : 'Copy Gateway URL'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
