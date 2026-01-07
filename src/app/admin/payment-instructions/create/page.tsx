'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import PaymentInstructionForm from '@/components/ui/PaymentInstructionForm'
import { PaymentInstructionFormData, PaymentInstructionResponse } from '@/lib/types'
import { AlertCircle, RefreshCw, Paperclip, Globe, Info } from 'lucide-react'

export default function CreatePaymentInstructionPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: PaymentInstructionFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/payment-instructions', {
        method: 'POST',
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
        throw new Error(result.error || 'Failed to create payment instruction')
      }

      // Redirect to the payment instructions list with success message
      router.push('/admin/payment-instructions?created=true')
    } catch (err) {
      console.error('Error creating payment instruction:', err)
      setError(err instanceof Error ? err.message : 'Failed to create payment instruction')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/payment-instructions')
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navigation />

      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="content-max-width section-padding">
          <div className="py-8">
            <div className="animate-fade-in">
              <h1 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-2">
                Create Payment Instruction
              </h1>
              <p className="text-lg text-[var(--text-secondary)]">
                Set up reusable payment requirements for your documents
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
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />

        {/* Help Section */}
        <div className="mt-12 card p-6">
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
            How Payment Instructions Work
          </h3>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center">
                <RefreshCw className="w-5 h-5 mr-2 text-[var(--brand-teal)]" />
                Reusable Settings
              </h4>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
                Create payment instructions once and use them for multiple documents.
                This saves time and ensures consistent pricing across your content.
              </p>

              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center">
                <Paperclip className="w-5 h-5 mr-2 text-[var(--brand-teal)]" />
                Document Attachment
              </h4>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                After creating a payment instruction, you can attach any number of
                documents to it. Each attached document gets its own gateway URL for sharing.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-[var(--brand-teal)]" />
                Base Sepolia Network
              </h4>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
                All payments use Base Sepolia testnet USDC. This is a safe testing
                environment where no real money is involved.
              </p>

              <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center">
                <span className="text-[var(--brand-teal)] mr-2 font-bold">$</span>
                Automatic Conversion
              </h4>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Enter prices in USD and they&apos;re automatically converted to USDC tokens
                with 6-decimal precision for blockchain compatibility.
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-[var(--info-light)] rounded-xl border border-[var(--info)]/20">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-[var(--info)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-[var(--info)] font-medium mb-1">
                  Next Steps After Creation
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Once you create this payment instruction, you can attach documents to it
                  from the payment instructions dashboard or during the upload process.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
