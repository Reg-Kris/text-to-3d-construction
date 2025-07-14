/**
 * Text-to-3D Construction Platform - Entry Point
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import './config';
import './auth';
import './meshy-api';
import './airtable-service';
import './device-utils';
import './script';

// Add character counter functionality
document.addEventListener('DOMContentLoaded', () => {
  const prompt = document.getElementById('prompt') as HTMLTextAreaElement;
  const charCount = document.getElementById('char-count');
  
  if (prompt && charCount) {
    const updateCharCount = () => {
      const count = prompt.value.length;
      charCount.textContent = count.toString();
      
      // Change color based on usage
      if (count > 500) {
        charCount.style.color = '#dc3545'; // Red
      } else if (count > 400) {
        charCount.style.color = '#ffc107'; // Yellow
      } else {
        charCount.style.color = '#666'; // Gray
      }
    };
    
    prompt.addEventListener('input', updateCharCount);
    updateCharCount(); // Initial count
  }
});