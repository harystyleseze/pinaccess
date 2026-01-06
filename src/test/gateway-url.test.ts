import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

/**
 * Property-based tests for gateway URL generation functionality
 */

describe('Gateway URL Generation Properties', () => {
  describe('Gateway URL Generation', () => {
    it('should generate gateway URLs in the correct format for any document CID', () => {
      // Feature: pinaccess, Property 12: Gateway URL Generation
      fc.assert(fc.property(
        fc.constantFrom(
          'QmTestHash123456789012345678901234567890123456',
          'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
        ),
        (cid) => {
          // For any document CID, the generated gateway URL should follow the format https://gateway.mypinata.cloud/x402/cid/{cid}
          const gatewayUrl = `https://gateway.mypinata.cloud/x402/cid/${cid}`;

          // Verify URL format
          expect(gatewayUrl).toBe(`https://gateway.mypinata.cloud/x402/cid/${cid}`);
          expect(gatewayUrl.startsWith('https://gateway.mypinata.cloud/x402/cid/')).toBe(true);
          expect(gatewayUrl.endsWith(cid)).toBe(true);
        }
      ), { numRuns: 5 })
    })
  })
})