import { NextRequest, NextResponse } from 'next/server';
import { pinataClient } from '@/lib/pinata';
import { getX402GatewayUrl } from '@/lib/gateway-config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  try {
    const { cid } = await params;

    if (!cid) {
      return NextResponse.json({
        success: false,
        error: 'CID is required'
      }, { status: 400 });
    }

    // Check if this CID is attached to any payment instruction
    const paymentInstructionsResult = await pinataClient.instance.listPaymentInstructions({
      pageSize: 100
    });

    let isMonetized = false;
    let paymentInstruction = null;
    let gatewayUrl = null;
    let price = null;

    if (paymentInstructionsResult.success) {
      // Check each payment instruction for attached CIDs
      for (const pi of paymentInstructionsResult.data!.paymentInstructions) {
        const attachedResult = await pinataClient.instance.getAttachedCids(pi.id);
        if (attachedResult.success) {
          const attachedCid = attachedResult.data!.cids.find(c => c.cid === cid);
          if (attachedCid) {
            isMonetized = true;
            paymentInstruction = pi;
            gatewayUrl = getX402GatewayUrl(cid);
            
            // Calculate price from payment requirements
            const paymentRequirement = pi.paymentRequirements[0];
            if (paymentRequirement) {
              const amountStr = (paymentRequirement as any).max_amount_required || '0';
              const amountNum = parseFloat(amountStr);
              
              price = {
                usd: amountNum / 1000000, // Convert from USDC smallest unit (6 decimals)
                usdc: amountStr
              };
            }
            break;
          }
        }
      }
    }

    // Get document details
    const result = await pinataClient.instance.listDocuments({
      pageSize: 100
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch content information'
      }, { status: 500 });
    }

    // Find the document with the matching CID
    const document = result.data!.documents.find(doc => doc.cid === cid);

    if (!document) {
      return NextResponse.json({
        success: false,
        error: 'Content not found'
      }, { status: 404 });
    }

    // Return comprehensive content information
    const contentInfo = {
      name: document.name,
      size: document.size,
      mimeType: document.mimeType,
      price: price,
      creator: document.metadata.creator,
      description: paymentInstruction?.description || ('description' in document.metadata ? document.metadata.description : undefined),
      gatewayUrl: gatewayUrl,
      isMonetized: isMonetized,
      requiresPayment: isMonetized,
      createdAt: document.createdAt,
      paymentInstructionName: paymentInstruction?.name
    };

    return NextResponse.json({
      success: true,
      data: contentInfo
    });

  } catch (error) {
    console.error('Content info API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching content information'
    }, { status: 500 });
  }
}