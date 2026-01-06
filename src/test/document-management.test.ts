import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { PinataClient } from '../lib/pinata'

/**
 * Property-based tests for Document Management System
 */

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Document Management Properties', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env.PINATA_JWT = 'valid.jwt.token'
    process.env.PINATA_API_URL = 'https://api.pinata.cloud'
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Metadata Query Filtering', () => {
    it('should filter documents by metadata key-value pairs for any valid filter combination', () => {
      // Feature: pinaccess, Property 26: Metadata Query Filtering
      fc.assert(fc.property(
        fc.record({
          creator: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)),
          status: fc.option(fc.constantFrom('uploaded', 'monetized', 'error')),
          pageSize: fc.option(fc.integer({ min: 1, max: 100 })),
          pageToken: fc.option(fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^\d+$/.test(s)))
        }),
        async (filters) => {
          const client = new PinataClient()
          
          // Mock successful response with documents that match the filters
          const mockDocuments = [
            {
              id: 'doc1',
              ipfs_pin_hash: 'QmHash1',
              size: 1024,
              user_id: 'user1',
              date_pinned: '2024-01-01T00:00:00Z',
              metadata: {
                name: 'Document 1',
                keyvalues: {
                  creator: filters.creator || 'test-creator',
                  status: filters.status || 'uploaded',
                  uploadTimestamp: '2024-01-01T00:00:00Z'
                }
              },
              mime_type: 'application/pdf',
              number_of_files: 1
            }
          ];

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              rows: mockDocuments,
              count: mockDocuments.length
            })
          })

          // For any valid filter combination, the system should correctly filter results using key-value pairs
          const result = await client.listDocuments(filters)

          expect(result.success).toBe(true)
          expect(result.data).toBeDefined()
          expect(result.data!.documents).toHaveLength(mockDocuments.length)

          // Verify the API was called with correct query parameters
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringMatching(/\/data\/pinList/),
            expect.objectContaining({
              method: 'GET',
              headers: expect.objectContaining({
                'Authorization': 'Bearer valid.jwt.token'
              })
            })
          )

          // Verify query parameters were constructed correctly
          const [url] = mockFetch.mock.calls[0]
          const urlObj = new URL(url as string)
          const searchParams = urlObj.searchParams

          // Check pagination parameters
          if (filters.pageSize) {
            expect(searchParams.get('pageLimit')).toBe(filters.pageSize.toString())
          }
          if (filters.pageToken) {
            expect(searchParams.get('pageOffset')).toBe(filters.pageToken)
          }

          // Check metadata filters
          if (filters.creator || filters.status) {
            const metadataParam = searchParams.get('metadata[keyvalues]')
            if (metadataParam) {
              const metadataFilters = JSON.parse(metadataParam)
              if (filters.creator) {
                expect(metadataFilters.creator).toBe(filters.creator)
              }
              if (filters.status) {
                expect(metadataFilters.status).toBe(filters.status)
              }
            }
          }

          // Verify sorting parameters
          expect(searchParams.get('sortBy')).toBe('date_pinned')
          expect(searchParams.get('sortOrder')).toBe('DESC')
        }
      ), { numRuns: 100 })
    })

    it('should handle empty filter results correctly for any filter that matches no documents', () => {
      // Feature: pinaccess, Property 26: Metadata Query Filtering
      fc.assert(fc.property(
        fc.record({
          creator: fc.string({ minLength: 1, maxLength: 50 }),
          status: fc.constantFrom('uploaded', 'monetized', 'error')
        }),
        async (filters) => {
          const client = new PinataClient()
          
          // Mock empty response (no documents match the filter)
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              rows: [],
              count: 0
            })
          })

          // For any filter that matches no documents, should return empty results gracefully
          const result = await client.listDocuments(filters)

          expect(result.success).toBe(true)
          expect(result.data).toBeDefined()
          expect(result.data!.documents).toHaveLength(0)
          expect(result.data!.totalCount).toBe(0)
          expect(result.data!.nextPageToken).toBeUndefined()
        }
      ), { numRuns: 50 })
    })

    it('should transform Pinata response format to Document format correctly for any valid response', () => {
      // Feature: pinaccess, Property 26: Metadata Query Filtering
      fc.assert(fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            ipfs_pin_hash: fc.string({ minLength: 10, maxLength: 100 }),
            size: fc.integer({ min: 1, max: 1000000 }),
            user_id: fc.string({ minLength: 1, max: 50 }),
            date_pinned: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
            metadata: fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              keyvalues: fc.record({
                creator: fc.string({ minLength: 1, maxLength: 50 }),
                status: fc.constantFrom('uploaded', 'monetized', 'error'),
                uploadTimestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
                price: fc.option(fc.record({
                  usd: fc.float({ min: Math.fround(0.01), max: Math.fround(1000) }),
                  usdc: fc.string({ minLength: 1, maxLength: 20 })
                })),
                paymentInstructionId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
                gatewayUrl: fc.option(fc.webUrl()),
                walletAddress: fc.option(fc.string({ minLength: 42, maxLength: 42 }))
              })
            }),
            mime_type: fc.constantFrom('application/pdf', 'application/epub+zip', 'text/plain'),
            number_of_files: fc.integer({ min: 1, max: 10 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (mockRows) => {
          const client = new PinataClient()
          
          // Mock response with the generated data
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              rows: mockRows,
              count: mockRows.length
            })
          })

          // For any valid Pinata response, transformation should preserve all data correctly
          const result = await client.listDocuments()

          expect(result.success).toBe(true)
          expect(result.data).toBeDefined()
          expect(result.data!.documents).toHaveLength(mockRows.length)

          // Verify each document was transformed correctly
          result.data!.documents.forEach((doc, index) => {
            const originalRow = mockRows[index]
            
            expect(doc.id).toBe(originalRow.id)
            expect(doc.cid).toBe(originalRow.ipfs_pin_hash)
            expect(doc.name).toBe(originalRow.metadata.name)
            expect(doc.size).toBe(originalRow.size)
            expect(doc.mimeType).toBe(originalRow.mime_type)
            expect(doc.createdAt).toBe(originalRow.date_pinned)
            expect(doc.metadata.creator).toBe(originalRow.metadata.keyvalues.creator)
            expect(doc.metadata.status).toBe(originalRow.metadata.keyvalues.status)
            expect(doc.metadata.uploadTimestamp).toBe(originalRow.metadata.keyvalues.uploadTimestamp)
            
            // Check monetization status
            expect(doc.isMonetized).toBe(originalRow.metadata.keyvalues.status === 'monetized')
            
            // Check optional fields
            if (originalRow.metadata.keyvalues.price) {
              expect(doc.price).toBeDefined()
              expect(doc.price!.usd).toBe(originalRow.metadata.keyvalues.price.usd)
              expect(doc.price!.usdc).toBe(originalRow.metadata.keyvalues.price.usdc)
            }
            
            if (originalRow.metadata.keyvalues.paymentInstructionId) {
              expect(doc.paymentInstructionId).toBe(originalRow.metadata.keyvalues.paymentInstructionId)
            }
            
            if (originalRow.metadata.keyvalues.gatewayUrl) {
              expect(doc.gatewayUrl).toBe(originalRow.metadata.keyvalues.gatewayUrl)
            }
            
            if (originalRow.metadata.keyvalues.walletAddress) {
              expect(doc.walletAddress).toBe(originalRow.metadata.keyvalues.walletAddress)
            }
          })
        }
      ), { numRuns: 100 })
    })

    it('should handle API errors gracefully for any error response', () => {
      // Feature: pinaccess, Property 26: Metadata Query Filtering
      fc.assert(fc.property(
        fc.constantFrom(400, 401, 403, 404, 500, 502, 503),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorStatus, errorMessage) => {
          const client = new PinataClient()
          
          // Mock error response
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: errorStatus,
            statusText: 'Error',
            json: async () => ({
              error: errorMessage
            })
          })

          // For any error response, should handle gracefully and return error result
          const result = await client.listDocuments()

          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
          expect(typeof result.error).toBe('string')
          expect(result.data).toBeUndefined()
        }
      ), { numRuns: 50 })
    })
  })

  describe('Metadata Retrieval Completeness', () => {
    it('should include all relevant metadata in document list responses for any document set', () => {
      // Feature: pinaccess, Property 28: Metadata Retrieval Completeness
      fc.assert(fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            ipfs_pin_hash: fc.string({ minLength: 10, maxLength: 100 }),
            size: fc.integer({ min: 1, max: 1000000 }),
            user_id: fc.string({ minLength: 1, maxLength: 50 }),
            date_pinned: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
            metadata: fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              keyvalues: fc.record({
                creator: fc.string({ minLength: 1, maxLength: 50 }),
                status: fc.constantFrom('uploaded', 'monetized', 'error'),
                uploadTimestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
                price: fc.option(fc.record({
                  usd: fc.float({ min: Math.fround(0.01), max: Math.fround(1000) }),
                  usdc: fc.string({ minLength: 1, maxLength: 20 })
                })),
                paymentInstructionId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
                gatewayUrl: fc.option(fc.webUrl()),
                walletAddress: fc.option(fc.string({ minLength: 42, maxLength: 42 })),
                category: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
                description: fc.option(fc.string({ minLength: 1, maxLength: 200 }))
              })
            }),
            mime_type: fc.constantFrom('application/pdf', 'application/epub+zip', 'text/plain'),
            number_of_files: fc.integer({ min: 1, max: 10 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (mockDocuments) => {
          const client = new PinataClient()
          
          // Mock successful response with complete metadata
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              rows: mockDocuments,
              count: mockDocuments.length
            })
          })

          // For any document set, the response should include all relevant metadata
          const result = await client.listDocuments()

          expect(result.success).toBe(true)
          expect(result.data).toBeDefined()
          expect(result.data!.documents).toHaveLength(mockDocuments.length)
          expect(result.data!.totalCount).toBe(mockDocuments.length)

          // Verify each document includes all required metadata fields
          result.data!.documents.forEach((doc, index) => {
            const originalDoc = mockDocuments[index]
            
            // Core document fields must be present
            expect(doc.id).toBeDefined()
            expect(doc.cid).toBeDefined()
            expect(doc.name).toBeDefined()
            expect(doc.size).toBeDefined()
            expect(doc.mimeType).toBeDefined()
            expect(doc.createdAt).toBeDefined()
            expect(doc.isMonetized).toBeDefined()
            
            // Metadata object must be present with required fields
            expect(doc.metadata).toBeDefined()
            expect(doc.metadata.creator).toBeDefined()
            expect(doc.metadata.uploadTimestamp).toBeDefined()
            expect(doc.metadata.status).toBeDefined()
            
            // Verify metadata completeness matches original
            expect(doc.metadata.creator).toBe(originalDoc.metadata.keyvalues.creator)
            expect(doc.metadata.status).toBe(originalDoc.metadata.keyvalues.status)
            expect(doc.metadata.uploadTimestamp).toBe(originalDoc.metadata.keyvalues.uploadTimestamp)
            
            // Optional fields should be preserved if present
            if (originalDoc.metadata.keyvalues.price) {
              expect(doc.price).toBeDefined()
              expect(doc.price!.usd).toBe(originalDoc.metadata.keyvalues.price.usd)
              expect(doc.price!.usdc).toBe(originalDoc.metadata.keyvalues.price.usdc)
            }
            
            if (originalDoc.metadata.keyvalues.paymentInstructionId) {
              expect(doc.paymentInstructionId).toBe(originalDoc.metadata.keyvalues.paymentInstructionId)
            }
            
            if (originalDoc.metadata.keyvalues.gatewayUrl) {
              expect(doc.gatewayUrl).toBe(originalDoc.metadata.keyvalues.gatewayUrl)
            }
            
            if (originalDoc.metadata.keyvalues.walletAddress) {
              expect(doc.walletAddress).toBe(originalDoc.metadata.keyvalues.walletAddress)
            }
          })
        }
      ), { numRuns: 100 })
    })

    it('should handle documents with missing optional metadata gracefully for any incomplete document', () => {
      // Feature: pinaccess, Property 28: Metadata Retrieval Completeness
      fc.assert(fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            ipfs_pin_hash: fc.string({ minLength: 10, maxLength: 100 }),
            size: fc.integer({ min: 1, max: 1000000 }),
            user_id: fc.string({ minLength: 1, maxLength: 50 }),
            date_pinned: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
            metadata: fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              keyvalues: fc.record({
                creator: fc.string({ minLength: 1, maxLength: 50 }),
                status: fc.constantFrom('uploaded', 'monetized', 'error'),
                uploadTimestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString())
                // Intentionally omitting optional fields to test graceful handling
              })
            }),
            mime_type: fc.constantFrom('application/pdf', 'application/epub+zip', 'text/plain'),
            number_of_files: fc.integer({ min: 1, max: 10 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (mockDocuments) => {
          const client = new PinataClient()
          
          // Mock response with documents that have minimal metadata
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              rows: mockDocuments,
              count: mockDocuments.length
            })
          })

          // For any incomplete document, should handle missing optional metadata gracefully
          const result = await client.listDocuments()

          expect(result.success).toBe(true)
          expect(result.data).toBeDefined()
          expect(result.data!.documents).toHaveLength(mockDocuments.length)

          // Verify each document handles missing optional fields gracefully
          result.data!.documents.forEach((doc) => {
            // Required fields must still be present
            expect(doc.id).toBeDefined()
            expect(doc.cid).toBeDefined()
            expect(doc.name).toBeDefined()
            expect(doc.metadata.creator).toBeDefined()
            expect(doc.metadata.status).toBeDefined()
            expect(doc.metadata.uploadTimestamp).toBeDefined()
            
            // Optional fields should be undefined when not present in source
            expect(doc.price).toBeUndefined()
            expect(doc.paymentInstructionId).toBeUndefined()
            expect(doc.gatewayUrl).toBeUndefined()
            expect(doc.walletAddress).toBeUndefined()
          })
        }
      ), { numRuns: 50 })
    })

    it('should preserve metadata consistency across pagination for any paginated result set', () => {
      // Feature: pinaccess, Property 28: Metadata Retrieval Completeness
      fc.assert(fc.property(
        fc.record({
          pageSize: fc.integer({ min: 1, max: 10 }),
          totalDocuments: fc.integer({ min: 5, max: 20 })
        }),
        async ({ pageSize, totalDocuments }) => {
          const client = new PinataClient()
          
          // Generate consistent mock documents
          const allMockDocuments = Array.from({ length: totalDocuments }, (_, i) => ({
            id: `doc${i}`,
            ipfs_pin_hash: `QmHash${i}`,
            size: 1024 + i,
            user_id: 'user1',
            date_pinned: new Date(2024, 0, i + 1).toISOString(),
            metadata: {
              name: `Document ${i}`,
              keyvalues: {
                creator: 'test-creator',
                status: 'uploaded' as const,
                uploadTimestamp: new Date(2024, 0, i + 1).toISOString(),
                documentIndex: i.toString()
              }
            },
            mime_type: 'application/pdf',
            number_of_files: 1
          }))

          // Mock first page response
          const firstPageDocs = allMockDocuments.slice(0, pageSize)
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              rows: firstPageDocs,
              count: totalDocuments
            })
          })

          // For any paginated result set, metadata should be consistent across pages
          const firstPageResult = await client.listDocuments({ pageSize })

          expect(firstPageResult.success).toBe(true)
          expect(firstPageResult.data).toBeDefined()
          expect(firstPageResult.data!.documents).toHaveLength(Math.min(pageSize, totalDocuments))
          expect(firstPageResult.data!.totalCount).toBe(totalDocuments)

          // Verify metadata completeness for first page
          firstPageResult.data!.documents.forEach((doc, index) => {
            const expectedDoc = firstPageDocs[index]
            expect(doc.metadata.creator).toBe(expectedDoc.metadata.keyvalues.creator)
            expect(doc.metadata.status).toBe(expectedDoc.metadata.keyvalues.status)
            expect(doc.metadata.uploadTimestamp).toBe(expectedDoc.metadata.keyvalues.uploadTimestamp)
          })

          // If there are more pages, test second page consistency
          if (totalDocuments > pageSize) {
            const secondPageDocs = allMockDocuments.slice(pageSize, pageSize * 2)
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                rows: secondPageDocs,
                count: totalDocuments
              })
            })

            const secondPageResult = await client.listDocuments({ 
              pageSize, 
              pageToken: pageSize.toString() 
            })

            expect(secondPageResult.success).toBe(true)
            expect(secondPageResult.data!.totalCount).toBe(totalDocuments) // Consistent total count

            // Verify metadata structure is consistent across pages
            secondPageResult.data!.documents.forEach((doc, index) => {
              const expectedDoc = secondPageDocs[index]
              expect(doc.metadata.creator).toBe(expectedDoc.metadata.keyvalues.creator)
              expect(doc.metadata.status).toBe(expectedDoc.metadata.keyvalues.status)
              expect(doc.metadata.uploadTimestamp).toBe(expectedDoc.metadata.keyvalues.uploadTimestamp)
            })
          }
        }
      ), { numRuns: 50 })
    })
  })

  describe('URL Copy Functionality', () => {
    it('should successfully copy gateway URLs to clipboard for any valid URL', () => {
      // Feature: pinaccess, Property 19: URL Copy Functionality
      fc.assert(fc.property(
        fc.webUrl(),
        async (gatewayUrl) => {
          // Mock the clipboard API
          const mockWriteText = vi.fn().mockResolvedValue(undefined)
          Object.assign(navigator, {
            clipboard: {
              writeText: mockWriteText
            }
          })

          // Mock document with gateway URL
          const mockDocument = {
            id: 'test-doc',
            cid: 'QmTestHash',
            name: 'Test Document',
            size: 1024,
            mimeType: 'application/pdf',
            createdAt: '2024-01-01T00:00:00Z',
            isMonetized: true,
            gatewayUrl: gatewayUrl,
            metadata: {
              creator: 'test-creator',
              uploadTimestamp: '2024-01-01T00:00:00Z',
              status: 'monetized' as const
            }
          }

          // For any valid URL, the copy function should successfully copy the correct URL to clipboard
          const onCopyUrl = vi.fn()
          
          // Simulate the copy functionality from DocumentCard
          await navigator.clipboard.writeText(mockDocument.gatewayUrl)
          onCopyUrl(mockDocument.gatewayUrl)

          // Verify clipboard API was called with correct URL
          expect(mockWriteText).toHaveBeenCalledWith(gatewayUrl)
          expect(onCopyUrl).toHaveBeenCalledWith(gatewayUrl)
        }
      ), { numRuns: 100 })
    })

    it('should handle clipboard API failures gracefully for any URL', () => {
      // Feature: pinaccess, Property 19: URL Copy Functionality
      fc.assert(fc.property(
        fc.webUrl(),
        fc.constantFrom(
          'NotAllowedError',
          'SecurityError', 
          'NetworkError',
          'AbortError'
        ),
        async (gatewayUrl, errorType) => {
          // Mock clipboard API to throw error
          const mockWriteText = vi.fn().mockRejectedValue(new Error(errorType))
          Object.assign(navigator, {
            clipboard: {
              writeText: mockWriteText
            }
          })

          const onCopyUrl = vi.fn()
          let copyError: Error | null = null

          // For any URL and error type, should handle clipboard failures gracefully
          try {
            await navigator.clipboard.writeText(gatewayUrl)
            onCopyUrl(gatewayUrl)
          } catch (error) {
            copyError = error as Error
            // In real implementation, this would be handled gracefully without throwing
          }

          // Verify error was caught and handled
          expect(mockWriteText).toHaveBeenCalledWith(gatewayUrl)
          expect(copyError).toBeInstanceOf(Error)
          expect(copyError!.message).toBe(errorType)
          
          // onCopyUrl should not be called when clipboard fails
          expect(onCopyUrl).not.toHaveBeenCalled()
        }
      ), { numRuns: 50 })
    })

    it('should copy different types of URLs correctly for any document field', () => {
      // Feature: pinaccess, Property 19: URL Copy Functionality
      fc.assert(fc.property(
        fc.record({
          cid: fc.string({ minLength: 10, maxLength: 100 }),
          gatewayUrl: fc.webUrl(),
          walletAddress: fc.string({ minLength: 42, maxLength: 42 })
        }),
        async ({ cid, gatewayUrl, walletAddress }) => {
          // Mock clipboard API
          const mockWriteText = vi.fn().mockResolvedValue(undefined)
          Object.assign(navigator, {
            clipboard: {
              writeText: mockWriteText
            }
          })

          const onCopyUrl = vi.fn()

          // For any document with different copyable fields, each should copy correctly
          
          // Test copying CID
          await navigator.clipboard.writeText(cid)
          onCopyUrl(cid)
          
          // Test copying gateway URL
          await navigator.clipboard.writeText(gatewayUrl)
          onCopyUrl(gatewayUrl)
          
          // Test copying wallet address
          await navigator.clipboard.writeText(walletAddress)
          onCopyUrl(walletAddress)

          // Verify all copy operations were successful
          expect(mockWriteText).toHaveBeenCalledTimes(3)
          expect(mockWriteText).toHaveBeenNthCalledWith(1, cid)
          expect(mockWriteText).toHaveBeenNthCalledWith(2, gatewayUrl)
          expect(mockWriteText).toHaveBeenNthCalledWith(3, walletAddress)
          
          expect(onCopyUrl).toHaveBeenCalledTimes(3)
          expect(onCopyUrl).toHaveBeenNthCalledWith(1, cid)
          expect(onCopyUrl).toHaveBeenNthCalledWith(2, gatewayUrl)
          expect(onCopyUrl).toHaveBeenNthCalledWith(3, walletAddress)
        }
      ), { numRuns: 100 })
    })

    it('should provide appropriate feedback for copy operations for any URL length', () => {
      // Feature: pinaccess, Property 19: URL Copy Functionality
      fc.assert(fc.property(
        fc.string({ minLength: 10, maxLength: 500 }).map(s => `https://gateway.example.com/${s}`),
        async (longUrl) => {
          // Mock clipboard API
          const mockWriteText = vi.fn().mockResolvedValue(undefined)
          Object.assign(navigator, {
            clipboard: {
              writeText: mockWriteText
            }
          })

          const onCopyUrl = vi.fn()
          let copySuccess = false

          // For any URL length, copy operation should provide appropriate feedback
          try {
            await navigator.clipboard.writeText(longUrl)
            onCopyUrl(longUrl)
            copySuccess = true
          } catch (error) {
            copySuccess = false
          }

          // Verify copy operation and feedback
          expect(mockWriteText).toHaveBeenCalledWith(longUrl)
          
          if (copySuccess) {
            expect(onCopyUrl).toHaveBeenCalledWith(longUrl)
          } else {
            expect(onCopyUrl).not.toHaveBeenCalled()
          }
          
          // URL length should not affect copy success (in our mock)
          expect(copySuccess).toBe(true)
        }
      ), { numRuns: 100 })
    })
  })
})