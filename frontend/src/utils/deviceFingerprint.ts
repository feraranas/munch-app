/**
 * Device fingerprinting utility for generating consistent user IDs
 * across page refreshes and navigation within the same browser session.
 */

interface DeviceInfo {
  userAgent: string;
  language: string;
  platform: string;
  timezone: string;
  screenResolution: string;
  sessionId: string; // Browser session-based ID
}

/**
 * Generates a simple hash from a string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Gets or creates a session-persistent ID stored in sessionStorage
 * This persists across page refreshes but not across browser sessions
 */
function getSessionId(): string {
  const STORAGE_KEY = 'munch_device_session_id';
  
  let sessionId = sessionStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    // Generate a new session ID
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem(STORAGE_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Collects device information for fingerprinting
 */
function collectDeviceInfo(): DeviceInfo {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    sessionId: getSessionId()
  };
}

/**
 * Generates a deterministic device fingerprint that persists across page refreshes
 * but changes for different browser sessions or devices
 */
export function generateDeviceFingerprint(): string {
  const deviceInfo = collectDeviceInfo();
  
  // Create a combined string from device characteristics
  const fingerprint = [
    deviceInfo.userAgent,
    deviceInfo.language,
    deviceInfo.platform,
    deviceInfo.timezone,
    deviceInfo.screenResolution,
    deviceInfo.sessionId // This makes it session-persistent
  ].join('|');
  
  // Generate a hash from the fingerprint
  const hash = simpleHash(fingerprint);
  
  // Ensure it's always 8 characters (like the original random ID)
  return hash.padStart(8, '0').substring(0, 8);
}

/**
 * Gets a persistent user ID for a specific QR session
 * This combines the device fingerprint with the QR session for uniqueness
 */
export function getPersistentUserId(qrSessionId: string): string {
  const deviceFingerprint = generateDeviceFingerprint();
  const combined = `${deviceFingerprint}_${qrSessionId}`;
  const hash = simpleHash(combined);
  
  // Return a consistent 8-character ID
  return hash.padStart(8, '0').substring(0, 8);
}
