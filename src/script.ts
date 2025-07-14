/**
 * Text-to-3D Construction Platform - Main Script
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { API_CONFIG } from './config';

async function generateModel() {
  const promptElement = document.getElementById('prompt') as HTMLTextAreaElement;
  if (!promptElement) return;
  
  const prompt = promptElement.value;
  if (!prompt.trim()) {
    alert('Please enter a construction description');
    return;
  }

  // Show loading state
  const loadingElement = document.getElementById('loading');
  const viewerElement = document.getElementById('viewer');
  const downloadSection = document.getElementById('download-section');
  
  if (loadingElement) loadingElement.style.display = 'block';
  if (viewerElement) viewerElement.style.display = 'none';
  if (downloadSection) downloadSection.style.display = 'none';

  try {
    // Call 3D generation API
    const response = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_CONFIG.TRIPO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text_to_model',
        prompt: prompt,
      }),
    });

    const task = await response.json();

    // Poll for completion
    const modelUrl = await pollForCompletion(task.data.task_id);

    // Display model
    displayModel(modelUrl);
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to generate model. Please try again.');
  } finally {
    if (loadingElement) loadingElement.style.display = 'none';
  }
}

async function pollForCompletion(taskId: string): Promise<string> {
  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

    const response = await fetch(
      `https://api.tripo3d.ai/v2/openapi/task/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${API_CONFIG.TRIPO_API_KEY}`,
        },
      },
    );

    const result = await response.json();

    if (result.data.status === 'success') {
      return result.data.output.model; // URL to GLB file
    }

    if (result.data.status === 'failed') {
      throw new Error('Model generation failed');
    }

    attempts++;
  }

  throw new Error('Model generation timed out');
}

function displayModel(modelUrl: string) {
  // Show 3D model in browser
  const viewer = document.getElementById('viewer') as any;
  if (viewer) {
    viewer.src = modelUrl;
    viewer.style.display = 'block';
  }

  // Enable download
  const downloadLink = document.getElementById('download-link') as HTMLAnchorElement;
  const downloadSection = document.getElementById('download-section');
  
  if (downloadLink) {
    downloadLink.href = modelUrl;
    downloadLink.download = 'construction-model.glb';
  }
  if (downloadSection) {
    downloadSection.style.display = 'block';
  }
}

// Make function available globally
(window as any).generateModel = generateModel;
