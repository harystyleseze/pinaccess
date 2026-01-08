'use client'

import { AlertTriangle } from 'lucide-react'
import { NetworkIndicatorProps } from '@/lib/types'

export default function NetworkIndicator({
  showDetails = false,
  className = ''
}: NetworkIndicatorProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Basic Network Badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--warning-light)] border border-[var(--warning)]/20">
        <div className="w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse" />
        <span className="text-xs font-medium text-[var(--warning)]">
          Base Sepolia Testnet
        </span>
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <div className="ml-2 p-3 rounded-lg bg-[var(--info-light)] border border-[var(--info)]/20 animate-slide-up">
          <h4 className="text-xs font-semibold text-[var(--info)] mb-2">
            Network Information
          </h4>
          <div className="text-xs text-[var(--text-secondary)] space-y-1">
            <p>Network: Base Sepolia (L2 Testnet)</p>
            <p className="font-mono text-[10px]">USDC: 0x036CbD...3dCF7e</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function NetworkBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`badge badge-warning ${className}`}>
      Testnet
    </span>
  )
}

export function TestnetWarning({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 status-warning rounded-xl animate-fade-in ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold mb-1">
            Testing Environment
          </h4>
          <p className="text-xs opacity-90">
            This uses Base Sepolia testnet. No real money is involved.
          </p>
        </div>
      </div>
    </div>
  )
}

export function PaymentNetworkStatus({
  network = 'base-sepolia',
  className = ''
}: {
  network?: string
  className?: string
}) {
  const isTestnet = network === 'base-sepolia'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'} animate-pulse`} />
      <span className="text-xs text-[var(--text-muted)]">
        {isTestnet ? 'Base Sepolia Testnet' : 'Unknown Network'}
      </span>
    </div>
  )
}
