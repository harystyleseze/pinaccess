'use client'

import { useState, useCallback } from 'react'
import { Copy, Check, Link2, Trash2, Paperclip, FolderOpen, Info } from 'lucide-react'
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

  return (
    <div className="space-y-8" data-payment-instruction-id={paymentInstructionId}>
      {/* Attached CIDs Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Paperclip className="w-5 h-5 text-[var(--brand-teal)]" />
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">
            Attached Documents ({attachedCIDs.length})
          </h3>
        </div>

        {attachedCIDs.length === 0 ? (
          <div className="text-center py-12 bg-[var(--surface-elevated)] rounded-xl border-2 border-dashed border-[var(--border)]">
            <p className="text-[var(--text-muted)] font-medium">No documents attached yet</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Attach documents below to start monetizing them
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {attachedCIDs.map((attachedCID) => (
              <div
                key={attachedCID.cid}
                className="card p-6 animate-slide-up"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[var(--text-primary)] truncate">
                        {attachedCID.documentName}
                      </h4>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-[var(--text-muted)]">
                        <span key={`size-${attachedCID.cid}`}>{formatFileSize(attachedCID.fileSize)}</span>
                        <span key={`date-${attachedCID.cid}`}>{formatDate(attachedCID.uploadDate)}</span>
                        <span key={`cid-${attachedCID.cid}`} className="font-mono text-xs truncate max-w-xs">
                          {attachedCID.cid}
                        </span>
                      </div>

                      {/* Gateway URL */}
                      <div className="mt-3 p-3 bg-[var(--primary-light)] rounded-lg border border-[var(--brand-teal)]/20">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[var(--brand-teal)] mb-1 font-medium">
                              Gateway URL
                            </p>
                            <p className="text-sm text-[var(--text-primary)] font-mono truncate">
                              {attachedCID.gatewayUrl}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopyUrl(attachedCID.gatewayUrl, attachedCID.cid)}
                            className={`ml-3 btn-sm ${
                              copySuccess === attachedCID.cid ? 'btn-success' : 'btn-primary'
                            }`}
                          >
                            {copySuccess === attachedCID.cid ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copySuccess === attachedCID.cid ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDetachCID(attachedCID.cid)}
                    disabled={isDetaching === attachedCID.cid}
                    className="ml-4 btn-secondary btn-sm hover:bg-[var(--error-light)] hover:text-[var(--error)] hover:border-[var(--error)]"
                  >
                    {isDetaching === attachedCID.cid ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Detaching...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Detach
                      </>
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
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-[var(--brand-teal)]" />
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
              Available Documents ({availableCIDs.length})
            </h3>
          </div>

          {availableCIDs.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={selectedCIDs.size === availableCIDs.length && availableCIDs.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--brand-teal)] focus:ring-[var(--brand-teal)]"
                />
                <span>Select All</span>
              </label>

              {selectedCIDs.size > 0 && (
                <button
                  onClick={handleBulkAttach}
                  disabled={isBulkAttaching}
                  className="btn-primary btn-sm"
                >
                  {isBulkAttaching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Attaching {selectedCIDs.size}...
                    </>
                  ) : (
                    <>
                      <Paperclip className="w-4 h-4" />
                      Attach Selected ({selectedCIDs.size})
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {availableCIDs.length === 0 ? (
          <div className="text-center py-12 bg-[var(--surface-elevated)] rounded-xl border-2 border-dashed border-[var(--border)]">
            <p className="text-[var(--text-muted)] font-medium">No available documents</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Upload documents first to attach them to payment instructions
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {availableCIDs.map((document) => (
              <div
                key={document.cid}
                className="card p-6 animate-slide-up"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedCIDs.has(document.cid)}
                      onChange={(e) => handleSelectCID(document.cid, e.target.checked)}
                      className="mt-1 rounded border-[var(--border)] text-[var(--brand-teal)] focus:ring-[var(--brand-teal)]"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[var(--text-primary)] truncate">
                        {document.name}
                      </h4>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-[var(--text-muted)]">
                        <span key={`size-${document.cid}`}>{formatFileSize(document.size)}</span>
                        <span key={`date-${document.cid}`}>{formatDate(document.createdAt)}</span>
                        <span key={`creator-${document.cid}`}>{document.metadata.creator}</span>
                      </div>
                      <div className="mt-2">
                        <span className="font-mono text-xs text-[var(--text-muted)] truncate max-w-xs block">
                          {document.cid}
                        </span>
                      </div>

                      {document.isMonetized && (
                        <div className="mt-2">
                          <span className="badge badge-warning">
                            Already monetized
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAttachCID(document.cid)}
                    disabled={isAttaching === document.cid || document.isMonetized}
                    className="ml-4 btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAttaching === document.cid ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Attaching...
                      </>
                    ) : document.isMonetized ? (
                      'Already Attached'
                    ) : (
                      <>
                        <Paperclip className="w-4 h-4" />
                        Attach
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="p-4 bg-[var(--info-light)] rounded-xl border border-[var(--info)]/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[var(--info)] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-[var(--info)] mb-2">
              How CID Management Works
            </h4>
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <p key="attach-help"><strong>Attach:</strong> Link documents to this payment instruction to monetize them</p>
              <p key="detach-help"><strong>Detach:</strong> Remove documents from this payment instruction (stops monetization)</p>
              <p key="gateway-help"><strong>Gateway URLs:</strong> Share these links with buyers to enable paid access</p>
              <p key="bulk-help"><strong>Bulk Operations:</strong> Select multiple documents to attach them all at once</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
