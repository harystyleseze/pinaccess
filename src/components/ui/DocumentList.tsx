'use client'

import { useState, useEffect } from 'react'
import { Document, DocumentListResponse } from '@/lib/types'
import DocumentCard from './DocumentCard'
import DocumentDetail from './DocumentDetail'

interface DocumentListProps {
  filters?: {
    creator?: string
    status?: 'uploaded' | 'monetized' | 'error'
  }
  onCopyUrl?: (url: string) => void
}

export default function DocumentList({ filters, onCopyUrl }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchDocuments = async (pageToken?: string, append = false) => {
    try {
      if (!append) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      const queryParams = new URLSearchParams()
      
      if (filters?.creator) {
        queryParams.append('creator', filters.creator)
      }
      
      if (filters?.status) {
        queryParams.append('status', filters.status)
      }
      
      if (pageToken) {
        queryParams.append('pageToken', pageToken)
      }
      
      queryParams.append('pageSize', '10')

      const response = await fetch(`/api/documents?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: DocumentListResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch documents')
      }

      if (result.data) {
        if (append) {
          // Filter out duplicates when appending
          const existingIds = new Set(documents.map(doc => doc.id));
          const newDocuments = result.data.documents.filter(doc => !existingIds.has(doc.id));
          
          if (newDocuments.length > 0) {
            setDocuments(prev => [...prev, ...newDocuments]);
          }
          
          // Only show "Load More" if we got new documents and there's a next page token
          setHasMore(newDocuments.length > 0 && !!result.data.nextPageToken);
        } else {
          setDocuments(result.data.documents);
          setHasMore(!!result.data.nextPageToken);
        }
        
        setNextPageToken(result.data.nextPageToken);
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch documents')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [filters?.creator, filters?.status])

  const handleCopyUrl = (url: string) => {
    onCopyUrl?.(url)
  }

  const handleViewDetails = (id: string) => {
    const document = documents.find(doc => doc.id === id)
    if (document) {
      setSelectedDocument(document)
    }
  }

  const handleCloseDetails = () => {
    setSelectedDocument(null)
  }

  const handleLoadMore = () => {
    if (nextPageToken && !loadingMore) {
      fetchDocuments(nextPageToken, true)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 animate-fade-in">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-4 text-gray-600 text-lg font-medium">⏳ Loading documents...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 animate-slide-up">
        <div className="text-red-600 mb-6">
          <svg className="mx-auto h-16 w-16 icon-clean animate-bounce-gentle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">⚠️ Error Loading Documents</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => fetchDocuments()}
          className="btn-primary px-6 py-3 transform hover:scale-105 transition-all duration-200"
        >
          🔄 Try Again
        </button>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-16 animate-slide-up">
        <div className="text-gray-400 mb-6">
          <svg className="mx-auto h-16 w-16 icon-clean animate-pulse-gentle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">📄 No Documents Found</h3>
        <p className="text-gray-600 mb-6">
          {filters?.creator || filters?.status 
            ? 'No documents match your current filters.' 
            : 'You haven\'t uploaded any documents yet.'}
        </p>
        <p className="text-gray-500 text-sm">
          💡 Upload your first document to get started with monetization!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            onCopyUrl={handleCopyUrl}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center animate-fade-in">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={`${
              loadingMore 
                ? 'btn-pill bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'btn-primary transform hover:scale-105 transition-all duration-200'
            } px-8 py-4`}
          >
            {loadingMore ? (
              <>
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                ⏳ Loading...
              </>
            ) : (
              '📄 Load More Documents'
            )}
          </button>
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDocument && (
        <DocumentDetail
          document={selectedDocument}
          onClose={handleCloseDetails}
          onCopyUrl={handleCopyUrl}
        />
      )}
    </div>
  )
}