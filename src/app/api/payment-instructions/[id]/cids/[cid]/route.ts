import { NextRequest, NextResponse } from 'next/server'
import { pinataClient } from '@/lib/pinata'
import { validateCID } from '@/lib/validation'
import { rateLimiters, getClientIP } from '@/lib/security'
import { type CIDAttachmentResponse } from '@/lib/types'
import { getX402GatewayUrl } from '@/lib/gateway-config'

// PUT /api/payment-instructions/[id]/cids/[cid] - Attach CID to payment instruction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
): Promise<NextResponse<CIDAttachmentResponse>> {
  try {
    // Rate limiting check
    const rateLimitResult = rateLimiters.payment(request)
    if (!rateLimitResult.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitResult.error || 'Too many payment instruction requests. Please try again later.'
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      })
    }

    const { id, cid } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Payment instruction ID is required'
      }, { status: 400 })
    }

    if (!cid || typeof cid !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'CID is required'
      }, { status: 400 })
    }

    // Validate CID format
    const cidValidation = validateCID(cid)
    if (!cidValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: `Invalid CID: ${cidValidation.error}`
      }, { status: 400 })
    }

    // Attach CID to payment instruction via Pinata
    const result = await pinataClient.instance.attachCID(id, cid)

    if (!result.success) {
      if (result.error?.includes('404') || result.error?.includes('not found')) {
        return NextResponse.json({
          success: false,
          error: 'Payment instruction or CID not found'
        }, { status: 404 })
      }

      if (result.error?.includes('409') || result.error?.includes('conflict')) {
        return NextResponse.json({
          success: false,
          error: 'CID is already attached to another payment instruction',
          isConflict: true,
          requiresCidRemoval: true
        }, { status: 409 })
      }

      console.error('CID attachment failed:', {
        error: result.error,
        paymentInstructionId: id,
        cid,
        ip: getClientIP(request)
      })

      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to attach CID to payment instruction'
      }, { status: 500 })
    }

    // Generate gateway URL
    const gatewayUrl = getX402GatewayUrl(cid)

    return NextResponse.json({
      success: true,
      data: {
        cid,
        paymentInstructionId: id,
        gatewayUrl
      }
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    })

  } catch (error) {
    console.error('CID attachment API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentInstructionId: (await params).id,
      cid: (await params).cid,
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while attaching CID'
    }, { status: 500 })
  }
}

// DELETE /api/payment-instructions/[id]/cids/[cid] - Detach CID from payment instruction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    // Rate limiting check
    const rateLimitResult = rateLimiters.payment(request)
    if (!rateLimitResult.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitResult.error || 'Too many payment instruction requests. Please try again later.'
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      })
    }

    const { id, cid } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Payment instruction ID is required'
      }, { status: 400 })
    }

    if (!cid || typeof cid !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'CID is required'
      }, { status: 400 })
    }

    // Validate CID format
    const cidValidation = validateCID(cid)
    if (!cidValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: `Invalid CID: ${cidValidation.error}`
      }, { status: 400 })
    }

    // Detach CID from payment instruction via Pinata
    const result = await pinataClient.instance.detachCID(id, cid)

    if (!result.success) {
      if (result.error?.includes('404') || result.error?.includes('not found')) {
        return NextResponse.json({
          success: false,
          error: 'Payment instruction, CID, or attachment not found'
        }, { status: 404 })
      }

      console.error('CID detachment failed:', {
        error: result.error,
        paymentInstructionId: id,
        cid,
        ip: getClientIP(request)
      })

      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to detach CID from payment instruction'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    })

  } catch (error) {
    console.error('CID detachment API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentInstructionId: (await params).id,
      cid: (await params).cid,
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while detaching CID'
    }, { status: 500 })
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use GET on /cids to list attached CIDs.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'PUT, DELETE'
    }
  })
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use PUT to attach CID.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'PUT, DELETE'
    }
  })
}

export async function PATCH() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use PUT to attach or DELETE to detach.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'PUT, DELETE'
    }
  })
}