'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import PaymentInstructionForm from '@/components/ui/PaymentInstructionForm'
import { PaymentInstructionFormData, PaymentInstructionResponse } from '@/lib/types'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="content-max-width section-padding">
          <div className="py-8">
            <div className="animate-fade-in">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
                Create Payment Instruction
              </h1>
              <p className="text-lg text-gray-600">
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
              <svg className="w-6 h-6 text-red-500 mr-3 icon-clean" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 font-semibold">{error}</p>
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
        <div className="mt-12 card p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <span className="text-2xl mr-3">💡</span>
            How Payment Instructions Work
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-lg mr-2">🔄</span>
                Reusable Settings
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Create payment instructions once and use them for multiple documents. 
                This saves time and ensures consistent pricing across your content.
              </p>
              
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-lg mr-2">📎</span>
                Document Attachment
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                After creating a payment instruction, you can attach any number of 
                documents to it. Each attached document gets its own gateway URL for sharing.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-lg mr-2">🌐</span>
                Base Sepolia Network
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                All payments use Base Sepolia testnet USDC. This is a safe testing 
                environment where no real money is involved.
              </p>
              
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-lg mr-2">💰</span>
                Automatic Conversion
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Enter prices in USD and they're automatically converted to USDC tokens 
                with 6-decimal precision for blockchain compatibility.
              </p>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start space-x-3">
              <span className="text-blue-600 text-lg">ℹ️</span>
              <div>
                <p className="text-sm text-blue-800 font-medium mb-1">
                  Next Steps After Creation
                </p>
                <p className="text-xs text-blue-700">
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