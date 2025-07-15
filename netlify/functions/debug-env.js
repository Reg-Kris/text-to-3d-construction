/**
 * Debug Environment Variables - Netlify Function
 * Temporary function to debug environment variable issues
 */

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const envDebug = {
      hasMeshyKey: !!process.env.MESHY_API_KEY,
      meshyKeyLength: process.env.MESHY_API_KEY ? process.env.MESHY_API_KEY.length : 0,
      meshyKeyFirst8: process.env.MESHY_API_KEY ? process.env.MESHY_API_KEY.substring(0, 8) + '...' : 'none',
      nodeEnv: process.env.NODE_ENV,
      netlifyEnv: process.env.NETLIFY,
      context: process.env.CONTEXT,
      deployId: process.env.DEPLOY_ID,
      site: process.env.SITE_NAME,
      envKeysWithMeshy: Object.keys(process.env).filter(key => key.toLowerCase().includes('meshy')),
      totalEnvKeys: Object.keys(process.env).length,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(envDebug, null, 2),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};