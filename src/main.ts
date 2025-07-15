/**
 * Text-to-3D Construction Platform - React Entry Point
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { MonitoringProvider } from './components/MonitoringProvider';
import './debug-meshy-endpoints';

// Get the root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Create root and render the app with monitoring
const root = createRoot(rootElement);
root.render(
  React.createElement(MonitoringProvider, null, React.createElement(App))
);
