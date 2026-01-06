import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CIDManager from '@/components/ui/CIDManager'
import { AttachedCID, Document } from '@/lib/types'

describe('CIDManager Component', () => {
  const mockAttachedCIDs: AttachedCID[] = [
    {
      cid: 'test-cid-1',
      documentName: 'Test Document 1',
      fileSize: 1024,
      mimeType: 'application/pdf',
      uploadDate: '2024-01-01T00:00:00Z',
      gatewayUrl: 'https://gateway.test/test-cid-1',
      paymentInstructionId: 'test-pi-1'
    },
    {
      cid: 'test-cid-2',
      documentName: 'Test Document 2',
      fileSize: 2048,
      mimeType: 'text/plain',
      uploadDate: '2024-01-02T00:00:00Z',
      gatewayUrl: 'https://gateway.test/test-cid-2',
      paymentInstructionId: 'test-pi-1'
    }
  ]

  const mockAvailableCIDs: Document[] = [
    {
      id: 'doc-1',
      cid: 'available-cid-1',
      name: 'Available Document 1',
      size: 512,
      mimeType: 'application/pdf',
      createdAt: '2024-01-03T00:00:00Z',
      isMonetized: false,
      metadata: {
        creator: 'Test Creator',
        uploadTimestamp: '2024-01-03T00:00:00Z',
        status: 'uploaded' as const
      }
    }
  ]

  const mockProps = {
    paymentInstructionId: 'test-pi-1',
    attachedCIDs: mockAttachedCIDs,
    availableCIDs: mockAvailableCIDs,
    onAttachCID: vi.fn(),
    onDetachCID: vi.fn(),
    onBulkAttach: vi.fn()
  }

  it('renders without React key warnings', () => {
    // Mock console.error to catch React warnings
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<CIDManager {...mockProps} />)
    
    // Check that attached documents are rendered
    expect(screen.getByText('Test Document 1')).toBeInTheDocument()
    expect(screen.getByText('Test Document 2')).toBeInTheDocument()
    
    // Check that available documents are rendered
    expect(screen.getByText('Available Document 1')).toBeInTheDocument()
    
    // Check that help text is rendered
    expect(screen.getByText('How CID Management Works')).toBeInTheDocument()
    
    // Verify no React key warnings were logged
    const keyWarnings = consoleSpy.mock.calls.filter(call => 
      call[0]?.includes?.('Warning: Each child in a list should have a unique "key" prop')
    )
    expect(keyWarnings).toHaveLength(0)
    
    consoleSpy.mockRestore()
  })

  it('renders empty states correctly', () => {
    const emptyProps = {
      ...mockProps,
      attachedCIDs: [],
      availableCIDs: []
    }
    
    render(<CIDManager {...emptyProps} />)
    
    expect(screen.getByText('No documents attached yet')).toBeInTheDocument()
    expect(screen.getByText('No available documents')).toBeInTheDocument()
  })
})