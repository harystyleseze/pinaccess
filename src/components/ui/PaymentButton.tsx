/**
 * PaymentButton Component
 * 
 * Executes x402 payments using connected wallet and displays payment progress.
 * Integrates with the x402 payment client for seamless payment execution.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useWallet, useWalletConnection } from '@/lib/wallet-context';
import { 
  x402PaymentClient, 
  type PaymentInfo, 
  type PaymentExecution, 
  type PaymentResult,
  PaymentErrorType 
} from '@/lib/x402-client';
import { BASE_SEPOLIA_USDC_ADDRESS } from '@/lib/wallet-config';
import { formatPaymentButtonAmount } from '@/lib/pricing';
import type { Address } from 'viem';

interface PaymentButtonProps {
  paymentInfo: {
    amount: string; // USDC amount in token units
    recipient: string; // Creator wallet address
    network: 'base-sepolia';
    asset: typeof BASE_SEPOLIA_USDC_ADDRESS;
    gatewayUrl: string;
    description?: string;
  };
  walletAddress?: string;
  onPaymentSuccess: (paymentProof: string, transactionHash?: string, paidAmount?: string) => void;
  onPaymentError: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PaymentButton({
  paymentInfo,
  walletAddress,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  className = ''
}: PaymentButtonProps) {
  const { isOnCorrectNetwork } = useWallet();
  const { isConnected, address, balance } = useWalletConnection();
  const [execution, setExecution] = useState<PaymentExecution | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  // Subscribe to payment progress updates
  useEffect(() => {
    const unsubscribe = x402PaymentClient.onProgress((newExecution) => {
      setExecution(newExecution);
      setShowProgress(newExecution.status !== 'idle');
    });

    return unsubscribe;
  }, []);

  // Check if user has sufficient balance
  const hasSufficientBalance = () => {
    if (!balance) return false;
    const currentBalance = parseFloat(balance.usdc); // This is in USDC tokens (e.g., "1.00")
    const requiredSmallestUnits = parseFloat(paymentInfo.amount); // This is in USDC smallest units (e.g., "10000")
    
    // Convert required amount from smallest units to tokens (divide by 10^6)
    const requiredTokens = requiredSmallestUnits / 1000000; // USDC has 6 decimals
    
    return currentBalance >= requiredTokens;
  };

  // Handle payment execution
  const handlePayment = async () => {
    try {
      // Validate wallet connection
      if (!isConnected || !address) {
        onPaymentError('Please connect your wallet to make a payment');
        return;
      }

      // Validate network
      if (!isOnCorrectNetwork) {
        onPaymentError('Please switch to Base Sepolia network');
        return;
      }

      // Validate balance
      if (!hasSufficientBalance()) {
        onPaymentError('Insufficient USDC token balance for this payment');
        return;
      }

      // Validate payment info
      const paymentInfoForValidation: PaymentInfo = {
        ...paymentInfo,
        recipient: paymentInfo.recipient as Address
      };
      
      if (!x402PaymentClient.validatePaymentInfo(paymentInfoForValidation)) {
        onPaymentError('Invalid payment information');
        return;
      }

      // Execute payment
      const result: PaymentResult = await x402PaymentClient.executePayment(paymentInfoForValidation);
      
      // Handle success
      onPaymentSuccess(result.paymentProof, result.transactionHash, result.paidAmount);
      setShowProgress(false);

    } catch (error: any) {
      console.error('Payment failed:', error);
      
      // Handle specific error types
      let errorMessage = 'Payment failed. Please try again.';
      
      if (error.type === PaymentErrorType.TRANSACTION_REJECTED) {
        errorMessage = 'Transaction was rejected. Please try again.';
      } else if (error.type === PaymentErrorType.INSUFFICIENT_BALANCE) {
        errorMessage = 'Insufficient USDC token balance for this payment.';
      } else if (error.type === PaymentErrorType.WRONG_NETWORK) {
        errorMessage = 'Please switch to Base Sepolia network.';
      } else if (error.type === PaymentErrorType.WALLET_NOT_CONNECTED) {
        errorMessage = 'Please connect your wallet to make a payment.';
      }
      
      onPaymentError(errorMessage);
      setShowProgress(false);
    }
  };

  // Get button text based on state
  const getButtonText = () => {
    if (!isConnected) return 'Connect Wallet to Pay';
    if (!isOnCorrectNetwork) return 'Switch to Base Sepolia';
    if (!hasSufficientBalance()) return 'Insufficient Balance';
    if (execution?.status === 'connecting') return 'Connecting...';
    if (execution?.status === 'confirming') return 'Confirm in Wallet';
    if (execution?.status === 'processing') return 'Processing Payment...';
    return `Pay ${formatPaymentButtonAmount(paymentInfo.amount)}`;
  };

  // Get button disabled state
  const isButtonDisabled = (): boolean => {
    return disabled || 
           !isConnected || 
           !isOnCorrectNetwork || 
           !hasSufficientBalance() ||
           (execution !== null && execution.status !== 'idle' && execution.status !== 'error');
  };

  // Get button style based on state
  const getButtonStyle = () => {
    if (!isConnected || !isOnCorrectNetwork || !hasSufficientBalance()) {
      return 'bg-gray-400 cursor-not-allowed';
    }
    if (execution?.status === 'processing' || execution?.status === 'confirming') {
      return 'bg-blue-500 cursor-wait';
    }
    return 'bg-blue-600 hover:bg-blue-700';
  };

  return (
    <div className={`payment-button-container ${className}`}>
      <button
        onClick={handlePayment}
        disabled={isButtonDisabled()}
        className={`w-full px-6 py-3 text-white font-medium rounded-full transition-colors ${getButtonStyle()}`}
      >
        {getButtonText()}
      </button>

      {/* Payment Progress Modal */}
      {showProgress && execution && (
        <PaymentProgressModal 
          execution={execution}
          onClose={() => setShowProgress(false)}
        />
      )}
    </div>
  );
}

