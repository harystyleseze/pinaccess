/**
 * WalletConnector Component
 * 
 * Handles Web3 wallet connection and network validation for buyers.
 * Supports MetaMask, WalletConnect, Coinbase Wallet, and other injected wallets.
 */

'use client';

import React, { useState } from 'react';
import { useWallet, useWalletConnection, useWalletActions } from '@/lib/wallet-context';
import { 
  BASE_SEPOLIA_CHAIN_ID, 
  WALLET_NAMES, 
  type SupportedWallet 
} from '@/lib/wallet-config';
import NetworkIndicator from './NetworkIndicator';

interface WalletConnectorProps {
  onWalletConnect?: (address: string, chainId: number) => void;
  onWalletDisconnect?: () => void;
  requiredChainId?: number;
  className?: string;
}

export function WalletConnector({ 
  onWalletConnect,
  onWalletDisconnect,
  requiredChainId = BASE_SEPOLIA_CHAIN_ID,
  className = ''
}: WalletConnectorProps) {
  const { isOnCorrectNetwork } = useWallet();
  const { 
    isConnected, 
    address, 
    chainId, 
    balance, 
    provider, 
    isConnecting, 
    error 
  } = useWalletConnection();
  const { 
    connect, 
    disconnect, 
    switchNetwork, 
    refreshBalance, 
    clearError 
  } = useWalletActions();

  const [showWalletOptions, setShowWalletOptions] = useState(false);

  // Handle wallet connection
  const handleConnect = async (walletType: SupportedWallet) => {
    try {
      console.log(`Attempting to connect to ${walletType}`);
      await connect(walletType);
      setShowWalletOptions(false);
      console.log(`Successfully connected to ${walletType}`);
      
      if (onWalletConnect && address && chainId) {
        onWalletConnect(address, chainId);
      }
    } catch (error) {
      console.error(`Connection to ${walletType} failed:`, error);
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('install')) {
          alert(`Please install the ${walletType} wallet extension and refresh the page.`);
        } else if (error.message.includes('rejected')) {
          // User cancelled, no need to show error
        } else {
          alert(`Failed to connect to ${walletType}. Please try again.`);
        }
      }
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    try {
      await disconnect();
      if (onWalletDisconnect) {
        onWalletDisconnect();
      }
    } catch (err) {
      console.error('Disconnection failed:', err);
    }
  };

  // Handle network switch
  const handleSwitchNetwork = async () => {
    try {
      await switchNetwork();
    } catch (err) {
      console.error('Network switch failed:', err);
    }
  };

  // Handle balance refresh
  const handleRefreshBalance = async () => {
    try {
      await refreshBalance();
    } catch (err) {
      console.error('Balance refresh failed:', err);
    }
  };

  // Wallet option buttons
  const walletOptions: { type: SupportedWallet; icon: string }[] = [
    { type: 'metamask', icon: '🦊' },
    { type: 'coinbase', icon: '🔵' },
    { type: 'walletconnect', icon: '🔗' },
    { type: 'injected', icon: '💼' },
  ];

  if (!isConnected) {
    return (
      <div className={`wallet-connector ${className}`}>
        {!showWalletOptions ? (
          <button
            onClick={() => setShowWalletOptions(true)}
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="wallet-options bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Connect Wallet</h3>
              <button
                onClick={() => setShowWalletOptions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2">
              {walletOptions.map(({ type, icon }) => (
                <button
                  key={type}
                  onClick={() => handleConnect(type)}
                  disabled={isConnecting}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xl">{icon}</span>
                  <span className="font-medium">{WALLET_NAMES[type]}</span>
                </button>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <NetworkIndicator showDetails={true} />
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`wallet-connected ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {/* Wallet Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium text-gray-900">
              {provider ? WALLET_NAMES[provider] : 'Wallet'} Connected
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Disconnect
          </button>
        </div>

        {/* Address */}
        <div className="mb-3">
          <p className="text-sm text-gray-600">Address</p>
          <p className="font-mono text-sm text-gray-900">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'}
          </p>
        </div>

        {/* Network Status */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Network</p>
            {!isOnCorrectNetwork && (
              <button
                onClick={handleSwitchNetwork}
                className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 transition-colors"
              >
                Switch Network
              </button>
            )}
          </div>
          <NetworkIndicator showDetails={false} />
        </div>

        {/* Balance */}
        {balance && (
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Balance</p>
              <button
                onClick={handleRefreshBalance}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-mono">
                <span className="text-gray-900">{parseFloat(balance.usdc).toFixed(2)}</span>
                <span className="text-gray-500 ml-1">USDC</span>
              </p>
              <p className="text-sm font-mono">
                <span className="text-gray-900">{parseFloat(balance.eth).toFixed(4)}</span>
                <span className="text-gray-500 ml-1">ETH</span>
              </p>
            </div>
          </div>
        )}

        {/* Network Warning */}
        {!isOnCorrectNetwork && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-700">
              Please switch to Base Sepolia network to make payments.
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for inline use
export function WalletConnectorCompact({ 
  onWalletConnect,
  onWalletDisconnect,
  className = ''
}: Omit<WalletConnectorProps, 'requiredChainId'>) {
  const { isConnected, address, isConnecting } = useWalletConnection();
  const { connect, disconnect } = useWalletActions();

  if (!isConnected) {
    return (
      <button
        onClick={() => connect('metamask')} // Default to MetaMask for compact version
        disabled={isConnecting}
        className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="text-sm font-mono">
        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
      </span>
      <button
        onClick={() => {
          disconnect();
          if (onWalletDisconnect) onWalletDisconnect();
        }}
        className="text-sm text-gray-500 hover:text-gray-700 ml-2"
      >
        Disconnect
      </button>
    </div>
  );
}