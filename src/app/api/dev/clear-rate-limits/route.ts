import { NextRequest, NextResponse } from 'next/server';
import { clearRateLimits, getClientIP } from '@/lib/security';

export async function POST(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      success: false,
      error: 'This endpoint is only available in development mode'
    }, { status: 403 });
  }

  try {
    clearRateLimits();
    
    return NextResponse.json({
      success: true,
      message: 'Rate limits cleared successfully',
      ip: getClientIP(request),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to clear rate limits'
    }, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Use POST to clear rate limits'
  }, { status: 405 });
}