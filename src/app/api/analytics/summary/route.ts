import { NextRequest, NextResponse } from 'next/server';
import { pinataClient } from '@/lib/pinata';
import { getX402GatewayUrl } from '@/lib/gateway-config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    if (!pinataClient) {
      return NextResponse.json(
        { success: false, error: 'Pinata client not configured' },
        { status: 500 }
      );
    }

    // Get all documents to analyze
    const documentsResult = await pinataClient.instance.listDocuments({
      pageSize: 100 // Get more documents for better analytics
    });

    if (!documentsResult.success || !documentsResult.data) {
      return NextResponse.json({
        success: true,
        data: {
          totalDocuments: 0,
          monetizedDocuments: 0,
          totalFileSize: 0,
          recentUploads: 0,
          documentsByType: {},
          uploadTrend: [],
          monetizationRate: 0
        }
      });
    }

    // Fetch payment instructions to determine which documents are monetized
    const paymentInstructionsResult = await pinataClient.instance.listPaymentInstructions({
      pageSize: 100
    });

    // Build a map of CID -> payment info for monetized documents
    const monetizedCIDMap = new Map<string, { price: { usd: number; usdc: string }; gatewayUrl: string }>();

    if (paymentInstructionsResult.success && paymentInstructionsResult.data?.paymentInstructions) {
      for (const pi of paymentInstructionsResult.data.paymentInstructions) {
        try {
          const attachedResult = await pinataClient.instance.getAttachedCids(pi.id);
          if (attachedResult.success && attachedResult.data?.cids) {
            const paymentReq = pi.paymentRequirements[0];
            const maxAmount = paymentReq?.max_amount_required || '0';
            const usdAmount = parseFloat(maxAmount) / 1000000;

            for (const attached of attachedResult.data.cids) {
              monetizedCIDMap.set(attached.cid, {
                price: { usd: usdAmount, usdc: maxAmount },
                gatewayUrl: getX402GatewayUrl(attached.cid)
              });
            }
          }
        } catch {
          // Silently handle errors
        }
      }
    }

    // Enrich documents with monetization data
    const documents = documentsResult.data.documents.map(doc => {
      const monetizationInfo = monetizedCIDMap.get(doc.cid);
      if (monetizationInfo) {
        return {
          ...doc,
          isMonetized: true,
          price: monetizationInfo.price,
          gatewayUrl: monetizationInfo.gatewayUrl
        };
      }
      return { ...doc, isMonetized: false };
    });
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Calculate analytics from actual document data
    const totalDocuments = documents.length;
    const monetizedDocuments = documents.filter(doc => doc.isMonetized).length;
    const totalFileSize = documents.reduce((sum, doc) => sum + doc.size, 0);
    const recentUploads = documents.filter(doc => 
      new Date(doc.createdAt) > cutoffDate
    ).length;

    // Document types analysis
    const documentsByType: { [key: string]: number } = {};
    documents.forEach(doc => {
      const type = doc.mimeType.split('/')[0] || 'unknown';
      documentsByType[type] = (documentsByType[type] || 0) + 1;
    });

    // Upload trend over the specified period
    const uploadTrend = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const uploadsOnDate = documents.filter(doc => {
        const docDate = new Date(doc.createdAt).toISOString().split('T')[0];
        return docDate === dateStr;
      }).length;

      uploadTrend.push({
        date: dateStr,
        uploads: uploadsOnDate,
        monetized: documents.filter(doc => {
          const docDate = new Date(doc.createdAt).toISOString().split('T')[0];
          return docDate === dateStr && doc.isMonetized;
        }).length
      });
    }

    // Monetization rate
    const monetizationRate = totalDocuments > 0 ? (monetizedDocuments / totalDocuments) * 100 : 0;

    // Top files by size (as a proxy for importance)
    const topFiles = documents
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map(doc => ({
        name: doc.name,
        size: doc.size,
        isMonetized: doc.isMonetized,
        createdAt: doc.createdAt,
        mimeType: doc.mimeType
      }));

    return NextResponse.json({
      success: true,
      data: {
        totalDocuments,
        monetizedDocuments,
        totalFileSize,
        recentUploads,
        documentsByType,
        uploadTrend,
        monetizationRate,
        topFiles,
        period: `${days} days`
      }
    });

  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}