'use client';

import React, { useState } from 'react';
import { X, Wallet, RefreshCw } from 'lucide-react';
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

  const handleConnect = async (walletType: SupportedWallet) => {
    try {
      await connect(walletType);
      setShowWalletOptions(false);

      if (onWalletConnect && address && chainId) {
        onWalletConnect(address, chainId);
      }
    } catch (error) {
      console.error(`Connection to ${walletType} failed:`, error);
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('install')) {
          alert(`Please install ${WALLET_NAMES[walletType]} and refresh the page.`);
        } else if (!error.message.includes('rejected')) {
          alert(`Failed to connect. Please try again.`);
        }
      }
    }
  };

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

  const walletOptions: { type: SupportedWallet; label: string }[] = [
    { type: 'metamask', label: 'MetaMask' },
    { type: 'coinbase', label: 'Coinbase Wallet' },
    { type: 'walletconnect', label: 'WalletConnect' },
    { type: 'injected', label: 'Browser Wallet' },
  ];

  if (!isConnected) {
    return (
      <div className={`wallet-connector ${className}`}>
        {!showWalletOptions ? (
          <button
            onClick={() => setShowWalletOptions(true)}
            disabled={isConnecting}
            className="btn-primary"
          >
            <Wallet className="w-4 h-4" />
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="card p-4 min-w-64 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Connect Wallet</h3>
              <button
                onClick={() => setShowWalletOptions(false)}
                className="p-1 rounded-full hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="space-y-2">
              {walletOptions.map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => handleConnect(type)}
                  disabled={isConnecting}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50"
                >
                  <Wallet className="w-5 h-5 text-[var(--text-muted)]" />
                  <span className="font-medium text-[var(--text-primary)]">{label}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <NetworkIndicator showDetails={false} />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 status-error rounded-lg animate-slide-up">
            <div className="flex items-center justify-between">
              <p className="text-sm">{error}</p>
              <button onClick={clearError} className="p-1 hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`wallet-connected ${className}`}>
      <div className="card p-4">
        {/* Wallet Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[var(--success)] rounded-full" />
            <span className="font-medium text-[var(--text-primary)] text-sm">
              {provider ? WALLET_NAMES[provider] : 'Wallet'} Connected
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Disconnect
          </button>
        </div>

        {/* Address */}
        <div className="mb-3">
          <p className="text-xs text-[var(--text-muted)] mb-1">Address</p>
          <p className="font-mono text-sm text-[var(--text-primary)]">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'}
          </p>
        </div>

        {/* Network Status */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[var(--text-muted)]">Network</p>
            {!isOnCorrectNetwork && (
              <button
                onClick={switchNetwork}
                className="text-xs btn-warning btn-sm"
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
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-[var(--text-muted)]">Balance</p>
              <button
                onClick={refreshBalance}
                className="p-1 hover:bg-[var(--surface-elevated)] rounded transition-colors"
              >
                <RefreshCw className="w-3 h-3 text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-mono">
                <span className="text-[var(--text-primary)]">{parseFloat(balance.usdc).toFixed(2)}</span>
                <span className="text-[var(--text-muted)] ml-1">USDC</span>
              </p>
              <p className="text-sm font-mono">
                <span className="text-[var(--text-primary)]">{parseFloat(balance.eth).toFixed(4)}</span>
                <span className="text-[var(--text-muted)] ml-1">ETH</span>
              </p>
            </div>
          </div>
        )}

        {/* Network Warning */}
        {!isOnCorrectNetwork && (
          <div className="mt-3 p-3 status-warning rounded-lg">
            <p className="text-sm">
              Please switch to Base Sepolia network to make payments.
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-3 p-3 status-error rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm">{error}</p>
              <button onClick={clearError} className="p-1 hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
        onClick={() => connect('metamask')}
        disabled={isConnecting}
        className={`btn-primary btn-sm ${className}`}
      >
        <Wallet className="w-4 h-4" />
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-2 h-2 bg-[var(--success)] rounded-full" />
      <span className="text-sm font-mono text-[var(--text-primary)]">
        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
      </span>
      <button
        onClick={() => {
          disconnect();
          if (onWalletDisconnect) onWalletDisconnect();
        }}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-2"
      >
        Disconnect
      </button>
    </div>
  );
}
