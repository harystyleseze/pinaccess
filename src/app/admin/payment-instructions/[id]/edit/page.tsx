'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/layout/Navigation'
import PaymentInstructionForm from '@/components/ui/PaymentInstructionForm'
import { PaymentInstruction, PaymentInstructionFormData, PaymentInstructionResponse } from '@/lib/types'
import { AlertCircle, AlertTriangle, Link2, Globe, ChevronLeft, Loader2 } from 'lucide-react'

export default function EditPaymentInstructionPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [paymentInstruction, setPaymentInstruction] = useState<PaymentInstruction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPaymentInstruction = async () => {
    try {
      setFetchLoading(true)
      setError(null)

      const response = await fetch(`/api/payment-instructions/${id}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch payment instruction: ${response.statusText}`)
      }

      const result: PaymentInstructionResponse = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Payment instruction not found')
      }

      setPaymentInstruction(result.data)
    } catch (err) {
      console.error('Error fetching payment instruction:', err)
      setError(err instanceof Error ? err.message : 'Failed to load payment instruction')
    } finally {
      setFetchLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchPaymentInstruction()
    }
  }, [id])

  const handleSubmit = async (data: PaymentInstructionFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/payment-instructions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result: PaymentInstructionResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update payment instruction')
      }

      // Redirect to the payment instruction detail page
      router.push(`/admin/payment-instructions/${id}?updated=true`)
    } catch (err) {
      console.error('Error updating payment instruction:', err)
      setError(err instanceof Error ? err.message : 'Failed to update payment instruction')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/admin/payment-instructions/${id}`)
  }

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Navigation />
        <div className="content-max-width section-padding py-16">
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-[var(--brand-teal)] border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-4 text-[var(--text-secondary)] text-lg">Loading payment instruction...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !paymentInstruction) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Navigation />
        <div className="content-max-width section-padding py-16">
          <div className="text-center">
            <div className="w-20 h-20 bg-[var(--error-light)] rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-[var(--error)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
              {error || 'Payment Instruction Not Found'}
            </h2>
            <p className="text-[var(--text-secondary)] mb-8">
              The payment instruction you&apos;re trying to edit doesn&apos;t exist or couldn&apos;t be loaded.
            </p>
            <Link href="/admin/payment-instructions" className="btn-primary">
              <ChevronLeft className="w-4 h-4" />
              Back to Payment Instructions
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navigation />

      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="content-max-width section-padding">
          <div className="py-8">
            <div className="animate-fade-in">
              <div className="flex items-center space-x-3 mb-4">
                <Link
                  href="/admin/payment-instructions"
                  className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Payment Instructions
                </Link>
                <span className="text-[var(--border)]">/</span>
                <Link
                  href={`/admin/payment-instructions/${id}`}
                  className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {paymentInstruction.name}
                </Link>
                <span className="text-[var(--border)]">/</span>
                <span className="text-[var(--text-secondary)]">Edit</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-2">
                Edit Payment Instruction
              </h1>
              <p className="text-lg text-[var(--text-secondary)]">
                Update payment requirements and settings
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="content-max-width section-padding py-8">
        {/* Error State */}
        {error && (
          <div className="mb-8 p-6 status-error rounded-2xl border animate-slide-up">
            <div className="flex items-center">
              <AlertCircle className="w-6 h-6 mr-3" />
              <p className="font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <PaymentInstructionForm
          mode="edit"
          initialData={paymentInstruction}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />

        {/* Warning Section */}
        <div className="mt-12 card p-6">
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6 flex items-center">
            <AlertTriangle className="w-6 h-6 mr-3 text-[var(--warning)]" />
            Important Notes
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-[var(--warning-light)] rounded-xl border border-[var(--warning)]/20">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--warning)] font-medium mb-1">
                    Attached Documents
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Changes to pricing will affect all documents currently attached to this payment instruction.
                    Existing gateway URLs will continue to work with the new pricing.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[var(--info-light)] rounded-xl border border-[var(--info)]/20">
              <div className="flex items-start space-x-3">
                <Link2 className="w-5 h-5 text-[var(--info)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--info)] font-medium mb-1">
                    Wallet Address Changes
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Updating the wallet address will change where future payments are sent.
                    Make sure you have access to the new wallet address.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[var(--success-light)] rounded-xl border border-[var(--success)]/20">
              <div className="flex items-start space-x-3">
                <Globe className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--success)] font-medium mb-1">
                    Testnet Environment
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Remember that this is using Base Sepolia testnet. All transactions are for testing purposes only.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
