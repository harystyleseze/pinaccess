/**
 * Wallet Connection Utilities
 * 
 * This module provides wallet connection management with multi-provider support,
 * network switching, and USDC balance checking for Base Sepolia testnet.
 */

import { 
  connect, 
  disconnect, 
  getAccount, 
  getBalance,
  switchChain,
  readContract,
  watchAccount,
  type Config
} from '@wagmi/core';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { 
  createWalletConfig,
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
  USDC_DECIMALS,
  USDC_ABI,
  WALLET_ERRORS,
  type SupportedWallet
} from './wallet-config';

// Wallet Connection State
export interface WalletConnection {
  address: string;
  chainId: number;
  isConnected: boolean;
  balance?: {
    usdc: string;
    eth: string;
  };
  provider: SupportedWallet;
}

// Connection State Type
type ConnectionState = 'disconnected' | 'connecting' | 'connected';

// Wallet Connection Manager Class
export class WalletManager {
  private config: Config;
  private connectionState: ConnectionState = 'disconnected';

  constructor() {
    // Create wagmi configuration
    this.config = createWalletConfig();
  }

  /**
   * Get the wagmi configuration
   */
  getConfig(): Config {
    return this.config;
  }

  /**
   * Set connection state
   */
  private setConnectionState(state: ConnectionState) {
    this.connectionState = state;
  }

  /**
   * Get connector by wallet type with improved detection
   */
  private getConnector(walletType: SupportedWallet) {
    const connectors = this.config.connectors;
    console.log('Available connectors:', connectors.map(c => ({ name: c.name, id: c.id, type: c.type })));
    
    switch (walletType) {
      case 'metamask':
        // Try multiple matching strategies for MetaMask
        return connectors.find(c => 
          c.name.toLowerCase().includes('metamask') ||
          c.id.toLowerCase().includes('metamask') ||
          c.type === 'metaMask'
        );
      case 'walletconnect':
        return connectors.find(c => 
          c.name.toLowerCase().includes('walletconnect') ||
          c.id.toLowerCase().includes('walletconnect') ||
          c.type === 'walletConnect'
        );
      case 'coinbase':
        return connectors.find(c => 
          c.name.toLowerCase().includes('coinbase') ||
          c.id.toLowerCase().includes('coinbase') ||
          c.type === 'coinbaseWallet'
        );
      case 'injected':
        return connectors.find(c => 
          c.name.toLowerCase().includes('injected') ||
          c.id.toLowerCase().includes('injected') ||
          c.type === 'injected'
        );
      default:
        return null;
    }
  }

