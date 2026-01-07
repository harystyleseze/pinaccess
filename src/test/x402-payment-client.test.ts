/**
 * x402 Payment Client Tests
 * 
 * Tests for the x402 payment execution client functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  X402PaymentClient, 
  PaymentErrorType, 
  PaymentExecutionError,
  type PaymentInfo 
} from '../lib/x402-client';
import { BASE_SEPOLIA_USDC_ADDRESS } from '../lib/wallet-config';

describe('X402PaymentClient', () => {
  let client: X402PaymentClient;
  
  beforeEach(() => {
    client = new X402PaymentClient();
  });

  describe('validatePaymentInfo', () => {
    it('should validate correct payment info', () => {
      const validPaymentInfo: PaymentInfo = {
        amount: '1000000', // 1 USDC
        recipient: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        network: 'base-sepolia',
        asset: BASE_SEPOLIA_USDC_ADDRESS,
        gatewayUrl: 'https://gateway.mypinata.cloud/x402/cid/QmTest123'
      };

      expect(client.validatePaymentInfo(validPaymentInfo)).toBe(true);
    });

    it('should reject invalid payment info', () => {
      const invalidPaymentInfo = {
        amount: '',
        recipient: 'invalid-address',
        network: 'wrong-network' as any,
        asset: BASE_SEPOLIA_USDC_ADDRESS,
        gatewayUrl: 'invalid-url'
      };

      expect(client.validatePaymentInfo(invalidPaymentInfo as any)).toBe(false);
    });

    it('should reject negative amounts', () => {
      const invalidPaymentInfo: PaymentInfo = {
        amount: '-1000000',
        recipient: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        network: 'base-sepolia',
        asset: BASE_SEPOLIA_USDC_ADDRESS,
        gatewayUrl: 'https://gateway.mypinata.cloud/x402/cid/QmTest123'
      };

      expect(client.validatePaymentInfo(invalidPaymentInfo)).toBe(false);
    });

    it('should reject invalid wallet addresses', () => {
      const invalidPaymentInfo: PaymentInfo = {
        amount: '1000000',
        recipient: '0x123' as `0x${string}`, // Too short
        network: 'base-sepolia',
        asset: BASE_SEPOLIA_USDC_ADDRESS,
        gatewayUrl: 'https://gateway.mypinata.cloud/x402/cid/QmTest123'
      };

      expect(client.validatePaymentInfo(invalidPaymentInfo)).toBe(false);
    });

    it('should reject invalid gateway URLs', () => {
      const invalidPaymentInfo: PaymentInfo = {
        amount: '1000000',
        recipient: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        network: 'base-sepolia',
        asset: BASE_SEPOLIA_USDC_ADDRESS,
        gatewayUrl: 'https://example.com/not-x402' // Missing x402 path
      };

      expect(client.validatePaymentInfo(invalidPaymentInfo)).toBe(false);
    });
  });

  describe('error categorization', () => {
    it('should categorize user rejection errors', () => {
      const error = new Error('User rejected transaction');
      
      try {
        // @ts-ignore - accessing private method for testing
        throw client.categorizeError(error);
      } catch (categorizedError) {
        expect(categorizedError).toBeInstanceOf(PaymentExecutionError);
        expect((categorizedError as PaymentExecutionError).type).toBe(PaymentErrorType.TRANSACTION_REJECTED);
      }
    });

    it('should categorize insufficient balance errors', () => {
      const error = new Error('Insufficient balance for transaction');
      
      try {
        // @ts-ignore - accessing private method for testing
        throw client.categorizeError(error);
      } catch (categorizedError) {
        expect(categorizedError).toBeInstanceOf(PaymentExecutionError);
        expect((categorizedError as PaymentExecutionError).type).toBe(PaymentErrorType.INSUFFICIENT_BALANCE);
      }
    });

    it('should categorize network errors', () => {
      const error = new Error('Network timeout occurred');
      
      try {
        // @ts-ignore - accessing private method for testing
        throw client.categorizeError(error);
      } catch (categorizedError) {
        expect(categorizedError).toBeInstanceOf(PaymentExecutionError);
        expect((categorizedError as PaymentExecutionError).type).toBe(PaymentErrorType.NETWORK_ERROR);
      }
    });

    it('should categorize unknown errors', () => {
      const error = new Error('Some unexpected error');
      
      try {
        // @ts-ignore - accessing private method for testing
        throw client.categorizeError(error);
      } catch (categorizedError) {
        expect(categorizedError).toBeInstanceOf(PaymentExecutionError);
        expect((categorizedError as PaymentExecutionError).type).toBe(PaymentErrorType.UNKNOWN_ERROR);
      }
    });
  });

  describe('progress tracking', () => {
    it('should track progress callbacks', () => {
      const mockCallback = vi.fn();
      const unsubscribe = client.onProgress(mockCallback);

      // Simulate progress update
      // @ts-ignore - accessing private method for testing
      client.currentExecution = {
        status: 'processing',
        progress: 50
      };
      
      // @ts-ignore - accessing private method for testing
      client.notifyProgress();

      expect(mockCallback).toHaveBeenCalledWith({
        status: 'processing',
        progress: 50
      });

      // Test unsubscribe
      unsubscribe();
      
      // @ts-ignore - accessing private method for testing
      client.notifyProgress();
      
      // Should not be called again after unsubscribe
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle callback errors gracefully', () => {
      const mockCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      
      client.onProgress(mockCallback);

      // @ts-ignore - accessing private method for testing
      client.currentExecution = {
        status: 'processing',
        progress: 50
      };

      // Should not throw even if callback throws
      expect(() => {
        // @ts-ignore - accessing private method for testing
        client.notifyProgress();
      }).not.toThrow();
    });
  });

  describe('state management', () => {
    it('should reset execution state', () => {
      // @ts-ignore - accessing private property for testing
      client.currentExecution = {
        status: 'processing',
        progress: 50
      };

      client.reset();

      expect(client.getCurrentExecution()).toBeNull();
    });

    it('should return current execution state', () => {
      const execution = {
        status: 'processing' as const,
        progress: 75
      };

      // @ts-ignore - accessing private property for testing
      client.currentExecution = execution;

      expect(client.getCurrentExecution()).toEqual(execution);
    });
  });

  describe('estimatePaymentTime', () => {
    it('should return estimated payment time', async () => {
      const estimatedTime = await client.estimatePaymentTime();
      
      expect(typeof estimatedTime).toBe('number');
      expect(estimatedTime).toBeGreaterThan(0);
    });
  });
});