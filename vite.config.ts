import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Standard Vite configuration - remove incorrect 'public' root
  server: {
    port: 3000,
    open: true,
  },
  build: {
    // Fix build output path
    outDir: 'dist',
    sourcemap: true,
    // Bundle optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Three.js into its own chunk
          three: ['three'],
          // Separate large libraries
          vendor: ['airtable'],
          // Device-specific chunks
          'three-loaders': [
            'three/examples/jsm/loaders/GLTFLoader.js',
            'three/examples/jsm/loaders/FBXLoader.js',
            'three/examples/jsm/loaders/OBJLoader.js'
          ],
          'three-controls': [
            'three/examples/jsm/controls/OrbitControls.js'
          ]
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable tree shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log']
      }
    }
  },
  // Enable tree shaking and optimization
  optimizeDeps: {
    include: ['three', 'airtable']
  },
  // Resolve configuration for better imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@services': resolve(__dirname, 'src/services'),
      '@viewer': resolve(__dirname, 'src/viewer'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types')
    }
  },
  // Define environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});