import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { 
  convertUsdToUsdc, 
  convertUsdcToUsd, 
  validateUsdPrice, 
  validateAndConvertPrice,
  formatUsdAmount,
  formatUsdcAmount
} from '../lib/pricing'

/**
 * Property-based tests for USD to USDC conversion utilities
 */

describe('USD to USDC Conversion Properties', () => {
  describe('USD to USDC Conversion', () => {
    it('should convert USD to USDC using the formula USD × 1,000,000 for all valid amounts', () => {
      // Feature: pinaccess, Property 6: USD to USDC Conversion
      fc.assert(fc.property(
        fc.float({ min: Math.fround(0.000001), max: Math.fround(10000), noNaN: true }),
        (usdAmount) => {
          // For any valid USD amount, conversion should use the formula USD × 1,000,000
          const usdcAmount = convertUsdToUsdc(usdAmount);
          const expectedUsdc = Math.floor(usdAmount * 1_000_000);
          
          expect(usdcAmount).toBe(expectedUsdc.toString());
          expect(parseInt(usdcAmount, 10)).toBe(expectedUsdc);
          
          // Verify the conversion is within expected bounds
          expect(parseInt(usdcAmount, 10)).toBeGreaterThan(0);
          expect(parseInt(usdcAmount, 10)).toBeLessThanOrEqual(10000 * 1_000_000);
        }
      ), { numRuns: 100 })
    })

    it('should maintain precision and handle rounding correctly for any USD amount', () => {
      // Feature: pinaccess, Property 6: USD to USDC Conversion
      fc.assert(fc.property(
        fc.float({ min: Math.fround(0.000001), max: Math.fround(1000), noNaN: true }),
        (usdAmount) => {
          // For any USD amount, the conversion should be deterministic and precise
          const usdcAmount1 = convertUsdToUsdc(usdAmount);
          const usdcAmount2 = convertUsdToUsdc(usdAmount);
          
          // Multiple conversions of the same amount should yield identical results
          expect(usdcAmount1).toBe(usdcAmount2);
          
          // The result should always be a valid integer string
          expect(parseInt(usdcAmount1, 10).toString()).toBe(usdcAmount1);
          
          // Floor operation should ensure we never round up
          const exactMultiplication = usdAmount * 1_000_000;
          const flooredResult = Math.floor(exactMultiplication);
          expect(parseInt(usdcAmount1, 10)).toBe(flooredResult);
        }
      ), { numRuns: 100 })
    })

    it('should reject invalid USD amounts with appropriate errors', () => {
      // Feature: pinaccess, Property 6: USD to USDC Conversion
      fc.assert(fc.property(
        fc.oneof(
          fc.float({ min: Math.fround(-1000), max: Math.fround(-0.000001) }), // Negative numbers
          fc.constant(0), // Zero
          fc.constant(Infinity), // Infinity
          fc.constant(-Infinity), // Negative infinity
          fc.constant(NaN) // NaN
        ),
        (invalidAmount) => {
          // For any invalid USD amount, conversion should throw an appropriate error
          expect(() => convertUsdToUsdc(invalidAmount)).toThrow();
          
          // Verify the error message is descriptive
          try {
            convertUsdToUsdc(invalidAmount);
            expect.fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBeTruthy();
            expect((error as Error).message.length).toBeGreaterThan(0);
          }
        }
      ), { numRuns: 100 })
    })

    it('should handle round-trip conversion correctly for any valid amount', () => {
      // Feature: pinaccess, Property 6: USD to USDC Conversion
      fc.assert(fc.property(
        fc.float({ min: Math.fround(0.000001), max: Math.fround(1000), noNaN: true }),
        (originalUsd) => {
          // For any USD amount, converting to USDC and back should be close to original
          const usdcAmount = convertUsdToUsdc(originalUsd);
          const convertedBackUsd = convertUsdcToUsd(usdcAmount);
          
          // Due to floor operation, the converted back amount should be <= original
          expect(convertedBackUsd).toBeLessThanOrEqual(originalUsd);
          
          // The difference should be less than the minimum USDC unit (0.000001 USD)
          const difference = originalUsd - convertedBackUsd;
          expect(difference).toBeLessThan(0.000001);
          expect(difference).toBeGreaterThanOrEqual(0);
        }
      ), { numRuns: 100 })
    })
  })

  describe('Price Validation', () => {
    it('should validate USD prices correctly for all numeric inputs', () => {
      // Feature: pinaccess, Property 6: USD to USDC Conversion
      fc.assert(fc.property(
        fc.float({ noNaN: true }),
        (price) => {
          // For any numeric price, validation should follow the rules: finite, > 0, <= 10000
          const isValid = validateUsdPrice(price);
          const expectedValid = Number.isFinite(price) && price > 0 && price <= 10000;
          
          expect(isValid).toBe(expectedValid);
        }
      ), { numRuns: 100 })
    })

    it('should provide detailed validation results for any price input', () => {
      // Feature: pinaccess, Property 6: USD to USDC Conversion
      fc.assert(fc.property(
        fc.oneof(
          fc.float({ min: Math.fround(0.000001), max: Math.fround(10000), noNaN: true }), // Valid prices
          fc.float({ min: Math.fround(-1000), max: Math.fround(0) }), // Invalid prices (negative/zero)
          fc.float({ min: Math.fround(10000.01), max: Math.fround(50000) }), // Invalid prices (too high)
          fc.constant(NaN), // Invalid (NaN)
          fc.constant(Infinity) // Invalid (Infinity)
        ),
        (price) => {
          // For any price input, validateAndConvertPrice should provide consistent results
          const result = validateAndConvertPrice(price);
          
          expect(result).toHaveProperty('isValid');
          expect(typeof result.isValid).toBe('boolean');
          
          if (result.isValid) {
            // Valid results should have usdcAmount
            expect(result.usdcAmount).toBeTruthy();
            expect(typeof result.usdcAmount).toBe('string');
            expect(parseInt(result.usdcAmount!, 10)).toBeGreaterThan(0);
          } else {
            // Invalid results should have error message
            expect(result.error).toBeTruthy();
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);
          }
        }
      ), { numRuns: 100 })
    })
  })

  describe('Formatting Functions', () => {
    it('should format USD amounts consistently for any valid number', () => {
      // Feature: pinaccess, Property 6: USD to USDC Conversion
      fc.assert(fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (amount) => {
          // For any valid amount, formatting should be consistent and include currency symbol
          const formatted = formatUsdAmount(amount);
          
          expect(formatted).toContain('$');
          expect(typeof formatted).toBe('string');
          expect(formatted.length).toBeGreaterThan(1);
          
          // Should handle the same amount consistently
          const formatted2 = formatUsdAmount(amount);
          expect(formatted).toBe(formatted2);
        }
      ), { numRuns: 100 })
    })

    it('should format USDC amounts with USD equivalent for any valid USDC string', () => {
      // Feature: pinaccess, Property 6: USD to USDC Conversion
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 10000000000 }).map(n => n.toString()),
        (usdcAmount) => {
          // For any valid USDC amount string, formatting should include both USDC and USD
          const formatted = formatUsdcAmount(usdcAmount);
          
          expect(formatted).toContain('USDC');
          expect(formatted).toContain('$');
          expect(formatted).toContain(usdcAmount);
          expect(typeof formatted).toBe('string');
          expect(formatted.length).toBeGreaterThan(usdcAmount.length);
        }
      ), { numRuns: 100 })
    })
  })
})