// Property test for error message quality
// Feature: pinaccess, Property 37: Error Message Quality
// **Validates: Requirements 9.4**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ErrorFactory, createErrorResponse, ErrorType, ERROR_MESSAGES } from '@/lib/error-handling';

describe('Error Message Quality Property Tests', () => {
  it('should provide helpful error messages with suggested actions for all error types', () => {
    // Feature: pinaccess, Property 37: Error Message Quality
    fc.assert(fc.property(
      fc.record({
        errorType: fc.constantFrom(...Object.values(ErrorType)),
        internalMessage: fc.string({ minLength: 5, maxLength: 100 }),
        userContext: fc.record({
          fileName: fc.string({ minLength: 1, maxLength: 50 }),
          fileSize: fc.integer({ min: 0, max: 100 * 1024 * 1024 }),
          walletAddress: fc.string({ minLength: 10, maxLength: 50 }),
          price: fc.float({ min: 0.01, max: 10000 })
        })
      }),
      ({ errorType, internalMessage, userContext }) => {
        // Create error using factory
        let error;
        switch (errorType) {
          case ErrorType.VALIDATION_ERROR:
            error = ErrorFactory.validation(internalMessage);
            break;
          case ErrorType.RATE_LIMIT_ERROR:
            error = ErrorFactory.rateLimit(internalMessage);
            break;
          case ErrorType.UPLOAD_ERROR:
            error = ErrorFactory.upload(internalMessage);
            break;
          case ErrorType.PAYMENT_ERROR:
            error = ErrorFactory.payment(internalMessage);
            break;
          case ErrorType.NETWORK_ERROR:
            error = ErrorFactory.network(internalMessage);
            break;
          case ErrorType.NOT_FOUND_ERROR:
            error = ErrorFactory.notFound(internalMessage);
            break;
          default:
            error = ErrorFactory.internal(internalMessage);
        }

        const response = createErrorResponse(error);

        // Property: All error responses should have consistent structure
        expect(response).toHaveProperty('success', false);
        expect(response).toHaveProperty('error');
        expect(response).toHaveProperty('type');
        expect(typeof response.error).toBe('string');
        expect(response.error.length).toBeGreaterThan(0);

        // Property: Error messages should be user-friendly (not technical)
        expect(response.error).not.toMatch(/stack trace/i);
        expect(response.error).not.toMatch(/internal error/i);
        expect(response.error).not.toMatch(/null pointer/i);
        expect(response.error).not.toMatch(/undefined/i);
        expect(response.error).not.toMatch(/exception/i);

        // Property: Error messages should not expose sensitive information
        expect(response.error).not.toMatch(/password/i);
        expect(response.error).not.toMatch(/token/i);
        expect(response.error).not.toMatch(/secret/i);
        expect(response.error).not.toMatch(/key/i);
        expect(response.error).not.toMatch(/jwt/i);

        // Property: Error messages should be actionable (contain guidance)
        const actionableWords = [
          'please', 'try', 'check', 'ensure', 'verify', 'provide', 
          'select', 'enter', 'wait', 'again', 'later', 'refresh'
        ];
        const hasActionableGuidance = actionableWords.some(word => 
          response.error.toLowerCase().includes(word)
        );
        expect(hasActionableGuidance).toBe(true);

        // Property: Error messages should be appropriately capitalized and punctuated
        expect(response.error[0]).toMatch(/[A-Z]/); // First letter capitalized
        expect(response.error).toMatch(/[.!]$/); // Ends with punctuation

        // Property: Error messages should not be too long or too short
        expect(response.error.length).toBeGreaterThan(10);
        expect(response.error.length).toBeLessThan(200);

        // Property: Error type should match the factory used
        expect(response.type).toBe(errorType);
      }
    ), { numRuns: 100 });
  });

  it('should provide context-specific error messages for validation errors', () => {
    fc.assert(fc.property(
      fc.record({
        validationType: fc.constantFrom('file', 'address', 'price'),
        invalidValue: fc.string({ minLength: 0, maxLength: 100 }),
        context: fc.record({
          fieldName: fc.string({ minLength: 1, maxLength: 20 }),
          expectedFormat: fc.string({ minLength: 5, maxLength: 50 })
        })
      }),
      ({ validationType, invalidValue, context }) => {
        // Create context-specific validation errors
        let error;
        switch (validationType) {
          case 'file':
            error = ErrorFactory.fileValidation(`Invalid file: ${invalidValue}`);
            break;
          case 'address':
            error = ErrorFactory.addressValidation(`Invalid address: ${invalidValue}`);
            break;
          case 'price':
            error = ErrorFactory.priceValidation(`Invalid price: ${invalidValue}`);
            break;
          default:
            error = ErrorFactory.validation(`Invalid ${context.fieldName}: ${invalidValue}`);
        }

        const response = createErrorResponse(error);

        // Property: Validation error messages should be specific to the validation type
        switch (validationType) {
          case 'file':
            expect(response.error.toLowerCase()).toMatch(/file|upload|pdf|ebook|format|size/);
            break;
          case 'address':
            expect(response.error.toLowerCase()).toMatch(/address|wallet|ethereum/);
            break;
          case 'price':
            expect(response.error.toLowerCase()).toMatch(/price|amount|dollar|\$|value/);
            break;
        }

        // Property: Validation errors should provide clear guidance
        expect(response.error.toLowerCase()).toMatch(/please|ensure|check|provide/);

        // Property: Should not expose the invalid value in user message
        if (invalidValue.length > 0) {
          expect(response.error).not.toContain(invalidValue);
        }
      }
    ), { numRuns: 100 });
  });

  it('should handle error message consistency across different error scenarios', () => {
    fc.assert(fc.property(
      fc.array(
        fc.record({
          scenario: fc.constantFrom(
            'upload_too_large',
            'upload_invalid_type', 
            'rate_limit_exceeded',
            'network_timeout',
            'payment_failed',
            'document_not_found'
          ),
          attemptNumber: fc.integer({ min: 1, max: 5 })
        }),
        { minLength: 1, maxLength: 10 }
      ),
      (errorScenarios) => {
        const errorMessages: string[] = [];
        
        for (const scenario of errorScenarios) {
          let error;
          switch (scenario.scenario) {
            case 'upload_too_large':
              error = ErrorFactory.upload('File too large', 'size');
              break;
            case 'upload_invalid_type':
              error = ErrorFactory.upload('Invalid file type', 'type');
              break;
            case 'rate_limit_exceeded':
              error = ErrorFactory.rateLimit('Rate limit exceeded', 'upload');
              break;
            case 'network_timeout':
              error = ErrorFactory.network('Request timeout', 'timeout');
              break;
            case 'payment_failed':
              error = ErrorFactory.payment('Payment processing failed');
              break;
            case 'document_not_found':
              error = ErrorFactory.notFound('Document not found', 'document');
              break;
            default:
              error = ErrorFactory.internal('Unknown error');
          }

          const response = createErrorResponse(error);
          errorMessages.push(response.error);
        }

        // Property: Similar error scenarios should produce consistent message patterns
        const groupedByScenario = errorScenarios.reduce((acc, scenario, index) => {
          if (!acc[scenario.scenario]) {
            acc[scenario.scenario] = [];
          }
          acc[scenario.scenario].push(errorMessages[index]);
          return acc;
        }, {} as Record<string, string[]>);

        for (const [scenarioType, messages] of Object.entries(groupedByScenario)) {
          if (messages.length > 1) {
            // All messages for the same scenario should be identical
            const firstMessage = messages[0];
            for (const message of messages) {
              expect(message).toBe(firstMessage);
            }
          }
        }

        // Property: All error messages should follow consistent formatting
        for (const message of errorMessages) {
          expect(message).toMatch(/^[A-Z]/); // Start with capital letter
          expect(message).toMatch(/[.!]$/); // End with punctuation
          expect(message).not.toMatch(/\s{2,}/); // No multiple spaces
          expect(message.trim()).toBe(message); // No leading/trailing whitespace
        }
      }
    ), { numRuns: 50 });
  });

  it('should ensure error messages are accessible and clear', () => {
    fc.assert(fc.property(
      fc.record({
        errorCategory: fc.constantFrom('validation', 'network', 'permission', 'resource'),
        userExperience: fc.constantFrom('beginner', 'intermediate', 'expert'),
        language: fc.constantFrom('en') // Could be extended for i18n
      }),
      ({ errorCategory, userExperience, language }) => {
        // Create errors for different categories
        let error;
        switch (errorCategory) {
          case 'validation':
            error = ErrorFactory.validation('Validation failed');
            break;
          case 'network':
            error = ErrorFactory.network('Network error');
            break;
          case 'permission':
            error = ErrorFactory.rateLimit('Permission denied');
            break;
          case 'resource':
            error = ErrorFactory.notFound('Resource not found');
            break;
          default:
            error = ErrorFactory.internal('Internal error');
        }

        const response = createErrorResponse(error);

        // Property: Error messages should be accessible (simple language)
        const complexWords = [
          'instantiate', 'initialize', 'authenticate', 'authorize', 
          'serialize', 'deserialize', 'concatenate', 'interpolate'
        ];
        const hasComplexWords = complexWords.some(word => 
          response.error.toLowerCase().includes(word)
        );
        expect(hasComplexWords).toBe(false);

        // Property: Error messages should avoid jargon
        const jargonWords = [
          'blob', 'mutex', 'semaphore', 'daemon', 'thread', 
          'socket', 'buffer', 'heap', 'stack', 'pointer'
        ];
        const hasJargon = jargonWords.some(word => 
          response.error.toLowerCase().includes(word)
        );
        expect(hasJargon).toBe(false);

        // Property: Error messages should use positive language when possible
        const negativeWords = ['can\'t', 'won\'t', 'don\'t', 'failed', 'error', 'wrong'];
        const positiveWords = ['please', 'try', 'check', 'ensure', 'help'];
        
        const negativeCount = negativeWords.filter(word => 
          response.error.toLowerCase().includes(word)
        ).length;
        const positiveCount = positiveWords.filter(word => 
          response.error.toLowerCase().includes(word)
        ).length;
        
        // Should have at least as many positive words as negative ones
        expect(positiveCount).toBeGreaterThanOrEqual(Math.max(1, negativeCount - 1));

        // Property: Error messages should be complete sentences
        expect(response.error).toMatch(/^[A-Z].*[.!]$/);
        
        // Property: Error messages should not use abbreviations without explanation
        const unexplainedAbbreviations = ['API', 'URL', 'HTTP', 'JSON', 'XML'];
        // These are acceptable as they're commonly understood
        const acceptableAbbreviations = ['PDF', 'USD', 'MB', 'GB'];
        
        for (const abbrev of unexplainedAbbreviations) {
          if (response.error.includes(abbrev)) {
            // If using technical abbreviations, should provide context
            expect(response.error.length).toBeGreaterThan(30); // Longer explanatory message
          }
        }
      }
    ), { numRuns: 100 });
  });
});