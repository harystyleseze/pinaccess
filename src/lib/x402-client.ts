/**
 * x402 Payment Execution Client
 * 
 * This module provides x402 payment execution using the x402-fetch library
 * with transaction tracking, payment proof handling, and progress monitoring.
 */

// Note: x402-fetch library removed due to wallet client compatibility issues
// Using manual x402 implementation instead
import { type Address, type Hash } from 'viem';
import { BASE_SEPOLIA_USDC_ADDRESS } from './wallet-config';
import { getWalletClient } from '@wagmi/core';
import { walletManager } from './wallet';

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
   */
  private async executeX402Payment(
    paymentInfo: PaymentInfo,
    walletClient: any
  ): Promise<PaymentResult> {
    try {
      console.log('Starting x402 payment execution with:', {
        gatewayUrl: paymentInfo.gatewayUrl,
        amount: paymentInfo.amount,
        recipient: paymentInfo.recipient,
        walletAddress: walletClient.account?.address
      });

      // Execute the payment using the proper x402 flow without x402-fetch library
      // The x402-fetch library has compatibility issues with our wallet setup
      console.log('Executing x402 payment flow manually...');
      
      const response = await this.executeProperX402Payment(paymentInfo, walletClient);

      console.log('x402 payment flow completed with status:', response.status);

      if (!response.ok) {
        throw new Error(`Payment failed: ${response.status} ${response.statusText}`);
      }

      // Extract payment proof from response headers or metadata
      let paymentProof = response.headers.get('x-payment') ||
                        response.headers.get('x-payment-response') || 
                        response.headers.get('x-payment-proof') ||
                        response.headers.get('authorization') ||
                        '';

      // If no payment proof in headers, check response metadata
      if (!paymentProof) {
        const x402Meta = (response as any).paymentProof;
        if (x402Meta) {
          paymentProof = x402Meta;
        } else {
          console.warn('Payment proof not found in response.');
          // Use the transaction hash from the actual payment
          const actualTxHash = (response as any).transactionHash;
          if (actualTxHash) {
            // For debugging: include transaction hash in error
            throw new Error(`Payment completed successfully (tx: ${actualTxHash}) but no payment proof was generated. This may be a temporary issue with the gateway.`);
          } else {
            throw new Error('Payment completed but no proof was generated');
          }
        }
      }

      console.log('Payment proof obtained:', paymentProof ? 'Yes' : 'No');

      // Get transaction hash from the response
      let transactionHash: Hash;
      const actualTransactionHash = (response as any).transactionHash;
      
      if (actualTransactionHash) {
        transactionHash = actualTransactionHash as Hash;
        console.log('Using actual transaction hash:', transactionHash);
      } else {
        // Check response headers for transaction hash
        const headerTxHash = response.headers.get('x-transaction-hash');
        if (headerTxHash) {
          transactionHash = headerTxHash as Hash;
        } else {
          throw new Error('Payment completed but transaction hash not available');
        }
      }

      console.log('x402 payment execution completed successfully');

      return {
        transactionHash,
        paymentProof,
        contentUrl: response.url,
        paidAmount: paymentInfo.amount,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('x402 payment execution failed:', error);
      
      // Provide more detailed error information for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        // Check for specific errors
        if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
          throw new PaymentExecutionError(
            PaymentErrorType.INSUFFICIENT_BALANCE,
            'Insufficient USDC balance for payment',
            error
          );
        }
        
        if (error.message.includes('user rejected') || error.message.includes('denied') || error.message.includes('rejected')) {
          throw new PaymentExecutionError(
            PaymentErrorType.TRANSACTION_REJECTED,
            'Payment transaction was rejected by user',
            error
          );
        }
        
        if (error.message.includes('network') || error.message.includes('chain') || error.message.includes('wrong network')) {
          throw new PaymentExecutionError(
            PaymentErrorType.WRONG_NETWORK,
            'Please ensure you are connected to Base Sepolia network',
            error
          );
        }
        
        if (error.message.includes('timeout') || error.message.includes('fetch failed')) {
          throw new PaymentExecutionError(
            PaymentErrorType.NETWORK_ERROR,
            'Network error occurred during payment. Please try again.',
            error
          );
        }
      }
      
      throw new PaymentExecutionError(
        PaymentErrorType.PAYMENT_FAILED,
        `x402 payment execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error as Error
      );
    }
  }

  /**
   * Execute proper x402 payment flow with real blockchain transactions
   */
  private async executeProperX402Payment(
    paymentInfo: PaymentInfo,
    walletClient: any
  ): Promise<Response> {
    console.log('Starting proper x402 payment flow...');
    
    // Step 1: Get payment requirements (402 response is expected)
    const initialResponse = await fetch(paymentInfo.gatewayUrl, {
      method: 'GET'
    });
    
    if (initialResponse.status !== 402) {
      if (initialResponse.ok) {
        console.log('Content is already accessible without payment');
        return initialResponse;
      } else {
        throw new Error(`Unexpected response: ${initialResponse.status} ${initialResponse.statusText}`);
      }
    }
    
    // Step 2: Parse payment requirements
    const paymentRequirements = await initialResponse.json();
    console.log('x402: Payment requirements received:', paymentRequirements);
    
    if (!paymentRequirements.accepts || !Array.isArray(paymentRequirements.accepts) || paymentRequirements.accepts.length === 0) {
      throw new Error('Invalid x402 payment response: missing accepts array');
    }
    
    const paymentOption = paymentRequirements.accepts[0];
    
    // Step 3: Execute actual USDC token transfer
    console.log('x402: Executing USDC token transfer...');
    
    try {
      // Import viem functions for token transfer
      const { encodeFunctionData, getAddress } = await import('viem');
      
      // USDC token contract ABI (ERC-20 transfer function)
      const usdcAbi = [
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable'
        }
      ] as const;
      
      // Prepare transaction data with proper address checksumming
      const transferAmount = BigInt(paymentOption.maxAmountRequired);
      const recipientAddress = getAddress(paymentOption.payTo); // This will checksum the address
      const usdcContractAddress = getAddress(paymentOption.asset); // This will checksum the address
      
      console.log('Transfer details:', {
        to: recipientAddress,
        amount: transferAmount.toString(),
        contract: usdcContractAddress
      });
      
      // Encode the transfer function call
      const data = encodeFunctionData({
        abi: usdcAbi,
        functionName: 'transfer',
        args: [recipientAddress, transferAmount]
      });
      
      // Send the transaction
      const txHash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: usdcContractAddress,
        data,
        value: BigInt(0) // No ETH value for ERC-20 transfer
      });
      
      console.log('USDC transfer transaction sent:', txHash);
      
      // Wait for transaction confirmation using viem's public client
      console.log('Waiting for transaction confirmation...');
      
      // Import viem's public client functions and waitForTransactionReceipt
      const { createPublicClient, http } = await import('viem');
      const { waitForTransactionReceipt } = await import('viem/actions');
      
      // Import baseSepolia from our wallet config
      const { baseSepolia } = await import('./wallet-config');
      
      // Create a public client for reading transaction receipts
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http('https://sepolia.base.org')
      });
      
      const receipt = await waitForTransactionReceipt(publicClient, { hash: txHash });
      
      if (receipt.status === 'reverted') {
        throw new Error('USDC transfer transaction failed');
      }
      
      console.log('USDC transfer confirmed:', receipt);
      
      // Step 4: Generate payment proof with transaction hash
      const paymentProof = this.generatePaymentProof(txHash, paymentOption, walletClient.account.address);
      
      console.log('x402: Generated payment proof with real transaction');
      
      // Step 5: Wait a moment for the transaction to be indexed by the gateway
      console.log('x402: Waiting for transaction to be indexed...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      // Step 6: Retry request with payment proof
      console.log('x402: Attempting to access content with payment proof...');
      const finalResponse = await fetch(paymentInfo.gatewayUrl, {
        method: 'GET',
        headers: {
          'X-Payment': paymentProof,
          'Accept': '*/*',
          'User-Agent': 'PinAccess/1.0'
        }
      });
      
      console.log('x402: Final response status:', finalResponse.status);
      console.log('x402: Final response headers:', Object.fromEntries(finalResponse.headers.entries()));
      
      if (!finalResponse.ok) {
        if (finalResponse.status === 402) {
          // Still getting 402 - payment proof not accepted
          const errorBody = await finalResponse.text();
          console.error('x402: Payment proof rejected:', errorBody);
          throw new Error(`Payment proof not accepted by gateway. Transaction was successful (${txHash}) but the gateway may need more time to process it. Please try accessing the content again in a few minutes.`);
        } else if (finalResponse.status === 400) {
          // Bad request - likely invalid proof format
          const errorBody = await finalResponse.text();
          console.error('x402: Bad request with payment proof:', errorBody);
          throw new Error(`Invalid payment proof format. Transaction was successful (${txHash}) but the proof format may be incorrect. Error: ${errorBody}`);
        } else {
          // Other error
          const errorBody = await finalResponse.text();
          console.error('x402: Unexpected error:', finalResponse.status, errorBody);
          throw new Error(`Gateway error: ${finalResponse.status} ${finalResponse.statusText}. Transaction was successful (${txHash}).`);
        }
      }
      
      // Attach transaction hash to response for extraction
      (finalResponse as any).transactionHash = txHash;
      (finalResponse as any).paymentProof = paymentProof;
      
      return finalResponse;
      
    } catch (error) {
      console.error('USDC transfer failed:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          throw new Error('Insufficient USDC balance for payment');
        }
        if (error.message.includes('user rejected')) {
          throw new Error('Transaction was rejected by user');
        }
        if (error.message.includes('invalid') && error.message.includes('address')) {
          throw new Error('Invalid recipient address in payment requirements');
        }
      }
      
      throw new Error(`Payment execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate payment proof from transaction hash and payment details
   * Creates a proof format compatible with Pinata's x402 gateway
   * Based on the x402 protocol specification and standard implementations
   */
  private generatePaymentProof(
    txHash: string,
    paymentOption: any,
    walletAddress: string
  ): string {
    // Try multiple payment proof formats to find one that works with Pinata
    
    // Format 1: Standard x402 structured proof (current implementation)
    const structuredProof = this.generateStructuredProof(txHash, paymentOption, walletAddress);
    
    // For now, return the structured proof
    // If this doesn't work, we can try other formats in the future
    return structuredProof;
  }

  /**
   * Generate structured payment proof with all required fields
   */
  private generateStructuredProof(
    txHash: string,
    paymentOption: any,
    walletAddress: string
  ): string {
    // Based on x402 protocol standards, create a payment proof that includes
    // all the necessary information for the gateway to verify the payment
    
    // Create a structured proof object with all required fields
    const proofData = {
      // Standard x402 fields
      version: '1',
      scheme: paymentOption.scheme || 'exact',
      network: paymentOption.network,
      asset: paymentOption.asset,
      amount: paymentOption.maxAmountRequired,
      recipient: paymentOption.payTo,
      sender: walletAddress,
      
      // Transaction details
      transactionHash: txHash,
      timestamp: Math.floor(Date.now() / 1000),
      
      // Resource being accessed
      resource: paymentOption.resource
    };
    
    console.log('Generated structured payment proof data:', proofData);
    
    // Create the proof in JSON format and base64 encode it
    // This is the standard format used by most x402 implementations
    const proofJson = JSON.stringify(proofData);
    const proofBase64 = btoa(proofJson);
    
    console.log('Payment proof JSON:', proofJson);
    console.log('Payment proof base64:', proofBase64);
    
    return proofBase64;
  }

  /**
   * Generate simple transaction hash proof (alternative format)
   */
  private generateSimpleProof(txHash: string): string {
    console.log('Using simple transaction hash as payment proof:', txHash);
    return txHash;
  }

  /**
   * Generate minimal JSON proof (alternative format)
   */
  private generateMinimalProof(
    txHash: string,
    paymentOption: any,
    walletAddress: string
  ): string {
    const proofData = {
      tx: txHash,
      from: walletAddress,
      to: paymentOption.payTo,
      amount: paymentOption.maxAmountRequired,
      asset: paymentOption.asset,
      network: paymentOption.network
    };
    
    const proofJson = JSON.stringify(proofData);
    const proofBase64 = btoa(proofJson);
    
    console.log('Minimal payment proof:', proofJson);
    return proofBase64;
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