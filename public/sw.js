/**
 * Text-to-3D Construction Platform - Service Worker
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

const CACHE_NAME = 'text-to-3d-v1.2.0';
const RUNTIME_CACHE = 'runtime-v1.2.0';
const MODEL_CACHE = 'models-v1.2.0';
const TEXTURE_CACHE = 'textures-v1.2.0';

// Resources to cache during install
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/src/main.ts',
  '/src/style.css',
  '/public/favicon.ico',
];

// 3D model file extensions that should be cached
const MODEL_EXTENSIONS = ['.glb', '.gltf', '.fbx', '.obj', '.mtl'];
const TEXTURE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.ktx2', '.basis'];

// Cache duration settings
const CACHE_DURATIONS = {
  static: 30 * 24 * 60 * 60 * 1000, // 30 days
  models: 7 * 24 * 60 * 60 * 1000,  // 7 days
  textures: 14 * 24 * 60 * 60 * 1000, // 14 days
  api: 60 * 60 * 1000,               // 1 hour
  runtime: 24 * 60 * 60 * 1000,      // 24 hours
};

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Static resources cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static resources:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && 
                     cacheName !== RUNTIME_CACHE &&
                     cacheName !== MODEL_CACHE &&
                     cacheName !== TEXTURE_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (isModelRequest(url)) {
    event.respondWith(handleModelRequest(request));
  } else if (isTextureRequest(url)) {
    event.respondWith(handleTextureRequest(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isStaticResource(url)) {
    event.respondWith(handleStaticRequest(request));
  } else {
    event.respondWith(handleRuntimeRequest(request));
  }
});

// Handle 3D model requests with aggressive caching
async function handleModelRequest(request) {
  const cache = await caches.open(MODEL_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log('[SW] Serving cached model:', request.url);
    
    // Update cache in background if expired
    if (isCacheExpired(cachedResponse, CACHE_DURATIONS.models)) {
      console.log('[SW] Updating expired model cache in background');
      updateCacheInBackground(request, cache);
    }
    
    return cachedResponse;
  }

  try {
    console.log('[SW] Fetching and caching new model:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      const responseToCache = response.clone();
      
      // Add cache headers
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      headers.set('sw-cache-duration', CACHE_DURATIONS.models.toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse.clone());
      
      // Notify clients about successful model cache
      broadcastToClients({
        type: 'MODEL_CACHED',
        url: request.url,
        size: response.headers.get('content-length')
      });
      
      return response;
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Failed to fetch model:', error);
    
    // Return offline fallback if available
    const fallback = await cache.match('/offline-model-placeholder.glb');
    if (fallback) {
      return fallback;
    }
    
    throw error;
  }
}

// Handle texture requests with compression-aware caching
async function handleTextureRequest(request) {
  const cache = await caches.open(TEXTURE_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log('[SW] Serving cached texture:', request.url);
    
    if (isCacheExpired(cachedResponse, CACHE_DURATIONS.textures)) {
      updateCacheInBackground(request, cache);
    }
    
    return cachedResponse;
  }

  try {
    console.log('[SW] Fetching and caching new texture:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      const responseToCache = response.clone();
      
      // Add cache metadata
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      headers.set('sw-cache-duration', CACHE_DURATIONS.textures.toString());
      
      // Try to compress texture if supported
      let finalResponse = responseToCache;
      if (supportsCompression() && isCompressibleTexture(request.url)) {
        try {
          const compressed = await compressResponse(responseToCache);
          if (compressed) {
            finalResponse = compressed;
            headers.set('sw-compressed', 'true');
          }
        } catch (compressionError) {
          console.warn('[SW] Texture compression failed:', compressionError);
        }
      }
      
      const cachedResponse = new Response(finalResponse.body, {
        status: finalResponse.status,
        statusText: finalResponse.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse.clone());
      return response;
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Failed to fetch texture:', error);
    throw error;
  }
}

// Handle API requests with short-term caching
async function handleAPIRequest(request) {
  // For API requests, implement network-first strategy with short cache
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      const responseToCache = response.clone();
      
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      headers.set('sw-cache-duration', CACHE_DURATIONS.api.toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for API request');
    
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isCacheExpired(cachedResponse, CACHE_DURATIONS.api)) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Handle static resources with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Failed to fetch static resource:', error);
    throw error;
  }
}

// Handle runtime requests with network-first strategy
async function handleRuntimeRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Utility functions
function isModelRequest(url) {
  return MODEL_EXTENSIONS.some(ext => url.pathname.toLowerCase().endsWith(ext));
}

function isTextureRequest(url) {
  return TEXTURE_EXTENSIONS.some(ext => url.pathname.toLowerCase().endsWith(ext));
}

function isAPIRequest(url) {
  return url.pathname.includes('/api/') || 
         url.hostname.includes('airtable.com') ||
         url.hostname.includes('meshy.ai');
}

function isStaticResource(url) {
  return STATIC_RESOURCES.some(resource => url.pathname === resource) ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.ts') ||
         url.pathname.endsWith('.ico');
}

function isCacheExpired(response, maxAge) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true;
  
  const age = Date.now() - parseInt(cachedAt);
  return age > maxAge;
}

function supportsCompression() {
  return 'CompressionStream' in self;
}

function isCompressibleTexture(url) {
  const compressibleFormats = ['.jpg', '.jpeg', '.png'];
  return compressibleFormats.some(format => url.toLowerCase().endsWith(format));
}

async function compressResponse(response) {
  if (!supportsCompression()) return null;
  
  try {
    const arrayBuffer = await response.arrayBuffer();
    const compressionStream = new CompressionStream('gzip');
    const writer = compressionStream.writable.getWriter();
    const reader = compressionStream.readable.getReader();
    
    writer.write(new Uint8Array(arrayBuffer));
    writer.close();
    
    const chunks = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) chunks.push(value);
    }
    
    const compressedData = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    
    let offset = 0;
    for (const chunk of chunks) {
      compressedData.set(chunk, offset);
      offset += chunk.length;
    }
    
    const headers = new Headers(response.headers);
    headers.set('content-encoding', 'gzip');
    headers.set('content-length', compressedData.length.toString());
    
    return new Response(compressedData, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  } catch (error) {
    console.warn('[SW] Compression failed:', error);
    return null;
  }
}

async function updateCacheInBackground(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', Date.now().toString());
      
      const updatedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      
      await cache.put(request, updatedResponse);
      console.log('[SW] Background cache update completed for:', request.url);
    }
  } catch (error) {
    console.warn('[SW] Background cache update failed:', error);
  }
}

function broadcastToClients(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message);
    });
  });
}

// Handle periodic cleanup
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    event.waitUntil(cleanupExpiredCache());
  } else if (event.data && event.data.type === 'PRELOAD_MODEL') {
    event.waitUntil(preloadModel(event.data.url));
  }
});

async function cleanupExpiredCache() {
  console.log('[SW] Starting cache cleanup...');
  
  const cacheNames = [MODEL_CACHE, TEXTURE_CACHE, RUNTIME_CACHE];
  
  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const maxAge = cacheName === MODEL_CACHE ? CACHE_DURATIONS.models :
                        cacheName === TEXTURE_CACHE ? CACHE_DURATIONS.textures :
                        CACHE_DURATIONS.runtime;
          
          if (isCacheExpired(response, maxAge)) {
            await cache.delete(request);
            console.log('[SW] Deleted expired cache entry:', request.url);
          }
        }
      }
    } catch (error) {
      console.error('[SW] Cache cleanup failed for', cacheName, error);
    }
  }
  
  console.log('[SW] Cache cleanup completed');
}

async function preloadModel(url) {
  try {
    console.log('[SW] Preloading model:', url);
    const cache = await caches.open(MODEL_CACHE);
    const request = new Request(url);
    
    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', Date.now().toString());
      headers.set('sw-preloaded', 'true');
      
      const cachedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      
      await cache.put(request, cachedResponse);
      
      broadcastToClients({
        type: 'MODEL_PRELOADED',
        url: url,
        size: response.headers.get('content-length')
      });
      
      console.log('[SW] Model preloaded successfully:', url);
    }
  } catch (error) {
    console.error('[SW] Model preload failed:', error);
    
    broadcastToClients({
      type: 'MODEL_PRELOAD_FAILED',
      url: url,
      error: error.message
    });
  }
}

console.log('[SW] Service worker loaded successfully');