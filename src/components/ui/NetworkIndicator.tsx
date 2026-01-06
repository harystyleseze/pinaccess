'use client'

import { NetworkIndicatorProps } from '@/lib/types'

export default function NetworkIndicator({ 
  showDetails = false, 
  className = '' 
}: NetworkIndicatorProps) {
  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {/* Basic Network Badge */}
      <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-full border border-yellow-200 animate-fade-in">
        <span className="text-yellow-600 text-sm">⚠️</span>
        <span className="text-yellow-800 text-xs font-medium">
          Base Sepolia Testnet
        </span>
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <div className="ml-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 animate-slide-up">
          <div className="flex items-start space-x-3">
            <span className="text-blue-600 text-lg">🌐</span>
            <div>
              <h4 className="text-sm font-semibold text-blue-800 mb-2">
                Network Information
              </h4>
              <div className="text-xs text-blue-700 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Network:</span>
                  <span>Base Sepolia (Ethereum L2 Testnet)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Token:</span>
                  <span className="font-mono">USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Environment:</span>
                  <span className="text-yellow-700 font-medium">Testing Only</span>
                </div>
              </div>
              
              <div className="mt-3 p-2 bg-yellow-100 rounded-lg border border-yellow-300">
                <p className="text-xs text-yellow-800 font-medium">
                  ⚠️ This is a testing environment. No real money will be charged or transferred.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for inline use
export function NetworkBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium ${className}`}>
      <span>⚠️</span>
      <span>Testnet</span>
    </span>
  )
}

// Detailed warning for forms and important actions
export function TestnetWarning({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 animate-fade-in ${className}`}>
      <div className="flex items-start space-x-3">
        <span className="text-yellow-600 text-lg flex-shrink-0">⚠️</span>
        <div>
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">
            Testing Environment Notice
          </h4>
          <div className="text-xs text-yellow-700 space-y-2">
            <p>
              This application uses <strong>Base Sepolia testnet</strong> for all payment operations.
            </p>
            <div className="bg-yellow-100 p-2 rounded-lg border border-yellow-300">
              <p className="font-medium text-yellow-800">
                🔒 No real money is involved. All transactions use testnet USDC tokens.
              </p>
            </div>
            <div className="text-xs space-y-1">
              <p>• Network: Base Sepolia (Ethereum L2 Testnet)</p>
              <p>• Token: Testnet USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e)</p>
              <p>• Purpose: Safe testing of payment flows</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Status indicator for payment instructions
export function PaymentNetworkStatus({ 
  network = 'base-sepolia',
  className = '' 
}: { 
  network?: string
  className?: string 
}) {
  const isTestnet = network === 'base-sepolia'
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
      <span className="text-xs text-gray-600">
        {isTestnet ? 'Base Sepolia Testnet' : 'Unknown Network'}
      </span>
      {isTestnet && (
        <span className="text-xs text-yellow-600 font-medium">(Testing)</span>
      )}
    </div>
  )
}