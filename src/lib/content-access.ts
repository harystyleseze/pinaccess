/**
 * Content Access Client
 * 
 * Handles content access using payment proofs with X-Payment header handling
 * for Pinata's x402 gateway requests. Provides automatic content access after
 * successful payment and content display for different file types.
 */

import { accessContentWithProof } from './x402-client';
import { getX402GatewayUrl } from './gateway-config';
import { getGatewayUrlWithFallback } from './gateway-config';

// Content access result
export interface ContentAccessResult {
  success: boolean;
  contentUrl?: string; // Blob URL for accessed content
  contentType?: string;
  contentSize?: number;
  error?: string;
  accessedAt: string;
}

// Content information
export interface ContentInfo {
  cid: string;
  name: string;
  mimeType: string;
  size: number;
  description?: string;
  creator?: string;
  price?: {
    usd: number;
    usdc: string;
  };
  gatewayUrl?: string;
}

// Payment proof validation result
export interface PaymentProofValidation {
  isValid: boolean;
  isExpired: boolean;
  error?: string;
}

// Payment record for tracking user payments
interface PaymentRecord {
  cid: string;
  paymentProof: string;
  transactionHash?: string;
  paidAt: string;
  walletAddress: string;
  amount: string;
}

/**
 * Content Access Client for x402 payment proof handling
 */
export class ContentAccessClient {
  private accessCache = new Map<string, ContentAccessResult>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly PAYMENT_STORAGE_KEY = 'pinaccess_payments';

  /**
   * Check if user has already paid for content
   */
  hasUserPaid(cid: string, walletAddress: string): PaymentRecord | null {
    try {
      const payments = this.getStoredPayments();
      return payments.find(p => p.cid === cid && p.walletAddress.toLowerCase() === walletAddress.toLowerCase()) || null;
    } catch (error) {
      console.error('Error checking payment history:', error);
      return null;
    }
  }

  /**
   * Store payment record for future access
   */
  storePaymentRecord(record: PaymentRecord): void {
    try {
      const payments = this.getStoredPayments();
      
      // Remove any existing payment for this CID and wallet
      const filteredPayments = payments.filter(
        p => !(p.cid === record.cid && p.walletAddress.toLowerCase() === record.walletAddress.toLowerCase())
      );
      
      // Add new payment record
      filteredPayments.push(record);
      
      // Keep only last 100 payments to avoid storage bloat
      const recentPayments = filteredPayments.slice(-100);
      
      localStorage.setItem(this.PAYMENT_STORAGE_KEY, JSON.stringify(recentPayments));
    } catch (error) {
      console.error('Error storing payment record:', error);
    }
  }

  /**
   * Get stored payment records
   */
  private getStoredPayments(): PaymentRecord[] {
    try {
      const stored = localStorage.getItem(this.PAYMENT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading payment records:', error);
      return [];
    }
  }

  /**
   * Access content using payment proof with X-Payment header
   */
  async accessContent(
    cid: string,
    paymentProof: string,
    contentInfo?: ContentInfo,
    walletAddress?: string
  ): Promise<ContentAccessResult> {
    try {
      // Check cache first
      const cacheKey = `${cid}-${paymentProof}`;
      const cached = this.getCachedAccess(cacheKey);
      if (cached) {
        return cached;
      }

      // Use the gateway URL from contentInfo if available, otherwise use the configured gateway
      // Note: contentInfo.gatewayUrl should always be provided by the server-side API
      const gatewayUrl = contentInfo?.gatewayUrl || `${getGatewayUrlWithFallback()}/x402/cid/${cid}`;
      
      if (!contentInfo?.gatewayUrl) {
        console.warn('Gateway URL not provided in contentInfo, using fallback. This may cause issues.');
      }

      // Access content with payment proof
      const response = await accessContentWithProof(gatewayUrl, paymentProof);

      // Create blob URL for content
      const blob = await response.blob();
      const contentUrl = URL.createObjectURL(blob);

      // Extract content information from response
      const contentType = response.headers.get('content-type') || contentInfo?.mimeType || 'application/octet-stream';
      const contentLength = response.headers.get('content-length');
      const contentSize = contentLength ? parseInt(contentLength, 10) : blob.size;

      const result: ContentAccessResult = {
        success: true,
        contentUrl,
        contentType,
        contentSize,
        accessedAt: new Date().toISOString()
      };

      // Cache the result
      this.setCachedAccess(cacheKey, result);

      return result;

    } catch (error: any) {
      console.error('Content access failed:', error);
      
      // Log additional details for debugging
      if (error.message) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      return {
        success: false,
        error: this.getErrorMessage(error),
        accessedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Access content automatically after successful payment
   */
  async accessContentAfterPayment(
    cid: string,
    paymentProof: string,
    contentInfo: ContentInfo,
    walletAddress?: string,
    transactionHash?: string,
    paidAmount?: string
  ): Promise<ContentAccessResult> {
    // Store payment record for future access
    if (walletAddress && paidAmount) {
      this.storePaymentRecord({
        cid,
        paymentProof,
        transactionHash,
        paidAt: new Date().toISOString(),
        walletAddress,
        amount: paidAmount
      });
    }

    // Add a small delay to ensure payment is fully processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    return this.accessContent(cid, paymentProof, contentInfo, walletAddress);
  }

  /**
   * Try to access content using stored payment proof
   */
  async tryAccessWithStoredPayment(
    cid: string,
    walletAddress: string,
    contentInfo?: ContentInfo
  ): Promise<ContentAccessResult | null> {
    const paymentRecord = this.hasUserPaid(cid, walletAddress);
    
    if (!paymentRecord) {
      return null;
    }

    try {
      return await this.accessContent(cid, paymentRecord.paymentProof, contentInfo, walletAddress);
    } catch (error) {
      console.error('Stored payment proof failed:', error);
      return null;
    }
  }

  /**
   * Validate payment proof without accessing content
   */
  async validatePaymentProof(
    cid: string,
    paymentProof: string,
    gatewayUrl?: string
  ): Promise<PaymentProofValidation> {
    try {
      // Use provided gateway URL or construct default
      const url = gatewayUrl || `${getGatewayUrlWithFallback()}/x402/cid/${cid}`;
      
      if (!gatewayUrl) {
        console.warn('Gateway URL not provided, using fallback. This may cause issues.');
      }
      
      // Make a HEAD request to validate without downloading content
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'X-Payment': paymentProof,
          'Accept': '*/*',
          'User-Agent': 'PinAccess/1.0'
        }
      });

      if (response.ok) {
        return {
          isValid: true,
          isExpired: false
        };
      }

      if (response.status === 402) {
        // Payment required - proof is invalid or expired
        return {
          isValid: false,
          isExpired: true,
          error: 'Payment proof is invalid or expired'
        };
      }

      return {
        isValid: false,
        isExpired: false,
        error: `Validation failed: ${response.statusText}`
      };

    } catch (error: any) {
      console.error('Payment proof validation error:', error);
      return {
        isValid: false,
        isExpired: false,
        error: error.message || 'Validation failed'
      };
    }
  }

  /**
   * Check if content can be displayed inline
   */
  canDisplayInline(mimeType: string): boolean {
    const inlineTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'text/plain',
      'text/html',
      'text/markdown',
      'text/csv'
    ];
    
    return inlineTypes.some(type => mimeType.includes(type));
  }

