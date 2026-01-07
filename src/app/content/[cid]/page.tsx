'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import { WalletConnector } from '@/components/ui/WalletConnector';
import { PaymentButton } from '@/components/ui/PaymentButton';
import { ContentViewer } from '@/components/ui/ContentViewer';
import { useWalletConnection } from '@/lib/wallet-context';
import { 
  validatePaymentProof,
  getContentIcon,
  formatFileSize,
  type ContentInfo
} from '@/lib/content-access';
import { BASE_SEPOLIA_USDC_ADDRESS } from '@/lib/wallet-config';
import { formatUsdAmount, formatUsdcWithEquivalent } from '@/lib/pricing';

interface ContentPageState {
  loading: boolean;
  error: string | null;
  contentInfo: ContentInfo | null;
  paymentRequired: boolean;
  paymentInfo: any | null;
  accessGranted: boolean;
  paymentProof: string | null;
}

export default function ContentAccessPage() {
  const params = useParams();
  const cid = params.cid as string;
  const { isConnected, address } = useWalletConnection();
  
  const [state, setState] = useState<ContentPageState>({
    loading: true,
    error: null,
    contentInfo: null,
    paymentRequired: false,
    paymentInfo: null,
    accessGranted: false,
    paymentProof: null
  });

  useEffect(() => {
    if (cid) {
      attemptContentAccess();
    }
  }, [cid]);

  const attemptContentAccess = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // First, get content info from our API
      const infoResponse = await fetch(`/api/content/${cid}/info`);
      const infoResult = await infoResponse.json();

      if (!infoResult.success) {
        throw new Error(infoResult.error || 'Content not found');
      }

      const contentInfo = infoResult.data;
      setState(prev => ({ ...prev, contentInfo }));

      // If content is free, try to access it directly
      if (!contentInfo.price || contentInfo.price.usd === 0) {
        await accessFreeContent();
        return;
      }

      // Check if user has already paid for this content
      if (isConnected && address) {
        const { tryAccessWithStoredPayment } = await import('@/lib/content-access');
        const storedAccessResult = await tryAccessWithStoredPayment(cid, address, contentInfo);
        
        if (storedAccessResult && storedAccessResult.success) {
          console.log('User has already paid for this content, granting access');
          setState(prev => ({
            ...prev,
            accessGranted: true,
            paymentProof: 'stored_payment',
            loading: false
          }));
          return;
        }
      }

      // For paid content, attempt access to get payment requirements
      await attemptPaidContentAccess(contentInfo.gatewayUrl || '');

    } catch (error) {
      console.error('Content access error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to access content',
        loading: false
      }));
    }
  };

  const accessFreeContent = async () => {
    try {
      // For free content, grant access immediately
      setState(prev => ({
        ...prev,
        accessGranted: true,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to access content',
        loading: false
      }));
    }
  };

  const attemptPaidContentAccess = async (gatewayUrl: string) => {
    try {
      // Try to access the content directly from Pinata's x402 gateway
      // This should return a 402 Payment Required response with payment details
      const response = await fetch(gatewayUrl, {
        method: 'GET',
        // Don't include credentials to get the 402 response
      });
      
      if (response.status === 402) {
        // Payment required - get the actual x402 payment info from Pinata
        const paymentInfo = await response.json();
        console.log('x402 Payment Info received:', paymentInfo);
        
        // Validate the x402 response structure
        if (!paymentInfo.accepts || !Array.isArray(paymentInfo.accepts) || paymentInfo.accepts.length === 0) {
          throw new Error('Invalid x402 payment response: missing accepts array');
        }

        const paymentOption = paymentInfo.accepts[0];
        if (!paymentOption.maxAmountRequired || !paymentOption.payTo || !paymentOption.resource) {
          throw new Error('Invalid x402 payment response: missing required payment fields');
        }
        
        setState(prev => ({
          ...prev,
          paymentRequired: true,
          paymentInfo,
          loading: false
        }));
      } else if (response.ok) {
        // Access granted (user already paid or content is free)
        // Set a special payment proof to indicate access is already granted
        console.log('Content access: Already granted, no payment required');
        setState(prev => ({
          ...prev,
          accessGranted: true,
          paymentProof: 'access_already_granted', // Special value to indicate no payment needed
          loading: false
        }));
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Content access error:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to check content access.';
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Unable to connect to content gateway. Please check your internet connection.';
      } else if (error instanceof Error) {
        if (error.message.includes('Invalid x402')) {
          errorMessage = error.message;
        } else if (error.message.includes('HTTP 404')) {
          errorMessage = 'Content not found. The requested content may have been removed or the link is invalid.';
        } else if (error.message.includes('HTTP 403')) {
          errorMessage = 'Access forbidden. You may not have permission to access this content.';
        }
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = async (paymentProof: string, transactionHash?: string, paidAmount?: string) => {
    try {
      console.log('Content page: Payment successful!', {
        cid,
        paymentProofLength: paymentProof.length,
        transactionHash,
        paidAmount
      });

      // Use the gateway URL from the x402 response for validation
      const gatewayUrl = state.paymentInfo?.accepts?.[0]?.resource;
      
      console.log('Content page: Validating payment proof...', {
        gatewayUrl,
        hasPaymentInfo: !!state.paymentInfo
      });
      
      // Validate payment proof
      const validation = await validatePaymentProof(cid, paymentProof, gatewayUrl);
      
      console.log('Content page: Payment proof validation result:', validation);
      
      if (validation.isValid) {
        console.log('Content page: Payment proof valid, granting access...');
        
        setState(prev => {
          const newState = {
            ...prev,
            paymentProof,
            accessGranted: true,
            paymentRequired: false,
            loading: false
          };
          console.log('Content page: Setting new state after payment success:', {
            paymentProof: newState.paymentProof,
            paymentProofLength: newState.paymentProof?.length,
            accessGranted: newState.accessGranted,
            paymentRequired: newState.paymentRequired,
            loading: newState.loading
          });
          return newState;
        });

        // Store payment record for future access
        if (address && paidAmount) {
          console.log('Content page: Storing payment record...');
          const { contentAccessClient } = await import('@/lib/content-access');
          contentAccessClient.storePaymentRecord({
            cid,
            paymentProof,
            transactionHash,
            paidAt: new Date().toISOString(),
            walletAddress: address,
            amount: paidAmount
          });
        }
      } else {
        throw new Error(validation.error || 'Payment proof validation failed');
      }
    } catch (error) {
      console.error('Content page: Payment proof validation failed:', error);
      setState(prev => ({
        ...prev,
        error: 'Payment completed but access validation failed. Please try again.',
        loading: false
      }));
    }
  };

  // Handle payment error
  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setState(prev => ({
      ...prev,
      error: `Payment failed: ${error}`,
      loading: false
    }));
  };

  // Handle content access error
  const handleContentAccessError = (error: string) => {
    console.error('Content access error:', error);
    setState(prev => ({
      ...prev,
      error: `Content access failed: ${error}`,
      accessGranted: false
    }));
  };

  // Retry the entire content access flow
  const retryContentAccess = () => {
    setState(prev => ({
      ...prev,
      error: null,
      loading: true
    }));
    attemptContentAccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      <div className="content-max-width section-padding py-12">
        {/* Loading State */}
        {state.loading && (
          <div className="max-w-4xl mx-auto">
            <div className="card p-8 animate-pulse">
              <div className="loading-shimmer w-16 h-16 rounded-lg mb-6"></div>
              <div className="loading-shimmer w-3/4 h-8 rounded mb-4"></div>
              <div className="loading-shimmer w-1/2 h-6 rounded mb-6"></div>
              <div className="loading-shimmer w-full h-64 rounded"></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {state.error && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="status-error rounded-2xl p-8">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Content Access Failed</h3>
              <p className="text-red-700 mb-4">{state.error}</p>
              <button
                onClick={retryContentAccess}
                className="btn-error px-6 py-2 mr-4"
              >
                🔄 Try Again
              </button>
              <a href="/browse" className="btn-secondary px-6 py-2">
                ← Browse Content
              </a>
            </div>
          </div>
        )}

        {/* Content Info & Payment Required */}
        {state.contentInfo && state.paymentRequired && (
          <div className="max-w-4xl mx-auto">
            <div className="card p-8">
              {/* Content Header */}
              <div className="flex items-start mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-2xl mr-6">
                  {getContentIcon(state.contentInfo.mimeType)}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {state.contentInfo.name}
                  </h1>
                  <div className="flex items-center text-gray-600 mb-4">
                    <span>By {state.contentInfo.creator}</span>
                    <span className="mx-2">•</span>
                    <span>{formatFileSize(state.contentInfo.size)}</span>
                  </div>
                  {state.contentInfo.description && (
                    <p className="text-gray-700">{state.contentInfo.description}</p>
                  )}
                </div>
              </div>

              {/* Payment Required Section */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 mb-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xl mr-4">
                    💳
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-yellow-800">Payment Required</h3>
                    <p className="text-yellow-700">This content requires payment to access</p>
                  </div>
                </div>

                {state.paymentInfo && state.paymentInfo.accepts && state.paymentInfo.accepts[0] && (
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Payment Details (x402 Protocol):</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p><strong>Price:</strong> {formatUsdAmount(state.contentInfo.price?.usd || 0)}</p>
                      <p><strong>Amount Required:</strong> {formatUsdcWithEquivalent(state.paymentInfo.accepts[0].maxAmountRequired)}</p>
                      <p><strong>Network:</strong> {state.paymentInfo.accepts[0].network}</p>
                      <p><strong>Pay To:</strong> {state.paymentInfo.accepts[0].payTo}</p>
                      <p><strong>Token Contract:</strong> {state.paymentInfo.accepts[0].asset}</p>
                    </div>
                    
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>Gateway URL:</strong> {state.paymentInfo.accepts[0].resource}
                      </p>
                    </div>
                  </div>
                )}

                {/* Wallet Connection Section */}
                <div className="mb-6">
                  <h4 className="font-semibold text-yellow-800 mb-3">Connect Your Wallet to Pay</h4>
                  <WalletConnector 
                    className="max-w-md"
                    onWalletConnect={(address, chainId) => {
                      console.log('Wallet connected:', address, chainId);
                    }}
                  />
                  {!isConnected && (
                    <p className="text-sm text-yellow-700 mt-2">
                      Connect your wallet to make payments using USDC tokens on Base Sepolia testnet.
                    </p>
                  )}
                </div>

                {/* Payment Button */}
                {state.paymentInfo && state.paymentInfo.accepts && state.paymentInfo.accepts[0] && (
                  <div className="flex gap-4">
                    <PaymentButton
                      paymentInfo={{
                        amount: state.paymentInfo.accepts[0].maxAmountRequired,
                        recipient: state.paymentInfo.accepts[0].payTo,
                        network: 'base-sepolia',
                        asset: BASE_SEPOLIA_USDC_ADDRESS,
                        gatewayUrl: state.paymentInfo.accepts[0].resource,
                        description: `Payment for ${state.contentInfo.name}`
                      }}
                      walletAddress={address}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                      disabled={!isConnected}
                    />
                    <a href="/browse" className="btn-secondary px-6 py-3">
                      ← Browse Other Content
                    </a>
                  </div>
                )}
              </div>

              {/* x402 Protocol Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-semibold text-blue-900 mb-2">🔒 x402 Payment Protocol</h4>
                <p className="text-blue-800 text-sm mb-3">
                  This content uses the x402 payment protocol for secure, decentralized payments. 
                  Your payment is processed directly on the blockchain without intermediaries.
                </p>
                
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>How it works:</strong></p>
                  <p>1. Request content → Get payment requirements (402 response)</p>
                  <p>2. Make USDC token payment → Receive payment proof</p>
                  <p>3. Access content → Using payment proof header</p>
                </div>
                
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-blue-600">
                    <strong>For Developers:</strong> Use x402-fetch or x402-axios libraries for automatic payment handling.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Access Granted */}
        {state.accessGranted && state.contentInfo && (() => {
          console.log('Content page: Rendering access granted section with state:', {
            accessGranted: state.accessGranted,
            hasPaymentProof: !!state.paymentProof,
            paymentProofValue: state.paymentProof,
            contentInfoName: state.contentInfo?.name
          });
          return true;
        })() && (
          <div className="max-w-4xl mx-auto">
            <div className="card p-8">
              {/* Content Header */}
              <div className="flex items-start mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-2xl mr-6">
                  {getContentIcon(state.contentInfo.mimeType)}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {state.contentInfo.name}
                  </h1>
                  <div className="flex items-center text-gray-600 mb-4">
                    <span>By {state.contentInfo.creator}</span>
                    <span className="mx-2">•</span>
                    <span>{formatFileSize(state.contentInfo.size)}</span>
                  </div>
                  {state.contentInfo.description && (
                    <p className="text-gray-700">{state.contentInfo.description}</p>
                  )}
                </div>
              </div>

              {/* Success Message */}
              <div className="status-success rounded-xl p-4 mb-8">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-800 font-semibold">
                    Access Granted! Enjoy your content.
                  </span>
                </div>
              </div>

              {/* Content Display using ContentViewer */}
              <div className="mb-8">
                {(() => {
                  console.log('Content page: Rendering ContentViewer with props:', {
                    cid,
                    hasPaymentProof: !!(state.paymentProof),
                    paymentProofValue: state.paymentProof,
                    paymentProofLength: state.paymentProof?.length,
                    autoAccessAfterPayment: !!state.paymentProof,
                    contentInfoName: state.contentInfo?.name
                  });
                  return null;
                })()}
                <ContentViewer
                  cid={cid}
                  paymentProof={state.paymentProof || undefined}
                  contentInfo={state.contentInfo}
                  onAccessError={handleContentAccessError}
                  autoAccessAfterPayment={!!state.paymentProof}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 justify-center">
                <a href="/browse" className="btn-secondary px-6 py-3">
                  ← Browse More Content
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}