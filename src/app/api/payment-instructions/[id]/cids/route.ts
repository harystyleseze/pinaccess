import { NextRequest, NextResponse } from 'next/server'
import { pinataClient } from '@/lib/pinata'
import { rateLimiters, getClientIP } from '@/lib/security'
import { type AttachedCIDsResponse } from '@/lib/types'

// GET /api/payment-instructions/[id]/cids - List attached CIDs for payment instruction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AttachedCIDsResponse>> {
  try {
    // Rate limiting check
    const rateLimitResult = rateLimiters.general(request)
    if (!rateLimitResult.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitResult.error || 'Too many requests. Please try again later.'
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

    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Payment instruction ID is required'
      }, { status: 400 })
    }

    // Fetch attached CIDs from Pinata
    const result = await pinataClient.instance.listAttachedCIDs(id)

    if (!result.success) {
      if (result.error?.includes('404') || result.error?.includes('not found')) {
        return NextResponse.json({
          success: false,
          error: 'Payment instruction not found'
        }, { status: 404 })
      }

      console.error('Failed to fetch attached CIDs:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to fetch attached CIDs'
      }, { status: 500 })
    }

    // Transform the response to match our interface
    // Cross-reference with documents to get full details
    let attachedCIDs = result.data?.cids || []
    
    // Try to get full document details for each attached CID
    try {
      const documentsResult = await pinataClient.instance.listDocuments({ pageSize: 100 })
      if (documentsResult.success && documentsResult.data?.documents) {
        const documentsMap = new Map(
          documentsResult.data.documents.map(doc => [doc.cid, doc])
        )
        
        attachedCIDs = attachedCIDs.map(cidData => {
          const fullDoc = documentsMap.get(cidData.cid)
          if (fullDoc) {
            return {
              cid: cidData.cid,
              documentName: fullDoc.name,
              fileSize: fullDoc.size,
              mimeType: fullDoc.mimeType,
              uploadDate: fullDoc.createdAt,
              gatewayUrl: cidData.gatewayUrl,
              paymentInstructionId: id
            }
          }
          return cidData
        })
      }
    } catch (error) {
      console.warn('Failed to fetch document details for attached CIDs:', error)
      // Continue with basic CID info if document lookup fails
    }

    return NextResponse.json({
      success: true,
      data: {
        cids: attachedCIDs,
        paymentInstructionId: id
      }
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    })

  } catch (error) {
    console.error('Attached CIDs list API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentInstructionId: (await params).id,
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while fetching attached CIDs'
    }, { status: 500 })
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use PUT on specific CID to attach.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'GET'
    }
  })
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use PUT on specific CID to attach.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'GET'
    }
  })
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use DELETE on specific CID to detach.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'GET'
    }
  })
}