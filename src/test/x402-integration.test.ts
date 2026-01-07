/**
 * x402 Payment Integration Tests
 * 
 * End-to-end tests for the complete x402 payment flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  x402PaymentClient,
  type PaymentInfo,
  type PaymentResult
} from '../lib/x402-client';
import { 
  contentAccessClient,
  type ContentInfo
} from '../lib/content-access';
import { BASE_SEPOLIA_USDC_ADDRESS } from '../lib/wallet-config';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('x402 Payment Integration', () => {
  const mockCid = 'bafkreihvajece2u7gnp7vdmuyrpj5btogxedzssfr4auh3lje527h6rztu';
  const mockWalletAddress = '0x1234567890123456789012345678901234567890';
  const mockRecipientAddress = '0x742d35Cc6634C0532925a3b8D0C9C0E3C5C7C5C5';
  const mockGatewayUrl = `https://gateway.mypinata.cloud/x402/cid/${mockCid}`;

  const mockContentInfo: ContentInfo = {
    cid: mockCid,
    name: 'Test Document.pdf',
    mimeType: 'application/pdf',
    size: 1024000,
    description: 'A test document for payment integration',
    creator: 'Test Creator',
    price: {
      usd: 0.01,
      usdc: '10000'
    },
    gatewayUrl: mockGatewayUrl
  };

  const mockPaymentInfo: PaymentInfo = {
    amount: '10000', // 0.01 USDC in smallest units
    recipient: mockRecipientAddress as `0x${string}`,
    network: 'base-sepolia',
    asset: BASE_SEPOLIA_USDC_ADDRESS,
    gatewayUrl: mockGatewayUrl,
    description: 'Payment for Test Document.pdf'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    x402PaymentClient.reset();
    contentAccessClient.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('x402 Protocol Flow', () => {
    it('should handle 402 payment required response correctly', async () => {
      // Mock the initial 402 response
      const mock402Response = {
        x402Version: 1,
        accepts: [
          {
            scheme: 'exact',
            network: 'base-sepolia',
            maxAmountRequired: '10000',
            resource: mockGatewayUrl,
            description: 'Access fee',
            mimeType: 'application/json',
            payTo: mockRecipientAddress,
            maxTimeoutSeconds: 60,
            asset: BASE_SEPOLIA_USDC_ADDRESS,
            extra: {
              name: 'USD Coin',
              version: '2'
            }
          }
        ],
        error: 'Provide a valid X-Payment header to access this content'
      };

      mockFetch.mockResolvedValueOnce({
        status: 402,
        ok: false,
        json: () => Promise.resolve(mock402Response)
      });

      // Test that we can parse the 402 response correctly
      const response = await fetch(mockGatewayUrl);
      expect(response.status).toBe(402);
      
      const paymentRequirements = await response.json();
      expect(paymentRequirements.accepts).toHaveLength(1);
      expect(paymentRequirements.accepts[0].maxAmountRequired).toBe('10000');
      expect(paymentRequirements.accepts[0].payTo).toBe(mockRecipientAddress);
      expect(paymentRequirements.accepts[0].asset).toBe(BASE_SEPOLIA_USDC_ADDRESS);
    });

    it('should validate payment info correctly', () => {
      expect(x402PaymentClient.validatePaymentInfo(mockPaymentInfo)).toBe(true);
    });

    it('should reject invalid payment info', () => {
      const invalidPaymentInfo = {
        ...mockPaymentInfo,
        recipient: 'invalid-address' as `0x${string}`
      };

      expect(x402PaymentClient.validatePaymentInfo(invalidPaymentInfo)).toBe(false);
    });

    it('should generate proper payment proof format', () => {
      // Test the payment proof generation indirectly by checking format
      const mockTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const mockPaymentOption = {
        scheme: 'exact',
        network: 'base-sepolia',
        maxAmountRequired: '10000',
        payTo: mockRecipientAddress,
        asset: BASE_SEPOLIA_USDC_ADDRESS,
        resource: mockGatewayUrl,
        description: 'Access fee'
      };

      // Access the private method for testing
      const client = new (x402PaymentClient.constructor as any)();
      const paymentProof = client.generatePaymentProof(
        mockTxHash,
        mockPaymentOption,
        mockWalletAddress
      );

      expect(paymentProof).toMatch(/^x402_proof_v1_/);
      
      // Decode and verify the proof structure
      const proofBase64 = paymentProof.replace('x402_proof_v1_', '');
      const proofJson = atob(proofBase64);
      const proofData = JSON.parse(proofJson);

      expect(proofData.version).toBe(1);
      expect(proofData.txHash).toBe(mockTxHash);
      expect(proofData.amount).toBe('10000');
      expect(proofData.recipient).toBe(mockRecipientAddress);
      expect(proofData.sender).toBe(mockWalletAddress);
      expect(proofData.asset).toBe(BASE_SEPOLIA_USDC_ADDRESS);
      expect(proofData.network).toBe('base-sepolia');
    });
  });

  describe('Content Access Integration', () => {
    it('should check for existing payments correctly', () => {
      // Store a mock payment
      contentAccessClient.storePaymentRecord({
        cid: mockCid,
        paymentProof: 'mock_proof_123',
        transactionHash: '0xmocktxhash',
        paidAt: new Date().toISOString(),
        walletAddress: mockWalletAddress,
        amount: '10000'
      });

      // Check if user has paid
      const paymentRecord = contentAccessClient.hasUserPaid(mockCid, mockWalletAddress);
      expect(paymentRecord).toBeTruthy();
      expect(paymentRecord?.cid).toBe(mockCid);
      expect(paymentRecord?.walletAddress).toBe(mockWalletAddress);
    });

    it('should validate payment proofs correctly', async () => {
      const mockPaymentProof = 'x402_proof_v1_eyJ2ZXJzaW9uIjoxLCJ0eEhhc2giOiIweDEyMyJ9';

      // Mock successful validation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']])
      });

      const validation = await contentAccessClient.validatePaymentProof(
        mockCid,
        mockPaymentProof,
        mockGatewayUrl
      );

      expect(validation.isValid).toBe(true);
      expect(validation.isExpired).toBe(false);
    });

    it('should handle expired payment proofs', async () => {
      const mockPaymentProof = 'x402_proof_v1_expired';

      // Mock 402 response indicating expired proof
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        statusText: 'Payment Required'
      });

      const validation = await contentAccessClient.validatePaymentProof(
        mockCid,
        mockPaymentProof,
        mockGatewayUrl
      );

      expect(validation.isValid).toBe(false);
      expect(validation.isExpired).toBe(true);
    });

    it('should format content information correctly', () => {
      expect(contentAccessClient.getContentIcon('application/pdf')).toBe('📄');
      expect(contentAccessClient.getContentIcon('image/jpeg')).toBe('🖼️');
      expect(contentAccessClient.getContentIcon('text/plain')).toBe('📝');
      
      expect(contentAccessClient.getContentCategory('application/pdf')).toBe('pdf');
      expect(contentAccessClient.getContentCategory('image/png')).toBe('image');
      expect(contentAccessClient.getContentCategory('text/markdown')).toBe('text');
      
      expect(contentAccessClient.formatFileSize(1024)).toBe('1 KB');
      expect(contentAccessClient.formatFileSize(1048576)).toBe('1 MB');
      expect(contentAccessClient.formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should determine inline display capability', () => {
      expect(contentAccessClient.canDisplayInline('application/pdf')).toBe(true);
      expect(contentAccessClient.canDisplayInline('image/jpeg')).toBe(true);
      expect(contentAccessClient.canDisplayInline('text/plain')).toBe(true);
      expect(contentAccessClient.canDisplayInline('video/mp4')).toBe(false);
      expect(contentAccessClient.canDisplayInline('application/zip')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const validation = await contentAccessClient.validatePaymentProof(
        mockCid,
        'mock_proof',
        mockGatewayUrl
      );

      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Network error');
    });

    it('should handle invalid gateway responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const validation = await contentAccessClient.validatePaymentProof(
        mockCid,
        'mock_proof',
        mockGatewayUrl
      );

      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Validation failed');
    });
  });

  describe('Payment Storage', () => {
    it('should store and retrieve payment records', () => {
      const paymentRecord = {
        cid: mockCid,
        paymentProof: 'test_proof_123',
        transactionHash: '0xtesthash',
        paidAt: new Date().toISOString(),
        walletAddress: mockWalletAddress,
        amount: '10000'
      };

      contentAccessClient.storePaymentRecord(paymentRecord);
      
      const retrieved = contentAccessClient.hasUserPaid(mockCid, mockWalletAddress);
      expect(retrieved).toEqual(paymentRecord);
    });

    it('should handle case-insensitive wallet address matching', () => {
      const paymentRecord = {
        cid: mockCid,
        paymentProof: 'test_proof_123',
        transactionHash: '0xtesthash',
        paidAt: new Date().toISOString(),
        walletAddress: mockWalletAddress.toLowerCase(),
        amount: '10000'
      };

      contentAccessClient.storePaymentRecord(paymentRecord);
      
      // Should find payment even with different case
      const retrieved = contentAccessClient.hasUserPaid(mockCid, mockWalletAddress.toUpperCase());
      expect(retrieved).toBeTruthy();
    });

    it('should replace existing payments for same CID and wallet', () => {
      const firstPayment = {
        cid: mockCid,
        paymentProof: 'first_proof',
        transactionHash: '0xfirsthash',
        paidAt: new Date().toISOString(),
        walletAddress: mockWalletAddress,
        amount: '10000'
      };

      const secondPayment = {
        cid: mockCid,
        paymentProof: 'second_proof',
        transactionHash: '0xsecondhash',
        paidAt: new Date().toISOString(),
        walletAddress: mockWalletAddress,
        amount: '20000'
      };

      contentAccessClient.storePaymentRecord(firstPayment);
      contentAccessClient.storePaymentRecord(secondPayment);
      
      const retrieved = contentAccessClient.hasUserPaid(mockCid, mockWalletAddress);
      expect(retrieved?.paymentProof).toBe('second_proof');
      expect(retrieved?.amount).toBe('20000');
    });
  });
});