/**
 * Text-to-3D Construction Platform - Configuration
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

export const API_CONFIG = {
  MESHY_API_KEY: import.meta.env.VITE_MESHY_API_KEY || 'your-meshy-api-key-here',
  AIRTABLE_API_KEY: import.meta.env.VITE_AIRTABLE_API_KEY || 'your-airtable-api-key-here',
  AIRTABLE_BASE_ID: import.meta.env.VITE_AIRTABLE_BASE_ID || 'your-airtable-base-id',
  ALLOWED_EMAILS: (import.meta.env.VITE_ALLOWED_EMAILS || 'gerasimovkris@gmail.com').split(','),
  MESHY_API_URL: 'https://api.meshy.ai/v1',
  AIRTABLE_API_URL: 'https://api.airtable.com/v0'
};

// Make available globally
(window as any).API_CONFIG = API_CONFIG;
