'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import PaymentInstructionCard from '@/components/ui/PaymentInstructionCard'
import { TestnetWarning } from '@/components/ui/NetworkIndicator'
import { PaymentInstruction, PaymentInstructionListResponse } from '@/lib/types'
import { CreditCard, Paperclip, DollarSign, Plus, Search, RefreshCw, Upload, AlertCircle, X } from 'lucide-react'

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
          pi.paymentRequirements?.[0]?.max_amount_required
        )
        const averagePrice = instructionsWithPrice.length > 0
          ? instructionsWithPrice.reduce((sum, pi) => {
              const usdcAmount = parseInt(pi.paymentRequirements[0].max_amount_required)
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
          const aPrice = a.paymentRequirements?.[0]?.max_amount_required ? parseInt(a.paymentRequirements[0].max_amount_required) : 0
          const bPrice = b.paymentRequirements?.[0]?.max_amount_required ? parseInt(b.paymentRequirements[0].max_amount_required) : 0
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
    <div className="min-h-screen bg-[var(--background)]">
      <Navigation />

      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="content-max-width section-padding">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-6">
            <div className="animate-fade-in">
              <h1 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-2">Payment Instructions</h1>
              <p className="text-lg text-[var(--text-secondary)]">
                Create and manage reusable payment settings for your documents
              </p>
            </div>
            <Link
              href="/admin/payment-instructions/create"
              className="btn-primary btn-lg"
            >
              <CreditCard className="w-5 h-5" />
              Create Payment Instruction
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
              <AlertCircle className="w-6 h-6 mr-3" />
              <p className="font-semibold">{error}</p>
            </div>
            <button
              onClick={fetchPaymentInstructions}
              className="mt-4 btn-primary"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="card p-6 animate-slide-up">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-[var(--brand-teal)] flex-shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Total Instructions</p>
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {loading ? <span className="inline-block w-12 h-8 rounded bg-[var(--surface-elevated)] animate-pulse"></span> : stats.totalInstructions}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center">
              <Paperclip className="w-8 h-8 text-[var(--success)] flex-shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Attached Documents</p>
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {loading ? <span className="inline-block w-12 h-8 rounded bg-[var(--surface-elevated)] animate-pulse"></span> : stats.totalAttachedCIDs}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-[var(--info)] flex-shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Average Price</p>
                <p className="text-3xl font-bold text-gradient">
                  {loading ? <span className="inline-block w-16 h-8 rounded bg-[var(--surface-elevated)] animate-pulse"></span> : formatCurrency(stats.averagePrice)}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center">
              <Plus className="w-8 h-8 text-[var(--warning)] flex-shrink-0" />
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Recent</p>
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {loading ? <span className="inline-block w-12 h-8 rounded bg-[var(--surface-elevated)] animate-pulse"></span> : stats.recentInstructions}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Last 7 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Search Payment Instructions
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, description, or ID..."
                  className="w-full pl-10 pr-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--brand-teal)] focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            {/* Filter */}
            <div>
              <label htmlFor="filter" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Filter
              </label>
              <select
                id="filter"
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
                className="px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-teal)] focus:border-transparent transition-all duration-200"
              >
                <option value="all">All Instructions</option>
                <option value="with-cids">With Documents</option>
                <option value="without-cids">Without Documents</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Sort By
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-teal)] focus:border-transparent transition-all duration-200"
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
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                Payment Instructions ({filteredAndSortedInstructions.length})
              </h2>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="btn-secondary btn-sm"
                >
                  <X className="w-4 h-4" />
                  Clear Search
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-[var(--brand-teal)] border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-4 text-[var(--text-secondary)] text-lg">Loading payment instructions...</span>
              </div>
            ) : filteredAndSortedInstructions.length === 0 ? (
              <div className="text-center py-16">
                {paymentInstructions.length === 0 ? (
                  <>
                    <CreditCard className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
                      No Payment Instructions Yet
                    </h3>
                    <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                      Create your first payment instruction to start monetizing your documents with reusable payment settings.
                    </p>
                    <Link
                      href="/admin/payment-instructions/create"
                      className="btn-primary btn-lg"
                    >
                      <CreditCard className="w-5 h-5" />
                      Create Your First Payment Instruction
                    </Link>
                  </>
                ) : (
                  <>
                    <Search className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
                      No Results Found
                    </h3>
                    <p className="text-[var(--text-secondary)] mb-8">
                      No payment instructions match your current search and filter criteria.
                    </p>
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setFilterBy('all')
                      }}
                      className="btn-secondary"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset Filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid gap-6">
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
        <div className="mt-12 card p-6">
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/payment-instructions/create"
              className="flex items-center p-4 border border-[var(--border)] rounded-xl hover:bg-[var(--surface-elevated)] transition-all duration-200"
            >
              <CreditCard className="w-6 h-6 text-[var(--brand-teal)] mr-4 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Create Payment Instruction</p>
                <p className="text-sm text-[var(--text-secondary)]">Set up new payment requirements</p>
              </div>
            </Link>

            <Link
              href="/admin/upload"
              className="flex items-center p-4 border border-[var(--border)] rounded-xl hover:bg-[var(--surface-elevated)] transition-all duration-200"
            >
              <Upload className="w-6 h-6 text-[var(--success)] mr-4 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Upload Document</p>
                <p className="text-sm text-[var(--text-secondary)]">Add documents to monetize</p>
              </div>
            </Link>

            <button
              onClick={fetchPaymentInstructions}
              className="flex items-center p-4 border border-[var(--border)] rounded-xl hover:bg-[var(--surface-elevated)] transition-all duration-200 w-full text-left"
            >
              <RefreshCw className="w-6 h-6 text-[var(--info)] mr-4 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Refresh Data</p>
                <p className="text-sm text-[var(--text-secondary)]">Update payment instructions</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
