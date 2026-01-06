// Comprehensive error handling utilities for PinAccess

/**
 * Standard error types for the application
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  PAYMENT_ERROR = 'PAYMENT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Application error class with structured error information
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly userMessage: string;
  public readonly details?: Record<string, any>;

  constructor(
    type: ErrorType,
    message: string,
    userMessage: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.userMessage = userMessage;
    this.details = details;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * User-friendly error messages for different error types
 */
export const ERROR_MESSAGES = {
  [ErrorType.VALIDATION_ERROR]: {
    default: 'The provided information is invalid. Please check your input and try again.',
    file: 'The uploaded file is invalid. Please ensure it\'s a PDF or supported ebook format under 50MB.',
    address: 'The wallet address is invalid. Please provide a valid Ethereum address.',
    price: 'The price is invalid. Please enter a value between $0.01 and $10,000.'
  },
  [ErrorType.AUTHENTICATION_ERROR]: {
    default: 'Authentication failed. Please check your credentials and try again.',
    token: 'Invalid or expired authentication token. Please refresh and try again.'
  },
  [ErrorType.AUTHORIZATION_ERROR]: {
    default: 'You don\'t have permission to perform this action.',
    resource: 'You don\'t have access to this resource.'
  },
  [ErrorType.NOT_FOUND_ERROR]: {
    default: 'The requested resource was not found.',
    document: 'The document you\'re looking for doesn\'t exist or has been removed.',
    payment: 'The payment instruction was not found.'
  },
  [ErrorType.RATE_LIMIT_ERROR]: {
    default: 'Too many requests. Please wait a moment and try again.',
    upload: 'You\'ve reached the upload limit. Please wait before uploading more files.',
    payment: 'Too many payment requests. Please wait before creating more payment instructions.'
  },
  [ErrorType.UPLOAD_ERROR]: {
    default: 'File upload failed. Please try again.',
    size: 'File is too large. Maximum size is 50MB.',
    type: 'File type not supported. Please upload a PDF or ebook file.',
    network: 'Upload failed due to network issues. Please check your connection and try again.'
  },
  [ErrorType.PAYMENT_ERROR]: {
    default: 'Payment processing failed. Please try again.',
    instruction: 'Failed to create payment instruction. Please verify your details and try again.',
    attachment: 'Failed to link document to payment. Please try again.'
  },
  [ErrorType.NETWORK_ERROR]: {
    default: 'Network error occurred. Please check your connection and try again.',
    timeout: 'Request timed out. Please try again.',
    unavailable: 'Service is temporarily unavailable. Please try again later.'
  },
  [ErrorType.INTERNAL_ERROR]: {
    default: 'An unexpected error occurred. Please try again later.',
    maintenance: 'The service is under maintenance. Please try again later.'
  }
};

/**
 * Create standardized error responses
 */
export function createErrorResponse(
  error: AppError | Error,
  includeDetails: boolean = false
): {
  success: false;
  error: string;
  type?: ErrorType;
  details?: Record<string, any>;
} {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.userMessage,
      type: error.type,
      ...(includeDetails && error.details && { details: error.details })
    };
  }

  // Handle unknown errors
  return {
    success: false,
    error: ERROR_MESSAGES[ErrorType.INTERNAL_ERROR].default,
    type: ErrorType.INTERNAL_ERROR
  };
}

/**
 * Error factory functions for common error scenarios
 */
