// Pinata API client for PinAccess application

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export class PinataApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'PinataApiError';
  }
}

export class PinataClient {
  private jwt: string;
  private apiUrl: string;
  private gatewayUrl: string;
  private defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  };

  constructor() {
    this.jwt = process.env.PINATA_JWT || '';
    this.apiUrl = process.env.PINATA_API_URL || 'https://api.pinata.cloud';
    this.gatewayUrl = process.env.PINATA_GATEWAY_URL || '';
    
    if (!this.jwt) {
      throw new Error('PINATA_JWT environment variable is required');
    }

    if (!this.gatewayUrl) {
      throw new Error('PINATA_GATEWAY_URL environment variable is required');
    }

    // Basic JWT format validation
    const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
    if (!jwtPattern.test(this.jwt)) {
      throw new Error('PINATA_JWT does not appear to be a valid JWT token');
    }

    // Ensure URLs are HTTPS in production
    if (process.env.NODE_ENV === 'production') {
      if (!this.apiUrl.startsWith('https://')) {
        throw new Error('PINATA_API_URL must use HTTPS in production');
      }
      if (!this.gatewayUrl.startsWith('https://')) {
        throw new Error('PINATA_GATEWAY_URL must use HTTPS in production');
      }
    } else {
      // In development, allow HTTP for localhost but warn about it
      if (!this.apiUrl.startsWith('https://') && !this.apiUrl.includes('localhost')) {
        console.warn('Warning: PINATA_API_URL should use HTTPS for security');
      }
      if (!this.gatewayUrl.startsWith('https://') && !this.gatewayUrl.includes('localhost')) {
        console.warn('Warning: PINATA_GATEWAY_URL should use HTTPS for security');
      }
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.jwt}`,
      'Content-Type': 'application/json',
      'User-Agent': 'PinAccess/1.0.0',
    };
  }

  private getFormDataHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.jwt}`,
      'User-Agent': 'PinAccess/1.0.0',
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true; // Network error
    }
    
    if (error instanceof PinataApiError) {
      const statusCode = error.statusCode;
      return statusCode === 429 || // Rate limit
             statusCode === 502 || // Bad Gateway
             statusCode === 503 || // Service Unavailable
             statusCode === 504;   // Gateway Timeout
    }
    
    return false;
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const { maxRetries, baseDelay, maxDelay } = { ...this.defaultRetryOptions, ...options };
    
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        
        const delayMs = this.calculateBackoffDelay(attempt, baseDelay, maxDelay);
        await this.delay(delayMs);
      }
    }
    
    throw lastError;
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    retryOptions?: Partial<RetryOptions>
  ): Promise<T> {
    return this.retryWithBackoff(async () => {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          let responseData: any;
          
          try {
            responseData = await response.json();
            if (responseData.error?.message) {
              errorMessage = responseData.error.message;
            } else if (responseData.error) {
              errorMessage = typeof responseData.error === 'string' ? responseData.error : JSON.stringify(responseData.error);
            } else if (responseData.message) {
              errorMessage = responseData.message;
            }
          } catch {
            // If response is not JSON, use status text
          }
          
          throw new PinataApiError(errorMessage, response.status, responseData);
        }

        try {
          return await response.json();
        } catch (error) {
          throw new PinataApiError('Invalid JSON response from Pinata API', response.status);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle abort/timeout errors
        if (error instanceof Error && error.name === 'AbortError') {
          throw new PinataApiError('Request timeout', 408);
        }
        
        throw error;
      }
    }, retryOptions);
  }

  async testAuthentication(): Promise<boolean> {
    try {
      const response = await this.makeRequest<any>(
        `${this.apiUrl}/data/testAuthentication`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );
      
      return response.message === 'Congratulations! You are communicating with the Pinata API!';
    } catch (error) {
      if (error instanceof PinataApiError && error.statusCode === 401) {
        return false;
      }
      throw error;
    }
  }

  async uploadFile(file: File, metadata: Record<string, any>) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('network', 'private');

      const keyvalues = {
        creator: String(metadata.creator || 'unknown'),
        uploadTimestamp: String(metadata.uploadTimestamp || new Date().toISOString()),
        status: String(metadata.status || 'uploaded'),
        mimeType: String(file.type),
        originalSize: String(file.size)
      };
      formData.append('keyvalues', JSON.stringify(keyvalues));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const rawResponse = await fetch('https://uploads.pinata.cloud/v3/files', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.jwt}` },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!rawResponse.ok) {
        const errorText = await rawResponse.text();
        throw new PinataApiError(`Upload failed: ${errorText}`, rawResponse.status);
      }

      const response = await rawResponse.json() as {
        data: {
          id: string;
          cid: string;
          name: string;
          size: number;
          mime_type: string;
          created_at: string;
          is_duplicate?: boolean;
        };
      };

      // Verify the file exists on PRIVATE network (required for x402)
      const verifyResponse = await fetch(
        `https://api.pinata.cloud/v3/files/private/${response.data.id}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${this.jwt}` },
        }
      );

      if (verifyResponse.status === 404) {
        // File not on PRIVATE storage - this happens when:
        // 1. File was previously uploaded to PUBLIC, or
        // 2. File was deleted but CID is cached as duplicate
        const errorMsg = response.data.is_duplicate
          ? 'This file was previously uploaded but has been deleted. The content ID is cached but the file no longer exists. Please upload a different file with different content.'
          : 'File upload succeeded but verification failed. Please try again or contact support.';

        console.error('[Pinata] Upload verification failed:', errorMsg);
        return { success: false, error: errorMsg };
      }

      return {
        success: true,
        data: {
          id: response.data.id,
          cid: response.data.cid,
          name: response.data.name || metadata.name || file.name,
          size: response.data.size,
          mimeType: response.data.mime_type || file.type,
          timestamp: response.data.created_at,
          isDuplicate: response.data.is_duplicate || false
        }
      };
    } catch (error) {
      console.error('[Pinata] Upload error:', error instanceof Error ? error.message : 'Unknown error');

      if (error instanceof PinataApiError) {
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      return {
        success: false,
        error: `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async createPaymentInstruction(config: {
    name: string;
    description: string;
    usdcAmount: string;
    walletAddress: string;
    network?: 'base-sepolia';
  }) {
    try {
      // Base Sepolia USDC token address
      const BASE_SEPOLIA_USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
      
      const paymentInstructionData = {
        name: config.name,
        description: config.description,
        payment_requirements: [
          {
            asset: BASE_SEPOLIA_USDC_ADDRESS,
            pay_to: config.walletAddress,
            network: config.network || 'base-sepolia',
            description: `Payment of ${config.usdcAmount} USDC for ${config.name}`,
            max_amount_required: config.usdcAmount
          }
        ]
      };

      const response = await this.makeRequest<{
        data: {
          id: string;
          name: string;
          description: string;
          payment_requirements: Array<{
            asset: string;
            pay_to: string;
            network: string;
            description: string;
            max_amount_required: string;
          }>;
        };
      }>(
        'https://api.pinata.cloud/v3/x402/payment_instructions',
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(paymentInstructionData),
        }
      );

      return {
        success: true,
        data: {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description,
          paymentRequirements: response.data.payment_requirements
        }
      };
    } catch (error) {
      console.error('Payment instruction creation error:', error);
      
      if (error instanceof PinataApiError) {
        return {
          success: false,
          error: `Payment instruction creation failed: ${error.message}`
        };
      }
      
      return {
        success: false,
        error: 'Payment instruction creation failed due to an unexpected error'
      };
    }
  }

  // ===== PAYMENT INSTRUCTIONS MANAGEMENT =====

  /**
   * List all payment instructions with pagination and filtering
   */
  async listPaymentInstructions(options?: {
    pageToken?: string;
    pageSize?: number;
    name?: string;
    cid?: string;
    instructionId?: string;
  }) {
    try {
      const queryParams = new URLSearchParams();
      
      if (options?.pageSize) {
        queryParams.append('limit', Math.min(options.pageSize, 100).toString());
      }
      
      if (options?.pageToken) {
        queryParams.append('page_token', options.pageToken);
      }
      
      // Add filtering parameters
      if (options?.name) {
        queryParams.append('name', options.name);
      }
      
      if (options?.cid) {
        queryParams.append('cid', options.cid);
      }
      
      if (options?.instructionId) {
        queryParams.append('instruction_id', options.instructionId);
      }

      const url = `https://api.pinata.cloud/v3/x402/payment_instructions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

      const response = await this.makeRequest<{
        data: {
          payment_instructions: Array<{
            id: string;
            version: number;
            name: string;
            description: string;
            payment_requirements: Array<{
              asset: string;
              pay_to: string;
              network: string;
              description: string;
              max_amount_required: string;
            }>;
            created_at: string;
            updated_at?: string;
          }>;
          next_page_token?: string;
        };
      }>(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      return {
        success: true,
        data: {
          paymentInstructions: response.data.payment_instructions.map(pi => ({
            id: pi.id,
            version: pi.version,
            name: pi.name,
            description: pi.description,
            paymentRequirements: pi.payment_requirements,
            createdAt: pi.created_at,
            updatedAt: pi.updated_at
          })),
          nextPageToken: response.data.next_page_token,
          totalCount: response.data.payment_instructions.length
        }
      };
    } catch (error) {
      console.error('Get payment instructions error:', error);
      
      if (error instanceof PinataApiError) {
        return {
          success: false,
          error: `Failed to fetch payment instructions: ${error.message}`
        };
      }
      
      return {
        success: false,
        error: 'Failed to fetch payment instructions due to an unexpected error'
      };
    }
  }

  /**
   * Get a specific payment instruction by ID
   */
  async getPaymentInstruction(instructionId: string) {
    try {
      const response = await this.makeRequest<{
        data: {
          id: string;
          version: number;
          name: string;
          description: string;
          payment_requirements: Array<{
            asset: string;
            pay_to: string;
            network: string;
            description: string;
            max_amount_required: string;
          }>;
          created_at: string;
          updated_at?: string;
        };
      }>(
        `https://api.pinata.cloud/v3/x402/payment_instructions/${instructionId}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: {
          id: response.data.id,
          version: response.data.version,
          name: response.data.name,
          description: response.data.description,
          paymentRequirements: response.data.payment_requirements,
          createdAt: response.data.created_at,
          updatedAt: response.data.updated_at
        }
      };
    } catch (error) {
      console.error('Get payment instruction error:', error);
      
      if (error instanceof PinataApiError) {
        if (error.statusCode === 404) {
          return {
            success: false,
            error: 'Payment instruction not found'
          };
        }
        return {
          success: false,
          error: `Failed to fetch payment instruction: ${error.message}`
        };
      }
      
      return {
        success: false,
        error: 'Failed to fetch payment instruction due to an unexpected error'
      };
    }
  }

  /**
   * Update a payment instruction
   */
  async updatePaymentInstruction(instructionId: string, config: {
    name: string;
    description: string;
    usdcAmount: string;
    walletAddress: string;
    network?: 'base-sepolia';
  }) {
    try {
      // Base Sepolia USDC token address
      const BASE_SEPOLIA_USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
      
      const updates = {
        name: config.name,
        description: config.description,
        payment_requirements: [
          {
            asset: BASE_SEPOLIA_USDC_ADDRESS,
            pay_to: config.walletAddress,
            network: config.network || 'base-sepolia',
            description: `Payment of ${config.usdcAmount} USDC for ${config.name}`,
            max_amount_required: config.usdcAmount
          }
        ]
      };
      const response = await this.makeRequest<{
        data: {
          id: string;
          version: number;
          name: string;
          description: string;
          payment_requirements: Array<{
            asset: string;
            pay_to: string;
            network: string;
            description: string;
            max_amount_required: string;
          }>;
          created_at: string;
          updated_at: string;
        };
      }>(
        `https://api.pinata.cloud/v3/x402/payment_instructions/${instructionId}`,
        {
          method: 'PATCH',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(updates),
        }
      );

      return {
        success: true,
        data: {
          id: response.data.id,
          version: response.data.version,
          name: response.data.name,
          description: response.data.description,
          paymentRequirements: response.data.payment_requirements,
          createdAt: response.data.created_at,
          updatedAt: response.data.updated_at
        }
      };
    } catch (error) {
      console.error('Update payment instruction error:', error);
      
      if (error instanceof PinataApiError) {
        if (error.statusCode === 404) {
          return {
            success: false,
            error: 'Payment instruction not found'
          };
        }
        if (error.statusCode === 400) {
          return {
            success: false,
            error: 'Invalid update data. Please check that addresses start with "0x" and network is "base-sepolia"'
          };
        }
        return {
          success: false,
          error: `Failed to update payment instruction: ${error.message}`
        };
      }
      
      return {
        success: false,
        error: 'Failed to update payment instruction due to an unexpected error'
      };
    }
  }

  /**
   * Delete a payment instruction (will fail if CIDs are attached)
   */
  async deletePaymentInstruction(instructionId: string) {
    try {
      await this.makeRequest<void>(
        `https://api.pinata.cloud/v3/x402/payment_instructions/${instructionId}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: { deleted: true }
      };
    } catch (error) {
      console.error('Delete payment instruction error:', error);
      
      if (error instanceof PinataApiError) {
        if (error.statusCode === 404) {
          return {
            success: false,
            error: 'Payment instruction not found'
          };
        }
        if (error.statusCode === 409) {
          return {
            success: false,
            error: 'Cannot delete payment instruction with attached CIDs. Please remove all CID attachments first.',
            requiresCidRemoval: true
          };
        }
        return {
          success: false,
          error: `Failed to delete payment instruction: ${error.message}`
        };
      }
      
      return {
        success: false,
        error: 'Failed to delete payment instruction due to an unexpected error'
      };
    }
  }

  // ===== CID MANAGEMENT =====

  /**
   * Get all CIDs attached to a payment instruction
   */
  async listAttachedCIDs(instructionId: string) {
    return this.getAttachedCids(instructionId);
  }

  /**
   * Attach a CID to a payment instruction
   */
  async attachCID(instructionId: string, cid: string) {
    return this.attachCidToPayment(cid, instructionId);
  }

  /**
   * Detach a CID from a payment instruction
   */
  async detachCID(instructionId: string, cid: string) {
    return this.detachCidFromPayment(cid, instructionId);
  }

  /**
   * Get all CIDs attached to a payment instruction
   */
  async getAttachedCids(instructionId: string) {
    try {
      const response = await this.makeRequest<{
        data: {
          cids: string[]; // Pinata returns an array of CID strings, not objects
        };
      }>(
        `https://api.pinata.cloud/v3/x402/payment_instructions/${instructionId}/cids`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      // Since Pinata only returns CID strings, we need to get file details separately
      // For now, we'll create minimal AttachedCID objects with just the CID
      return {
        success: true,
        data: {
          cids: response.data.cids.map(cid => ({
            cid: cid,
            documentName: cid, // Use CID as name since we don't have the original name
            fileSize: 0, // We don't have size info from this endpoint
            mimeType: 'application/octet-stream', // Default mime type
            uploadDate: new Date().toISOString(), // Use current date as fallback
            gatewayUrl: `${this.gatewayUrl}/x402/cid/${cid}`,
            paymentInstructionId: instructionId
          })),
          paymentInstructionId: instructionId
        }
      };
    } catch (error) {
      console.error('Get attached CIDs error:', error);
      
      if (error instanceof PinataApiError) {
        if (error.statusCode === 404) {
          return {
            success: false,
            error: 'Payment instruction not found'
          };
        }
        return {
          success: false,
          error: `Failed to fetch attached CIDs: ${error.message}`
        };
      }
      
      return {
        success: false,
        error: 'Failed to fetch attached CIDs due to an unexpected error'
      };
    }
  }

  /**
   * Attach a CID to a payment instruction
   */
  async attachCidToPayment(cid: string, paymentId: string) {
    try {
      await this.makeRequest<void>(
        `https://api.pinata.cloud/v3/x402/payment_instructions/${paymentId}/cids/${cid}`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
        }
      );

      const gatewayUrl = `${this.gatewayUrl}/x402/cid/${cid}`;

      return {
        success: true,
        data: {
          cid: cid,
          paymentInstructionId: paymentId,
          gatewayUrl: gatewayUrl,
          association: {
            documentCid: cid,
            paymentId: paymentId,
            gatewayUrl: gatewayUrl,
            createdAt: new Date().toISOString()
          }
        }
      };
    } catch (error) {
      console.error('[Pinata] CID attachment failed:', error instanceof Error ? error.message : 'Unknown error');

      if (error instanceof PinataApiError) {
        if (error.statusCode === 404) {
          return {
            success: false,
            error: 'CID not found, is not private, or payment instruction does not exist. Ensure the file was uploaded with network=private.'
          };
        }
        if (error.statusCode === 409) {
          return {
            success: false,
            error: 'CID is already attached to another payment instruction',
            isConflict: true
          };
        }
        return {
          success: false,
          error: `CID attachment failed: ${error.message}`
        };
      }

      return {
        success: false,
        error: 'CID attachment failed due to an unexpected error'
      };
    }
  }

  /**
   * Detach a CID from a payment instruction
   */
  async detachCidFromPayment(cid: string, paymentId: string) {
    try {
      await this.makeRequest<void>(
        `https://api.pinata.cloud/v3/x402/payment_instructions/${paymentId}/cids/${cid}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        data: {
          cid: cid,
          paymentInstructionId: paymentId,
          detached: true
        }
      };
    } catch (error) {
      console.error('CID detachment error:', error);
      
      if (error instanceof PinataApiError) {
        if (error.statusCode === 404) {
          return {
            success: false,
            error: 'CID or payment instruction not found, or CID is not attached'
          };
        }
        return {
          success: false,
          error: `CID detachment failed: ${error.message}`
        };
      }
      
      return {
        success: false,
        error: 'CID detachment failed due to an unexpected error'
      };
    }
  }

  /**
   * Bulk attach multiple CIDs to a payment instruction
   */
  async bulkAttachCids(cids: string[], paymentId: string) {
    const results = [];
    const errors = [];

    for (const cid of cids) {
      try {
        const result = await this.attachCidToPayment(cid, paymentId);
        if (result.success) {
          results.push(result.data);
        } else {
          errors.push({ cid, error: result.error });
        }
      } catch (error) {
        errors.push({ 
          cid, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return {
      success: errors.length === 0,
      data: {
        successful: results,
        failed: errors,
        totalProcessed: cids.length,
        successCount: results.length,
        errorCount: errors.length
      }
    };
  }

  /**
   * Bulk detach multiple CIDs from a payment instruction
   */
  async bulkDetachCids(cids: string[], paymentId: string) {
    const results = [];
    const errors = [];

    for (const cid of cids) {
      try {
        const result = await this.detachCidFromPayment(cid, paymentId);
        if (result.success) {
          results.push(result.data);
        } else {
          errors.push({ cid, error: result.error });
        }
      } catch (error) {
        errors.push({ 
          cid, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return {
      success: errors.length === 0,
      data: {
        successful: results,
        failed: errors,
        totalProcessed: cids.length,
        successCount: results.length,
        errorCount: errors.length
      }
    };
  }

  /**
   * Delete payment instruction with automatic CID detachment
   */
  async deletePaymentInstructionWithCleanup(instructionId: string) {
    try {
      // First, try to delete directly
      const deleteResult = await this.deletePaymentInstruction(instructionId);
      
      if (deleteResult.success) {
        return deleteResult;
      }

      // If deletion failed due to attached CIDs, clean them up first
      if (deleteResult.error?.includes('attached CIDs')) {
        // Get all attached CIDs
        const attachedResult = await this.getAttachedCids(instructionId);
        
        if (!attachedResult.success) {
          return {
            success: false,
            error: 'Failed to fetch attached CIDs for cleanup'
          };
        }

        // Detach all CIDs
        const cids = attachedResult.data!.cids.map(c => c.cid);
        if (cids.length > 0) {
          const detachResult = await this.bulkDetachCids(cids, instructionId);
          
          if (!detachResult.success) {
            return {
              success: false,
              error: `Failed to detach CIDs: ${detachResult.data?.failed.map(f => f.error).join(', ')}`
            };
          }
        }

        // Try deletion again
        return await this.deletePaymentInstruction(instructionId);
      }

      return deleteResult;
    } catch (error) {
      console.error('Delete payment instruction with cleanup error:', error);
      
      return {
        success: false,
        error: 'Failed to delete payment instruction with cleanup due to an unexpected error'
      };
    }
  }

  async listDocuments(filters?: {
    creator?: string;
    status?: 'uploaded' | 'monetized' | 'error';
    pageToken?: string;
    pageSize?: number;
  }) {
    try {
      // Build query parameters for Pinata's v3 files API
      const queryParams = new URLSearchParams();

      // Set page size (use a larger size to get more files)
      const pageSize = filters?.pageSize || 10;
      queryParams.append('limit', Math.min(pageSize * 2, 100).toString());

      // Add metadata filters using Pinata's key-value query system
      if (filters?.creator) {
        queryParams.append('metadata[creator]', filters.creator);
      }

      if (filters?.status) {
        queryParams.append('metadata[status]', filters.status);
      }

      // Sort by most recent first (Pinata uses ASC/DESC, not asc/desc)
      queryParams.append('order', 'DESC');

      // Pinata v3 API: GET /v3/files/{network}
      const url = `https://api.pinata.cloud/v3/files/private?${queryParams.toString()}`;

      const response = await this.makeRequest<{
        data: {
          files: Array<{
            id: string;
            cid: string;
            name: string;
            size: number;
            mime_type: string;
            created_at: string;
            keyvalues: Record<string, any>;
          }>;
          next_page_token?: string;
        };
      }>(
        url,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      // Transform Pinata response to our Document format
      const documents = response.data.files.map(file => {
        const keyvalues = file.keyvalues || {};
        
        return {
          id: file.id,
          cid: file.cid,
          name: file.name || 'Untitled Document',
          size: file.size,
          mimeType: file.mime_type || 'application/octet-stream',
          createdAt: file.created_at,
          isMonetized: keyvalues.status === 'monetized',
          price: keyvalues.price ? {
            usd: parseFloat(keyvalues.price.usd || '0'),
            usdc: keyvalues.price.usdc || '0'
          } : undefined,
          paymentInstructionId: keyvalues.paymentInstructionId,
          gatewayUrl: keyvalues.gatewayUrl,
          walletAddress: keyvalues.walletAddress,
          metadata: {
            creator: keyvalues.creator || 'unknown',
            uploadTimestamp: keyvalues.uploadTimestamp || file.created_at,
            status: keyvalues.status || 'uploaded'
          }
        };
      });

      // Simple pagination logic: return requested page size and indicate if there are more
      const requestedPageSize = filters?.pageSize || 10;
      const startIndex = filters?.pageToken ? parseInt(filters.pageToken) || 0 : 0;
      
      // Slice the documents to the requested page
      const paginatedDocuments = documents.slice(startIndex, startIndex + requestedPageSize);
      
      // Check if there are more documents available
      const hasMoreResults = documents.length > startIndex + requestedPageSize;
      const nextPageToken = hasMoreResults ? (startIndex + requestedPageSize).toString() : null;

      return {
        success: true,
        data: {
          documents: paginatedDocuments,
          nextPageToken,
          totalCount: paginatedDocuments.length
        }
      };
    } catch (error) {
      console.error('Document listing error:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        statusCode: error instanceof PinataApiError ? error.statusCode : undefined,
        response: error instanceof PinataApiError ? error.response : undefined
      });
      
      if (error instanceof PinataApiError) {
        return {
          success: false,
          error: `Document listing failed: ${error.message}`
        };
      }
      
      return {
        success: false,
        error: 'Document listing failed due to an unexpected error'
      };
    }
  }
}

// Export a function to create the client when needed
export const createPinataClient = () => new PinataClient();

// Export a default instance for convenience (will be created when first accessed)
let _defaultClient: PinataClient | null = null;
export const pinataClient = {
  get instance() {
    if (!_defaultClient) {
      _defaultClient = new PinataClient();
    }
    return _defaultClient;
  }
};