'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/layout/Navigation'
import CIDManager from '@/components/ui/CIDManager'
import { NetworkBadge } from '@/components/ui/NetworkIndicator'
import { PaymentInstruction, AttachedCID, Document, PaymentInstructionResponse, AttachedCIDsResponse, DocumentListResponse } from '@/lib/types'
import { formatUsdAmount, convertUsdcToUsd, formatUsdcWithEquivalent } from '@/lib/pricing'

export default function PaymentInstructionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [paymentInstruction, setPaymentInstruction] = useState<PaymentInstruction | null>(null)
  const [attachedCIDs, setAttachedCIDs] = useState<AttachedCID[]>([])
  const [availableCIDs, setAvailableCIDs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchPaymentInstructionDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch payment instruction details
      const piResponse = await fetch(`/api/payment-instructions/${id}`)
      if (!piResponse.ok) {
        throw new Error(`Failed to fetch payment instruction: ${piResponse.statusText}`)
      }

      const piResult: PaymentInstructionResponse = await piResponse.json()
      if (!piResult.success || !piResult.data) {
        throw new Error(piResult.error || 'Payment instruction not found')
      }

      setPaymentInstruction(piResult.data)

      // Fetch attached CIDs
      let attachedCIDsData: AttachedCID[] = []
      const cidsResponse = await fetch(`/api/payment-instructions/${id}/cids`)
      if (cidsResponse.ok) {
        const cidsResult: AttachedCIDsResponse = await cidsResponse.json()
        if (cidsResult.success && cidsResult.data) {
          attachedCIDsData = cidsResult.data.cids
          setAttachedCIDs(attachedCIDsData)
        }
      }

      // Fetch available documents (not attached to this payment instruction)
      const docsResponse = await fetch('/api/documents')
      if (docsResponse.ok) {
        const docsResult: DocumentListResponse = await docsResponse.json()
        if (docsResult.success && docsResult.data) {
          // Filter out documents that are already attached - use the actual data, not state
          const attachedCIDSet = new Set(attachedCIDsData.map(ac => ac.cid))
          const available = docsResult.data.documents.filter(doc => 
            !attachedCIDSet.has(doc.cid) && !doc.isMonetized
          )
          setAvailableCIDs(available)
        }
      }
    } catch (err) {
      console.error('Error fetching payment instruction details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load payment instruction')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchPaymentInstructionDetails()
    }
  }, [id])

  const handleAttachCID = async (cid: string) => {
    try {
      const response = await fetch(`/api/payment-instructions/${id}/cids/${cid}`, {
        method: 'PUT'
      })

      if (!response.ok) {
        throw new Error(`Failed to attach CID: ${response.statusText}`)
      }

      // Refresh the data
      await fetchPaymentInstructionDetails()
    } catch (error) {
      console.error('Error attaching CID:', error)
      setError(error instanceof Error ? error.message : 'Failed to attach document')
    }
  }

  const handleDetachCID = async (cid: string) => {
    try {
      const response = await fetch(`/api/payment-instructions/${id}/cids/${cid}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to detach CID: ${response.statusText}`)
      }

      // Refresh the data
      await fetchPaymentInstructionDetails()
    } catch (error) {
      console.error('Error detaching CID:', error)
      setError(error instanceof Error ? error.message : 'Failed to detach document')
    }
  }

  const handleBulkAttach = async (cids: string[]) => {
    try {
      // Attach CIDs one by one (could be optimized with bulk API)
      for (const cid of cids) {
        await handleAttachCID(cid)
      }
    } catch (error) {
      console.error('Error bulk attaching CIDs:', error)
      setError(error instanceof Error ? error.message : 'Failed to attach documents')
    }
  }

  const handleDelete = async () => {
    if (!paymentInstruction) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/payment-instructions/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete payment instruction: ${response.statusText}`)
      }

      // Redirect to payment instructions list
      router.push('/admin/payment-instructions?deleted=true')
    } catch (error) {
      console.error('Error deleting payment instruction:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete payment instruction')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPaymentRequirement = () => {
    return paymentInstruction?.paymentRequirements?.[0]
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <Navigation />
        <div className="content-max-width section-padding py-16">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600 text-lg">Loading payment instruction...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !paymentInstruction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <Navigation />
        <div className="content-max-width section-padding py-16">
          <div className="text-center">
            <span className="text-6xl mb-6 block">❌</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {error || 'Payment Instruction Not Found'}
            </h2>
            <p className="text-gray-600 mb-8">
              The payment instruction you're looking for doesn't exist or couldn't be loaded.
            </p>
            <Link href="/admin/payment-instructions" className="btn-primary">
              ← Back to Payment Instructions
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="content-max-width section-padding">
          <div className="py-8">
            <div className="flex items-start justify-between">
              <div className="animate-fade-in">
                <div className="flex items-center space-x-3 mb-4">
                  <Link 
                    href="/admin/payment-instructions"
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ← Payment Instructions
                  </Link>
                  <span className="text-gray-300">/</span>
                  <NetworkBadge />
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
                  {paymentInstruction.name}
                </h1>
                <p className="text-lg text-gray-600">
                  {paymentInstruction.description}
                </p>
              </div>
              
              <div className="flex gap-3">
                <Link
                  href={`/admin/payment-instructions/${id}/edit`}
                  className="btn-primary"
                >
                  ✏️ Edit
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="btn-danger"
                >
                  {isDeleting ? '🔄 Deleting...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-max-width section-padding py-8">
        {/* Error State */}
        {error && (
          <div className="mb-8 p-6 status-error rounded-2xl border animate-slide-up">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-500 mr-3 icon-clean" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Payment Instruction Details */}
        <div className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <span className="text-2xl mr-3">💳</span>
            Payment Details
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg font-semibold text-gray-900">{paymentInstruction.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-700">{paymentInstruction.description}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Price</label>
                <p className="text-lg font-semibold text-gray-900">{formatPrice()}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Wallet Address</label>
                <p className="text-sm font-mono text-gray-700 break-all">
                  {getPaymentRequirement()?.pay_to || 'No wallet set'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Network</label>
                <p className="text-gray-700">Base Sepolia (Testnet)</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-700">{formatDate(paymentInstruction.createdAt)}</p>
              </div>
              
              {paymentInstruction.updatedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-gray-700">{formatDate(paymentInstruction.updatedAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CID Management */}
        <div className="card p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <span className="text-2xl mr-3">📎</span>
            Document Management
          </h2>
          
          <CIDManager
            paymentInstructionId={id}
            attachedCIDs={attachedCIDs}
            availableCIDs={availableCIDs}
            onAttachCID={handleAttachCID}
            onDetachCID={handleDetachCID}
            onBulkAttach={handleBulkAttach}
          />
        </div>
      </div>
    </div>
  )
}