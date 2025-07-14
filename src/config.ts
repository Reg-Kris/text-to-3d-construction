/**
 * Text-to-3D Construction Platform - Configuration
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

// Development mode check
export const IS_DEVELOPMENT = import.meta.env.MODE === 'development';
export const IS_PRODUCTION = import.meta.env.MODE === 'production';

export const API_CONFIG = {
  MESHY_API_KEY: import.meta.env.VITE_MESHY_API_KEY || 'your-meshy-api-key-here',
  AIRTABLE_API_KEY: import.meta.env.VITE_AIRTABLE_PAT || 'your-airtable-pat-here',
  AIRTABLE_BASE_ID: import.meta.env.VITE_AIRTABLE_BASE_ID || 'your-airtable-base-id',
  AUTHORIZED_EMAILS: (import.meta.env.VITE_AUTHORIZED_EMAILS || 'gerasimovkris@gmail.com').split(','),
  MESHY_API_URL: 'https://api.meshy.ai/openapi/v1',
  AIRTABLE_API_URL: 'https://api.airtable.com/v0',
  // Proxy configuration
  PROXY_URL: IS_PRODUCTION ? '/.netlify/functions/meshy-proxy' : null,
  USE_PROXY: IS_PRODUCTION
};

// API configuration validation
export const validateConfig = () => {
  const missing = [];
  if (!API_CONFIG.MESHY_API_KEY || API_CONFIG.MESHY_API_KEY.includes('your-meshy')) {
    missing.push('VITE_MESHY_API_KEY');
  }
  if (!API_CONFIG.AIRTABLE_API_KEY || API_CONFIG.AIRTABLE_API_KEY.includes('your-airtable')) {
    missing.push('VITE_AIRTABLE_PAT');
  }
  if (!API_CONFIG.AIRTABLE_BASE_ID || API_CONFIG.AIRTABLE_BASE_ID.includes('your-airtable')) {
    missing.push('VITE_AIRTABLE_BASE_ID');
  }
  
  if (missing.length > 0 && IS_PRODUCTION) {
    console.error('Missing environment variables:', missing);
    return false;
  }
  return true;
};

// Make available globally
(window as any).API_CONFIG = API_CONFIG;
