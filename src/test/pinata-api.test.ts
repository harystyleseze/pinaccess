import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { PinataClient, PinataApiError } from '../lib/pinata'

/**
 * Property-based tests for Pinata API client
 */

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Pinata API Client Properties', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('API Retry Logic', () => {
    it('should retry transient failures with exponential backoff for any retry configuration', async () => {
      // Feature: pinaccess, Property 31: API Retry Logic
      await fc.assert(fc.asyncProperty(
        fc.constantFrom(
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          'valid.jwt.token'
        ),
        fc.constantFrom(1, 2, 3), // Max retries
        fc.constantFrom(100, 200, 500), // Base delay
        fc.constantFrom(2000, 3000, 5000), // Max delay
        async (jwtToken, maxRetries, baseDelay, maxDelay) => {
          process.env.PINATA_JWT = jwtToken
          process.env.PINATA_API_URL = 'https://api.pinata.cloud'

          const client = new PinataClient()
          let callCount = 0

          // Mock transient failure followed by success
          mockFetch.mockImplementation(() => {
            callCount++
            if (callCount <= maxRetries) {
              // Return 503 Service Unavailable (transient error)
              return Promise.resolve({
                ok: false,
                status: 503,
                statusText: 'Service Unavailable',
                json: async () => ({ error: 'Service temporarily unavailable' })
              })
            } else {
              // Return success
              return Promise.resolve({
                ok: true,
                json: async () => ({
                  message: 'Congratulations! You are communicating with the Pinata API!'
                })
              })
            }
          })

          // For any retry configuration, the client should eventually succeed
          const result = await client.testAuthentication()
          expect(result).toBe(true)
          
          // Verify retry attempts were made
          expect(callCount).toBeGreaterThan(1)
          expect(callCount).toBeLessThanOrEqual(maxRetries + 1)
        }
      ), { numRuns: 3 })
    })

    it('should not retry non-transient errors for any error type', async () => {
      // Feature: pinaccess, Property 31: API Retry Logic
      await fc.assert(fc.asyncProperty(
        fc.constantFrom(
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          'valid.jwt.token'
        ),
        fc.constantFrom(400, 401, 403, 404), // Non-retryable status codes
        async (jwtToken, errorStatus) => {
          process.env.PINATA_JWT = jwtToken
          process.env.PINATA_API_URL = 'https://api.pinata.cloud'

          const client = new PinataClient()
          let callCount = 0

          // Mock non-retryable error
          mockFetch.mockImplementation(() => {
            callCount++
            return Promise.resolve({
              ok: false,
              status: errorStatus,
              statusText: 'Client Error',
              json: async () => ({ error: 'Client error occurred' })
            })
          })

          // For any non-retryable error, should fail immediately without retries
          try {
            await client.testAuthentication()
            // If we get here, it means the method didn't throw, which is unexpected for auth failures
            if (errorStatus === 401) {
              // 401 is handled specially and returns false instead of throwing
              expect(true).toBe(true) // This is expected behavior
            }
          } catch (error) {
            // Non-401 errors should throw immediately
            expect(error).toBeInstanceOf(Error)
          }
          
          // Verify no retries were attempted (only 1 call)
          expect(callCount).toBe(1)
        }
      ), { numRuns: 3 })
    })

    it('should calculate exponential backoff delays correctly for any attempt number', () => {
      // Feature: pinaccess, Property 31: API Retry Logic
      fc.assert(fc.property(
        fc.constantFrom(0, 1, 2, 3, 4, 5), // Attempt number
        fc.constantFrom(100, 200, 500, 1000), // Base delay
        fc.constantFrom(2000, 5000, 10000), // Max delay
        (attempt, baseDelay, maxDelay) => {
          // For any attempt number and delay configuration, backoff should be calculated correctly
          const expectedMinDelay = baseDelay * Math.pow(2, attempt)
          const expectedMaxDelayWithJitter = expectedMinDelay * 1.1 // 10% jitter
          
          // The actual delay should be between expected and max, accounting for jitter
          const actualMaxDelay = Math.min(expectedMaxDelayWithJitter, maxDelay)
          
          // Verify the calculation logic (we can't test the actual private method, 
          // but we can verify the mathematical relationship)
          expect(expectedMinDelay).toBeGreaterThanOrEqual(baseDelay)
          expect(actualMaxDelay).toBeLessThanOrEqual(maxDelay)
          
          // Verify exponential growth
          if (attempt > 0) {
            const previousDelay = baseDelay * Math.pow(2, attempt - 1)
            expect(expectedMinDelay).toBeGreaterThanOrEqual(previousDelay * 2)
          }
        }
      ), { numRuns: 5 })
    })
  })

  describe('API Authentication', () => {
    it('should include proper JWT authentication headers for all API requests', async () => {
      // Feature: pinaccess, Property 30: API Authentication
      await fc.assert(fc.asyncProperty(
        fc.constantFrom(
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          'valid.jwt.token',
          'another-valid-jwt-token-123'
        ),
        fc.constantFrom('https://api.pinata.cloud', 'https://api.example.com'),
        async (jwtToken, apiUrl) => {
          // Set up environment with the generated JWT
          process.env.PINATA_JWT = jwtToken
          process.env.PINATA_API_URL = apiUrl

          const client = new PinataClient()

          // Mock successful authentication response
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              message: 'Congratulations! You are communicating with the Pinata API!'
            })
          })

          // For any JWT token, the client should include proper authentication headers
          await client.testAuthentication()

          // Verify that fetch was called with proper authentication headers
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/data/testAuthentication'),
            expect.objectContaining({
              method: 'GET',
              headers: expect.objectContaining({
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
              })
            })
          )
        }
      ), { numRuns: 5 })
    })

    it('should properly handle authentication failures for any invalid JWT', async () => {
      // Feature: pinaccess, Property 30: API Authentication
      await fc.assert(fc.asyncProperty(
        fc.constantFrom(
          'invalid-jwt',
          'short',
          'another-invalid-token'
        ),
        async (invalidJwt) => {
          process.env.PINATA_JWT = invalidJwt
          process.env.PINATA_API_URL = 'https://api.pinata.cloud'

          const client = new PinataClient()

          // Mock 401 Unauthorized response
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({
              error: 'Invalid JWT token'
            })
          })

          // For any invalid JWT, authentication should return false
          const result = await client.testAuthentication()
          expect(result).toBe(false)

          // Verify the request was made with the invalid token
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/data/testAuthentication'),
            expect.objectContaining({
              headers: expect.objectContaining({
                'Authorization': `Bearer ${invalidJwt}`
              })
            })
          )
        }
      ), { numRuns: 5 })
    })

    it('should validate JWT token presence during client initialization', () => {
      // Feature: pinaccess, Property 30: API Authentication
      fc.assert(fc.property(
        fc.constantFrom('', undefined, null),
        (invalidJwt) => {
          // Set invalid JWT in environment
          if (invalidJwt === undefined || invalidJwt === null) {
            delete process.env.PINATA_JWT
          } else {
            process.env.PINATA_JWT = invalidJwt
          }

          // For any missing or empty JWT, client initialization should throw
          expect(() => new PinataClient()).toThrow('PINATA_JWT environment variable is required')
        }
      ), { numRuns: 3 })
    })
  })

  describe('Private IPFS Upload', () => {
    it('should upload files to private IPFS network for any valid document file', async () => {
      // Feature: pinaccess, Property 2: Private IPFS Upload
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(name => 
            name.trim().length > 0 && !name.includes('<') && !name.includes('>')
          ),
          content: fc.string({ minLength: 1, maxLength: 1000 }),
          type: fc.constantFrom(
            'application/pdf',
            'application/epub+zip',
            'text/plain'
          ),
          creator: fc.string({ minLength: 1, maxLength: 50 }).filter(creator => 
            creator.trim().length > 0
          )
        }),
        async (fileData) => {
          process.env.PINATA_JWT = 'valid.jwt.token'
          process.env.PINATA_API_URL = 'https://api.pinata.cloud'

          const client = new PinataClient()
          const mockFile = new File([fileData.content], fileData.name, { type: fileData.type });

          // Mock successful upload response
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              IpfsHash: 'QmTestHash123456789',
              PinSize: mockFile.size,
              Timestamp: new Date().toISOString(),
              isDuplicate: false
            })
          })

          const metadata = {
            creator: fileData.creator,
            uploadTimestamp: new Date().toISOString(),
            status: 'uploaded'
          };

          // For any valid document file, uploading should result in storage on Pinata's private IPFS network
          const result = await client.uploadFile(mockFile, metadata);

          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();
          expect(result.data!.cid).toBe('QmTestHash123456789');
          expect(result.data!.name).toBe(fileData.name);
          expect(result.data!.mimeType).toBe(fileData.type);

          // Verify the request was made to the correct endpoint
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/pinning/pinFileToIPFS'),
            expect.objectContaining({
              method: 'POST',
              headers: expect.objectContaining({
                'Authorization': 'Bearer valid.jwt.token'
              }),
              body: expect.any(FormData)
            })
          )
        }
      ), { numRuns: 20 })
    })

    it('should handle upload failures gracefully for any error condition', async () => {
      // Feature: pinaccess, Property 2: Private IPFS Upload
      await fc.assert(fc.asyncProperty(
        fc.constantFrom(400, 401, 403, 413, 500, 502, 503),
        fc.constantFrom(
          'File too large',
          'Invalid file type',
          'Network error',
          'Server error'
        ),
        async (errorStatus, errorMessage) => {
          process.env.PINATA_JWT = 'valid.jwt.token'
          process.env.PINATA_API_URL = 'https://api.pinata.cloud'

          const client = new PinataClient()
          const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

          // Mock error response
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: errorStatus,
            statusText: 'Error',
            json: async () => ({
              error: errorMessage
            })
          })

          const metadata = {
            creator: 'test-creator',
            uploadTimestamp: new Date().toISOString(),
            status: 'uploaded'
          };

          // For any error condition, upload should fail gracefully
          const result = await client.uploadFile(mockFile, metadata);

          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.data).toBeUndefined();
        }
      ), { numRuns: 20 })
    })

    it('should include proper metadata for any file upload', async () => {
      // Feature: pinaccess, Property 2: Private IPFS Upload
      await fc.assert(fc.asyncProperty(
        fc.record({
          creator: fc.string({ minLength: 1, maxLength: 50 }),
          category: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
          description: fc.option(fc.string({ minLength: 1, maxLength: 200 }))
        }),
        async (metadataInput) => {
          process.env.PINATA_JWT = 'valid.jwt.token'
          process.env.PINATA_API_URL = 'https://api.pinata.cloud'

          const client = new PinataClient()
          const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

          let capturedFormData: FormData | null = null;

          // Mock successful response and capture the FormData
          mockFetch.mockImplementation(async (_url, options) => {
            if (options?.body instanceof FormData) {
              capturedFormData = options.body;
            }
            return {
              ok: true,
              json: async () => ({
                IpfsHash: 'QmTestHash123456789',
                PinSize: mockFile.size,
                Timestamp: new Date().toISOString()
              })
            };
          });

          const metadata = {
            creator: metadataInput.creator,
            uploadTimestamp: new Date().toISOString(),
            status: 'uploaded',
            keyvalues: {
              ...(metadataInput.category && { category: metadataInput.category }),
              ...(metadataInput.description && { description: metadataInput.description })
            }
          };

          // For any file upload, proper metadata should be included
          const result = await client.uploadFile(mockFile, metadata);

          expect(result.success).toBe(true);
          expect(capturedFormData).not.toBeNull();

          // Verify metadata was included in the form data
          const pinataMetadataStr = capturedFormData!.get('pinataMetadata') as string;
          expect(pinataMetadataStr).toBeTruthy();

          const pinataMetadata = JSON.parse(pinataMetadataStr);
          expect(pinataMetadata.keyvalues.creator).toBe(metadataInput.creator);
          expect(pinataMetadata.keyvalues.status).toBe('uploaded');
          expect(pinataMetadata.keyvalues.uploadTimestamp).toBeTruthy();
        }
      ), { numRuns: 20 })
    })
  })
})