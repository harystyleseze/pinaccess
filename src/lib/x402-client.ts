/**
 * x402 Payment Execution Client
 * 
 * This module provides x402 payment execution using the x402-fetch library
 * with proper EIP-712 typed data signing for browser wallets.
 * 
 * The x402 protocol uses TransferWithAuthorization (EIP-3009) which requires
 * signing a typed message, NOT executing actual token transfers.
 */

import { type Address, type Hash, type WalletClient } from 'viem';
import { BASE_SEPOLIA_USDC_ADDRESS } from './wallet-config';
import { getWalletClient } from '@wagmi/core';
import { walletManager } from './wallet';
import { wrapFetchWithPayment } from 'x402-fetch';

// Payment execution state
export interface PaymentExecution {
  transactionHash?: Hash;
  paymentProof?: string;
  status: 'idle' | 'connecting' | 'confirming' | 'processing' | 'success' | 'error';
  error?: string;
  estimatedTime?: number; // seconds
  progress?: number; // 0-100
}

// Payment information required for x402 execution
export interface PaymentInfo {
  amount: string; // USDC amount in token units (6 decimals)
  recipient: Address; // Creator wallet address
  network: 'base-sepolia';
  asset: typeof BASE_SEPOLIA_USDC_ADDRESS;
  gatewayUrl: string; // The x402 gateway URL to access content
  description?: string;
}

// Payment result after successful execution
export interface PaymentResult {
  transactionHash: Hash;
  paymentProof: string;
  contentUrl: string;
  paidAmount: string;
  timestamp: string;
}

// Payment error types
export enum PaymentErrorType {
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  WRONG_NETWORK = 'WRONG_NETWORK',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class PaymentExecutionError extends Error {
  constructor(
    public type: PaymentErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PaymentExecutionError';
  }
}

/**
 * x402 Payment Client for executing payments and accessing content
 */
export class X402PaymentClient {
  private currentExecution: PaymentExecution | null = null;
  private progressCallbacks: Set<(execution: PaymentExecution) => void> = new Set();

  /**
   * Execute x402 payment flow
   */
  async executePayment(paymentInfo: PaymentInfo): Promise<PaymentResult> {
    try {
      // Initialize payment execution state
      this.currentExecution = {
        status: 'connecting',
        estimatedTime: 30,
        progress: 0
      };
      this.notifyProgress();

      // Get wallet client for signing transactions
      const walletClient = await getWalletClient(walletManager.getConfig());
      if (!walletClient) {
        throw new PaymentExecutionError(
          PaymentErrorType.WALLET_NOT_CONNECTED,
          'Unable to access wallet for signing'
        );
      }

      // Verify network
      if (!walletManager.isOnCorrectNetwork(walletClient.chain?.id || 0)) {
        throw new PaymentExecutionError(
          PaymentErrorType.WRONG_NETWORK,
          'Please switch to Base Sepolia network'
        );
      }

      // Check balance
      const hasSufficientBalance = await walletManager.hasSufficientBalance(
        walletClient.account.address,
        paymentInfo.amount
      );
      
      if (!hasSufficientBalance) {
        throw new PaymentExecutionError(
          PaymentErrorType.INSUFFICIENT_BALANCE,
          'Insufficient USDC balance for this payment'
        );
      }

      // Update progress
      this.currentExecution.status = 'confirming';
      this.currentExecution.progress = 25;
      this.notifyProgress();

      // Update progress
      this.currentExecution.status = 'processing';
      this.currentExecution.progress = 50;
      this.notifyProgress();

      // Execute x402 payment using x402-fetch
      const paymentResult = await this.executeX402Payment(
        paymentInfo,
        walletClient
      );

      // Update progress
      this.currentExecution.status = 'success';
      this.currentExecution.progress = 100;
      this.currentExecution.transactionHash = paymentResult.transactionHash;
      this.currentExecution.paymentProof = paymentResult.paymentProof;
      this.notifyProgress();

      return paymentResult;

    } catch (error) {
      // Handle and categorize errors
      const paymentError = this.categorizeError(error);
      
      this.currentExecution = {
        ...this.currentExecution,
        status: 'error',
        error: paymentError.message
      };
      this.notifyProgress();

      throw paymentError;
    }
  }