  /**
   * Get content type category for display purposes
   */
  getContentCategory(mimeType: string): 'image' | 'pdf' | 'text' | 'video' | 'audio' | 'document' | 'other' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('text/')) return 'text';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) return 'document';
    return 'other';
  }

  /**
   * Get appropriate icon for content type
   */
  getContentIcon(mimeType: string): string {
    const category = this.getContentCategory(mimeType);
    
    switch (category) {
      case 'image': return '🖼️';
      case 'pdf': return '📄';
      case 'text': return '📝';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'document': return '📊';
      default: return '📁';
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clean up blob URLs to prevent memory leaks
   */
  cleanupContentUrl(contentUrl: string): void {
    if (contentUrl && contentUrl.startsWith('blob:')) {
      URL.revokeObjectURL(contentUrl);
    }
  }

  /**
   * Clear access cache
   */
  clearCache(): void {
    // Clean up blob URLs before clearing cache
    this.accessCache.forEach(result => {
      if (result.contentUrl) {
        this.cleanupContentUrl(result.contentUrl);
      }
    });
    
    this.accessCache.clear();
  }

  /**
   * Get cached access result if still valid
   */
  private getCachedAccess(cacheKey: string): ContentAccessResult | null {
    const cached = this.accessCache.get(cacheKey);
    if (!cached) return null;

    // Check if cache is still valid
    const cacheAge = Date.now() - new Date(cached.accessedAt).getTime();
    if (cacheAge > this.CACHE_DURATION) {
      // Clean up expired cache entry
      if (cached.contentUrl) {
        this.cleanupContentUrl(cached.contentUrl);
      }
      this.accessCache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Set cached access result
   */
  private setCachedAccess(cacheKey: string, result: ContentAccessResult): void {
    this.accessCache.set(cacheKey, result);
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (error.message) {
      if (error.message.includes('Payment proof is invalid')) {
        return 'Payment proof is invalid or expired. Please make a new payment.';
      }
      if (error.message.includes('402')) {
        return 'Payment required to access this content.';
      }
      if (error.message.includes('404')) {
        return 'Content not found or not properly configured.';
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Network error. Please check your connection and try again.';
      }
    }
    
    return 'Failed to access content. Please try again.';
  }
}

// Create singleton instance
export const contentAccessClient = new ContentAccessClient();

// Utility functions for easier usage
export const accessContent = (cid: string, paymentProof: string, contentInfo?: ContentInfo, walletAddress?: string) =>
  contentAccessClient.accessContent(cid, paymentProof, contentInfo, walletAddress);

export const accessContentAfterPayment = (cid: string, paymentProof: string, contentInfo: ContentInfo, walletAddress?: string, transactionHash?: string, paidAmount?: string) =>
  contentAccessClient.accessContentAfterPayment(cid, paymentProof, contentInfo, walletAddress, transactionHash, paidAmount);

export const tryAccessWithStoredPayment = (cid: string, walletAddress: string, contentInfo?: ContentInfo) =>
  contentAccessClient.tryAccessWithStoredPayment(cid, walletAddress, contentInfo);

export const hasUserPaid = (cid: string, walletAddress: string) =>
  contentAccessClient.hasUserPaid(cid, walletAddress);

export const validatePaymentProof = (cid: string, paymentProof: string, gatewayUrl?: string) =>
  contentAccessClient.validatePaymentProof(cid, paymentProof, gatewayUrl);

export const canDisplayInline = (mimeType: string) =>
  contentAccessClient.canDisplayInline(mimeType);

export const getContentCategory = (mimeType: string) =>
  contentAccessClient.getContentCategory(mimeType);

export const getContentIcon = (mimeType: string) =>
  contentAccessClient.getContentIcon(mimeType);

export const formatFileSize = (bytes: number) =>
  contentAccessClient.formatFileSize(bytes);

export const cleanupContentUrl = (contentUrl: string) =>
  contentAccessClient.cleanupContentUrl(contentUrl);

export const clearContentCache = () =>
  contentAccessClient.clearCache();