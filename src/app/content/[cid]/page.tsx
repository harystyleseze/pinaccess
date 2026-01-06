'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';

interface ContentPageState {
  loading: boolean;
  error: string | null;
  contentInfo: {
    name: string;
    size: number;
    mimeType: string;
    price?: {
      usd: number;
      usdc: string;
    };
    creator: string;
    description?: string;
    gatewayUrl: string;
  } | null;
  paymentRequired: boolean;
  paymentInfo: any | null;
  accessGranted: boolean;
  content: any | null;
}

export default function ContentAccessPage() {
  const params = useParams();
  const cid = params.cid as string;
  
  const [state, setState] = useState<ContentPageState>({
    loading: true,
    error: null,
    contentInfo: null,
    paymentRequired: false,
    paymentInfo: null,
    accessGranted: false,
    content: null
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
        await accessFreeContent(contentInfo.gatewayUrl);
        return;
      }

      // For paid content, attempt access to get payment requirements
      await attemptPaidContentAccess(contentInfo.gatewayUrl);

    } catch (error) {
      console.error('Content access error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to access content',
        loading: false
      }));
    }
  };

  const accessFreeContent = async (gatewayUrl: string) => {
    try {
      const response = await fetch(gatewayUrl);
      
      if (response.ok) {
        const content = await response.blob();
        setState(prev => ({
          ...prev,
          accessGranted: true,
          content: URL.createObjectURL(content),
          loading: false
        }));
      } else {
        throw new Error('Failed to access free content');
      }
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
      const response = await fetch(gatewayUrl, {
        method: 'GET',
        // Don't include credentials to get the 402 response
      });
      
      if (response.status === 402) {
        // Payment required - get the actual x402 payment info from Pinata
        const paymentInfo = await response.json();
        console.log('x402 Payment Info:', paymentInfo);
        
        setState(prev => ({
          ...prev,
          paymentRequired: true,
          paymentInfo,
          loading: false
        }));
      } else if (response.ok) {
        // Access granted (user already paid or content is free)
        const content = await response.blob();
        setState(prev => ({
          ...prev,
          accessGranted: true,
          content: URL.createObjectURL(content),
          loading: false
        }));
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Content access error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to check content access. The content may not be properly configured for x402 payments.',
        loading: false
      }));
    }
  };

  const handlePayment = async () => {
    if (!state.paymentInfo || !state.paymentInfo.accepts || !state.paymentInfo.accepts[0]) {
      alert('Payment information not available');
      return;
    }

    const paymentDetails = state.paymentInfo.accepts[0];
    
    // For now, show detailed instructions for manual payment
    // In a full implementation, this would integrate with x402-fetch or x402-axios
    const instructions = `
To access this content, you need to make a payment using the x402 protocol:

1. PAYMENT DETAILS:
   • Amount: ${paymentDetails.maxAmountRequired} USDC (smallest unit)
   • USD Equivalent: $${state.contentInfo?.price?.usd.toFixed(2)}
   • Recipient: ${paymentDetails.payTo}
   • Network: ${paymentDetails.network}
   • Token: ${paymentDetails.asset}

2. PAYMENT OPTIONS:
   
   Option A - Use x402 Libraries (Recommended):
   • Install: npm install x402-fetch viem
   • Use the x402-fetch library to automatically handle payment
   • See documentation: https://www.npmjs.com/package/x402-fetch
   
   Option B - Manual Payment:
   • Send ${paymentDetails.maxAmountRequired} USDC to ${paymentDetails.payTo}
   • On ${paymentDetails.network} network
   • After payment, you'll receive access automatically

3. GATEWAY URL:
   ${paymentDetails.resource}

This content uses Pinata's x402 protocol for secure, decentralized payments.
    `;
    
    alert(instructions);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('text')) return '📝';
    return '📁';
  };

  const renderContent = () => {
    if (!state.content || !state.contentInfo) return null;

    const { mimeType } = state.contentInfo;

    if (mimeType.startsWith('image/')) {
      return (
        <div className="text-center">
          <img 
            src={state.content} 
            alt={state.contentInfo.name}
            className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
          />
        </div>
      );
    }

    if (mimeType === 'application/pdf') {
      return (
        <div className="w-full h-96">
          <iframe 
            src={state.content} 
            className="w-full h-full border rounded-lg"
            title={state.contentInfo.name}
          />
        </div>
      );
    }

    if (mimeType.startsWith('text/')) {
      return (
        <div className="bg-gray-50 p-6 rounded-lg">
          <iframe 
            src={state.content} 
            className="w-full h-64 border-0"
            title={state.contentInfo.name}
          />
        </div>
      );
    }

    // For other file types, show download link
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <div className="text-6xl mb-4">{getFileIcon(mimeType)}</div>
        <p className="text-gray-600 mb-4">Content ready for download</p>
        <a 
          href={state.content}
          download={state.contentInfo.name}
          className="btn-primary px-6 py-3"
        >
          📥 Download {state.contentInfo.name}
        </a>
      </div>
    );
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
                onClick={attemptContentAccess}
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
                  {getFileIcon(state.contentInfo.mimeType)}
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
                      <p><strong>Price:</strong> ${state.contentInfo.price?.usd.toFixed(2)} USDC</p>
                      <p><strong>Amount Required:</strong> {state.paymentInfo.accepts[0].maxAmountRequired} USDC (smallest unit)</p>
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

                <div className="flex gap-4">
                  <button
                    onClick={handlePayment}
                    className="btn-primary px-6 py-3"
                  >
                    💳 Pay ${state.contentInfo.price?.usd.toFixed(2)} USDC
                  </button>
                  <a href="/browse" className="btn-secondary px-6 py-3">
                    ← Browse Other Content
                  </a>
                </div>
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
                  <p>2. Make USDC payment → Receive payment proof</p>
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
        {state.accessGranted && state.contentInfo && (
          <div className="max-w-4xl mx-auto">
            <div className="card p-8">
              {/* Content Header */}
              <div className="flex items-start mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-2xl mr-6">
                  {getFileIcon(state.contentInfo.mimeType)}
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

              {/* Content Display */}
              <div className="mb-8">
                {renderContent()}
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