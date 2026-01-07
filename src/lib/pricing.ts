// USD to USDC conversion utilities

export interface PriceValidationResult {
  isValid: boolean;
  error?: string;
  usdcAmount?: string;
}

/**
 * Converts USD amount to USDC token amount with 6-decimal precision
 * Formula: USD × 1,000,000 (USDC has 6 decimal places)
 */
export function convertUsdToUsdc(usdAmount: number): string {
  if (typeof usdAmount !== 'number') {
    throw new Error('USD amount must be a number');
  }

  if (usdAmount < 0) {
    throw new Error('USD amount cannot be negative');
  }
  
  if (!Number.isFinite(usdAmount)) {
    throw new Error('USD amount must be a valid finite number');
  }

  if (usdAmount === 0) {
    throw new Error('USD amount must be greater than zero');
  }

  // USDC has 6 decimal places, so multiply by 10^6
  const USDC_DECIMALS = 6;
  const multiplier = Math.pow(10, USDC_DECIMALS);
  const multiplied = usdAmount * multiplier;
  
  if (multiplied > Number.MAX_SAFE_INTEGER) {
    throw new Error('USD amount is too large for safe conversion');
  }

  // Use Math.round for proper rounding to nearest integer
  // This ensures 6-decimal precision is maintained
  const usdcAmount = Math.round(multiplied);
  
  if (usdcAmount === 0) {
    throw new Error('USD amount is too small to convert to USDC (minimum 0.000001 USD)');
  }

  return usdcAmount.toString();
}

/**
 * Converts USDC token amount back to USD with proper precision
 */
export function convertUsdcToUsd(usdcAmount: string): number {
  if (typeof usdcAmount !== 'string') {
    throw new Error('USDC amount must be a string');
  }

  if (usdcAmount.trim() === '') {
    throw new Error('USDC amount cannot be empty');
  }

  const amount = parseInt(usdcAmount, 10);
  
  if (isNaN(amount)) {
    throw new Error('Invalid USDC amount format');
  }

  if (amount < 0) {
    throw new Error('USDC amount cannot be negative');
  }
  
  // USDC has 6 decimal places
  const USDC_DECIMALS = 6;
  const divisor = Math.pow(10, USDC_DECIMALS);
  
  return amount / divisor;
}

/**
 * Validates USD price input with enhanced precision checks
 */
export function validateUsdPrice(price: number): boolean {
  if (!Number.isFinite(price) || price <= 0 || price > 10000) {
    return false;
  }

  // Check if the price has more than 6 decimal places
  // This ensures compatibility with USDC's 6-decimal precision
  const priceString = price.toString();
  const decimalIndex = priceString.indexOf('.');
  
  if (decimalIndex !== -1) {
    const decimalPlaces = priceString.length - decimalIndex - 1;
    if (decimalPlaces > 6) {
      return false; // Too many decimal places for USDC precision
    }
  }

  return true;
}

/**
 * Validates and converts USD to USDC with detailed error reporting
 */
export function validateAndConvertPrice(usdAmount: number): PriceValidationResult {
  try {
    // Input validation
    if (typeof usdAmount !== 'number') {
      return {
        isValid: false,
        error: 'Price must be a number'
      };
    }

    if (!Number.isFinite(usdAmount)) {
      return {
        isValid: false,
        error: 'Price must be a valid finite number'
      };
    }

    if (usdAmount <= 0) {
      return {
        isValid: false,
        error: 'Price must be greater than zero'
      };
    }

    if (usdAmount > 10000) {
      return {
        isValid: false,
        error: 'Price cannot exceed $10,000'
      };
    }

    // Check minimum precision (0.000001 USD = 1 USDC unit)
    if (usdAmount < 0.000001) {
      return {
        isValid: false,
        error: 'Price is too small (minimum $0.000001)'
      };
    }

    // Perform conversion
    const usdcAmount = convertUsdToUsdc(usdAmount);

    return {
      isValid: true,
      usdcAmount
    };

  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown conversion error'
    };
  }
}

/**
 * Formats USD amount for display with proper precision
 */
export function formatUsdAmount(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6 // Support up to 6 decimal places for USDC precision
  }).format(amount);
}

/**
 * Formats USDC amount for display with USD equivalent
 */
export function formatUsdcAmount(amount: string): string {
  try {
    const usdAmount = convertUsdcToUsd(amount);
    return `${formatUsdcTokenAmount(amount)} (${formatUsdAmount(usdAmount)})`;
  } catch {
    return `${formatUsdcTokenAmount(amount)}`;
  }
}

/**
 * Formats USDC token amount for display
 */
export function formatUsdcTokenAmount(amount: string): string {
  try {
    const numericAmount = parseInt(amount, 10);
    if (isNaN(numericAmount)) {
      return `${amount} USDC`;
    }
    
    // Format with thousands separators
    return `${numericAmount.toLocaleString()} USDC`;
  } catch {
    return `${amount} USDC`;
  }
}

/**
 * Formats USDC smallest units for display with clear labeling
 */
export function formatUsdcSmallestUnits(amount: string): string {
  try {
    const numericAmount = parseInt(amount, 10);
    if (isNaN(numericAmount)) {
      return `${amount} USDC units`;
    }
    
    // Format with thousands separators and clear unit label
    return `${numericAmount.toLocaleString()} USDC units`;
  } catch {
    return `${amount} USDC units`;
  }
}

/**
 * Formats USDC amount with both token and USD equivalent display
 */
export function formatUsdcWithEquivalent(smallestUnits: string): string {
  try {
    const usdAmount = convertUsdcToUsd(smallestUnits);
    const tokenAmount = usdAmount.toFixed(6).replace(/\.?0+$/, ''); // Remove trailing zeros
    return `${tokenAmount} USDC (${formatUsdAmount(usdAmount)})`;
  } catch {
    return formatUsdcSmallestUnits(smallestUnits);
  }
}

/**
 * Formats payment button amount (converts from smallest units to tokens)
 */
export function formatPaymentButtonAmount(smallestUnits: string): string {
  try {
    const usdAmount = convertUsdcToUsd(smallestUnits);
    const tokenAmount = usdAmount.toFixed(6).replace(/\.?0+$/, ''); // Remove trailing zeros
    return `${tokenAmount} USDC`;
  } catch {
    return `${smallestUnits} USDC units`;
  }
}

/**
 * Formats dual currency display (USD and USDC)
 */
export function formatDualCurrency(usdAmount: number): string {
  try {
    const usdcAmount = convertUsdToUsdc(usdAmount);
    return `${formatUsdAmount(usdAmount)} (${formatUsdcTokenAmount(usdcAmount)})`;
  } catch {
    return formatUsdAmount(usdAmount);
  }
}

/**
 * Parses USD amount from user input with validation
 */
export function parseUsdAmount(input: string): { isValid: boolean; amount?: number; error?: string } {
  if (typeof input !== 'string') {
    return { isValid: false, error: 'Input must be a string' };
  }

  const trimmed = input.trim();
  
  if (trimmed === '') {
    return { isValid: false, error: 'Amount cannot be empty' };
  }

  // Remove currency symbols and spaces
  const cleaned = trimmed.replace(/[$,\s]/g, '');
  
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) {
    return { isValid: false, error: 'Invalid number format' };
  }

  if (!validateUsdPrice(amount)) {
    if (amount <= 0) {
      return { isValid: false, error: 'Amount must be greater than zero' };
    }
    if (amount > 10000) {
      return { isValid: false, error: 'Amount cannot exceed $10,000' };
    }
    return { isValid: false, error: 'Amount has too many decimal places (max 6)' };
  }

  return { isValid: true, amount };
}