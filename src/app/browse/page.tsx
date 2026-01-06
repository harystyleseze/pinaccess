'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Document } from '@/lib/types';

interface BrowsePageState {
  documents: Document[];
  loading: boolean;
  error: string | null;
}

export default function BrowsePage() {
  const [state, setState] = useState<BrowsePageState>({
    documents: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    fetchPublicDocuments();
  }, []);

  const fetchPublicDocuments = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/documents/public');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch documents');
      }

      setState(prev => ({
        ...prev,
        documents: result.data.documents || [],
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching documents:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load content',
        loading: false
      }));
    }
  };

  const formatPrice = (document: Document): string => {
    if (!document.price || document.price.usd === null || document.price.usd === undefined) return 'Free';
    return `$${document.price.usd.toFixed(2)} USDC`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('text')) return '📝';
    return '📁';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="content-max-width section-padding">
          <div className="py-12 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Browse Premium Content
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover and access high-quality digital content from creators around the world
            </p>
          </div>
        </div>
      </div>

      <div className="content-max-width section-padding py-12">
        {/* Loading State */}
        {state.loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="loading-shimmer w-12 h-12 rounded-lg mb-4"></div>
                <div className="loading-shimmer w-3/4 h-6 rounded mb-2"></div>
                <div className="loading-shimmer w-1/2 h-4 rounded mb-4"></div>
                <div className="loading-shimmer w-full h-20 rounded mb-4"></div>
                <div className="loading-shimmer w-1/3 h-8 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {state.error && (
          <div className="text-center py-12">
            <div className="status-error rounded-2xl p-8 max-w-md mx-auto">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Content</h3>
              <p className="text-red-700 mb-4">{state.error}</p>
              <button
                onClick={fetchPublicDocuments}
                className="btn-error px-6 py-2"
              >
                🔄 Try Again
              </button>
            </div>
          </div>
        )}

        {/* Content Grid */}
        {!state.loading && !state.error && (
          <>
            {state.documents.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Content Available</h3>
                <p className="text-gray-600">Check back later for new premium content from creators.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {state.documents.map((document) => (
                  <div key={document.id} className="card hover:shadow-xl transition-all duration-300 group">
                    <div className="p-6">
                      {/* File Icon & Type */}
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl mr-4">
                          {getFileIcon(document.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                            {document.mimeType.split('/')[1] || 'File'}
                          </p>
                          <p className="text-sm text-gray-600">{formatFileSize(document.size)}</p>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {document.name}
                      </h3>

                      {/* Description */}
                      {document.metadata.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                          {document.metadata.description}
                        </p>
                      )}

                      {/* Creator & Date */}
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <span>By {document.metadata.creator}</span>
                        <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Price & Access Button */}
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-gray-900">
                          {formatPrice(document)}
                        </div>
                        <a
                          href={`/content/${document.cid}`}
                          className="btn-primary px-4 py-2 text-sm"
                        >
                          {document.isMonetized ? '💳 Purchase' : '📖 View'}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}