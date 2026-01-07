/**
 * Wallet Integration Tests
 * 
 * Tests for wallet connection utilities and configuration
 */

import { describe, it, expect } from 'vitest';
import { 
  BASE_SEPOLIA_CHAIN_ID, 
  BASE_SEPOLIA_USDC_ADDRESS, 
  USDC_DECIMALS,
  WALLET_NAMES,
  baseSepolia
} from '@/lib/wallet-config';
import { WalletManager } from '@/lib/wallet';

describe('Wallet Configuration', () => {
  it('should have correct Base Sepolia configuration', () => {
    expect(BASE_SEPOLIA_CHAIN_ID).toBe(84532);
    expect(BASE_SEPOLIA_USDC_ADDRESS).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    expect(USDC_DECIMALS).toBe(6);
  });

  it('should have correct chain configuration', () => {
    expect(baseSepolia.id).toBe(84532);
    expect(baseSepolia.name).toBe('Base Sepolia');
    expect(baseSepolia.testnet).toBe(true);
    expect(baseSepolia.nativeCurrency.symbol).toBe('ETH');
  });

  it('should have wallet names defined', () => {
    expect(WALLET_NAMES.metamask).toBe('MetaMask');
    expect(WALLET_NAMES.walletconnect).toBe('WalletConnect');
    expect(WALLET_NAMES.coinbase).toBe('Coinbase Wallet');
    expect(WALLET_NAMES.injected).toBe('Browser Wallet');
  });
});

describe('WalletManager', () => {
  it('should create wallet manager instance', () => {
    const walletManager = new WalletManager();
    expect(walletManager).toBeDefined();
    expect(walletManager.getConfig).toBeDefined();
  });

  it('should have correct network validation', () => {
    const walletManager = new WalletManager();
    
    // Should return true for Base Sepolia
    expect(walletManager.isOnCorrectNetwork(84532)).toBe(true);
    
    // Should return false for other networks
    expect(walletManager.isOnCorrectNetwork(1)).toBe(false); // Ethereum mainnet
    expect(walletManager.isOnCorrectNetwork(137)).toBe(false); // Polygon
  });
});

describe('Wallet Integration Types', () => {
  it('should have correct supported wallet types', () => {
    const supportedWallets = ['metamask', 'walletconnect', 'coinbase', 'injected'];
    
    supportedWallets.forEach(wallet => {
      expect(WALLET_NAMES[wallet as keyof typeof WALLET_NAMES]).toBeDefined();
    });
  });
});