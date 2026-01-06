import { NextRequest, NextResponse } from 'next/server';
import { pinataClient } from '@/lib/pinata';

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

    const documents = documentsResult.data.documents;
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