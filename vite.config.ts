import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy Meshy API calls during development
      '/.netlify/functions/meshy-proxy': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/\.netlify\/functions/, '/.netlify/functions'),
      },
      // Proxy Airtable API calls during development
      '/.netlify/functions/airtable-proxy': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/\.netlify\/functions/, '/.netlify/functions'),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext', // Modern browsers only
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Intelligent chunking strategy (2025 best practices)
        manualChunks(id) {
          // React core libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-core';
          }
          // Material-UI
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'mui';
          }
          // Core Three.js library
          if (id.includes('three') && !id.includes('three/examples')) {
            return 'three-core';
          }
          // Three.js examples (loaders, controls) - group together since they're small
          if (id.includes('three/examples')) {
            return 'three-addons';
          }
          // Airtable SDK
          if (id.includes('airtable')) {
            return 'airtable';
          }
          // App services and utilities
          if (id.includes('src/services') || id.includes('src/utils')) {
            return 'app-services';
          }
          // Viewer components
          if (id.includes('src/viewer')) {
            return 'viewer';
          }
          // All other vendor libraries
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Optimize output file names for better caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 800, // More aggressive limit
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn'],
        passes: 2, // Multiple passes for better optimization
        unsafe_arrows: true, // Modern optimization
        unsafe_methods: true,
        unsafe_proto: true,
      },
      mangle: {
        properties: {
          regex: /^_/, // Mangle private properties
        },
      },
      format: {
        comments: false, // Remove all comments
      },
    },
  },
  optimizeDeps: {
    include: ['three', 'airtable', 'react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
    // Pre-bundle these for faster dev startup
    force: true,
  },
  // Resolve configuration for better imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@services': resolve(__dirname, 'src/services'),
      '@viewer': resolve(__dirname, 'src/viewer'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },
  // Define environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      process.env.NODE_ENV || 'development',
    ),
  },
});
