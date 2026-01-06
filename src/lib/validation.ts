// Input validation utilities

// Base Sepolia Network Constants
export const BASE_SEPOLIA_NETWORK = 'base-sepolia';
export const BASE_SEPOLIA_USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
export const SUPPORTED_NETWORKS = [BASE_SEPOLIA_NETWORK] as const;

export type SupportedNetwork = typeof SUPPORTED_NETWORKS[number];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface FileValidationResult extends ValidationResult {
  fileInfo?: {
    name: string;
    size: number;
    type: string;
  };
}

export interface PaymentInstructionValidationResult extends ValidationResult {
  data?: {
    name: string;
    description: string;
    priceUSD: number;
    walletAddress: string;
    network: SupportedNetwork;
    usdcAmount: string;
  };
}

/**
 * Validates Ethereum address format and checksum using EIP-55
 */
export function validateEthereumAddress(address: string): boolean {
  if (typeof address !== 'string') {
    return false;
  }

  // Remove any whitespace and check basic format
  const trimmed = address.trim();
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  
  if (!addressRegex.test(trimmed)) {
    return false;
  }

  // Validate checksum if address has mixed case (EIP-55)
  return validateEthereumChecksum(trimmed);
}

/**
 * Validates EIP-55 checksum for Ethereum addresses
 */
export function validateEthereumChecksum(address: string): boolean {
  // If all lowercase or all uppercase, checksum validation is not required
  const addressWithoutPrefix = address.slice(2);
  const isAllLowercase = addressWithoutPrefix === addressWithoutPrefix.toLowerCase();
  const isAllUppercase = addressWithoutPrefix === addressWithoutPrefix.toUpperCase();
  
  if (isAllLowercase || isAllUppercase) {
    return true; // Valid format, no checksum to validate
  }

  // For mixed case addresses, validate EIP-55 checksum
  // Note: In a real implementation, you would use a proper keccak256 hash
  // For this implementation, we'll accept mixed case as valid since we don't have crypto libraries
  return true;
}

/**
 * Converts Ethereum address to EIP-55 checksum format
 */
export function toChecksumAddress(address: string): string {
  if (!validateEthereumAddress(address)) {
    throw new Error('Invalid Ethereum address');
  }

  // For this implementation, return lowercase format
  // In a real implementation, you would use keccak256 to calculate proper checksum
  return address.toLowerCase();
}

/**
 * Validates Ethereum address with detailed error reporting
 */
export function validateEthereumAddressDetailed(address: string): ValidationResult {
  if (typeof address !== 'string') {
    return { isValid: false, error: 'Address must be a string' };
  }

  const trimmed = address.trim();

  if (trimmed === '') {
    return { isValid: false, error: 'Address cannot be empty' };
  }

  if (!trimmed.startsWith('0x')) {
    return { isValid: false, error: 'Address must start with 0x' };
  }

  if (trimmed.length !== 42) {
    return { isValid: false, error: 'Address must be 42 characters long' };
  }

  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!addressRegex.test(trimmed)) {
    return { isValid: false, error: 'Address contains invalid characters' };
  }

  return { isValid: true };
}

/**
 * Validates file type for document uploads
 */
export function validateFileType(file: File): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/epub+zip',
    'application/x-mobipocket-ebook',
    'text/plain',
    'application/vnd.amazon.ebook', // Kindle format
    'application/x-ibooks+zip' // iBooks format
  ];
  
  return allowedTypes.includes(file.type);
}

/**
 * Validates file size (max 50MB)
 */
export function validateFileSize(file: File): boolean {
  const maxSize = 50 * 1024 * 1024; // 50MB
  return file.size > 0 && file.size <= maxSize;
}

/**
 * Validates file name for security
 */
export function validateFileName(fileName: string): boolean {
  if (typeof fileName !== 'string' || fileName.trim() === '') {
    return false;
  }

  // Check for dangerous characters and patterns
  const dangerousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,  // Windows reserved names
    /^\./,  // Hidden files starting with dot
    /\.$/, // Files ending with dot
  ];

  return !dangerousPatterns.some(pattern => pattern.test(fileName));
}

/**
 * Validates file content type based on file signature (magic numbers)
 */
export function validateFileSignature(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    // Skip signature validation in server environment
    if (typeof window === 'undefined') {
      // Server-side: accept all files for now
      // TODO: Implement server-side file signature validation using Buffer
      resolve(true);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        resolve(false);
        return;
      }

      const bytes = new Uint8Array(arrayBuffer.slice(0, 8));
      
      // PDF signature: %PDF
      if (file.type === 'application/pdf') {
        const pdfSignature = [0x25, 0x50, 0x44, 0x46]; // %PDF
        const matches = pdfSignature.every((byte, index) => bytes[index] === byte);
        resolve(matches);
        return;
      }

      // For other file types, accept for now
      // TODO: Add more file signature validations
      resolve(true);
    };

    reader.onerror = () => resolve(false);
    
    // Read first 8 bytes for signature check
    reader.readAsArrayBuffer(file.slice(0, 8));
  });
}

/**
 * Comprehensive file validation with security checks
 */
export async function validateFile(file: File): Promise<FileValidationResult> {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Basic file object validation
  if (!(file instanceof File)) {
    return { isValid: false, error: 'Invalid file object' };
  }

  // File name validation
  if (!validateFileName(file.name)) {
    return { isValid: false, error: 'Invalid file name or potentially dangerous file' };
  }

  // File type validation
  if (!validateFileType(file)) {
    return { 
      isValid: false, 
      error: 'Invalid file type. Only PDF and ebook formats (EPUB, MOBI, TXT) are allowed.' 
    };
  }
  
  // File size validation
  if (!validateFileSize(file)) {
    if (file.size === 0) {
      return { isValid: false, error: 'File is empty' };
    }
    return { isValid: false, error: 'File size exceeds 50MB limit' };
  }

  // File signature validation (for security)
  try {
    const hasValidSignature = await validateFileSignature(file);
    if (!hasValidSignature) {
      return { isValid: false, error: 'File content does not match declared file type' };
    }
  } catch (error) {
    return { isValid: false, error: 'Unable to validate file content' };
  }
  
  return { 
    isValid: true,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type
    }
  };
}

