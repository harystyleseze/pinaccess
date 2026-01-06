import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateEthereumAddressDetailed, validateSafeString } from '@/lib/validation';
import { validateAndConvertPrice } from '@/lib/pricing';

describe('Upload Form Validation Property Tests', () => {
  
  it('should validate form fields correctly for all valid inputs', () => {
    // Feature: pinaccess, Property 22: Form Validation
    // **Validates: Requirements 5.3**
    
    fc.assert(fc.property(
      // Generate valid form data
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
        walletAddress: fc.constantFrom(
          '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
          '0x8ba1f109551bD432803012645Hac136c9c1e3a9e',
          '0x1234567890123456789012345678901234567890',
          '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
        ),
        description: fc.string({ maxLength: 500 })
      }),
      (formData) => {
        // Validate each field using the same validation logic as the form
        const nameValidation = validateSafeString(formData.name, 100);
        const priceValidation = validateAndConvertPrice(formData.price);
        const walletValidation = validateEthereumAddressDetailed(formData.walletAddress);
        const descValidation = validateSafeString(formData.description, 500);
        
        // All validations should pass for valid inputs
        expect(nameValidation.isValid).toBe(true);
        expect(priceValidation.isValid).toBe(true);
        expect(walletValidation.isValid).toBe(true);
        expect(descValidation.isValid).toBe(true);
        
        // Price validation should return USDC amount
        expect(priceValidation.usdcAmount).toBeDefined();
        expect(typeof priceValidation.usdcAmount).toBe('string');
        
        // USDC amount should be correct conversion
        const expectedUsdc = Math.floor(formData.price * 1_000_000).toString();
        expect(priceValidation.usdcAmount).toBe(expectedUsdc);
      }
    ), { numRuns: 100 });
  });

  it('should reject invalid form inputs consistently', () => {
    // Feature: pinaccess, Property 22: Form Validation
    // **Validates: Requirements 5.3**
    
    fc.assert(fc.property(
      fc.oneof(
        // Invalid names
        fc.record({
          type: fc.constant('invalidName'),
          name: fc.oneof(
            fc.constant(''), // Empty string
            fc.string({ minLength: 101 }), // Too long
            fc.constantFrom('<script>', 'javascript:', 'onclick=') // Dangerous content
          ),
          price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
          walletAddress: fc.constant('0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e'),
          description: fc.string({ maxLength: 500 })
        }),
        
        // Invalid prices
        fc.record({
          type: fc.constant('invalidPrice'),
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          price: fc.oneof(
            fc.constant(0), // Zero price
            fc.constant(-1), // Negative price
            fc.constant(10001), // Too high
            fc.constant(NaN), // NaN
            fc.constant(Infinity) // Infinity
          ),
          walletAddress: fc.constant('0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e'),
          description: fc.string({ maxLength: 500 })
        }),
        
        // Invalid wallet addresses
        fc.record({
          type: fc.constant('invalidWallet'),
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
          walletAddress: fc.oneof(
            fc.constant(''), // Empty
            fc.constant('0x123'), // Too short
            fc.constant('742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e'), // Missing 0x
            fc.constant('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'), // Invalid characters
            fc.constant('0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e123') // Too long
          ),
          description: fc.string({ maxLength: 500 })
        }),
        
        // Invalid descriptions
        fc.record({
          type: fc.constant('invalidDescription'),
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
          walletAddress: fc.constant('0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e'),
          description: fc.oneof(
            fc.string({ minLength: 501 }), // Too long
            fc.constantFrom('<script>alert("xss")</script>', 'javascript:void(0)', 'onclick=hack()') // Dangerous content
          )
        })
      ),
      (invalidFormData) => {
        // Validate each field
        const nameValidation = validateSafeString(invalidFormData.name, 100);
        const priceValidation = validateAndConvertPrice(invalidFormData.price);
        const walletValidation = validateEthereumAddressDetailed(invalidFormData.walletAddress);
        const descValidation = validateSafeString(invalidFormData.description, 500);
        
        // At least one validation should fail based on the invalid input type
        switch (invalidFormData.type) {
          case 'invalidName':
            expect(nameValidation.isValid || invalidFormData.name.trim().length === 0).toBe(false);
            break;
          case 'invalidPrice':
            expect(priceValidation.isValid).toBe(false);
            break;
          case 'invalidWallet':
            expect(walletValidation.isValid).toBe(false);
            break;
          case 'invalidDescription':
            expect(descValidation.isValid).toBe(false);
            break;
        }
      }
    ), { numRuns: 100 });
  });

  it('should provide consistent error messages for validation failures', () => {
    // Feature: pinaccess, Property 22: Form Validation
    // **Validates: Requirements 5.3**
    
    fc.assert(fc.property(
      fc.record({
        emptyName: fc.constant(''),
        negativePrice: fc.constant(-5),
        invalidWallet: fc.constant('not-an-address'),
        longDescription: fc.string({ minLength: 501, maxLength: 600 })
      }),
      (invalidData) => {
        // Test that validation consistently provides error messages
        const nameValidation = validateSafeString(invalidData.emptyName, 100);
        const priceValidation = validateAndConvertPrice(invalidData.negativePrice);
        const walletValidation = validateEthereumAddressDetailed(invalidData.invalidWallet);
        const descValidation = validateSafeString(invalidData.longDescription, 500);
        
        // Price, wallet, and description should be invalid
        expect(priceValidation.isValid).toBe(false);
        expect(walletValidation.isValid).toBe(false);
        expect(descValidation.isValid).toBe(false);
        
        // Name validation passes for empty string (it's the form logic that checks for empty names)
        // The validateSafeString function only checks for dangerous content and length
        expect(nameValidation.isValid).toBe(true); // Empty string is safe, just not valid for form
        
        // Error messages should be provided for invalid fields
        expect(priceValidation.error).toBeDefined();
        expect(walletValidation.error).toBeDefined();
        expect(descValidation.error).toBeDefined();
        
        // Error messages should be strings
        expect(typeof priceValidation.error).toBe('string');
        expect(typeof walletValidation.error).toBe('string');
        expect(typeof descValidation.error).toBe('string');
        
        // Error messages should not be empty
        expect(priceValidation.error!.length).toBeGreaterThan(0);
        expect(walletValidation.error!.length).toBeGreaterThan(0);
        expect(descValidation.error!.length).toBeGreaterThan(0);
      }
    ), { numRuns: 100 });
  });

  it('should handle edge cases in price validation', () => {
    // Feature: pinaccess, Property 22: Form Validation
    // **Validates: Requirements 5.3**
    
    fc.assert(fc.property(
      fc.oneof(
        fc.constant(0.000001), // Minimum valid price
        fc.constant(10000), // Maximum valid price
        fc.constant(0.000000999), // Just below minimum
        fc.constant(10000.01) // Just above maximum
      ),
      (edgePrice) => {
        const validation = validateAndConvertPrice(edgePrice);
        
        if (edgePrice >= 0.000001 && edgePrice <= 10000) {
          // Should be valid
          expect(validation.isValid).toBe(true);
          expect(validation.usdcAmount).toBeDefined();
          
          // USDC conversion should be correct
          const expectedUsdc = Math.floor(edgePrice * 1_000_000).toString();
          expect(validation.usdcAmount).toBe(expectedUsdc);
        } else {
          // Should be invalid
          expect(validation.isValid).toBe(false);
          expect(validation.error).toBeDefined();
        }
      }
    ), { numRuns: 100 });
  });

  it('should validate wallet addresses with proper format checking', () => {
    // Feature: pinaccess, Property 22: Form Validation
    // **Validates: Requirements 5.3**
    
    fc.assert(fc.property(
      fc.oneof(
        // Valid addresses
        fc.constantFrom(
          '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
          '0x0000000000000000000000000000000000000000',
          '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
        ),
        // Invalid addresses
        fc.constantFrom(
          '', // Empty
          '742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e', // No 0x prefix
          '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5', // Too short
          '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e1', // Too long
          '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG' // Invalid characters
        )
      ),
      (address) => {
        const validation = validateEthereumAddressDetailed(address);
        
        // Check if address matches valid format
        const isValidFormat = /^0x[a-fA-F0-9]{40}$/.test(address);
        
        expect(validation.isValid).toBe(isValidFormat);
        
        if (!isValidFormat) {
          expect(validation.error).toBeDefined();
          expect(typeof validation.error).toBe('string');
          expect(validation.error!.length).toBeGreaterThan(0);
        }
      }
    ), { numRuns: 100 });
  });
});