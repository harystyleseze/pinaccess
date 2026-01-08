/**
 * Wallet Configuration for Base Sepolia Network
 * 
 * This file contains network constants and configuration for Web3 wallet integration
 * using Base Sepolia testnet for safe testing of payment flows.
 */

import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
export { baseSepolia };
import { metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Base Sepolia Network Configuration
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_NETWORK_NAME = 'base-sepolia';

// USDC Token Configuration for Base Sepolia
export const BASE_SEPOLIA_USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
export const USDC_DECIMALS = 6;

// Wallet Connection Configuration
export const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'ac2f965ecdffabe63854d976df684ac7';

// Supported Wallet Types
export type SupportedWallet = 'metamask' | 'walletconnect' | 'coinbase' | 'injected';

// Wallet Provider Names
export const WALLET_NAMES: Record<SupportedWallet, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
  injected: 'Browser Wallet',
};

// Error Messages
export const WALLET_ERRORS = {
  NO_WALLET: 'No wallet detected. Please install a Web3 wallet.',
  WRONG_NETWORK: 'Please switch to Base Sepolia network.',
  CONNECTION_REJECTED: 'Wallet connection was rejected.',
  INSUFFICIENT_BALANCE: 'Insufficient USDC balance for this payment.',
  TRANSACTION_REJECTED: 'Transaction was rejected.',
  NETWORK_ERROR: 'Network error occurred. Please try again.',
} as const;

// Contract ABI for USDC token (minimal interface for balance checking)
export const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const;

// Create wallet configuration with improved connector detection
export function createWalletConfig() {
  const connectors = [
    metaMask({
      dappMetadata: {
        name: 'PinAccess',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000',
      },
    }),
    walletConnect({
      projectId: WALLET_CONNECT_PROJECT_ID,
      metadata: {
        name: 'PinAccess',
        description: 'Decentralized content access with x402 payments',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000',
        icons: [typeof window !== 'undefined' ? `${window.location.origin}/icon.png` : 'https://localhost:3000/icon.png'],
      },
      showQrModal: true,
    }),
    coinbaseWallet({
      appName: 'PinAccess',
      appLogoUrl: typeof window !== 'undefined' ? `${window.location.origin}/icon.png` : 'https://localhost:3000/icon.png',
    }),
  ];

  return createConfig({
    chains: [baseSepolia],
    connectors,
    transports: {
      [baseSepolia.id]: http('https://sepolia.base.org'),
    },
  });
}