  /**
   * Execute the actual x402 payment using x402-fetch library
   * This uses EIP-712 typed data signing (not actual token transfers)
   */
  private async executeX402Payment(
    paymentInfo: PaymentInfo,
    walletClient: WalletClient
  ): Promise<PaymentResult> {
    try {
      console.log('x402: Starting payment with EIP-712 signing...', {
        gatewayUrl: paymentInfo.gatewayUrl,
        walletAddress: walletClient.account?.address
      });

      // Wrap fetch with x402 payment handling
      // The walletClient from wagmi is a SignerWallet that x402-fetch can use directly
      // The library will:
      // 1. Make initial request → receive 402 with payment requirements
      // 2. Create EIP-712 typed data for TransferWithAuthorization  
      // 3. Prompt wallet to SIGN (not transfer) the authorization
      // 4. Encode signed authorization as X-Payment header
      // 5. Retry request with payment proof
      const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient as any);

      console.log('x402: Making request with automatic payment handling...');

      // Execute the payment flow - x402-fetch handles everything
      const response = await fetchWithPayment(paymentInfo.gatewayUrl, {
        method: 'GET',
      });

      console.log('x402: Response received:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Payment failed: ${response.status} - ${errorText}`);
      }

      // Extract payment proof from response headers
      const paymentProof = response.headers.get('x-payment-response') || 
                          response.headers.get('x-payment') || 
                          'x402-authorization-signed';
      
      // For x402, the settlement happens via the Coinbase Facilitator
      // The response header may contain the settlement transaction hash
      const transactionHash = response.headers.get('x-transaction-hash') || 
                             response.headers.get('x-settlement-tx') ||
                             `0x${Date.now().toString(16).padStart(64, '0')}` as Hash;

      console.log('x402: Payment successful!');

      return {
        transactionHash: transactionHash as Hash,
        paymentProof,
        contentUrl: response.url,
        paidAmount: paymentInfo.amount,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('x402: Payment execution failed:', error);
      
      if (error instanceof Error) {
        // User rejected the signature request
        if (error.message.includes('user rejected') || 
            error.message.includes('User denied') ||
            error.message.includes('rejected')) {
          throw new PaymentExecutionError(
            PaymentErrorType.TRANSACTION_REJECTED,
            'Payment signature was rejected',
            error
          );
        }
        
        // Insufficient balance
        if (error.message.includes('insufficient') || error.message.includes('balance')) {
          throw new PaymentExecutionError(
            PaymentErrorType.INSUFFICIENT_BALANCE,
            'Insufficient USDC balance for payment',
            error
          );
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new PaymentExecutionError(
            PaymentErrorType.NETWORK_ERROR,
            'Network error occurred during payment',
            error
          );
        }
      }
      
      throw new PaymentExecutionError(
        PaymentErrorType.PAYMENT_FAILED,
        `x402 payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error as Error
      );
    }
  }

  /**
   * Access content using existing payment proof
   */
  async accessContentWithProof(
    gatewayUrl: string,
    paymentProof: string
  ): Promise<Response> {
    try {
      console.log('Attempting to access content with proof:', {
        gatewayUrl,
        paymentProofLength: paymentProof.length,
        paymentProofPreview: paymentProof.substring(0, 50) + '...'
      });

      const response = await fetch(gatewayUrl, {
        method: 'GET',
        headers: {
          'X-Payment': paymentProof,
          'Accept': '*/*',
          'User-Agent': 'PinAccess/1.0'
        }
      });

      console.log('Content access response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        // Get response body for error details
        const errorBody = await response.text();
        console.error('Content access error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });

        if (response.status === 402) {
          throw new PaymentExecutionError(
            PaymentErrorType.PAYMENT_FAILED,
            `Payment proof is invalid or expired. Response: ${errorBody}`
          );
        } else if (response.status === 400) {
          throw new PaymentExecutionError(
            PaymentErrorType.PAYMENT_FAILED,
            `Bad request - invalid payment proof format. Response: ${errorBody}`
          );
        } else if (response.status === 404) {
          throw new Error(`Content not found: ${errorBody}`);
        } else {
          throw new Error(`Content access failed (${response.status}): ${errorBody || response.statusText}`);
        }
      }

      return response;

    } catch (error) {
      console.error('Content access failed:', error);
      
      if (error instanceof PaymentExecutionError) {
        throw error;
      }
      
      throw new PaymentExecutionError(
        PaymentErrorType.NETWORK_ERROR,
        'Failed to access content. Please try again.',
        error as Error
      );
    }
  }

  /**
   * Get current payment execution status
   */
  getCurrentExecution(): PaymentExecution | null {
    return this.currentExecution;
  }

  /**
   * Subscribe to payment progress updates
   */
  onProgress(callback: (execution: PaymentExecution) => void): () => void {
    this.progressCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Reset payment execution state
   */
  reset(): void {
    this.currentExecution = null;
  }

  /**
   * Estimate payment time based on network conditions
   */
  async estimatePaymentTime(): Promise<number> {
    // Base estimate for Base Sepolia network
    // This could be enhanced with real-time network data
    return 30; // seconds
  }

  /**
   * Validate payment information before execution
   */
  validatePaymentInfo(paymentInfo: PaymentInfo): boolean {
    try {
      // Validate required fields
      if (!paymentInfo.amount || !paymentInfo.recipient || !paymentInfo.gatewayUrl) {
        return false;
      }

      // Validate amount is positive number
      const amount = parseFloat(paymentInfo.amount);
      if (isNaN(amount) || amount <= 0) {
        return false;
      }

      // Validate recipient address format
      if (!paymentInfo.recipient.startsWith('0x') || paymentInfo.recipient.length !== 42) {
        return false;
      }

      // Validate network
      if (paymentInfo.network !== 'base-sepolia') {
        return false;
      }

      // Validate gateway URL format
      if (!paymentInfo.gatewayUrl.includes('/x402/cid/')) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(): void {
    if (this.currentExecution) {
      this.progressCallbacks.forEach(callback => {
        try {
          callback(this.currentExecution!);
        } catch (error) {
          console.error('Progress callback error:', error);
        }
      });
    }
  }

  /**
   * Categorize errors for better user experience
   */
  private categorizeError(error: any): PaymentExecutionError {
    if (error instanceof PaymentExecutionError) {
      return error;
    }

    // Check for common error patterns
    const errorMessage = error?.message?.toLowerCase() || '';

    if (errorMessage.includes('user rejected') || errorMessage.includes('denied')) {
      return new PaymentExecutionError(
        PaymentErrorType.TRANSACTION_REJECTED,
        'Transaction was rejected by user',
        error
      );
    }

    if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
      return new PaymentExecutionError(
        PaymentErrorType.INSUFFICIENT_BALANCE,
        'Insufficient balance for transaction',
        error
      );
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
      return new PaymentExecutionError(
        PaymentErrorType.NETWORK_ERROR,
        'Network error occurred. Please try again.',
        error
      );
    }

    if (errorMessage.includes('network') || errorMessage.includes('chain')) {
      return new PaymentExecutionError(
        PaymentErrorType.WRONG_NETWORK,
        'Please switch to Base Sepolia network',
        error
      );
    }

    // Default to unknown error
    return new PaymentExecutionError(
      PaymentErrorType.UNKNOWN_ERROR,
      'An unexpected error occurred. Please try again.',
      error
    );
  }
}

// Create singleton instance
export const x402PaymentClient = new X402PaymentClient();

// Utility functions for easier usage
export const executePayment = (paymentInfo: PaymentInfo) => 
  x402PaymentClient.executePayment(paymentInfo);

export const accessContentWithProof = (gatewayUrl: string, paymentProof: string) => 
  x402PaymentClient.accessContentWithProof(gatewayUrl, paymentProof);

export const getCurrentPaymentExecution = () => 
  x402PaymentClient.getCurrentExecution();

export const onPaymentProgress = (callback: (execution: PaymentExecution) => void) => 
  x402PaymentClient.onProgress(callback);

export const validatePaymentInfo = (paymentInfo: PaymentInfo) => 
  x402PaymentClient.validatePaymentInfo(paymentInfo);

export const resetPaymentExecution = () => 
  x402PaymentClient.reset();