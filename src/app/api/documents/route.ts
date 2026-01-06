import { NextRequest, NextResponse } from 'next/server';
import { pinataClient } from '@/lib/pinata';
import { validateSafeString } from '@/lib/validation';
import { rateLimiters, validateContentSecurity, getClientIP } from '@/lib/security';
import { DocumentListResponse } from '@/lib/types';

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
    const filters = {
      ...(creator && { creator: creator.trim() }),
      ...(status && { status }),
      ...(pageToken && { pageToken: pageToken.trim() }),
      ...(pageSize && { pageSize })
    };
    
    // Call Pinata client to list documents
    const result = await pinataClient.instance.listDocuments(filters);
    
    if (!result.success) {
      // Enhanced error logging
      console.error('Document listing failed:', {
        error: result.error,
        filters,
        ip: getClientIP(request)
      });

      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to retrieve documents'
      } as DocumentListResponse, { status: 500 });
    }
    
    // Return successful response
    return NextResponse.json({
      success: true,
      data: result.data
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