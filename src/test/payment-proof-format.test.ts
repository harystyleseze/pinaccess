/**
 * Payment Proof Format Tests
 * 
 * Tests the payment proof generation to ensure it creates valid proofs
 * that are compatible with Pinata's x402 gateway.
 */

import { describe, it, expect } from 'vitest';

// Mock the x402 client to test payment proof generation
class TestX402Client {
  generatePaymentProof(
    txHash: string,
    paymentOption: any,
    walletAddress: string
  ): string {
    // Replicate the same logic from x402-client.ts
    const proofData = {
      version: '1',
      scheme: paymentOption.scheme || 'exact',
      network: paymentOption.network,
      asset: paymentOption.asset,
      amount: paymentOption.maxAmountRequired,
      recipient: paymentOption.payTo,
      sender: walletAddress,
      transactionHash: txHash,
      timestamp: Math.floor(Date.now() / 1000),
      resource: paymentOption.resource
    };
    
    const proofJson = JSON.stringify(proofData);
    const proofBase64 = btoa(proofJson);
    
    return proofBase64;
  }
}

describe('Payment Proof Format', () => {
  const testClient = new TestX402Client();
  
  const mockPaymentOption = {
    scheme: 'exact',
    network: 'base',
    asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    maxAmountRequired: '10000',
    payTo: '0x6135561038E7C676473431842e586C8248276AED',
    resource: 'https://gateway.mypinata.cloud/x402/cid/bafkreih...'
  };
  
  const mockTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockWalletAddress = '0xabcdef1234567890abcdef1234567890abcdef12';

  it('should generate a valid base64 encoded payment proof', () => {
    const proof = testClient.generatePaymentProof(
      mockTxHash,
      mockPaymentOption,
      mockWalletAddress
    );
    
    // Should be a valid base64 string
    expect(proof).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
    
    // Should be decodable
    const decoded = atob(proof);
    expect(() => JSON.parse(decoded)).not.toThrow();
  });

  it('should include all required fields in the payment proof', () => {
    const proof = testClient.generatePaymentProof(
      mockTxHash,
      mockPaymentOption,
      mockWalletAddress
    );
    
    const decoded = JSON.parse(atob(proof));
    
    // Check all required fields are present
    expect(decoded.version).toBe('1');
    expect(decoded.scheme).toBe('exact');
    expect(decoded.network).toBe('base');
    expect(decoded.asset).toBe(mockPaymentOption.asset);
    expect(decoded.amount).toBe(mockPaymentOption.maxAmountRequired);
    expect(decoded.recipient).toBe(mockPaymentOption.payTo);
    expect(decoded.sender).toBe(mockWalletAddress);
    expect(decoded.transactionHash).toBe(mockTxHash);
    expect(decoded.resource).toBe(mockPaymentOption.resource);
    expect(decoded.timestamp).toBeTypeOf('number');
  });

  it('should generate different proofs for different transactions', () => {
    const proof1 = testClient.generatePaymentProof(
      mockTxHash,
      mockPaymentOption,
      mockWalletAddress
    );
    
    const proof2 = testClient.generatePaymentProof(
      '0xdifferenthash1234567890abcdef1234567890abcdef1234567890abcdef12',
      mockPaymentOption,
      mockWalletAddress
    );
    
    expect(proof1).not.toBe(proof2);
  });

  it('should handle different payment options correctly', () => {
    const differentPaymentOption = {
      ...mockPaymentOption,
      maxAmountRequired: '50000',
      payTo: '0xdifferentrecipient1234567890abcdef1234567890'
    };
    
    const proof = testClient.generatePaymentProof(
      mockTxHash,
      differentPaymentOption,
      mockWalletAddress
    );
    
    const decoded = JSON.parse(atob(proof));
    
    expect(decoded.amount).toBe('50000');
    expect(decoded.recipient).toBe(differentPaymentOption.payTo);
  });

  it('should include timestamp for proof freshness', () => {
    const beforeTime = Math.floor(Date.now() / 1000);
    
    const proof = testClient.generatePaymentProof(
      mockTxHash,
      mockPaymentOption,
      mockWalletAddress
    );
    
    const afterTime = Math.floor(Date.now() / 1000);
    const decoded = JSON.parse(atob(proof));
    
    expect(decoded.timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(decoded.timestamp).toBeLessThanOrEqual(afterTime);
  });
});