/**
 * Payment Progress Modal Component
 * Shows detailed payment progress with transaction details
 */
interface PaymentProgressModalProps {
  execution: PaymentExecution;
  onClose: () => void;
}

function PaymentProgressModal({ execution, onClose }: PaymentProgressModalProps) {
  // Don't show modal for idle or error states
  if (execution.status === 'idle' || execution.status === 'error') {
    return null;
  }

  const getStatusText = () => {
    switch (execution.status) {
      case 'connecting':
        return 'Connecting to wallet...';
      case 'confirming':
        return 'Please confirm the transaction in your wallet';
      case 'processing':
        return 'Processing payment on blockchain...';
      case 'success':
        return 'Payment successful!';
      default:
        return 'Processing...';
    }
  };

  const getStatusIcon = () => {
    switch (execution.status) {
      case 'connecting':
        return '🔗';
      case 'confirming':
        return '⏳';
      case 'processing':
        return '⚡';
      case 'success':
        return '✅';
      default:
        return '⏳';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Payment Progress</h3>
          {execution.status === 'success' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">{getStatusIcon()}</div>
          <p className="text-lg font-medium text-gray-900 mb-2">
            {getStatusText()}
          </p>
          
          {execution.estimatedTime && execution.status === 'processing' && (
            <p className="text-sm text-gray-600">
              Estimated time: {execution.estimatedTime} seconds
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {execution.progress !== undefined && execution.status !== 'success' && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{execution.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${execution.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Transaction Hash */}
        {execution.transactionHash && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Transaction Hash</p>
            <p className="font-mono text-xs text-gray-900 break-all">
              {execution.transactionHash}
            </p>
          </div>
        )}

        {/* Success Actions */}
        {execution.status === 'success' && (
          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Continue to Content
            </button>
            
            {execution.transactionHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${execution.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center text-blue-600 hover:text-blue-700 text-sm"
              >
                View on Block Explorer ↗
              </a>
            )}
          </div>
        )}

        {/* Loading Animation for Processing States */}
        {(execution.status === 'connecting' || execution.status === 'processing') && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact Payment Button for inline use
 */
interface PaymentButtonCompactProps extends Omit<PaymentButtonProps, 'className'> {
  size?: 'sm' | 'md' | 'lg';
}

export function PaymentButtonCompact({
  size = 'md',
  ...props
}: PaymentButtonCompactProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <PaymentButton
      {...props}
      className={`inline-block ${sizeClasses[size]}`}
    />
  );
}