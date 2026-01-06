'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/layout/Navigation'
import PaymentInstructionForm from '@/components/ui/PaymentInstructionForm'
import { PaymentInstruction, PaymentInstructionFormData, PaymentInstructionResponse } from '@/lib/types'

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
              The payment instruction you're trying to edit doesn't exist or couldn't be loaded.
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
            <div className="animate-fade-in">
              <div className="flex items-center space-x-3 mb-4">
                <Link 
                  href="/admin/payment-instructions"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← Payment Instructions
                </Link>
                <span className="text-gray-300">/</span>
                <Link 
                  href={`/admin/payment-instructions/${id}`}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {paymentInstruction.name}
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-gray-700">Edit</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
                Edit Payment Instruction
              </h1>
              <p className="text-lg text-gray-600">
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
              <svg className="w-6 h-6 text-red-500 mr-3 icon-clean" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 font-semibold">{error}</p>
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
        <div className="mt-12 card p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            Important Notes
          </h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <div className="flex items-start space-x-3">
                <span className="text-yellow-600 text-lg">💡</span>
                <div>
                  <p className="text-sm text-yellow-800 font-medium mb-1">
                    Attached Documents
                  </p>
                  <p className="text-xs text-yellow-700">
                    Changes to pricing will affect all documents currently attached to this payment instruction. 
                    Existing gateway URLs will continue to work with the new pricing.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start space-x-3">
                <span className="text-blue-600 text-lg">🔗</span>
                <div>
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    Wallet Address Changes
                  </p>
                  <p className="text-xs text-blue-700">
                    Updating the wallet address will change where future payments are sent. 
                    Make sure you have access to the new wallet address.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-start space-x-3">
                <span className="text-green-600 text-lg">🌐</span>
                <div>
                  <p className="text-sm text-green-800 font-medium mb-1">
                    Testnet Environment
                  </p>
                  <p className="text-xs text-green-700">
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