export const ErrorFactory = {
  validation: (message: string, userMessage?: string, details?: Record<string, any>) =>
    new AppError(
      ErrorType.VALIDATION_ERROR,
      message,
      userMessage || ERROR_MESSAGES[ErrorType.VALIDATION_ERROR].default,
      400,
      true,
      details
    ),

  fileValidation: (message: string, details?: Record<string, any>) =>
    new AppError(
      ErrorType.VALIDATION_ERROR,
      message,
      ERROR_MESSAGES[ErrorType.VALIDATION_ERROR].file,
      400,
      true,
      details
    ),

  addressValidation: (message: string, details?: Record<string, any>) =>
    new AppError(
      ErrorType.VALIDATION_ERROR,
      message,
      ERROR_MESSAGES[ErrorType.VALIDATION_ERROR].address,
      400,
      true,
      details
    ),

  priceValidation: (message: string, details?: Record<string, any>) =>
    new AppError(
      ErrorType.VALIDATION_ERROR,
      message,
      ERROR_MESSAGES[ErrorType.VALIDATION_ERROR].price,
      400,
      true,
      details
    ),

  rateLimit: (message: string, type: 'upload' | 'payment' | 'default' = 'default') =>
    new AppError(
      ErrorType.RATE_LIMIT_ERROR,
      message,
      ERROR_MESSAGES[ErrorType.RATE_LIMIT_ERROR][type],
      429,
      true
    ),

  upload: (message: string, subType: 'size' | 'type' | 'network' | 'default' = 'default') =>
    new AppError(
      ErrorType.UPLOAD_ERROR,
      message,
      ERROR_MESSAGES[ErrorType.UPLOAD_ERROR][subType],
      subType === 'size' ? 413 : subType === 'type' ? 415 : 500,
      true
    ),

  payment: (message: string, subType: 'instruction' | 'attachment' | 'default' = 'default') =>
    new AppError(
      ErrorType.PAYMENT_ERROR,
      message,
      ERROR_MESSAGES[ErrorType.PAYMENT_ERROR][subType],
      500,
      true
    ),

  network: (message: string, subType: 'timeout' | 'unavailable' | 'default' = 'default') =>
    new AppError(
      ErrorType.NETWORK_ERROR,
      message,
      ERROR_MESSAGES[ErrorType.NETWORK_ERROR][subType],
      subType === 'timeout' ? 408 : subType === 'unavailable' ? 503 : 500,
      true
    ),

  notFound: (message: string, subType: 'document' | 'payment' | 'default' = 'default') =>
    new AppError(
      ErrorType.NOT_FOUND_ERROR,
      message,
      ERROR_MESSAGES[ErrorType.NOT_FOUND_ERROR][subType],
      404,
      true
    ),

  internal: (message: string, isOperational: boolean = false) =>
    new AppError(
      ErrorType.INTERNAL_ERROR,
      message,
      ERROR_MESSAGES[ErrorType.INTERNAL_ERROR].default,
      500,
      isOperational
    )
};

/**
 * Error recovery strategies
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
};

/**
 * Retry mechanism with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  shouldRetry: (error: any) => boolean = (error) => error instanceof AppError && error.type === ErrorType.NETWORK_ERROR
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay, backoffFactor } = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      
      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Fallback state generator for when services are unavailable
 */
export interface FallbackState<T> {
  isUsingFallback: boolean;
  data?: T;
  message: string;
  retryAfter?: number;
}

export function createFallbackState<T>(
  message: string = 'Service temporarily unavailable',
  retryAfter?: number,
  fallbackData?: T
): FallbackState<T> {
  return {
    isUsingFallback: true,
    data: fallbackData,
    message,
    retryAfter
  };
}

/**
 * Error boundary for React components (if needed)
 */
export function handleComponentError(error: Error, errorInfo: any): void {
  console.error('Component error:', error, errorInfo);
  
  // In production, you might want to send this to an error reporting service
  if (process.env.NODE_ENV === 'production') {
    // Example: sendToErrorReporting(error, errorInfo);
  }
}

/**
 * Sanitize error for logging (remove sensitive information)
 */
export function sanitizeErrorForLogging(error: any): Record<string, any> {
  const sanitized: Record<string, any> = {
    message: error.message || 'Unknown error',
    type: error.type || 'UNKNOWN',
    statusCode: error.statusCode || 500,
    timestamp: new Date().toISOString()
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    sanitized.stack = error.stack;
  }

  // Include details but sanitize sensitive data
  if (error.details) {
    sanitized.details = { ...error.details };
    
    // Remove potentially sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'jwt'];
    for (const field of sensitiveFields) {
      if (sanitized.details[field]) {
        sanitized.details[field] = '[REDACTED]';
      }
    }
  }

  return sanitized;
}

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandling(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // In production, you might want to gracefully shut down
    if (process.env.NODE_ENV === 'production') {
      console.error('Shutting down due to unhandled rejection');
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    
    // Always exit on uncaught exceptions
    console.error('Shutting down due to uncaught exception');
    process.exit(1);
  });
}