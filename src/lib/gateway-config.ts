/**
 * Gateway Configuration
 * 
 * Centralized configuration for Pinata gateway URLs to ensure consistency
 * across the application and eliminate hardcoded fallbacks.
 */

/**
 * Get the Pinata gateway URL from environment variables
 * This should be used consistently across the application
 */
export function getPinataGatewayUrl(): string {
  // In server-side code, use the environment variable
  if (typeof window === 'undefined') {
    return process.env.PINATA_GATEWAY_URL || 'https://brown-voluntary-aardwolf-402.mypinata.cloud';
  }
  
  // In client-side code, we need to get this from the server
  // For now, return the default but this should be passed from server-side APIs
  console.warn('Gateway URL accessed from client-side. This should be provided by server-side APIs.');
  return 'https://brown-voluntary-aardwolf-402.mypinata.cloud';
}

/**
 * Get gateway URL with fallback for client-side usage
 * This function provides a consistent fallback when environment variables are not available
 */
export function getGatewayUrlWithFallback(): string {
  return getPinataGatewayUrl();
}

/**
 * Construct x402 gateway URL for a specific CID
 */
export function getX402GatewayUrl(cid: string): string {
  const baseUrl = getPinataGatewayUrl();
  return `${baseUrl}/x402/cid/${cid}`;
}

/**
 * Validate that a gateway URL is properly formatted
 */
export function isValidGatewayUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && 
           parsed.hostname.includes('mypinata.cloud') &&
           parsed.pathname.includes('/x402/cid/');
  } catch {
    return false;
  }
}