import { NextRequest, NextResponse } from 'next/server';
import { pinataClient } from '@/lib/pinata';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageSize = parseInt(searchParams.get('pageSize') || '12');
    const pageToken = searchParams.get('pageToken') || undefined;

    // Get all payment instructions to find monetized content
    const paymentInstructionsResult = await pinataClient.instance.listPaymentInstructions({
      pageSize: 100 // Get a large number to find all monetized content
    });

    if (!paymentInstructionsResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch payment instructions'
      }, { status: 500 });
    }

    // Get all CIDs attached to payment instructions
    const monetizedCIDs = new Set<string>();
    const cidToPaymentInstruction = new Map<string, any>();

    for (const pi of paymentInstructionsResult.data!.paymentInstructions) {
      const attachedResult = await pinataClient.instance.getAttachedCids(pi.id);
      if (attachedResult.success) {
        for (const attachedCid of attachedResult.data!.cids) {
          monetizedCIDs.add(attachedCid.cid);
          cidToPaymentInstruction.set(attachedCid.cid, {
            id: pi.id,
            name: pi.name,
            description: pi.description,
            paymentRequirements: pi.paymentRequirements
          });
        }
      }
    }

    console.log('Found monetized CIDs:', Array.from(monetizedCIDs));

    if (monetizedCIDs.size === 0) {
      return NextResponse.json({
        success: true,
        data: {
          documents: [],
          nextPageToken: null,
          totalCount: 0
        }
      });
    }

    // Get all documents and filter for monetized ones
    const allDocumentsResult = await pinataClient.instance.listDocuments({
      pageSize: 100 // Get more documents to find the monetized ones
    });

    if (!allDocumentsResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch documents'
      }, { status: 500 });
    }

    // Filter documents to only include monetized ones
    const monetizedDocuments = allDocumentsResult.data!.documents
      .filter(doc => monetizedCIDs.has(doc.cid))
      .map(doc => {
        const paymentInstruction = cidToPaymentInstruction.get(doc.cid);
        const paymentRequirement = paymentInstruction?.paymentRequirements[0];
        
        return {
          id: doc.id,
          cid: doc.cid,
          name: doc.name,
          size: doc.size,
          mimeType: doc.mimeType,
          createdAt: doc.createdAt,
          isMonetized: true, // These are definitely monetized since they're attached to payment instructions
          price: paymentRequirement ? {
            usd: parseFloat((paymentRequirement as any).max_amount_required || '0') / 1000000, // Convert from USDC smallest unit (6 decimals)
            usdc: (paymentRequirement as any).max_amount_required || '0'
          } : {
            usd: 0,
            usdc: '0'
          },
          gatewayUrl: `${process.env.PINATA_GATEWAY_URL || 'https://gateway.mypinata.cloud'}/x402/cid/${doc.cid}`,
          metadata: {
            creator: doc.metadata.creator,
            status: 'monetized' as const, // Override status since these are monetized
            description: paymentInstruction?.description || (doc.metadata as any).description
          }
        };
      });

    console.log(`Found ${monetizedDocuments.length} monetized documents out of ${allDocumentsResult.data!.documents.length} total documents`);

    // Simple pagination
    const startIndex = pageToken ? parseInt(pageToken) || 0 : 0;
    const paginatedDocuments = monetizedDocuments.slice(startIndex, startIndex + pageSize);
    const hasMore = monetizedDocuments.length > startIndex + pageSize;

    return NextResponse.json({
      success: true,
      data: {
        documents: paginatedDocuments,
        nextPageToken: hasMore ? (startIndex + pageSize).toString() : null,
        totalCount: paginatedDocuments.length
      }
    });

  } catch (error) {
    console.error('Public documents API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching public documents'
    }, { status: 500 });
  }
}