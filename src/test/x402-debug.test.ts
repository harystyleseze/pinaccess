/**
 * x402 Debug Test
 * 
 * Manual test to debug x402 payment proof issues with Pinata gateway.
 * This test helps identify what format Pinata expects for payment proofs.
 */

import { describe, it, expect } from 'vitest';

describe('x402 Debug Tests', () => {
  // Skip these tests by default since they require real network calls
  it.skip('should test different payment proof formats with Pinata gateway', async () => {
    const testCid = 'bafkreih5aznjvttude6c3wbvqeebb6rlx5wkbzyppv7garjiubll2ceym4';
    const gatewayUrl = `https://gateway.mypinata.cloud/x402/cid/${testCid}`;
    
    // First, get the 402 response to see what Pinata expects
    const initialResponse = await fetch(gatewayUrl);
    expect(initialResponse.status).toBe(402);
    
    const paymentRequirements = await initialResponse.json();
    console.log('Payment requirements from Pinata:', JSON.stringify(paymentRequirements, null, 2));
    
    // Test different proof formats to see which one works
    const testProofs = [
      // Format 1: Simple transaction hash
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      
      // Format 2: Base64 encoded JSON with all fields
      btoa(JSON.stringify({
        version: '1',
        scheme: 'exact',
        network: 'base',
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '10000',
        recipient: '0x6135561038E7C676473431842e586C8248276AED',
        sender: '0xabcdef1234567890abcdef1234567890abcdef12',
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        timestamp: Math.floor(Date.now() / 1000),
        resource: gatewayUrl
      })),
      
      // Format 3: Minimal JSON
      btoa(JSON.stringify({
        tx: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        amount: '10000',
        to: '0x6135561038E7C676473431842e586C8248276AED'
      }))
    ];
    
    for (let i = 0; i < testProofs.length; i++) {
      const proof = testProofs[i];
      console.log(`Testing proof format ${i + 1}:`, proof);
      
      const response = await fetch(gatewayUrl, {
        headers: {
          'X-Payment': proof
        }
      });
      
      console.log(`Proof ${i + 1} result:`, response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Proof ${i + 1} error:`, errorText);
      }
    }
  });

  it.skip('should analyze Pinata x402 response structure', async () => {
    const testCid = 'bafkreih5aznjvttude6c3wbvqeebb6rlx5wkbzyppv7garjiubll2ceym4';
    const gatewayUrl = `https://gateway.mypinata.cloud/x402/cid/${testCid}`;
    
    const response = await fetch(gatewayUrl);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 402) {
      const body = await response.json();
      console.log('402 Response body:', JSON.stringify(body, null, 2));
      
      // Analyze the structure
      if (body.accepts && Array.isArray(body.accepts)) {
        const paymentOption = body.accepts[0];
        console.log('Payment option analysis:');
        console.log('- Network:', paymentOption.network);
        console.log('- Asset:', paymentOption.asset);
        console.log('- Amount:', paymentOption.maxAmountRequired);
        console.log('- Recipient:', paymentOption.payTo);
        console.log('- Resource:', paymentOption.resource);
        console.log('- Scheme:', paymentOption.scheme);
        console.log('- Extra:', paymentOption.extra);
      }
    }
  });

  it('should validate payment proof structure', () => {
    // Test the payment proof generation logic
    const mockPaymentOption = {
      scheme: 'exact',
      network: 'base',
      asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      maxAmountRequired: '10000',
      payTo: '0x6135561038E7C676473431842e586C8248276AED',
      resource: 'https://gateway.mypinata.cloud/x402/cid/test'
    };
    
    const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const walletAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
    
    // Generate proof using the same logic as x402-client.ts
    const proofData = {
      version: '1',
      scheme: mockPaymentOption.scheme || 'exact',
      network: mockPaymentOption.network,
      asset: mockPaymentOption.asset,
      amount: mockPaymentOption.maxAmountRequired,
      recipient: mockPaymentOption.payTo,
      sender: walletAddress,
      transactionHash: txHash,
      timestamp: Math.floor(Date.now() / 1000),
      resource: mockPaymentOption.resource
    };
    
    const proofJson = JSON.stringify(proofData);
    const proofBase64 = btoa(proofJson);
    
    console.log('Generated proof JSON:', proofJson);
    console.log('Generated proof base64:', proofBase64);
    
    // Validate it can be decoded
    const decoded = JSON.parse(atob(proofBase64));
    expect(decoded.version).toBe('1');
    expect(decoded.transactionHash).toBe(txHash);
    expect(decoded.sender).toBe(walletAddress);
  });
});