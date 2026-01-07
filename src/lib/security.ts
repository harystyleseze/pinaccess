// Security utilities for PinAccess application

import { NextRequest } from 'next/server';

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Simple in-memory rate limit store
 */
class MemoryRateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (entry && Date.now() > entry.resetTime) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const existing = this.get(key);
    
    if (existing) {
      existing.count++;
      return existing;
    } else {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs
      };
      this.store.set(key, newEntry);
      return newEntry;
    }
  }

  // Clear all rate limit entries (useful for development)
  clear(): void {
    this.store.clear();
  }

  // Clear rate limit for specific IP
  clearForIP(ip: string): void {
    const keys = Array.from(this.store.keys()).filter(key => key.includes(ip));
    keys.forEach(key => this.store.delete(key));
  }
}

// Global rate limit store instance
const rateLimitStore = new MemoryRateLimitStore();

/**
 * Simple rate limiter
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests } = config;

  return function rateLimit(request: NextRequest): {
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    error?: string;
  } {
    // Bypass rate limiting in development mode
    if (process.env.NODE_ENV !== 'production') {
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests,
        resetTime: Date.now() + windowMs,
        error: undefined
      };
    }

    // Get IP from headers (works with proxies/CDNs)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
    
    const key = `rate_limit:${ip}`;
    const entry = rateLimitStore.increment(key, windowMs);
    
    const remaining = Math.max(0, maxRequests - entry.count);
    const isAllowed = entry.count <= maxRequests;
    
    return {
      success: isAllowed,
      limit: maxRequests,
      remaining,
      resetTime: entry.resetTime,
      error: isAllowed ? undefined : 'Rate limit exceeded. Please try again later.'
    };
  };
}

/**
 * Predefined rate limiters
 */
export const rateLimiters = {
  // General API rate limiter - 100 requests per 15 minutes
  general: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }),
  
  // Upload rate limiter - More generous limits for development
  upload: createRateLimiter({
    windowMs: process.env.NODE_ENV === 'production' 
      ? 60 * 60 * 1000  // Production: 1 hour window
      : 15 * 60 * 1000, // Development: 15 minutes window
    maxRequests: process.env.NODE_ENV === 'production' 
      ? 20              // Production: 20 uploads per hour
      : 50              // Development: 50 uploads per 15 minutes
  }),
  
  // Payment instruction rate limiter - 20 per hour
  payment: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20
  }),
  
  // Strict rate limiter for sensitive operations - 5 per 5 minutes
  strict: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5
  })
};

/**
 * Basic content security validation
 */
export function validateContentSecurity(content: string, maxLength: number = 1000): {
  isSecure: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  
  // Check length
  if (content.length > maxLength) {
    violations.push(`Content exceeds maximum length of ${maxLength} characters`);
  }
  
  // Check for basic XSS patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      violations.push('Potentially dangerous content detected');
      break;
    }
  }
  
  return {
    isSecure: violations.length === 0,
    violations
  };
}

/**
 * Simple request origin validation
 */
export function validateRequestOrigin(request: NextRequest, allowedOrigins: string[]): boolean {
  const origin = request.headers.get('origin');
  
  // Allow same-origin requests (no origin header)
  if (!origin) {
    return true;
  }
  
  // Check against allowed origins
  return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
}

/**
 * Enhanced file security validation
 */
export async function validateFileUploadSecurity(file: File): Promise<{
  isSecure: boolean;
  violations: string[];
  risk: 'low' | 'medium' | 'high';
}> {
  const violations: string[] = [];
  let risk: 'low' | 'medium' | 'high' = 'low';
  
  // Check file size (prevent DoS attacks)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    violations.push('File size exceeds security limit');
    risk = 'high';
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|scr|pif|com|dll|vbs|js|jar)$/i,
    /[<>:"|?*]/,
    /^\./,
    /\.\./,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      violations.push('Suspicious file name pattern detected');
      risk = 'high';
      break;
    }
  }
  
  return {
    isSecure: violations.length === 0,
    violations,
    risk
  };
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  return forwarded?.split(',')[0]?.trim() || 
         realIp || 
         cfConnectingIp || 
         'unknown';
}

/**
 * Development utility to clear rate limits
 * Only works in development mode
 */
export function clearRateLimits(): void {
  if (process.env.NODE_ENV !== 'production') {
    rateLimitStore.clear();
    console.log('Rate limits cleared for development');
  }
}

/**
 * Development utility to clear rate limits for specific IP
 * Only works in development mode
 */
export function clearRateLimitsForIP(ip: string): void {
  if (process.env.NODE_ENV !== 'production') {
    rateLimitStore.clearForIP(ip);
    console.log(`Rate limits cleared for IP: ${ip}`);
  }
}