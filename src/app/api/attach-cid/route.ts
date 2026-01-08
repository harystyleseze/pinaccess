import { NextRequest, NextResponse } from 'next/server';
import { pinataClient } from '@/lib/pinata';
import { validateSafeString } from '@/lib/validation';
import { rateLimiters, validateContentSecurity, getClientIP } from '@/lib/security';

interface AttachCidResponse {
  success: boolean;
  data?: {
    cid: string;
    paymentInstructionId: string;
    gatewayUrl: string;
    association: {
      documentCid: string;
      paymentId: string;
      gatewayUrl: string;
      createdAt: string;
    };
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<AttachCidResponse>> {
  try {
    // Rate limiting check
    const rateLimitResult = rateLimiters.strict(request);
    if (!rateLimitResult.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitResult.error || 'Too many CID attachment requests. Please try again later.'
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      });
    }

    // Parse the request body
    let body: { cid?: string; paymentInstructionId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    const { cid, paymentInstructionId } = body;

    // Validate required fields
    if (!cid || typeof cid !== 'string' || cid.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'CID is required and must be a non-empty string'
      }, { status: 400 });
    }

    if (!paymentInstructionId || typeof paymentInstructionId !== 'string' || paymentInstructionId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Payment instruction ID is required and must be a non-empty string'
      }, { status: 400 });
    }

    // Basic content security validation
    const cidSecurityValidation = validateContentSecurity(cid.trim(), 100);
    if (!cidSecurityValidation.isSecure) {
      return NextResponse.json({
        success: false,
        error: `Invalid CID: ${cidSecurityValidation.violations.join(', ')}`
      }, { status: 400 });
    }

    const paymentIdSecurityValidation = validateContentSecurity(paymentInstructionId.trim(), 100);
    if (!paymentIdSecurityValidation.isSecure) {
      return NextResponse.json({
        success: false,
        error: `Invalid payment instruction ID: ${paymentIdSecurityValidation.violations.join(', ')}`
      }, { status: 400 });
    }

    // Validate and sanitize inputs
    const cidValidation = validateSafeString(cid.trim(), 100);
    if (!cidValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: `Invalid CID: ${cidValidation.error}`
      }, { status: 400 });
    }

    const paymentIdValidation = validateSafeString(paymentInstructionId.trim(), 100);
    if (!paymentIdValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: `Invalid payment instruction ID: ${paymentIdValidation.error}`
      }, { status: 400 });
    }

    // Basic CID format validation
    const trimmedCid = cid.trim();
    const cidPatterns = [
      /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/, // CIDv0
      /^b[A-Za-z2-7]{58}$/, // CIDv1 base32
      /^[a-z0-9]{46,59}$/, // General CIDv1
    ];

    const isValidCid = cidPatterns.some(pattern => pattern.test(trimmedCid));
    if (!isValidCid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid CID format. Must be a valid IPFS CID.'
      }, { status: 400 });
    }

    // Validate payment instruction ID format
    const trimmedPaymentId = paymentInstructionId.trim();
    if (!trimmedPaymentId.match(/^[a-zA-Z0-9_-]{8,64}$/)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment instruction ID format.'
      }, { status: 400 });
    }

    // Attach CID to payment instruction via Pinata
    const result = await pinataClient.instance.attachCidToPayment(
      trimmedCid,
      trimmedPaymentId
    );

    if (!result.success) {
      // Enhanced error logging
      console.error('CID attachment failed:', {
        error: result.error,
        cid: trimmedCid,
        paymentInstructionId: trimmedPaymentId,
        ip: getClientIP(request)
      });

      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to attach CID to payment instruction'
      }, { status: 500 });
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      data: {
        cid: result.data!.cid,
        paymentInstructionId: result.data!.paymentInstructionId,
        gatewayUrl: result.data!.gatewayUrl,
        association: result.data!.association
      }
    }, { 
      status: 201,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    });

  } catch (error) {
    // Enhanced error logging
    console.error('Attach CID API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
      timestamp: new Date().toISOString()
    });
    
    // Handle specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while attaching CID to payment instruction'
    }, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST to attach CIDs to payment instructions.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'POST'
    }
  });
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST to attach CIDs to payment instructions.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'POST'
    }
  });
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST to attach CIDs to payment instructions.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'POST'
    }
  });
}