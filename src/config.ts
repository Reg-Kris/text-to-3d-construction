/**
 * Text-to-3D Construction Platform - Configuration
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

// Development mode check
export const IS_DEVELOPMENT = import.meta.env.MODE === 'development';
export const IS_PRODUCTION = import.meta.env.MODE === 'production';

export const API_CONFIG = {
  // Client-side configuration (all sensitive data now handled server-side)
  AUTHORIZED_EMAILS: (
    import.meta.env.VITE_AUTHORIZED_EMAILS || 'gerasimovkris@gmail.com'
  ).split(','),
  MESHY_API_URL: 'https://api.meshy.ai',
  AIRTABLE_API_URL: 'https://api.airtable.com/v0',
  // Proxy configuration (API keys and base ID managed server-side in Netlify functions)
  MESHY_PROXY_URL: IS_PRODUCTION
    ? '/.netlify/functions/meshy-proxy'
    : '/.netlify/functions/meshy-proxy',
  AIRTABLE_PROXY_URL: IS_PRODUCTION
    ? '/.netlify/functions/airtable-proxy'
    : '/.netlify/functions/airtable-proxy',
  USE_PROXY: true, // Always use proxy to avoid CORS issues and secure all credentials
};

// API configuration validation (all sensitive data now validated server-side)
export const validateConfig = () => {
  // All sensitive configuration is now handled server-side
  // Client-side validation is minimal for security
  if (IS_PRODUCTION) {
    console.info('All API credentials managed server-side via Netlify functions');
  }
  return true;
};

// Make available globally
(window as any).API_CONFIG = API_CONFIG;
