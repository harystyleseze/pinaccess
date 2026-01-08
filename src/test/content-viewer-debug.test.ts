/**
 * Content Viewer Debug Test
 * 
 * Debug test to understand why ContentViewer is not displaying content after payment.
 */

import { describe, it, expect } from 'vitest';

describe('Content Viewer Debug', () => {
  it('should identify the content access flow issue', () => {
    // Mock content info that would come from the API
    const mockContentInfo = {
      cid: 'bafkreih5aznjvttude6c3wbvqeebb6rlx5wkbzyppv7garjiubll2ceym4',
      name: 'Test Document.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      price: {
        usd: 0.01,
        usdc: '10000'
      },
      creator: 'Test Creator',
      description: 'Test document for debugging',
      gatewayUrl: 'https://brown-voluntary-aardwolf-402.mypinata.cloud/x402/cid/bafkreih5aznjvttude6c3wbvqeebb6rlx5wkbzyppv7garjiubll2ceym4',
      isMonetized: true,
      requiresPayment: true
    };

    // Mock payment proof that would be generated after successful payment
    const mockPaymentProof = btoa(JSON.stringify({
      version: '1',
      scheme: 'exact',
      network: 'base',
      asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      amount: '10000',
      recipient: '0x6135561038E7C676473431842e586C8248276AED',
      sender: '0xabcdef1234567890abcdef1234567890abcdef12',
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      timestamp: Math.floor(Date.now() / 1000),
      resource: mockContentInfo.gatewayUrl
    }));

    console.log('Mock Content Info:', JSON.stringify(mockContentInfo, null, 2));
    console.log('Mock Payment Proof:', mockPaymentProof);
    console.log('Payment Proof Decoded:', JSON.parse(atob(mockPaymentProof)));

    // Verify the gateway URL format
    expect(mockContentInfo.gatewayUrl).toContain('/x402/cid/');
    expect(mockContentInfo.gatewayUrl).toContain(mockContentInfo.cid);

    // Verify the payment proof format
    const decodedProof = JSON.parse(atob(mockPaymentProof));
    expect(decodedProof.version).toBe('1');
    expect(decodedProof.transactionHash).toBeTruthy();
    expect(decodedProof.resource).toBe(mockContentInfo.gatewayUrl);
  });

  it('should check if the issue is with the gateway URL mismatch', () => {
    // Check if there's a mismatch between environment and hardcoded URLs
    const envGatewayUrl = process.env.PINATA_GATEWAY_URL || 'https://gateway.mypinata.cloud';
    const hardcodedFallback = 'https://gateway.mypinata.cloud';
    
    console.log('Environment Gateway URL:', envGatewayUrl);
    console.log('Hardcoded Fallback:', hardcodedFallback);
    
    // If these don't match, that could be the issue
    if (envGatewayUrl !== hardcodedFallback) {
      console.warn('Gateway URL mismatch detected!');
      console.warn('This could cause content access failures.');
    }
    
    // The test should pass regardless, but log the information
    expect(true).toBe(true);
  });

  it('should simulate the content access flow', async () => {
    const testCid = 'bafkreih5aznjvttude6c3wbvqeebb6rlx5wkbzyppv7garjiubll2ceym4';
    const gatewayUrl = `https://brown-voluntary-aardwolf-402.mypinata.cloud/x402/cid/${testCid}`;
    
    console.log('Testing gateway URL:', gatewayUrl);
    
    // This would be the actual flow:
    // 1. Get 402 response with payment requirements
    // 2. Make payment and get transaction hash
    // 3. Generate payment proof
    // 4. Access content with payment proof
    
    // For now, just verify the URL format
    expect(gatewayUrl).toMatch(/^https:\/\/.*\.mypinata\.cloud\/x402\/cid\/bafkrei.*/);
  });
});