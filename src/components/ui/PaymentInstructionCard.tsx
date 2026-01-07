'use client'

import { useState } from 'react'
import { Eye, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { PaymentInstruction } from '@/lib/types'
import { formatUsdAmount, convertUsdcToUsd, formatUsdcWithEquivalent } from '@/lib/pricing'

interface PaymentInstructionCardProps {
  paymentInstruction: PaymentInstruction
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onViewDetails: (id: string) => void
  attachedCIDCount: number
}

export default function PaymentInstructionCard({
  paymentInstruction,
  onEdit,
  onDelete,
  onViewDetails,
  attachedCIDCount
}: PaymentInstructionCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setIsDeleting(true)
    try {
      await onDelete(paymentInstruction.id)
    } catch (error) {
      console.error('Failed to delete payment instruction:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
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

  const getPaymentRequirement = () => {
    return paymentInstruction.paymentRequirements?.[0]
  }

  const formatPrice = () => {
    const requirement = getPaymentRequirement()
    if (!requirement) return 'No price set'

    try {
      const usdAmount = convertUsdcToUsd(requirement.max_amount_required)
      return `${formatUsdAmount(usdAmount)} (${formatUsdcWithEquivalent(requirement.max_amount_required)})`
    } catch {
      return formatUsdcWithEquivalent(requirement.max_amount_required)
    }
  }

  const getWalletAddress = () => {
    const requirement = getPaymentRequirement()
    return requirement?.pay_to || 'No wallet set'
  }

  const getStatusBadge = () => {
    if (attachedCIDCount > 0) {
      return 'badge-success'
    }
    return 'badge-info'
  }

  const getStatusText = () => {
    if (attachedCIDCount > 0) {
      return `${attachedCIDCount} document${attachedCIDCount === 1 ? '' : 's'} attached`
    }
    return 'No documents attached'
  }

  return (
    <div className="card p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate max-w-xs">
            {paymentInstruction.name}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Created {formatDate(paymentInstruction.createdAt)}
          </p>
        </div>
        <span className={`badge ${getStatusBadge()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Description */}
      <div className="mb-4">
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed line-clamp-2">
          {paymentInstruction.description}
        </p>
      </div>

      {/* Payment Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Price</span>
          <span className="text-[var(--text-primary)] font-medium">
            {formatPrice()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Wallet</span>
          <span className="text-[var(--text-primary)] font-mono text-xs truncate max-w-[180px]">
            {getWalletAddress()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Network</span>
          <span className="text-[var(--text-primary)]">
            Base Sepolia (Testnet)
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Documents</span>
          <span className="text-[var(--text-primary)]">
            {attachedCIDCount} attached
          </span>
        </div>
      </div>

      {/* Testnet Warning */}
      <div className="mb-4 p-3 status-warning rounded-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs font-medium">
            Testing Environment - Uses Base Sepolia testnet USDC
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => onViewDetails(paymentInstruction.id)}
          className="flex-1 btn-secondary btn-sm"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button
          onClick={() => onEdit(paymentInstruction.id)}
          className="btn-primary btn-sm"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={`btn-sm ${
            showDeleteConfirm
              ? 'btn-error'
              : 'btn-secondary hover:bg-[var(--error-light)] hover:text-[var(--error)] hover:border-[var(--error)]'
          }`}
        >
          {isDeleting ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Deleting...
            </>
          ) : showDeleteConfirm ? (
            'Confirm Delete'
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Delete
            </>
          )}
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="mt-4 p-3 status-error rounded-lg animate-fade-in">
          <p className="text-sm mb-3">
            Are you sure you want to delete this payment instruction?
            {attachedCIDCount > 0 && (
              <span className="font-semibold">
                {' '}This will also detach {attachedCIDCount} document{attachedCIDCount === 1 ? '' : 's'}.
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn-error btn-sm"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
