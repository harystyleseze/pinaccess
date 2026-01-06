'use client'

import { useState, useCallback } from 'react'
import { CIDManagerProps } from '@/lib/types'

export default function CIDManager({
  paymentInstructionId,
  attachedCIDs,
  availableCIDs,
  onAttachCID,
  onDetachCID,
  onBulkAttach
}: CIDManagerProps) {
  const [selectedCIDs, setSelectedCIDs] = useState<Set<string>>(new Set())
  const [isAttaching, setIsAttaching] = useState<string | null>(null)
  const [isDetaching, setIsDetaching] = useState<string | null>(null)
  const [isBulkAttaching, setIsBulkAttaching] = useState(false)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const handleAttachCID = async (cid: string) => {
    setIsAttaching(cid)
    try {
      await onAttachCID(cid)
    } catch (error) {
      console.error('Failed to attach CID:', error)
    } finally {
      setIsAttaching(null)
    }
  }

  const handleDetachCID = async (cid: string) => {
    setIsDetaching(cid)
    try {
      await onDetachCID(cid)
    } catch (error) {
      console.error('Failed to detach CID:', error)
    } finally {
      setIsDetaching(null)
    }
  }

  const handleBulkAttach = async () => {
    if (selectedCIDs.size === 0) return
    
    setIsBulkAttaching(true)
    try {
      await onBulkAttach(Array.from(selectedCIDs))
      setSelectedCIDs(new Set())
    } catch (error) {
      console.error('Failed to bulk attach CIDs:', error)
    } finally {
      setIsBulkAttaching(false)
    }
  }

  const handleSelectCID = (cid: string, checked: boolean) => {
    const newSelected = new Set(selectedCIDs)
    if (checked) {
      newSelected.add(cid)
    } else {
      newSelected.delete(cid)
    }
    setSelectedCIDs(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const availableCIDSet = new Set(availableCIDs.map(doc => doc.cid))
      setSelectedCIDs(availableCIDSet)
    } else {
      setSelectedCIDs(new Set())
    }
  }

  const handleCopyUrl = useCallback(async (url: string, cid: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopySuccess(cid)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getMimeTypeIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('epub')) return '📚'
    if (mimeType.includes('text')) return '📝'
    return '📄'
  }

  return (
    <div className="space-y-8" data-payment-instruction-id={paymentInstructionId}>
      {/* Attached CIDs Section */}
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <span className="text-2xl">📎</span>
          <h3 className="text-xl font-semibold text-gray-900">
            Attached Documents ({attachedCIDs.length})
          </h3>
        </div>

        {attachedCIDs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <span className="text-4xl mb-4 block">📄</span>
            <p className="text-gray-500 font-medium">No documents attached yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Attach documents below to start monetizing them
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {attachedCIDs.map((attachedCID) => (
              <div
                key={attachedCID.cid}
                className="card-gradient p-6 hover:shadow-lg transition-all duration-200 animate-slide-up"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <span className="text-2xl">
                      {getMimeTypeIcon(attachedCID.mimeType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {attachedCID.documentName}
                      </h4>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        <span key={`size-${attachedCID.cid}`}>📊 {formatFileSize(attachedCID.fileSize)}</span>
                        <span key={`date-${attachedCID.cid}`}>📅 {formatDate(attachedCID.uploadDate)}</span>
                        <span key={`cid-${attachedCID.cid}`} className="font-mono text-xs truncate max-w-xs">
                          🔗 {attachedCID.cid}
                        </span>
                      </div>
                      
                      {/* Gateway URL */}
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-blue-600 mb-1 font-medium">
                              🔗 Gateway URL:
                            </p>
                            <p className="text-sm text-blue-900 font-mono truncate">
                              {attachedCID.gatewayUrl}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopyUrl(attachedCID.gatewayUrl, attachedCID.cid)}
                            className={`ml-3 px-3 py-1 text-xs transition-all duration-200 ${
                              copySuccess === attachedCID.cid ? 'btn-success' : 'btn-primary'
                            }`}
                          >
                            {copySuccess === attachedCID.cid ? '✅ Copied' : '📋 Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDetachCID(attachedCID.cid)}
                    disabled={isDetaching === attachedCID.cid}
                    className="ml-4 btn-secondary hover:bg-red-50 hover:text-red-600 text-sm transform hover:scale-105 transition-all duration-200"
                  >
                    {isDetaching === attachedCID.cid ? (
                      <>🔄 Detaching...</>
                    ) : (
                      <>🗑️ Detach</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available CIDs Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📁</span>
            <h3 className="text-xl font-semibold text-gray-900">
              Available Documents ({availableCIDs.length})
            </h3>
          </div>
          
          {availableCIDs.length > 0 && (
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedCIDs.size === availableCIDs.length && availableCIDs.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Select All</span>
              </label>
              
              {selectedCIDs.size > 0 && (
                <button
                  onClick={handleBulkAttach}
                  disabled={isBulkAttaching}
                  className="btn-primary text-sm transform hover:scale-105 transition-all duration-200"
                >
                  {isBulkAttaching ? (
                    <>🔄 Attaching {selectedCIDs.size}...</>
                  ) : (
                    <>📎 Attach Selected ({selectedCIDs.size})</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {availableCIDs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <span className="text-4xl mb-4 block">📂</span>
            <p className="text-gray-500 font-medium">No available documents</p>
            <p className="text-sm text-gray-400 mt-1">
              Upload documents first to attach them to payment instructions
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {availableCIDs.map((document) => (
              <div
                key={document.cid}
                className="card-gradient p-6 hover:shadow-lg transition-all duration-200 animate-slide-up"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedCIDs.has(document.cid)}
                      onChange={(e) => handleSelectCID(document.cid, e.target.checked)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    
                    <span className="text-2xl">
                      {getMimeTypeIcon(document.mimeType)}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {document.name}
                      </h4>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        <span key={`size-${document.cid}`}>📊 {formatFileSize(document.size)}</span>
                        <span key={`date-${document.cid}`}>📅 {formatDate(document.createdAt)}</span>
                        <span key={`creator-${document.cid}`}>👤 {document.metadata.creator}</span>
                      </div>
                      <div className="mt-2">
                        <span className="font-mono text-xs text-gray-400 truncate max-w-xs block">
                          🔗 {document.cid}
                        </span>
                      </div>
                      
                      {document.isMonetized && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⚠️ Already monetized
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleAttachCID(document.cid)}
                    disabled={isAttaching === document.cid || document.isMonetized}
                    className="ml-4 btn-primary text-sm transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAttaching === document.cid ? (
                      <>🔄 Attaching...</>
                    ) : document.isMonetized ? (
                      <>⚠️ Already Attached</>
                    ) : (
                      <>📎 Attach</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-start space-x-3">
          <span className="text-blue-600 text-lg">💡</span>
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              How CID Management Works
            </h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p key="attach-help">• <strong>Attach:</strong> Link documents to this payment instruction to monetize them</p>
              <p key="detach-help">• <strong>Detach:</strong> Remove documents from this payment instruction (stops monetization)</p>
              <p key="gateway-help">• <strong>Gateway URLs:</strong> Share these links with buyers to enable paid access</p>
              <p key="bulk-help">• <strong>Bulk Operations:</strong> Select multiple documents to attach them all at once</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}