'use client'

import { useState } from 'react'
import { PaymentInstruction } from '@/lib/types'
import { formatUsdAmount, convertUsdcToUsd } from '@/lib/pricing'

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
      return `${formatUsdAmount(usdAmount)} (${parseInt(requirement.max_amount_required).toLocaleString()} USDC)`
    } catch {
      return `${parseInt(requirement.max_amount_required).toLocaleString()} USDC`
    }
  }

  const getWalletAddress = () => {
    const requirement = getPaymentRequirement()
    return requirement?.pay_to || 'No wallet set'
  }

  const getStatusColor = () => {
    if (attachedCIDCount > 0) {
      return 'text-green-600 bg-green-50'
    }
    return 'text-blue-600 bg-blue-50'
  }

  const getStatusText = () => {
    if (attachedCIDCount > 0) {
      return `${attachedCIDCount} document${attachedCIDCount === 1 ? '' : 's'} attached`
    }
    return 'No documents attached'
  }

  return (
    <div className="card-gradient p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-3xl animate-bounce-gentle">💳</span>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 truncate max-w-xs">
              {paymentInstruction.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              📅 Created {formatDate(paymentInstruction.createdAt)}
            </p>
          </div>
        </div>
        <span className={`px-4 py-2 rounded-full text-xs font-semibold animate-fade-in ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Description */}
      <div className="mb-6">
        <p className="text-gray-700 text-sm leading-relaxed">
          {paymentInstruction.description}
        </p>
      </div>

      {/* Payment Details */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 font-medium">💰 Price:</span>
          <span className="text-gray-900 font-semibold">
            {formatPrice()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 font-medium">🔗 Wallet:</span>
          <span className="text-gray-900 font-mono text-xs truncate max-w-xs">
            {getWalletAddress()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 font-medium">🌐 Network:</span>
          <span className="text-gray-900 font-semibold">
            Base Sepolia (Testnet)
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 font-medium">📄 Documents:</span>
          <span className="text-gray-900 font-semibold">
            {attachedCIDCount} attached
          </span>
        </div>
      </div>

      {/* Testnet Warning */}
      <div className="mb-6 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 animate-fade-in">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-600">⚠️</span>
          <p className="text-xs text-yellow-800 font-medium">
            Testing Environment - Uses Base Sepolia testnet USDC
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onViewDetails(paymentInstruction.id)}
          className="flex-1 btn-secondary text-sm transform hover:scale-105 transition-all duration-200"
        >
          👁️ View Details
        </button>
        <button
          onClick={() => onEdit(paymentInstruction.id)}
          className="btn-primary text-sm transform hover:scale-105 transition-all duration-200"
        >
          ✏️ Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={`text-sm transform hover:scale-105 transition-all duration-200 ${
            showDeleteConfirm 
              ? 'btn-danger' 
              : 'btn-secondary hover:bg-red-50 hover:text-red-600'
          }`}
        >
          {isDeleting ? (
            <>🔄 Deleting...</>
          ) : showDeleteConfirm ? (
            <>⚠️ Confirm Delete</>
          ) : (
            <>🗑️ Delete</>
          )}
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200 animate-fade-in">
          <p className="text-sm text-red-800 mb-3">
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
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn-danger text-xs"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}