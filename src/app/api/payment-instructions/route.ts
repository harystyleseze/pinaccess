import { NextRequest, NextResponse } from 'next/server'
import { pinataClient } from '@/lib/pinata'
import { validatePaymentInstructionForm } from '@/lib/validation'
import { rateLimiters, getClientIP } from '@/lib/security'
import { convertUsdToUsdc } from '@/lib/pricing'
import { BASE_SEPOLIA_USDC_ADDRESS } from '@/lib/validation'
import { type PaymentInstructionListResponse, type PaymentInstructionResponse } from '@/lib/types'

// GET /api/payment-instructions - List all payment instructions
export async function GET(request: NextRequest): Promise<NextResponse<PaymentInstructionListResponse>> {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100)
    const pageToken = searchParams.get('pageToken') || undefined
    const name = searchParams.get('name') || undefined
    const cid = searchParams.get('cid') || undefined
    const instructionId = searchParams.get('instructionId') || undefined

    // Fetch payment instructions from Pinata
    const result = await pinataClient.instance.listPaymentInstructions({
      pageSize,
      pageToken,
      name,
      cid,
      instructionId
    })

    if (!result.success) {
      console.error('Failed to fetch payment instructions:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to fetch payment instructions'
      }, { status: 500 })
    }

    // Fetch attached CID counts for each payment instruction
    const paymentInstructions = await Promise.all(
      (result.data?.paymentInstructions || []).map(async (pi) => {
        // Get attached CIDs count for this payment instruction
        let attachedCIDCount = 0
        try {
          const attachedResult = await pinataClient.instance.getAttachedCids(pi.id)
          if (attachedResult.success && attachedResult.data?.cids) {
            attachedCIDCount = attachedResult.data.cids.length
          }
        } catch (e) {
          // Silently handle errors fetching attached CIDs
        }

        return {
          id: pi.id,
          version: pi.version,
          name: pi.name,
          description: pi.description,
          paymentRequirements: pi.paymentRequirements.map(req => ({
            asset: req.asset,
            pay_to: req.pay_to, // Keep snake_case to match PaymentRequirement interface
            network: req.network as 'base-sepolia',
            description: req.description,
            max_amount_required: req.max_amount_required // Keep snake_case to match PaymentRequirement interface
          })),
          createdAt: pi.createdAt,
          updatedAt: pi.updatedAt,
          attachedCIDCount
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        paymentInstructions,
        nextPageToken: result.data?.nextPageToken,
        totalCount: result.data?.totalCount || paymentInstructions.length
      }
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    })

  } catch (error) {
    console.error('Payment instructions list API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while fetching payment instructions'
    }, { status: 500 })
  }
}

// POST /api/payment-instructions - Create new payment instruction
export async function POST(request: NextRequest): Promise<NextResponse<PaymentInstructionResponse>> {
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

    const { name, description, priceUSD, walletAddress, usdcAmount } = validation.data

    // Create payment instruction via Pinata
    const paymentConfig = {
      name,
      description,
      usdcAmount,
      walletAddress,
      network: 'base-sepolia' as const
    }

    const result = await pinataClient.instance.createPaymentInstruction(paymentConfig)

    if (!result.success) {
      console.error('Payment instruction creation failed:', {
        error: result.error,
        name,
        walletAddress,
        ip: getClientIP(request)
      })

      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to create payment instruction'
      }, { status: 500 })
    }

    // Transform response to match our interface
    const paymentInstruction = {
      id: result.data!.id,
      version: 1, // Default version for new payment instructions
      name: result.data!.name,
      description: result.data!.description,
      paymentRequirements: result.data!.paymentRequirements.map(req => ({
        asset: req.asset,
        pay_to: req.pay_to, // Keep snake_case to match PaymentRequirement interface
        network: req.network as 'base-sepolia',
        description: req.description,
        max_amount_required: req.max_amount_required // Keep snake_case to match PaymentRequirement interface
      })),
      createdAt: new Date().toISOString(), // Set current timestamp for new instructions
      attachedCIDCount: 0
    }

    return NextResponse.json({
      success: true,
      data: paymentInstruction
    }, { 
      status: 201,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
      }
    })

  } catch (error) {
    console.error('Payment instruction creation API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
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
      error: 'Internal server error occurred while creating payment instruction'
    }, { status: 500 })
  }
}

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST to create payment instructions.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'GET, POST'
    }
  })
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use DELETE on specific payment instruction.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'GET, POST'
    }
  })
}