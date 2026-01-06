import { NextRequest, NextResponse } from 'next/server';
import { pinataClient } from '@/lib/pinata';
import { validateFile, validateSafeString } from '@/lib/validation';
import { rateLimiters, validateFileUploadSecurity, getClientIP } from '@/lib/security';
import { ErrorFactory, createErrorResponse, withRetry, createFallbackState } from '@/lib/error-handling';
import { type UploadResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // Rate limiting check
    const rateLimitResult = rateLimiters.upload(request);
    if (!rateLimitResult.success) {
      const error = ErrorFactory.rateLimit('Upload rate limit exceeded', 'upload');
      return NextResponse.json(createErrorResponse(error), { 
        status: error.statusCode,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      });
    }

    // Parse the form data with proper error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      const appError = ErrorFactory.validation(
        'Failed to parse form data',
        'Invalid form data or request too large. Please check your file and try again.'
      );
      return NextResponse.json(createErrorResponse(appError), { status: appError.statusCode });
    }

    const file = formData.get('file') as File;
    const creator = formData.get('creator') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;

    // Validate required fields
    if (!file) {
      const error = ErrorFactory.validation('No file provided', 'Please select a file to upload.');
      return NextResponse.json(createErrorResponse(error), { status: error.statusCode });
    }

    if (!creator || creator.trim() === '') {
      const error = ErrorFactory.validation('Creator information is required', 'Please provide creator information.');
      return NextResponse.json(createErrorResponse(error), { status: error.statusCode });
    }

    // Validate text inputs for security
    try {
      const creatorValidation = validateSafeString(creator, 100);
      if (!creatorValidation.isValid) {
        const error = ErrorFactory.validation(
          `Invalid creator field: ${creatorValidation.error}`,
          'Creator information contains invalid characters. Please use only letters, numbers, and basic punctuation.'
        );
        return NextResponse.json(createErrorResponse(error), { status: error.statusCode });
      }

      if (category) {
        const categoryValidation = validateSafeString(category, 50);
        if (!categoryValidation.isValid) {
          const error = ErrorFactory.validation(
            `Invalid category field: ${categoryValidation.error}`,
            'Category contains invalid characters. Please use only letters, numbers, and basic punctuation.'
          );
          return NextResponse.json(createErrorResponse(error), { status: error.statusCode });
        }
      }

      if (description) {
        const descriptionValidation = validateSafeString(description, 500);
        if (!descriptionValidation.isValid) {
          const error = ErrorFactory.validation(
            `Invalid description field: ${descriptionValidation.error}`,
            'Description contains invalid characters. Please use only letters, numbers, and basic punctuation.'
          );
          return NextResponse.json(createErrorResponse(error), { status: error.statusCode });
        }
      }
    } catch (error) {
      const appError = ErrorFactory.validation('Input validation failed', 'Please check your input and try again.');
      return NextResponse.json(createErrorResponse(appError), { status: appError.statusCode });
    }

    // File security validation with detailed error handling
    try {
      const securityResult = await validateFileUploadSecurity(file);
      if (!securityResult.isSecure) {
        const error = ErrorFactory.fileValidation(
          `File security validation failed: ${securityResult.violations.join(', ')}`,
          { violations: securityResult.violations, risk: securityResult.risk }
        );
        return NextResponse.json(createErrorResponse(error, true), { status: error.statusCode });
      }
    } catch (error) {
      const appError = ErrorFactory.fileValidation('Unable to validate file security');
      return NextResponse.json(createErrorResponse(appError), { status: appError.statusCode });
    }

    // Standard file validation
    try {
      const validationResult = await validateFile(file);
      if (!validationResult.isValid) {
        const error = ErrorFactory.fileValidation(
          validationResult.error || 'File validation failed'
        );
        return NextResponse.json(createErrorResponse(error), { status: error.statusCode });
      }
    } catch (error) {
      const appError = ErrorFactory.fileValidation('Unable to validate file');
      return NextResponse.json(createErrorResponse(appError), { status: appError.statusCode });
    }

    // Prepare metadata for Pinata
    const metadata = {
      name: file.name,
      creator: creator.trim(),
      uploadTimestamp: new Date().toISOString(),
      status: 'uploaded',
      keyvalues: {
        creator: creator.trim(),
        uploadTimestamp: new Date().toISOString(),
        status: 'uploaded',
        mimeType: file.type,
        originalSize: file.size.toString(),
        ...(category && { category: category.trim() }),
        ...(description && { description: description.trim() })
      }
    };

    // Upload to Pinata with retry mechanism
    try {
      const uploadResult = await withRetry(
        () => pinataClient.instance.uploadFile(file, metadata),
        { maxAttempts: 3, baseDelay: 1000 },
        (error) => {
          // Retry on network errors or temporary failures
          return error.message?.includes('network') || 
                 error.message?.includes('timeout') ||
                 error.message?.includes('503') ||
                 error.message?.includes('502');
        }
      );

      if (!uploadResult.success) {
        // Log upload failures for monitoring
        console.error('Pinata upload failed:', {
          error: uploadResult.error,
          fileName: file.name,
          fileSize: file.size,
          creator: creator.trim(),
          ip: getClientIP(request)
        });

        // Determine appropriate error type based on the failure
        if (uploadResult.error?.includes('size')) {
          const error = ErrorFactory.upload('File too large', 'size');
          return NextResponse.json(createErrorResponse(error), { status: error.statusCode });
        } else if (uploadResult.error?.includes('type')) {
          const error = ErrorFactory.upload('Invalid file type', 'type');
          return NextResponse.json(createErrorResponse(error), { status: error.statusCode });
        } else if (uploadResult.error?.includes('network') || uploadResult.error?.includes('timeout')) {
          const error = ErrorFactory.upload('Network error during upload', 'network');
          return NextResponse.json(createErrorResponse(error), { status: error.statusCode });
        } else {
          const error = ErrorFactory.upload(uploadResult.error || 'Upload failed');
          return NextResponse.json(createErrorResponse(error), { status: error.statusCode });
        }
      }

      // Return successful response
      return NextResponse.json({
        success: true,
        data: {
          id: uploadResult.data!.id,
          cid: uploadResult.data!.cid,
          name: uploadResult.data!.name,
          size: uploadResult.data!.size,
          mimeType: uploadResult.data!.mimeType
        }
      }, { 
        status: 201,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      });

    } catch (error) {
      // Handle upload errors with fallback
      console.error('Upload operation failed after retries:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName: file.name,
        fileSize: file.size,
        ip: getClientIP(request)
      });

      const appError = ErrorFactory.upload('Upload service temporarily unavailable', 'network');
      const fallback = createFallbackState(
        'Upload service is temporarily unavailable. Please try again in a few minutes.',
        300 // Retry after 5 minutes
      );

      return NextResponse.json({
        ...createErrorResponse(appError),
        fallback
      }, { 
        status: appError.statusCode,
        headers: {
          'Retry-After': '300'
        }
      });
    }

  } catch (error) {
    // Global error handler
    console.error('Unexpected upload API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
      timestamp: new Date().toISOString()
    });

    const appError = ErrorFactory.internal('Unexpected error during upload', false);
    return NextResponse.json(createErrorResponse(appError), { status: appError.statusCode });
  }
}

// Handle unsupported methods with proper error responses
export async function GET() {
  const error = ErrorFactory.validation(
    'Method not allowed',
    'This endpoint only accepts file uploads via POST requests.'
  );
  return NextResponse.json(createErrorResponse(error), { 
    status: 405,
    headers: {
      'Allow': 'POST'
    }
  });
}

export async function PUT() {
  const error = ErrorFactory.validation(
    'Method not allowed',
    'This endpoint only accepts file uploads via POST requests.'
  );
  return NextResponse.json(createErrorResponse(error), { 
    status: 405,
    headers: {
      'Allow': 'POST'
    }
  });
}

export async function DELETE() {
  const error = ErrorFactory.validation(
    'Method not allowed',
    'This endpoint only accepts file uploads via POST requests.'
  );
  return NextResponse.json(createErrorResponse(error), { 
    status: 405,
    headers: {
      'Allow': 'POST'
    }
  });
}