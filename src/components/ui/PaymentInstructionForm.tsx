'use client'

import { useState, useEffect } from 'react'
import { PaymentInstruction, PaymentInstructionFormData } from '@/lib/types'
import { validatePaymentInstructionForm } from '@/lib/validation'
import { parseUsdAmount, convertUsdToUsdc } from '@/lib/pricing'

interface PaymentInstructionFormProps {
  initialData?: Partial<PaymentInstruction>
  onSubmit: (data: PaymentInstructionFormData) => void
  onCancel: () => void
  isLoading: boolean
  mode: 'create' | 'edit'
}

export default function PaymentInstructionForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  mode
}: PaymentInstructionFormProps) {
  const [formData, setFormData] = useState<PaymentInstructionFormData>({
    name: '',
    description: '',
    priceUSD: 0,
    walletAddress: '',
    network: 'base-sepolia'
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [priceInput, setPriceInput] = useState('')
  const [usdcPreview, setUsdcPreview] = useState('')

  // Initialize form with existing data for edit mode
  useEffect(() => {
    if (initialData && mode === 'edit') {
      const requirement = initialData.paymentRequirements?.[0]
      let priceUSD = 0
      
      if (requirement?.max_amount_required) {
        try {
          // Convert USDC back to USD for editing
          const usdcAmount = parseInt(requirement.max_amount_required)
          priceUSD = usdcAmount / 1000000 // Convert from 6-decimal USDC to USD
        } catch (error) {
          console.error('Error converting USDC to USD:', error)
        }
      }

      const newFormData = {
        name: initialData.name || '',
        description: initialData.description || '',
        priceUSD,
        walletAddress: requirement?.pay_to || '',
        network: 'base-sepolia' as const
      }

      setFormData(newFormData)
      setPriceInput(priceUSD > 0 ? priceUSD.toString() : '')
      
      if (priceUSD > 0) {
        try {
          const usdcAmount = convertUsdToUsdc(priceUSD)
          setUsdcPreview(`${parseInt(usdcAmount).toLocaleString()} USDC`)
        } catch (error) {
          setUsdcPreview('')
        }
      }
    }
  }, [initialData, mode])

  const handleInputChange = (field: keyof PaymentInstructionFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Real-time validation for each field
    validateFieldRealTime(field, value)
  }

  const validateFieldRealTime = (field: keyof PaymentInstructionFormData, value: string | number) => {
    let fieldError: string | undefined

    switch (field) {
      case 'name':
        if (typeof value === 'string') {
          if (value.trim().length === 0) {
            fieldError = undefined // Don't show error for empty field
          } else if (value.trim().length < 3) {
            fieldError = 'Name must be at least 3 characters long'
          }
        }
        break
      
      case 'description':
        if (typeof value === 'string') {
          if (value.trim().length === 0) {
            fieldError = undefined // Don't show error for empty field
          } else if (value.trim().length < 5) {
            fieldError = 'Description must be at least 5 characters long'
          }
        }
        break
      
      case 'priceUSD':
        if (typeof value === 'number') {
          if (value <= 0) {
            fieldError = 'Price must be greater than zero'
          } else if (value > 10000) {
            fieldError = 'Price cannot exceed $10,000'
          }
        }
        break
      
      case 'walletAddress':
        if (typeof value === 'string') {
          if (value.trim().length === 0) {
            fieldError = undefined // Don't show error for empty field
          } else if (!value.startsWith('0x')) {
            fieldError = 'Wallet address must start with 0x'
          } else if (value.length !== 42) {
            fieldError = 'Wallet address must be 42 characters long'
          }
        }
        break
    }

    // Update errors state
    setErrors(prev => {
      const newErrors = { ...prev }
      if (fieldError) {
        newErrors[field] = fieldError
      } else {
        delete newErrors[field]
      }
      return newErrors
    })
  }

  const handlePriceChange = (value: string) => {
    setPriceInput(value)
    
    const parsed = parseUsdAmount(value)
    if (parsed.isValid && parsed.amount) {
      handleInputChange('priceUSD', parsed.amount)
      
      // Update USDC preview
      try {
        const usdcAmount = convertUsdToUsdc(parsed.amount)
        setUsdcPreview(`${parseInt(usdcAmount).toLocaleString()} USDC`)
      } catch (error) {
        setUsdcPreview('Invalid amount')
      }
    } else {
      handleInputChange('priceUSD', 0)
      setUsdcPreview('')
      
      // Set price error if there's input but it's invalid
      if (value.trim() !== '') {
        setErrors(prev => ({ ...prev, priceUSD: parsed.error || 'Invalid price' }))
      } else {
        // Clear price error if input is empty
        setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.priceUSD
          return newErrors
        })
      }
    }
  }

  const validateForm = (): boolean => {
    const validation = validatePaymentInstructionForm(formData)
    
    if (!validation.isValid) {
      // Parse the error to determine which field it relates to
      const error = validation.error || 'Validation failed'
      
      if (error.includes('name') || error.includes('Name')) {
        setErrors({ name: error })
      } else if (error.includes('description') || error.includes('Description')) {
        setErrors({ description: error })
      } else if (error.includes('price') || error.includes('Price')) {
        setErrors({ priceUSD: error })
      } else if (error.includes('wallet') || error.includes('address')) {
        setErrors({ walletAddress: error })
      } else {
        setErrors({ general: error })
      }
      
      return false
    }

    setErrors({})
    return true
  }

  // Check if form is ready for submission
  const isFormComplete = (): boolean => {
    const nameValid = formData.name.trim().length >= 3
    const descriptionValid = formData.description.trim().length >= 5
    const priceValid = formData.priceUSD > 0
    const walletValid = formData.walletAddress.trim().length === 42 && formData.walletAddress.startsWith('0x')
    const noErrors = Object.keys(errors).length === 0
    
    return nameValid && descriptionValid && priceValid && walletValid && noErrors
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    onSubmit(formData)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card-gradient p-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <span className="text-3xl animate-bounce-gentle">💳</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Create Payment Instruction' : 'Edit Payment Instruction'}
            </h2>
            <p className="text-gray-600 mt-1">
              {mode === 'create' 
                ? 'Set up payment requirements for your documents' 
                : 'Update payment instruction details'
              }
            </p>
          </div>
        </div>

        {/* Testnet Warning */}
        <div className="mb-8 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 animate-fade-in">
          <div className="flex items-start space-x-3">
            <span className="text-yellow-600 text-lg">⚠️</span>
            <div>
              <p className="text-sm text-yellow-800 font-medium mb-1">
                Testing Environment
              </p>
              <p className="text-xs text-yellow-700">
                This uses Base Sepolia testnet USDC. No real money will be charged.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200 animate-fade-in">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              📝 Payment Instruction Name
              <span className="text-xs text-gray-500 ml-2">
                ({formData.name.trim().length}/3 characters minimum)
              </span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Premium Content Access, Research Paper Bundle"
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="mt-2 text-sm text-red-600 animate-fade-in">{errors.name}</p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              📄 Description
              <span className="text-xs text-gray-500 ml-2">
                ({formData.description.trim().length}/5 characters minimum)
              </span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what buyers will get access to..."
              rows={4}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none ${
                errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="mt-2 text-sm text-red-600 animate-fade-in">{errors.description}</p>
            )}
          </div>

          {/* Price Field */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              💰 Price (USD)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                id="price"
                value={priceInput}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.priceUSD ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
            </div>
            {usdcPreview && !errors.priceUSD && (
              <p className="mt-2 text-sm text-gray-600 animate-fade-in">
                💎 Equivalent: {usdcPreview} (Base Sepolia testnet)
              </p>
            )}
            {errors.priceUSD && (
              <p className="mt-2 text-sm text-red-600 animate-fade-in">{errors.priceUSD}</p>
            )}
          </div>

          {/* Wallet Address Field */}
          <div>
            <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-2">
              🔗 Wallet Address (Base Sepolia)
            </label>
            <input
              type="text"
              id="walletAddress"
              value={formData.walletAddress}
              onChange={(e) => handleInputChange('walletAddress', e.target.value)}
              placeholder="0x..."
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono text-sm ${
                errors.walletAddress ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.walletAddress && (
              <p className="mt-2 text-sm text-red-600 animate-fade-in">{errors.walletAddress}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Enter your Ethereum wallet address to receive testnet USDC payments
            </p>
          </div>

          {/* Network Info */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-blue-600">🌐</span>
              <p className="text-sm font-medium text-blue-800">Network Configuration</p>
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• Network: Base Sepolia (Testnet)</p>
              <p>• Token: USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e)</p>
              <p>• Environment: Testing only - no real money involved</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="btn-secondary transform hover:scale-105 transition-all duration-200"
            >
              ❌ Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isFormComplete()}
              className="flex-1 btn-primary transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>🔄 {mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>✅ {mode === 'create' ? 'Create Payment Instruction' : 'Update Payment Instruction'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}