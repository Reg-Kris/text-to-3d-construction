/**
 * Text-to-3D Construction Platform - Airtable API Proxy
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 *
 * Netlify Function to proxy Airtable API calls and resolve CORS issues
 */

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map();

// Rate limiter: 5 requests per minute per IP (Airtable has strict limits)
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const record = rateLimitMap.get(ip);
  if (now > record.resetTime) {
    // Reset window
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Validate API key format (basic security)
function isValidApiKey(apiKey) {
  return apiKey && typeof apiKey === 'string' && apiKey.startsWith('pat');
}

// Validate allowed operations
function isAllowedOperation(method, path) {
  // Only allow read operations and specific write operations
  const allowedPaths = ['/Projects', '/Downloads', '/Projects/', '/Downloads/'];

  // Read operations are always allowed
  if (method === 'GET') {
    return allowedPaths.some((allowedPath) => path.includes(allowedPath));
  }

  // Write operations only for specific endpoints
  if (method === 'POST' || method === 'PATCH') {
    return allowedPaths.some((allowedPath) => path.includes(allowedPath));
  }

  // DELETE not allowed for security
  return false;
}

// Clean up rate limit map periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  },
  5 * 60 * 1000,
); // Cleanup every 5 minutes

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Rate limiting
    const clientIp =
      event.headers['x-forwarded-for'] ||
      event.headers['x-real-ip'] ||
      'unknown';
    if (!checkRateLimit(clientIp)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error:
            'Rate limit exceeded. Airtable proxy allows 5 requests per minute.',
        }),
      };
    }

    // Parse request
    const {
      path,
      method = 'GET',
      body: requestBody,
    } = JSON.parse(event.body || '{}');

    if (!path) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required field: path' }),
      };
    }

    // Get API credentials from environment variables (server-side only)
    const apiKey = process.env.AIRTABLE_PAT;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!isValidApiKey(apiKey)) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error: Invalid Airtable API key' }),
      };
    }

    if (!baseId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error: Missing Airtable Base ID' }),
      };
    }

    // Validate operation
    if (!isAllowedOperation(method, path)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Operation not allowed through proxy' }),
      };
    }

    // Construct Airtable API request with server-side base ID
    // If path doesn't start with base ID, prepend it
    const normalizedPath = path.startsWith(`/${baseId}`) ? path : `/${baseId}${path}`;
    const airtableUrl = `${AIRTABLE_API_URL}${normalizedPath}`;
    const airtableHeaders = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Text-to-3D-Construction-Proxy/1.0',
    };

    const fetchOptions = {
      method,
      headers: airtableHeaders,
    };

    if (requestBody && (method === 'POST' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(requestBody);
    }

    // Make request to Airtable API
    console.log(`Proxying ${method} request to: ${airtableUrl}`);
    const response = await fetch(airtableUrl, fetchOptions);

    const responseData = await response.text();
    let jsonData;

    try {
      jsonData = JSON.parse(responseData);
    } catch (e) {
      jsonData = { raw: responseData };
    }

    // Log for debugging (remove in production)
    console.log(`Airtable API response status: ${response.status}`);

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify({
        success: response.ok,
        status: response.status,
        data: jsonData,
        // Include Airtable-specific headers if needed
        remaining: response.headers.get('x-ratelimit-remaining'),
        resetTime: response.headers.get('x-ratelimit-reset'),
      }),
    };
  } catch (error) {
    console.error('Airtable proxy error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal proxy error',
        message: error.message,
      }),
    };
  }
};
