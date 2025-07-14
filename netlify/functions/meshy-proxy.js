/**
 * Text-to-3D Construction Platform - Meshy API Proxy
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 * 
 * Netlify Function to proxy Meshy API calls and resolve CORS issues
 */

const MESHY_API_URL = 'https://api.meshy.ai/openapi/v1';

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map();

// Simple rate limiter: 10 requests per minute per IP
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;
  
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
  return apiKey && typeof apiKey === 'string' && apiKey.length > 20;
}

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Rate limiting
    const clientIp = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' })
      };
    }

    // Parse request
    const { path, method = 'GET', body: requestBody, apiKey } = JSON.parse(event.body || '{}');
    
    if (!path) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required field: path' })
      };
    }

    if (!isValidApiKey(apiKey)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or missing API key' })
      };
    }

    // Construct Meshy API request
    const meshyUrl = `${MESHY_API_URL}${path}`;
    const meshyHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Text-to-3D-Construction-Proxy/1.0'
    };

    const fetchOptions = {
      method,
      headers: meshyHeaders
    };

    if (requestBody && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(requestBody);
    }

    // Make request to Meshy API
    console.log(`Proxying ${method} request to: ${meshyUrl}`);
    const response = await fetch(meshyUrl, fetchOptions);
    
    const responseData = await response.text();
    let jsonData;
    
    try {
      jsonData = JSON.parse(responseData);
    } catch (e) {
      jsonData = { raw: responseData };
    }

    // Log for debugging (remove in production)
    console.log(`Meshy API response status: ${response.status}`);
    
    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify({
        success: response.ok,
        status: response.status,
        data: jsonData
      })
    };

  } catch (error) {
    console.error('Proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal proxy error',
        message: error.message
      })
    };
  }
};