import { NextRequest, NextResponse } from 'next/server';
import { pinataClient } from '@/lib/pinata';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const type = searchParams.get('type') || 'documents';

    if (!pinataClient) {
      return NextResponse.json(
        { success: false, error: 'Pinata client not configured' },
        { status: 500 }
      );
    }

    // Get documents data for analytics
    const documentsResult = await pinataClient.instance.listDocuments({
      pageSize: 100
    });

    if (!documentsResult.success || !documentsResult.data) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    const documents = documentsResult.data.documents;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let analyticsData: Array<{
      value: string;
      count: number;
      size?: number;
      isMonetized?: boolean;
      revenue?: number;
      createdAt?: string;
    }> = [];

    if (type === 'documents') {
      // Document upload analytics
      analyticsData = documents
        .filter(doc => new Date(doc.createdAt) > cutoffDate)
        .map(doc => ({
          value: doc.name,
          count: 1,
          size: doc.size,
          isMonetized: doc.isMonetized,
          createdAt: doc.createdAt
        }));
    } else if (type === 'monetization') {
      // Monetization analytics
      const monetizedDocs = documents.filter(doc => doc.isMonetized);
      analyticsData = monetizedDocs.map(doc => ({
        value: doc.name,
        count: 1,
        revenue: doc.price?.usd || 0,
        createdAt: doc.createdAt
      }));
    } else if (type === 'file-types') {
      // File type analytics
      const typeCount: { [key: string]: number } = {};
      documents.forEach(doc => {
        const type = doc.mimeType.split('/')[0] || 'unknown';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      
      analyticsData = Object.entries(typeCount).map(([type, count]) => ({
        value: type,
        count: count
      }));
    }

    return NextResponse.json({
      success: true,
      data: analyticsData
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