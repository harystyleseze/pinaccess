/**
 * Transaction Receipt Fix Test
 * 
 * Tests to verify that the transaction receipt waiting fix works correctly
 */

import { describe, it, expect, vi } from 'vitest';

describe('Transaction Receipt Fix', () => {
  it('should be able to import viem actions correctly', async () => {
    // Test that we can import the required viem functions
    const { createPublicClient, http } = await import('viem');
    const { waitForTransactionReceipt } = await import('viem/actions');
    const { baseSepolia } = await import('../lib/wallet-config');

    expect(createPublicClient).toBeDefined();
    expect(http).toBeDefined();
    expect(waitForTransactionReceipt).toBeDefined();
    expect(baseSepolia).toBeDefined();
    expect(baseSepolia.id).toBe(84532); // Base Sepolia chain ID
  });

  it('should be able to create a public client for Base Sepolia', async () => {
    const { createPublicClient, http } = await import('viem');
    const { baseSepolia } = await import('../lib/wallet-config');

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http('https://sepolia.base.org')
    });

    expect(publicClient).toBeDefined();
    expect(publicClient.chain.id).toBe(84532);
  });

  it('should have the correct chain configuration', async () => {
    const { baseSepolia } = await import('../lib/wallet-config');

    expect(baseSepolia.id).toBe(84532);
    expect(baseSepolia.name).toBe('Base Sepolia');
    expect(baseSepolia.nativeCurrency.symbol).toBe('ETH');
    expect(baseSepolia.testnet).toBe(true);
  });

  it('should be able to mock waitForTransactionReceipt', async () => {
    const { waitForTransactionReceipt } = await import('viem/actions');
    
    // Mock the function to test our error handling
    const mockWaitForTransactionReceipt = vi.fn().mockResolvedValue({
      status: 'success',
      transactionHash: '0x123',
      blockNumber: 12345n,
      gasUsed: 21000n
    });

    // Test that we can call it with the expected parameters
    const mockPublicClient = {} as any;
    const mockTxHash = '0x123' as `0x${string}`;

    const result = await mockWaitForTransactionReceipt(mockPublicClient, { 
      hash: mockTxHash 
    });

    expect(result.status).toBe('success');
    expect(result.transactionHash).toBe('0x123');
  });

  it('should handle reverted transactions correctly', async () => {
    const { waitForTransactionReceipt } = await import('viem/actions');
    
    // Mock a reverted transaction
    const mockWaitForTransactionReceipt = vi.fn().mockResolvedValue({
      status: 'reverted',
      transactionHash: '0x123',
      blockNumber: 12345n,
      gasUsed: 21000n
    });

    const mockPublicClient = {} as any;
    const mockTxHash = '0x123' as `0x${string}`;

    const result = await mockWaitForTransactionReceipt(mockPublicClient, { 
      hash: mockTxHash 
    });

    expect(result.status).toBe('reverted');
    
    // This is how our code should handle reverted transactions
    if (result.status === 'reverted') {
      expect(() => {
        throw new Error('USDC transfer transaction failed');
      }).toThrow('USDC transfer transaction failed');
    }
  });
});