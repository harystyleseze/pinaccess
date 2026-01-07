import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    PINATA_GATEWAY_URL: process.env.PINATA_GATEWAY_URL,
    PINATA_API_URL: process.env.PINATA_API_URL,
    NODE_ENV: process.env.NODE_ENV
  });
}