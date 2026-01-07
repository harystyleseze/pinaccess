'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, AlertTriangle, FileText } from 'lucide-react'
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
        <div className="w-10 h-10 border-2 border-[var(--brand-teal)] border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-4 text-[var(--text-secondary)] text-lg font-medium">Loading documents...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 animate-slide-up">
        <div className="text-[var(--error)] mb-6">
          <AlertTriangle className="mx-auto h-16 w-16" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Error Loading Documents</h3>
        <p className="text-[var(--text-secondary)] mb-6">{error}</p>
        <button
          onClick={() => fetchDocuments()}
          className="btn-primary"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-16 animate-slide-up">
        <div className="text-[var(--text-muted)] mb-6">
          <FileText className="mx-auto h-16 w-16" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">No Documents Found</h3>
        <p className="text-[var(--text-secondary)] mb-6">
          {filters?.creator || filters?.status
            ? 'No documents match your current filters.'
            : 'You haven\'t uploaded any documents yet.'}
        </p>
        <p className="text-[var(--text-muted)] text-sm">
          Upload your first document to get started with monetization!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                ? 'bg-[var(--surface-elevated)] text-[var(--text-muted)] cursor-not-allowed'
                : 'btn-primary'
            } px-8 py-3 rounded-full`}
          >
            {loadingMore ? (
              <>
                <div className="inline-block w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin mr-3"></div>
                Loading...
              </>
            ) : (
              'Load More Documents'
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