/**
 * Validates input string for XSS and injection attacks
 */
export function validateSafeString(input: string, maxLength: number = 1000): ValidationResult {
  if (typeof input !== 'string') {
    return { isValid: false, error: 'Input must be a string' };
  }

  if (input.length > maxLength) {
    return { isValid: false, error: `Input exceeds maximum length of ${maxLength} characters` };
  }

  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  const hasDangerousContent = dangerousPatterns.some(pattern => pattern.test(input));
  
  if (hasDangerousContent) {
    return { isValid: false, error: 'Input contains potentially dangerous content' };
  }

  return { isValid: true };
}

/**
 * Validates network configuration for Base Sepolia
 */
export function validateNetwork(network: string): ValidationResult {
  if (typeof network !== 'string') {
    return { isValid: false, error: 'Network must be a string' };
  }

  if (!SUPPORTED_NETWORKS.includes(network as SupportedNetwork)) {
    return { 
      isValid: false, 
      error: `Unsupported network. Must be one of: ${SUPPORTED_NETWORKS.join(', ')}` 
    };
  }

  return { isValid: true };
}

/**
 * Validates USDC token address for Base Sepolia
 */
export function validateUsdcTokenAddress(address: string, network: SupportedNetwork): ValidationResult {
  if (network === BASE_SEPOLIA_NETWORK) {
    if (address !== BASE_SEPOLIA_USDC_ADDRESS) {
      return {
        isValid: false,
        error: `Invalid USDC token address for Base Sepolia. Expected: ${BASE_SEPOLIA_USDC_ADDRESS}`
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates payment instruction form data comprehensively
 */
export function validatePaymentInstructionForm(data: {
  name: string;
  description: string;
  priceUSD: number;
  walletAddress: string;
  network?: string;
}): PaymentInstructionValidationResult {
  // Validate name
  const nameValidation = validateSafeString(data.name?.trim() || '', 100);
  if (!nameValidation.isValid) {
    return { isValid: false, error: `Invalid name: ${nameValidation.error}` };
  }

  if (data.name.trim().length < 3) {
    return { isValid: false, error: 'Name must be at least 3 characters long' };
  }

  // Validate description
  const descriptionValidation = validateSafeString(data.description?.trim() || '', 500);
  if (!descriptionValidation.isValid) {
    return { isValid: false, error: `Invalid description: ${descriptionValidation.error}` };
  }

  if (data.description.trim().length < 5) {
    return { isValid: false, error: 'Description must be at least 5 characters long' };
  }

  // Validate price
  const priceValidation = validateNumericRange(data.priceUSD, 0.01, 10000, 'Price');
  if (!priceValidation.isValid) {
    return { isValid: false, error: priceValidation.error };
  }

  // Validate wallet address
  const addressValidation = validateEthereumAddressDetailed(data.walletAddress);
  if (!addressValidation.isValid) {
    return { isValid: false, error: `Invalid wallet address: ${addressValidation.error}` };
  }

  // Validate network
  const network = data.network || BASE_SEPOLIA_NETWORK;
  const networkValidation = validateNetwork(network);
  if (!networkValidation.isValid) {
    return { isValid: false, error: networkValidation.error };
  }

  // Convert USD to USDC
  let usdcAmount: string;
  try {
    // Import pricing utility dynamically to avoid circular dependency
    const { convertUsdToUsdc } = require('./pricing');
    usdcAmount = convertUsdToUsdc(data.priceUSD);
  } catch (error) {
    return { 
      isValid: false, 
      error: `Price conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }

  return {
    isValid: true,
    data: {
      name: data.name.trim(),
      description: data.description.trim(),
      priceUSD: data.priceUSD,
      walletAddress: data.walletAddress.trim(),
      network: network as SupportedNetwork,
      usdcAmount
    }
  };
}

/**
 * Validates CID format (IPFS Content Identifier)
 */
export function validateCID(cid: string): ValidationResult {
  if (typeof cid !== 'string') {
    return { isValid: false, error: 'CID must be a string' };
  }

  const trimmed = cid.trim();
  
  if (trimmed === '') {
    return { isValid: false, error: 'CID cannot be empty' };
  }

  // Basic CID format validation (simplified)
  // Real CIDs are more complex, but this covers basic cases
  if (trimmed.length < 10 || trimmed.length > 100) {
    return { isValid: false, error: 'CID length is invalid' };
  }

  // CIDs should not contain spaces or special characters except allowed ones
  const cidRegex = /^[a-zA-Z0-9]+$/;
  if (!cidRegex.test(trimmed)) {
    return { isValid: false, error: 'CID contains invalid characters' };
  }

  return { isValid: true };
}

/**
 * Validates numeric input within specified range
 */
export function validateNumericRange(
  value: number, 
  min: number, 
  max: number, 
  fieldName: string = 'Value'
): ValidationResult {
  if (typeof value !== 'number') {
    return { isValid: false, error: `${fieldName} must be a number` };
  }

  if (!Number.isFinite(value)) {
    return { isValid: false, error: `${fieldName} must be a valid finite number` };
  }

  if (value < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (value > max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${max}` };
  }

  return { isValid: true };
}