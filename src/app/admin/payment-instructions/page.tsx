'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import PaymentInstructionCard from '@/components/ui/PaymentInstructionCard'
import { TestnetWarning } from '@/components/ui/NetworkIndicator'
import { PaymentInstruction, PaymentInstructionListResponse } from '@/lib/types'

interface PaymentInstructionStats {
  totalInstructions: number
  totalAttachedCIDs: number
  averagePrice: number
  recentInstructions: number
}

export default function PaymentInstructionsPage() {
  const router = useRouter()
  const [paymentInstructions, setPaymentInstructions] = useState<PaymentInstruction[]>([])
  const [stats, setStats] = useState<PaymentInstructionStats>({
    totalInstructions: 0,
    totalAttachedCIDs: 0,
    averagePrice: 0,
    recentInstructions: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'with-cids' | 'without-cids'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'price'>('newest')

  const fetchPaymentInstructions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/payment-instructions')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: PaymentInstructionListResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch payment instructions')
      }

      if (result.data) {
        const instructions = result.data.paymentInstructions
        setPaymentInstructions(instructions)
        
        // Calculate statistics
        const totalInstructions = instructions.length
        const totalAttachedCIDs = instructions.reduce((sum, pi) => sum + (pi.attachedCIDCount || 0), 0)
        
        // Calculate average price
        const instructionsWithPrice = instructions.filter(pi => 
          pi.paymentRequirements?.[0]?.maxAmountRequired
        )
        const averagePrice = instructionsWithPrice.length > 0 
          ? instructionsWithPrice.reduce((sum, pi) => {
              const usdcAmount = parseInt(pi.paymentRequirements[0].maxAmountRequired)
              return sum + (usdcAmount / 1000000) // Convert USDC to USD
            }, 0) / instructionsWithPrice.length
          : 0

        // Recent instructions (last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const recentInstructions = instructions.filter(pi => 
          new Date(pi.createdAt) > sevenDaysAgo
        ).length

        setStats({
          totalInstructions,
          totalAttachedCIDs,
          averagePrice,
          recentInstructions
        })
      }
    } catch (err) {
      console.error('Error fetching payment instructions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load payment instructions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentInstructions()
  }, [])

  const handleEdit = (id: string) => {
    router.push(`/admin/payment-instructions/${id}/edit`)
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/payment-instructions/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete payment instruction: ${response.statusText}`)
      }

      // Refresh the list
      await fetchPaymentInstructions()
    } catch (error) {
      console.error('Error deleting payment instruction:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete payment instruction')
    }
  }

  const handleViewDetails = (id: string) => {
    router.push(`/admin/payment-instructions/${id}`)
  }

  // Filter and sort payment instructions
  const filteredAndSortedInstructions = paymentInstructions
    .filter(pi => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesName = pi.name.toLowerCase().includes(searchLower)
        const matchesDescription = pi.description.toLowerCase().includes(searchLower)
        const matchesId = pi.id.toLowerCase().includes(searchLower)
        if (!matchesName && !matchesDescription && !matchesId) {
          return false
        }
      }

      // CID filter
      if (filterBy === 'with-cids') {
        return (pi.attachedCIDCount || 0) > 0
      } else if (filterBy === 'without-cids') {
        return (pi.attachedCIDCount || 0) === 0
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'name':
          return a.name.localeCompare(b.name)
        case 'price':
          const aPrice = a.paymentRequirements?.[0]?.maxAmountRequired ? parseInt(a.paymentRequirements[0].maxAmountRequired) : 0
          const bPrice = b.paymentRequirements?.[0]?.maxAmountRequired ? parseInt(b.paymentRequirements[0].maxAmountRequired) : 0
          return bPrice - aPrice
        default:
          return 0
      }
    })

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="content-max-width section-padding">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6">
            <div className="animate-fade-in">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">Payment Instructions</h1>
              <p className="text-lg text-gray-600">
                Create and manage reusable payment settings for your documents
              </p>
            </div>
            <Link
              href="/admin/payment-instructions/create"
              className="btn-primary text-lg px-8 py-4 animate-pulse-gentle"
            >
              💳 Create Payment Instruction
            </Link>
          </div>
        </div>
      </div>

      <div className="content-max-width section-padding py-8">
        {/* Testnet Warning */}
        <div className="mb-8">
          <TestnetWarning />
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-6 status-error rounded-2xl border animate-slide-up">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-500 mr-3 icon-clean" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
            <button
              onClick={fetchPaymentInstructions}
              className="mt-4 btn-error px-6 py-2"
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="card-gradient p-8 animate-slide-up">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">💳</span>
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 mb-1">Total Instructions</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? <span className="loading-shimmer w-12 h-8 rounded"></span> : stats.totalInstructions}
                </p>
              </div>
            </div>
          </div>

          <div className="card-gradient p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">📎</span>
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 mb-1">Attached Documents</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? <span className="loading-shimmer w-12 h-8 rounded"></span> : stats.totalAttachedCIDs}
                </p>
              </div>
            </div>
          </div>

          <div className="card-gradient p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 mb-1">Average Price</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {loading ? <span className="loading-shimmer w-16 h-8 rounded"></span> : formatCurrency(stats.averagePrice)}
                </p>
              </div>
            </div>
          </div>

          <div className="card-gradient p-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🆕</span>
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 mb-1">Recent</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? <span className="loading-shimmer w-12 h-8 rounded"></span> : stats.recentInstructions}
                </p>
                <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card p-8 mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                🔍 Search Payment Instructions
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, description, or ID..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Filter */}
            <div>
              <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-2">
                📋 Filter
              </label>
              <select
                id="filter"
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">All Instructions</option>
                <option value="with-cids">With Documents</option>
                <option value="without-cids">Without Documents</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
                🔄 Sort By
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="price">Price (High-Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payment Instructions List */}
        <div className="card">
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                Payment Instructions ({filteredAndSortedInstructions.length})
              </h2>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="btn-secondary text-sm"
                >
                  ❌ Clear Search
                </button>
              )}
            </div>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <span className="ml-4 text-gray-600 text-lg">Loading payment instructions...</span>
              </div>
            ) : filteredAndSortedInstructions.length === 0 ? (
              <div className="text-center py-16">
                {paymentInstructions.length === 0 ? (
                  <>
                    <span className="text-6xl mb-6 block">💳</span>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      No Payment Instructions Yet
                    </h3>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      Create your first payment instruction to start monetizing your documents with reusable payment settings.
                    </p>
                    <Link
                      href="/admin/payment-instructions/create"
                      className="btn-primary text-lg px-8 py-4"
                    >
                      💳 Create Your First Payment Instruction
                    </Link>
                  </>
                ) : (
                  <>
                    <span className="text-6xl mb-6 block">🔍</span>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      No Results Found
                    </h3>
                    <p className="text-gray-600 mb-8">
                      No payment instructions match your current search and filter criteria.
                    </p>
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setFilterBy('all')
                      }}
                      className="btn-secondary"
                    >
                      🔄 Reset Filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid gap-8">
                {filteredAndSortedInstructions.map((paymentInstruction) => (
                  <PaymentInstructionCard
                    key={paymentInstruction.id}
                    paymentInstruction={paymentInstruction}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                    attachedCIDCount={paymentInstruction.attachedCIDCount || 0}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12 card p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/admin/payment-instructions/create"
              className="flex items-center p-6 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-6">
                <span className="text-2xl">💳</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Create Payment Instruction</p>
                <p className="text-sm text-gray-600">Set up new payment requirements</p>
              </div>
            </Link>

            <Link
              href="/admin/upload"
              className="flex items-center p-6 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-6">
                <span className="text-2xl">📤</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Upload Document</p>
                <p className="text-sm text-gray-600">Add documents to monetize</p>
              </div>
            </Link>

            <button
              onClick={fetchPaymentInstructions}
              className="flex items-center p-6 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-6">
                <span className="text-2xl">🔄</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Refresh Data</p>
                <p className="text-sm text-gray-600">Update payment instructions</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}