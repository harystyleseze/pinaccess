import { NextRequest, NextResponse } from 'next/server';
import { pinataClient } from '@/lib/pinata';
import { validateSafeString } from '@/lib/validation';
import { rateLimiters, validateContentSecurity, getClientIP } from '@/lib/security';
import { DocumentListResponse } from '@/lib/types';
import { getX402GatewayUrl } from '@/lib/gateway-config';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResult = rateLimiters.general(request);
    if (!rateLimitResult.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitResult.error || 'Too many document requests. Please try again later.'
      } as DocumentListResponse, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      });
    }

    const { searchParams } = new URL(request.url);
    
    // Extract and validate query parameters
    const creator = searchParams.get('creator') || undefined;
    const status = searchParams.get('status') as 'uploaded' | 'monetized' | 'error' | undefined;
    const pageToken = searchParams.get('pageToken') || undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined;
    
    // Validate creator parameter if provided
    if (creator) {
      const creatorSecurityValidation = validateContentSecurity(creator, 100);
      if (!creatorSecurityValidation.isSecure) {
        return NextResponse.json({
          success: false,
          error: `Invalid creator parameter: ${creatorSecurityValidation.violations.join(', ')}`
        } as DocumentListResponse, { status: 400 });
      }

      const creatorValidation = validateSafeString(creator, 100);
      if (!creatorValidation.isValid) {
        return NextResponse.json({
          success: false,
          error: `Invalid creator parameter: ${creatorValidation.error}`
        } as DocumentListResponse, { status: 400 });
      }
    }
    
    // Validate status parameter if provided
    if (status && !['uploaded', 'monetized', 'error'].includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid status parameter. Must be one of: uploaded, monetized, error'
      } as DocumentListResponse, { status: 400 });
    }
    
    // Validate pageToken parameter if provided
    if (pageToken) {
      const pageTokenSecurityValidation = validateContentSecurity(pageToken, 20);
      if (!pageTokenSecurityValidation.isSecure) {
        return NextResponse.json({
          success: false,
          error: `Invalid pageToken parameter: ${pageTokenSecurityValidation.violations.join(', ')}`
        } as DocumentListResponse, { status: 400 });
      }

      // Validate pageToken format (should be numeric for offset-based pagination)
      if (!pageToken.match(/^\d+$/)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid pageToken format. Must be a numeric offset value.'
        } as DocumentListResponse, { status: 400 });
      }
    }
    
    // Validate pageSize parameter if provided
    if (pageSize !== undefined) {
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        return NextResponse.json({
          success: false,
          error: 'Invalid pageSize parameter. Must be a number between 1 and 100'
        } as DocumentListResponse, { status: 400 });
      }
    }
    
    // Build filters object with sanitized inputs
    // Don't pass 'monetized' status to Pinata - monetization is determined dynamically
    // from payment instruction attachments, not from stored metadata
    const pinataFilters = {
      ...(creator && { creator: creator.trim() }),
      ...(status && status !== 'monetized' && { status }),
      ...(pageToken && { pageToken: pageToken.trim() }),
      // Fetch more if filtering by monetized to ensure we get enough results
      ...(pageSize && { pageSize: status === 'monetized' ? 100 : pageSize })
    };

    // Call Pinata client to list documents
    const result = await pinataClient.instance.listDocuments(pinataFilters);

    if (!result.success) {
      // Enhanced error logging
      console.error('Document listing failed:', {
        error: result.error,
        filters: pinataFilters,
        ip: getClientIP(request)
      });

      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to retrieve documents'
      } as DocumentListResponse, { status: 500 });
    }

    // Fetch payment instructions to determine which documents are monetized
    const paymentInstructionsResult = await pinataClient.instance.listPaymentInstructions({
      pageSize: 100
    });

    // Build a map of CID -> payment info for monetized documents
    const monetizedCIDMap = new Map<string, { price: { usd: number; usdc: string }; gatewayUrl: string }>();

    if (paymentInstructionsResult.success && paymentInstructionsResult.data?.paymentInstructions) {
      for (const pi of paymentInstructionsResult.data.paymentInstructions) {
        try {
          const attachedResult = await pinataClient.instance.getAttachedCids(pi.id);
          if (attachedResult.success && attachedResult.data?.cids) {
            const paymentReq = pi.paymentRequirements[0];
            const maxAmount = paymentReq?.max_amount_required || '0';
            const usdAmount = parseFloat(maxAmount) / 1000000; // Convert from USDC smallest unit

            for (const attached of attachedResult.data.cids) {
              monetizedCIDMap.set(attached.cid, {
                price: {
                  usd: usdAmount,
                  usdc: maxAmount
                },
                gatewayUrl: getX402GatewayUrl(attached.cid)
              });
            }
          }
        } catch (e) {
          // Silently handle errors
        }
      }
    }

    // Update documents with proper monetization status and pricing
    let documents = result.data?.documents.map(doc => {
      const monetizationInfo = monetizedCIDMap.get(doc.cid);
      if (monetizationInfo) {
        return {
          ...doc,
          isMonetized: true,
          price: monetizationInfo.price,
          gatewayUrl: monetizationInfo.gatewayUrl,
          metadata: {
            ...doc.metadata,
            status: 'monetized' as const
          }
        };
      }
      return doc;
    }) || [];

    // Apply client-side filter for monetized status (since it's determined dynamically)
    if (status === 'monetized') {
      documents = documents.filter(doc => doc.isMonetized === true);
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        documents
      }
    } as DocumentListResponse, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    });
    
  } catch (error) {
    // Enhanced error logging
    console.error('Documents API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
      timestamp: new Date().toISOString()
    });
    
    // Generic error response
    return NextResponse.json({
      success: false,
      error: 'Internal server error while retrieving documents'
    } as DocumentListResponse, { status: 500 });
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use GET to retrieve documents.'
  } as DocumentListResponse, { 
    status: 405,
    headers: {
      'Allow': 'GET'
    }
  });
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use GET to retrieve documents.'
  } as DocumentListResponse, { 
    status: 405,
    headers: {
      'Allow': 'GET'
    }
  });
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use GET to retrieve documents.'
  } as DocumentListResponse, { 
    status: 405,
    headers: {
      'Allow': 'GET'
    }
  });
}