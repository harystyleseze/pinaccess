import { NextRequest, NextResponse } from 'next/server'
import { pinataClient } from '@/lib/pinata'
import { validatePaymentInstructionForm } from '@/lib/validation'
import { rateLimiters, getClientIP } from '@/lib/security'
import { type PaymentInstructionResponse } from '@/lib/types'

// GET /api/payment-instructions/[id] - Get specific payment instruction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<PaymentInstructionResponse>> {
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

    // Fetch payment instruction from Pinata
    const result = await pinataClient.instance.getPaymentInstruction(id)

    if (!result.success) {
      if (result.error?.includes('404') || result.error?.includes('not found')) {
        return NextResponse.json({
          success: false,
          error: 'Payment instruction not found'
        }, { status: 404 })
      }

      console.error('Failed to fetch payment instruction:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to fetch payment instruction'
      }, { status: 500 })
    }

    // Transform the response to match our interface
    const paymentInstruction = {
      id: result.data!.id,
      version: result.data!.version,
      name: result.data!.name,
      description: result.data!.description,
      paymentRequirements: result.data!.paymentRequirements.map(req => ({
        asset: req.asset,
        payTo: req.pay_to,
        network: req.network as 'base-sepolia',
        description: req.description,
        maxAmountRequired: req.max_amount_required
      })),
      createdAt: result.data!.createdAt,
      updatedAt: result.data!.updatedAt,
      attachedCIDCount: 0 // This would need to be fetched separately if needed
    }

    return NextResponse.json({
      success: true,
      data: paymentInstruction
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    })

  } catch (error) {
    const resolvedParams = await params
    console.error('Payment instruction get API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      id: resolvedParams.id,
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while fetching payment instruction'
    }, { status: 500 })
  }
}

// PATCH /api/payment-instructions/[id] - Update payment instruction
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<PaymentInstructionResponse>> {
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

    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Payment instruction ID is required'
      }, { status: 400 })
    }

    // Parse the request body
    let body: any
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 })
    }

    // Validate the form data
    const validation = validatePaymentInstructionForm(body)
    if (!validation.isValid || !validation.data) {
      return NextResponse.json({
        success: false,
        error: validation.error || 'Invalid payment instruction data'
      }, { status: 400 })
    }

    const { name, description, walletAddress, usdcAmount } = validation.data

    // Update payment instruction via Pinata
    const updateData = {
      name,
      description,
      usdcAmount,
      walletAddress,
      network: 'base-sepolia' as const
    }

    const result = await pinataClient.instance.updatePaymentInstruction(id, updateData)

    if (!result.success) {
      if (result.error?.includes('404') || result.error?.includes('not found')) {
        return NextResponse.json({
          success: false,
          error: 'Payment instruction not found'
        }, { status: 404 })
      }

      console.error('Payment instruction update failed:', {
        error: result.error,
        id,
        name,
        walletAddress,
        ip: getClientIP(request)
      })

      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to update payment instruction'
      }, { status: 500 })
    }

    // Transform response to match our interface
    const paymentInstruction = {
      id: result.data!.id,
      version: result.data!.version,
      name: result.data!.name,
      description: result.data!.description,
      paymentRequirements: result.data!.paymentRequirements.map(req => ({
        asset: req.asset,
        payTo: req.pay_to,
        network: req.network as 'base-sepolia',
        description: req.description,
        maxAmountRequired: req.max_amount_required
      })),
      createdAt: result.data!.createdAt,
      updatedAt: result.data!.updatedAt,
      attachedCIDCount: 0 // This would need to be fetched separately if needed
    }

    return NextResponse.json({
      success: true,
      data: paymentInstruction
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    })

  } catch (error) {
    const resolvedParams = await params
    console.error('Payment instruction update API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      id: resolvedParams.id,
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
      timestamp: new Date().toISOString()
    })
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while updating payment instruction'
    }, { status: 500 })
  }
}

// DELETE /api/payment-instructions/[id] - Delete payment instruction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Payment instruction ID is required'
      }, { status: 400 })
    }

    // First, try to get attached CIDs and detach them
    try {
      const cidsResult = await pinataClient.instance.listAttachedCIDs(id)
      if (cidsResult.success && cidsResult.data?.cids) {
        // Detach all CIDs before deletion
        for (const cidData of cidsResult.data.cids) {
          await pinataClient.instance.detachCID(id, cidData.cid)
        }
      }
    } catch (error) {
      console.warn('Failed to detach CIDs before deletion:', error)
      // Continue with deletion attempt
    }

    // Delete payment instruction via Pinata
    const result = await pinataClient.instance.deletePaymentInstruction(id)

    if (!result.success) {
      if (result.error?.includes('404') || result.error?.includes('not found')) {
        return NextResponse.json({
          success: false,
          error: 'Payment instruction not found'
        }, { status: 404 })
      }

      if (result.error?.includes('409') || result.error?.includes('conflict')) {
        return NextResponse.json({
          success: false,
          error: 'Cannot delete payment instruction with attached documents. Please detach all documents first.'
        }, { status: 409 })
      }

      console.error('Payment instruction deletion failed:', {
        error: result.error,
        id,
        ip: getClientIP(request)
      })

      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to delete payment instruction'
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
    const resolvedParams = await params
    console.error('Payment instruction deletion API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      id: resolvedParams.id,
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while deleting payment instruction'
    }, { status: 500 })
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST on /api/payment-instructions to create.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'GET, PATCH, DELETE'
    }
  })
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use PATCH to update payment instructions.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'GET, PATCH, DELETE'
    }
  })
}