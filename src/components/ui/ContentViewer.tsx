/**
 * ContentViewer Component
 *
 * Displays content after successful payment using payment proof.
 * Handles different content types and provides download functionality.
 */

'use client';

import { useState, useEffect } from 'react';
import { Download, Lock, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import {
  accessContent,
  accessContentAfterPayment,
  canDisplayInline,
  getContentIcon,
  formatFileSize,
  cleanupContentUrl,
  type ContentAccessResult,
  type ContentInfo
} from '@/lib/content-access';
import { getGatewayUrlWithFallback } from '@/lib/gateway-config';

interface ContentViewerProps {
  cid: string;
  paymentProof?: string;
  contentInfo: ContentInfo;
  onAccessError: (error: string) => void;
  className?: string;
  autoAccessAfterPayment?: boolean; // Automatically access content after payment
}

export function ContentViewer({
  cid,
  paymentProof,
  contentInfo,
  onAccessError,
  className = '',
  autoAccessAfterPayment = false
}: ContentViewerProps) {
  const [accessResult, setAccessResult] = useState<ContentAccessResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Access content when payment proof is available OR when content is free
  useEffect(() => {
    console.log('ContentViewer: useEffect triggered', {
      cid,
      hasPaymentProof: !!paymentProof,
      paymentProofValue: paymentProof,
      contentInfo: contentInfo?.name,
      autoAccessAfterPayment
    });

    if (cid && contentInfo) {
      // Check if content is free (no payment required)
      const isFreeContent = !contentInfo.price || contentInfo.price.usd === 0;

      if (paymentProof) {
        console.log('ContentViewer: Payment proof available, accessing content...', {
          cid,
          hasPaymentProof: !!paymentProof,
          autoAccessAfterPayment,
          paymentProofPreview: paymentProof.substring(0, 50) + '...'
        });

        if (autoAccessAfterPayment) {
          accessContentAfterPaymentFlow();
        } else {
          accessContentFlow();
        }
      } else if (isFreeContent) {
        console.log('ContentViewer: Free content detected, accessing directly...', {
          cid,
          contentName: contentInfo.name,
          price: contentInfo.price
        });

        // For free content, we can access it directly without payment proof
        accessFreeContentFlow();
      } else {
        console.log('ContentViewer: No payment proof and content requires payment', {
          cid,
          hasPaymentProof: !!paymentProof,
          price: contentInfo.price
        });
      }
    }
  }, [paymentProof, cid, autoAccessAfterPayment, contentInfo]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (accessResult?.contentUrl) {
        cleanupContentUrl(accessResult.contentUrl);
      }
    };
  }, [accessResult?.contentUrl]);

  const accessContentFlow = async () => {
    if (!paymentProof) {
      console.error('ContentViewer: Payment proof is required to access content');
      setError('Payment proof is required to access content');
      return;
    }

    console.log('ContentViewer: Starting content access flow...', {
      cid,
      paymentProofLength: paymentProof.length,
      contentInfo: contentInfo?.name,
      isSpecialAccess: paymentProof === 'access_already_granted' || paymentProof === 'stored_payment'
    });

    setIsLoading(true);
    setError(null);

    try {
      // Handle special cases where access is already granted
      if (paymentProof === 'access_already_granted' || paymentProof === 'stored_payment') {
        console.log('ContentViewer: Access already granted, accessing content directly...');

        // Access content directly without payment proof
        const gatewayUrl = contentInfo?.gatewayUrl || `${getGatewayUrlWithFallback()}/x402/cid/${cid}`;
        const response = await fetch(gatewayUrl);

        if (response.ok) {
          const blob = await response.blob();
          const contentUrl = URL.createObjectURL(blob);
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

          setAccessResult(result);
          console.log('ContentViewer: Direct content access successful!');
          return;
        } else {
          throw new Error(`Failed to access content: ${response.status} ${response.statusText}`);
        }
      }

      // Normal payment proof flow
      const result = await accessContent(cid, paymentProof, contentInfo);

      console.log('ContentViewer: Content access result:', {
        success: result.success,
        hasContentUrl: !!result.contentUrl,
        contentType: result.contentType,
        error: result.error
      });

      if (result.success) {
        setAccessResult(result);
        console.log('ContentViewer: Content access successful!');
      } else {
        const errorMessage = result.error || 'Failed to access content';
        console.error('ContentViewer: Content access failed:', errorMessage);
        setError(errorMessage);
        onAccessError(errorMessage);
      }

    } catch (err: any) {
      console.error('ContentViewer: Content access exception:', err);
      const errorMessage = err.message || 'Failed to access content';
      setError(errorMessage);
      onAccessError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const accessFreeContentFlow = async () => {
    console.log('ContentViewer: Starting free content access flow...', {
      cid,
      contentInfo: contentInfo?.name
    });

    setIsLoading(true);
    setError(null);

    try {
      // For free content, we can access it directly from the regular gateway
      const directUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

      console.log('ContentViewer: Accessing free content directly:', directUrl);

      const response = await fetch(directUrl);

      if (!response.ok) {
        throw new Error(`Failed to access free content: ${response.status} ${response.statusText}`);
      }

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

      console.log('ContentViewer: Free content access successful!', {
        contentType,
        contentSize,
        hasContentUrl: !!result.contentUrl
      });

      setAccessResult(result);

    } catch (err: any) {
      console.error('ContentViewer: Free content access exception:', err);
      const errorMessage = err.message || 'Failed to access free content';
      setError(errorMessage);
      onAccessError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const accessContentAfterPaymentFlow = async () => {
    if (!paymentProof) {
      console.error('ContentViewer: Payment proof is required to access content');
      setError('Payment proof is required to access content');
      return;
    }

    console.log('ContentViewer: Starting content access after payment flow...', {
      cid,
      paymentProofLength: paymentProof.length,
      contentInfo: contentInfo?.name,
      isSpecialAccess: paymentProof === 'access_already_granted' || paymentProof === 'stored_payment'
    });

    setIsLoading(true);
    setError(null);

    try {
      // Handle special cases where access is already granted
      if (paymentProof === 'access_already_granted' || paymentProof === 'stored_payment') {
        console.log('ContentViewer: Access already granted, accessing content directly...');

        // Access content directly without payment proof
        const gatewayUrl = contentInfo?.gatewayUrl || `${getGatewayUrlWithFallback()}/x402/cid/${cid}`;
        const response = await fetch(gatewayUrl);

        if (response.ok) {
          const blob = await response.blob();
          const contentUrl = URL.createObjectURL(blob);
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

          setAccessResult(result);
          console.log('ContentViewer: Direct content access after payment successful!');
          return;
        } else {
          throw new Error(`Failed to access content: ${response.status} ${response.statusText}`);
        }
      }

      // Normal payment proof flow
      const result = await accessContentAfterPayment(cid, paymentProof, contentInfo);

      console.log('ContentViewer: Content access after payment result:', {
        success: result.success,
        hasContentUrl: !!result.contentUrl,
        contentType: result.contentType,
        error: result.error
      });

      if (result.success) {
        setAccessResult(result);
        console.log('ContentViewer: Content access after payment successful!');
      } else {
        const errorMessage = result.error || 'Failed to access content';
        console.error('ContentViewer: Content access after payment failed:', errorMessage);
        setError(errorMessage);
        onAccessError(errorMessage);
      }

    } catch (err: any) {
      console.error('ContentViewer: Content access after payment exception:', err);
      const errorMessage = err.message || 'Failed to access content';
      setError(errorMessage);
      onAccessError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (!accessResult?.contentUrl) return;

    const link = document.createElement('a');
    link.href = accessResult.contentUrl;
    link.download = contentInfo.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle retry
  const handleRetry = () => {
    if (autoAccessAfterPayment) {
      accessContentAfterPaymentFlow();
    } else {
      accessContentFlow();
    }
  };

  console.log('ContentViewer: Rendering with state:', {
    hasPaymentProof: !!paymentProof,
    paymentProofValue: paymentProof,
    isLoading,
    error,
    hasAccessResult: !!accessResult,
    hasContentUrl: !!accessResult?.contentUrl
  });

  if (!paymentProof) {
    console.log('ContentViewer: No payment proof or CID available', {
      cid,
      hasPaymentProof: !!paymentProof,
      autoAccessAfterPayment
    });
    return (
      <div className={`content-viewer-placeholder ${className}`}>
        <div className="text-center p-8 bg-[var(--surface-elevated)] rounded-lg border-2 border-dashed border-[var(--border)]">
          <Lock className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Payment Required
          </h3>
          <p className="text-[var(--text-secondary)]">
            Complete payment to access this content
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`content-viewer-loading ${className}`}>
        <div className="text-center p-8 bg-[var(--info-light)] rounded-lg">
          <div className="w-12 h-12 border-2 border-[var(--brand-teal)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Loading Content
          </h3>
          <p className="text-[var(--text-secondary)]">
            Accessing your purchased content...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`content-viewer-error ${className}`}>
        <div className="text-center p-8 status-error rounded-lg">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Access Failed
          </h3>
          <p className="mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="btn-primary"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!accessResult?.contentUrl) {
    return (
      <div className={`content-viewer-empty ${className}`}>
        <div className="text-center p-8 bg-[var(--surface-elevated)] rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No Content Available
          </h3>
          <p className="text-[var(--text-secondary)]">
            Unable to load content at this time
          </p>
        </div>
      </div>
    );
  }

  console.log('ContentViewer: Rendering content successfully!', {
    contentUrl: !!accessResult.contentUrl,
    contentType: accessResult.contentType,
    contentSize: accessResult.contentSize
  });

  return (
    <div className={`content-viewer ${className}`}>
      {/* Content Header */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-[var(--brand-teal)]" />
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">{contentInfo.name}</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {accessResult.contentType || contentInfo.mimeType} • {formatFileSize(accessResult.contentSize || contentInfo.size)}
              </p>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="btn-primary"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* Content Display */}
      <div className="card overflow-hidden">
        {canDisplayInline(contentInfo.mimeType) ? (
          <ContentDisplay
            contentUrl={accessResult.contentUrl}
            mimeType={accessResult.contentType || contentInfo.mimeType}
            name={contentInfo.name}
          />
        ) : (
          <div className="text-center p-8">
            <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              {contentInfo.name}
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              This file type cannot be previewed. Click download to access the content.
            </p>
            <button
              onClick={handleDownload}
              className="btn-primary"
            >
              <Download className="w-4 h-4" />
              Download File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Content Display Component
 * Handles inline display of different content types
 */
interface ContentDisplayProps {
  contentUrl: string;
  mimeType: string;
  name: string;
}

function ContentDisplay({ contentUrl, mimeType, name }: ContentDisplayProps) {
  if (mimeType === 'application/pdf') {
    return (
      <iframe
        src={contentUrl}
        title={name}
        className="w-full h-96 border-0"
        style={{ minHeight: '600px' }}
      />
    );
  }

  if (mimeType.startsWith('image/')) {
    return (
      <div className="p-4">
        <img
          src={contentUrl}
          alt={name}
          className="max-w-full h-auto mx-auto rounded-lg shadow-sm"
        />
      </div>
    );
  }

  if (mimeType.startsWith('text/')) {
    return (
      <div className="p-4">
        <iframe
          src={contentUrl}
          title={name}
          className="w-full h-96 border border-[var(--border)] rounded"
        />
      </div>
    );
  }

  if (mimeType.startsWith('video/')) {
    return (
      <div className="p-4">
        <video
          src={contentUrl}
          controls
          className="w-full max-w-2xl mx-auto rounded-lg"
        >
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  if (mimeType.startsWith('audio/')) {
    return (
      <div className="p-8 text-center">
        <audio
          src={contentUrl}
          controls
          className="mx-auto"
        >
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  // Fallback for unsupported types
  return (
    <div className="text-center p-8">
      <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
      <p className="text-[var(--text-secondary)]">
        Preview not available for this file type.
      </p>
    </div>
  );
}

/**
 * Compact Content Viewer for smaller spaces
 */
interface ContentViewerCompactProps extends Omit<ContentViewerProps, 'className'> {
  showPreview?: boolean;
}

export function ContentViewerCompact({
  showPreview = false,
  ...props
}: ContentViewerCompactProps) {
  if (!showPreview) {
    return (
      <div className="flex items-center justify-between p-4 card">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-[var(--brand-teal)]" />
          <div>
            <p className="font-medium text-[var(--text-primary)]">{props.contentInfo.name}</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {props.contentInfo.mimeType}
            </p>
          </div>
        </div>

        {props.paymentProof && (
          <button
            onClick={() => {
              // Handle download logic here - would need access to ContentViewer's download function
            }}
            className="btn-primary btn-sm"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        )}
      </div>
    );
  }

  return <ContentViewer {...props} className="max-w-md" />;
}
