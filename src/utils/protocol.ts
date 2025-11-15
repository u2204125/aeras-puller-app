/**
 * Protocol Utilities
 * Automatically detect and use secure protocols (HTTPS/WSS) when needed
 */

/**
 * Convert HTTP/WS URL to HTTPS/WSS if current page is loaded over HTTPS
 * This prevents mixed content errors when deployed on HTTPS
 */
export function getSecureUrl(url: string): string {
  if (!url) return url;
  
  // Check if current page is loaded over HTTPS
  const isSecure = window.location.protocol === 'https:';
  
  if (isSecure) {
    // Convert http:// to https://
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    // Convert ws:// to wss://
    if (url.startsWith('ws://')) {
      return url.replace('ws://', 'wss://');
    }
  }
  
  return url;
}

/**
 * Get WebSocket URL with proper protocol
 */
export function getWebSocketUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  
  // If already a WebSocket URL, just ensure proper protocol
  if (baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://')) {
    return getSecureUrl(baseUrl);
  }
  
  // If it's an HTTP URL, convert to WebSocket URL
  const isSecure = window.location.protocol === 'https:' || baseUrl.startsWith('https://');
  const protocol = isSecure ? 'wss://' : 'ws://';
  
  // Remove http:// or https:// prefix
  const urlWithoutProtocol = baseUrl.replace(/^https?:\/\//, '');
  
  return `${protocol}${urlWithoutProtocol}`;
}

/**
 * Get HTTP/HTTPS URL with proper protocol
 */
export function getHttpUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  
  // If already has protocol, ensure it matches page security
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    return getSecureUrl(baseUrl);
  }
  
  // Add appropriate protocol
  const protocol = window.location.protocol === 'https:' ? 'https://' : 'http://';
  return `${protocol}${baseUrl}`;
}
