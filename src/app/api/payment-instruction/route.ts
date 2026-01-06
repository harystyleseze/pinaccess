import { NextRequest, NextResponse } from 'next/server';
import { pinataClient } from '@/lib/pinata';
import { validateEthereumAddressDetailed, validateSafeString } from '@/lib/validation';
import { rateLimiters, getClientIP } from '@/lib/security';
import { type PaymentInstructionResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<PaymentInstructionResponse>> {
  try {
    // Rate limiting check
    const rateLimitResult = rateLimiters.payment(request);
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
      });
    }

    // Parse the request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    const { name, description, payment_requirements } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Payment instruction name is required'
      }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Payment instruction description is required'
      }, { status: 400 });
    }

    if (!payment_requirements || !Array.isArray(payment_requirements) || payment_requirements.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Payment requirements array is required'
      }, { status: 400 });
    }

    // Validate first payment requirement (we expect exactly one)
    const paymentReq = payment_requirements[0];
    if (!paymentReq.asset || !paymentReq.pay_to || !paymentReq.network || !paymentReq.max_amount_required) {
      return NextResponse.json({
        success: false,
        error: 'Payment requirement must include asset, pay_to, network, and max_amount_required'
      }, { status: 400 });
    }

    // Validate wallet address
    const addressValidation = validateEthereumAddressDetailed(paymentReq.pay_to);
    if (!addressValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: `Invalid wallet address: ${addressValidation.error}`
      }, { status: 400 });
    }

    // Validate and sanitize text inputs
    const nameValidation = validateSafeString(name.trim(), 100);
    if (!nameValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: `Invalid name: ${nameValidation.error}`
      }, { status: 400 });
    }

    const descriptionValidation = validateSafeString(description.trim(), 500);
    if (!descriptionValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: `Invalid description: ${descriptionValidation.error}`
      }, { status: 400 });
    }

    // Create payment instruction via Pinata using the exact format from documentation
    const paymentConfig = {
      name: name.trim(),
      description: description.trim(),
      usdcAmount: paymentReq.max_amount_required,
      walletAddress: paymentReq.pay_to.trim(),
      network: paymentReq.network as 'base-sepolia'
    };

    const result = await pinataClient.instance.createPaymentInstruction(paymentConfig);

    if (!result.success) {
      // Enhanced error logging
      console.error('Payment instruction creation failed:', {
        error: result.error,
        name: name.trim(),
        walletAddress: paymentReq.pay_to.trim(),
        ip: getClientIP(request)
      });

      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to create payment instruction'
      }, { status: 500 });
    }

    // Return successful response with proper typing (using snake_case to match PaymentRequirement interface)
    return NextResponse.json({
      success: true,
      data: {
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
        createdAt: new Date().toISOString() // Set current timestamp for new instructions
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
    console.error('Payment instruction API error:', {
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
      error: 'Internal server error occurred while creating payment instruction'
    }, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST to create payment instructions.'
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
    error: 'Method not allowed. Use POST to create payment instructions.'
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
    error: 'Method not allowed. Use POST to create payment instructions.'
  }, { 
    status: 405,
    headers: {
      'Allow': 'POST'
    }
  });
}