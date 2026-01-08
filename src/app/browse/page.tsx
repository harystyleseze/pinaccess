'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, FileText, Search } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navigation />

      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="content-max-width section-padding">
          <div className="py-12 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
              Browse Premium Content
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
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
                <div className="w-12 h-12 rounded-lg bg-[var(--surface-elevated)] mb-4"></div>
                <div className="w-3/4 h-6 rounded bg-[var(--surface-elevated)] mb-2"></div>
                <div className="w-1/2 h-4 rounded bg-[var(--surface-elevated)] mb-4"></div>
                <div className="w-full h-20 rounded bg-[var(--surface-elevated)] mb-4"></div>
                <div className="w-1/3 h-8 rounded bg-[var(--surface-elevated)]"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {state.error && (
          <div className="text-center py-12">
            <div className="status-error rounded-2xl p-8 max-w-md mx-auto">
              <AlertCircle className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Content</h3>
              <p className="mb-4">{state.error}</p>
              <button
                onClick={fetchPublicDocuments}
                className="btn-primary"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Content Grid */}
        {!state.loading && !state.error && (
          <>
            {state.documents.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Content Available</h3>
                <p className="text-[var(--text-secondary)]">Check back later for new premium content from creators.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {state.documents.map((document) => (
                  <div key={document.id} className="card hover:shadow-lg transition-all duration-300 group">
                    <div className="p-6">
                      {/* File Type & Size */}
                      <div className="flex items-center mb-4">
                        <span className="text-xs font-semibold uppercase text-[var(--brand-teal)] bg-[var(--primary-light)] px-2 py-1 rounded mr-3">
                          {document.mimeType.split('/')[1] || 'File'}
                        </span>
                        <span className="text-sm text-[var(--text-secondary)]">{formatFileSize(document.size)}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 line-clamp-2 group-hover:text-[var(--brand-teal)] transition-colors">
                        {document.name}
                      </h3>

                      {/* Description */}
                      {document.metadata.description && (
                        <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-3">
                          {document.metadata.description}
                        </p>
                      )}

                      {/* Creator & Date */}
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-4">
                        <span>By {document.metadata.creator}</span>
                        <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Price & Access Button */}
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-[var(--text-primary)]">
                          {formatPrice(document)}
                        </div>
                        <a
                          href={`/content/${document.cid}`}
                          className="btn-primary btn-sm"
                        >
                          {document.isMonetized ? 'Purchase' : 'View'}
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
