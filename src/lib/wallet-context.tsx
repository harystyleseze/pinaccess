/**
 * Wallet Context Provider
 * 
 * React context for managing wallet connection state across the application.
 * Provides wallet connection status, balance information, and connection methods.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  walletManager, 
  type WalletConnection
} from './wallet';
import { WALLET_ERRORS, type SupportedWallet } from './wallet-config';

// Wallet Context State
interface WalletContextState {
  // Connection state
  wallet: WalletConnection | null;
  isConnecting: boolean;
  error: string | null;
  
  // Actions
  connect: (walletType: SupportedWallet) => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  clearError: () => void;
  
  // Utilities
  isOnCorrectNetwork: boolean;
  hasSufficientBalance: (amount: string) => boolean;
}

// Create context
const WalletContext = createContext<WalletContextState | null>(null);

// Provider component
interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if on correct network
  const isOnCorrectNetwork = wallet ? walletManager.isOnCorrectNetwork(wallet.chainId) : false;

  // Connect wallet
  const connect = useCallback(async (walletType: SupportedWallet) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const connection = await walletManager.connectWallet(walletType);
      setWallet(connection);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await walletManager.disconnectWallet();
      setWallet(null);
      setError(null);
    } catch (err) {
      console.error('Wallet disconnection error:', err);
    }
  }, []);

  // Switch to Base Sepolia network
  const switchNetwork = useCallback(async () => {
    if (!wallet) return;
    
    try {
      await walletManager.switchToBaseSepolia();
      // Refresh wallet connection to get updated chain ID
      const updatedConnection = await walletManager.getWalletConnection();
      setWallet(updatedConnection);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : WALLET_ERRORS.WRONG_NETWORK;
      setError(errorMessage);
      console.error('Network switch error:', err);
    }
  }, [wallet]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!wallet?.address) return;
    
    try {
      const balances = await walletManager.getBalances(wallet.address as `0x${string}`);
      setWallet(prev => prev ? { ...prev, balance: balances } : null);
    } catch (err) {
      console.error('Balance refresh error:', err);
    }
  }, [wallet?.address]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if user has sufficient balance
  const hasSufficientBalance = useCallback((amount: string): boolean => {
    if (!wallet?.balance?.usdc) return false;
    
    const currentBalance = parseFloat(wallet.balance.usdc); // This is in USDC tokens (e.g., "1.00")
    const requiredSmallestUnits = parseFloat(amount);       // This is in USDC smallest units (e.g., "10000")
    
    // Convert required amount from smallest units to tokens (divide by 10^6)
    const requiredTokens = requiredSmallestUnits / 1000000; // USDC has 6 decimals
    
    return currentBalance >= requiredTokens;
  }, [wallet?.balance?.usdc]);

  // Watch for wallet changes
  useEffect(() => {
    const unwatch = walletManager.watchWalletChanges((connection) => {
      setWallet(connection);
      if (!connection) {
        setError(null);
      }
    });

    return unwatch;
  }, []);

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const connection = await walletManager.getWalletConnection();
        setWallet(connection);
      } catch (err) {
        // No existing connection, which is fine
        console.debug('No existing wallet connection');
      }
    };

    checkExistingConnection();
  }, []);

  const contextValue: WalletContextState = {
    wallet,
    isConnecting,
    error,
    connect,
    disconnect,
    switchNetwork,
    refreshBalance,
    clearError,
    isOnCorrectNetwork,
    hasSufficientBalance,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Hook to use wallet context
export function useWallet(): WalletContextState {
  const context = useContext(WalletContext);
  
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  
  return context;
}

// Hook for wallet connection status
export function useWalletConnection() {
  const { wallet, isConnecting, error } = useWallet();
  
  return {
    isConnected: !!wallet,
    address: wallet?.address,
    chainId: wallet?.chainId,
    balance: wallet?.balance,
    provider: wallet?.provider,
    isConnecting,
    error,
  };
}

// Hook for wallet actions
export function useWalletActions() {
  const { 
    connect, 
    disconnect, 
    switchNetwork, 
    refreshBalance, 
    clearError 
  } = useWallet();
  
  return {
    connect,
    disconnect,
    switchNetwork,
    refreshBalance,
    clearError,
  };
}