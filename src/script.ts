/**
 * Text-to-3D Construction Platform - Main Script
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { ConstructionApp } from './core/app';

// Initialize the application
const app = new ConstructionApp();

// Make functions available globally for HTML event handlers
(window as any).app = app;
(window as any).generateModel = () => app.generateModel();
