/**
 * Text-to-3D Construction Platform - Dynamic Import Utilities
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

// Dynamic imports for Three.js loaders - only load when needed
export async function loadGLTFLoader() {
  const { GLTFLoader } = await import(
    'three/examples/jsm/loaders/GLTFLoader.js'
  );
  return GLTFLoader;
}

export async function loadFBXLoader() {
  const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
  return FBXLoader;
}

export async function loadOBJLoader() {
  const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
  return OBJLoader;
}

export async function loadOrbitControls() {
  const { OrbitControls } = await import(
    'three/examples/jsm/controls/OrbitControls.js'
  );
  return OrbitControls;
}

// Dynamic import for device-specific components
export async function loadMobileOptimizations() {
  const { DeviceOptimizer } = await import('../viewer/device-optimizer');
  return DeviceOptimizer;
}

// Dynamic import for advanced features
export async function loadAdvancedFeatures() {
  return Promise.all([
    import('../viewer/performance-monitor'),
    import('../viewer/lod-system'),
  ]);
}

// Lazy loading utility
export function createLazyComponent<T>(
  importFn: () => Promise<{ default: T }>,
  fallback?: T,
): () => Promise<T> {
  let cachedComponent: T | null = null;

  return async () => {
    if (cachedComponent) {
      return cachedComponent;
    }

    try {
      const module = await importFn();
      cachedComponent = module.default;
      return cachedComponent;
    } catch (error) {
      console.error('Failed to load component:', error);
      if (fallback) {
        return fallback;
      }
      throw error;
    }
  };
}