  /**
   * Connect to a specific wallet provider with enhanced error handling
   */
  async connectWallet(walletType: SupportedWallet): Promise<WalletConnection> {
    try {
      this.setConnectionState('connecting');
      
      // Get the appropriate connector
      const connector = this.getConnector(walletType);
      if (!connector) {
        // List available connectors for debugging
        const availableConnectors = this.config.connectors.map(c => c.name);
        console.error('Available connectors:', availableConnectors);
        throw new Error(`${walletType} connector not found. Available: ${availableConnectors.join(', ')}`);
      }

      console.log(`Attempting to connect with ${walletType} connector:`, connector.name);

      // Connect using wagmi
      const result = await connect(this.config, { connector });
      
      if (result.accounts && result.accounts.length > 0) {
        this.setConnectionState('connected');
        console.log(`Connected to ${walletType}:`, result.accounts[0]);
        
        // Verify we're on the correct network
        if (result.chainId !== BASE_SEPOLIA_CHAIN_ID) {
          await this.switchToBaseSepolia();
        }

        return await this.getWalletConnection();
      } else {
        throw new Error('No accounts returned from wallet connection');
      }
    } catch (error) {
      this.setConnectionState('disconnected');
      console.error('Wallet connection failed:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          throw new Error('Wallet connection was rejected by user.');
        } else if (error.message.includes('not found')) {
          throw new Error(`${walletType} wallet not found. Please install the ${walletType} extension.`);
        }
      }
      
      throw new Error('Wallet connection failed. Please try again.');
    }
  }

  /**
   * Disconnect the current wallet
   */
  async disconnectWallet(): Promise<void> {
    try {
      await disconnect(this.config);
      this.setConnectionState('disconnected');
    } catch (error) {
      console.error('Wallet disconnection failed:', error);
      throw error;
    }
  }

  /**
   * Get current wallet connection status
   */
  async getWalletConnection(): Promise<WalletConnection> {
    const account = getAccount(this.config);
    
    if (!account.isConnected || !account.address) {
      throw new Error('No wallet connected');
    }

    // Get balances
    const balances = await this.getBalances(account.address);

    return {
      address: account.address,
      chainId: account.chainId || 0,
      isConnected: account.isConnected,
      balance: balances,
      provider: this.getProviderType(account.connector?.id || '')
    };
  }

  /**
   * Switch to Base Sepolia network
   */
  async switchToBaseSepolia(): Promise<void> {
    try {
      await switchChain(this.config, { chainId: BASE_SEPOLIA_CHAIN_ID });
    } catch (error) {
      console.error('Network switch failed:', error);
      throw new Error(WALLET_ERRORS.WRONG_NETWORK);
    }
  }

  /**
   * Check if wallet is on correct network
   */
  isOnCorrectNetwork(chainId: number): boolean {
    return chainId === BASE_SEPOLIA_CHAIN_ID;
  }

  /**
   * Get USDC and ETH balances for an address
   */
  async getBalances(address: Address): Promise<{ usdc: string; eth: string }> {
    try {
      // Get ETH balance
      const ethBalance = await getBalance(this.config, { address });
      const ethFormatted = formatUnits(ethBalance.value, 18);

      // Get USDC balance
      const usdcBalance = await readContract(this.config, {
        address: BASE_SEPOLIA_USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address]
      });
      
      const usdcFormatted = formatUnits(usdcBalance as bigint, USDC_DECIMALS);

      return {
        usdc: usdcFormatted,
        eth: ethFormatted
      };
    } catch (error) {
      console.error('Balance fetch failed:', error);
      return {
        usdc: '0',
        eth: '0'
      };
    }
  }

  /**
   * Check if user has sufficient USDC balance for payment
   */
  async hasSufficientBalance(address: Address, requiredAmount: string): Promise<boolean> {
    try {
      const balances = await this.getBalances(address);
      const currentBalance = parseFloat(balances.usdc); // This is in USDC tokens (e.g., "1.00")
      const requiredSmallestUnits = parseFloat(requiredAmount); // This is in USDC smallest units (e.g., "10000")
      
      // Convert required amount from smallest units to tokens (divide by 10^6)
      const requiredTokens = requiredSmallestUnits / 1000000; // USDC has 6 decimals
      
      return currentBalance >= requiredTokens;
    } catch (error) {
      console.error('Balance check failed:', error);
      return false;
    }
  }

  /**
   * Watch for account changes
   */
  watchWalletChanges(callback: (account: WalletConnection | null) => void): () => void {
    return watchAccount(this.config, {
      onChange: async (account) => {
        if (account.isConnected && account.address) {
          try {
            const connection = await this.getWalletConnection();
            callback(connection);
          } catch (error) {
            console.error('Account change handling failed:', error);
            callback(null);
          }
        } else {
          callback(null);
        }
      }
    });
  }

  /**
   * Get provider type from connector ID
   */
  private getProviderType(connectorId: string): SupportedWallet {
    switch (connectorId) {
      case 'metaMask':
        return 'metamask';
      case 'walletConnect':
        return 'walletconnect';
      case 'coinbaseWallet':
        return 'coinbase';
      case 'injected':
        return 'injected';
      default:
        return 'injected';
    }
  }
}

// Create singleton instance
export const walletManager = new WalletManager();

// Utility functions for easier usage
export const connectWallet = (walletType: SupportedWallet) => 
  walletManager.connectWallet(walletType);

export const disconnectWallet = () => 
  walletManager.disconnectWallet();

export const getWalletConnection = () => 
  walletManager.getWalletConnection();

export const switchToBaseSepolia = () => 
  walletManager.switchToBaseSepolia();

export const checkSufficientBalance = (address: Address, amount: string) => 
  walletManager.hasSufficientBalance(address, amount);

export const watchWalletChanges = (callback: (account: WalletConnection | null) => void) => 
  walletManager.watchWalletChanges(callback);