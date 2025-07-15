/**
 * Nuclear Option: Test All Possible Meshy API Endpoints
 */

import { ApiClient } from './api-client';

export class MeshyEndpointTester {
  static async testAllEndpoints() {
    const testPayload = {
      mode: 'preview',
      prompt: 'simple cube',
      art_style: 'realistic',
      should_remesh: true,
    };

    // All possible endpoint combinations to test (now with correct base URL)
    const endpointsToTest = [
      // The documented correct endpoint first
      '/openapi/v2/text-to-3d',
      
      // Other version 2 variations
      '/v2/text-to-3d',
      '/api/v2/text-to-3d', 
      '/openapi/v2/text-to-3d/generate',
      '/v2/text-to-3d/generate',
      '/api/v2/text-to-3d/generate',
      
      // Version 1 variations
      '/text-to-3d',
      '/v1/text-to-3d', 
      '/api/v1/text-to-3d',
      '/openapi/v1/text-to-3d',
      '/text-to-3d/generate',
      '/v1/text-to-3d/generate',
      '/api/v1/text-to-3d/generate',
      '/openapi/v1/text-to-3d/generate',
      
      // Alternative patterns
      '/text2mesh',
      '/v1/text2mesh',
      '/v2/text2mesh',
      '/generate/text-to-3d',
      '/v1/generate/text-to-3d',
      '/v2/generate/text-to-3d',
      '/models/text-to-3d',
      '/v1/models/text-to-3d',
      '/v2/models/text-to-3d',
      '/3d/generate',
      '/v1/3d/generate',
      '/v2/3d/generate',
      '/tasks/text-to-3d',
      '/v1/tasks/text-to-3d',
      '/v2/tasks/text-to-3d',
      
      // Just in case patterns
      '/text-to-3d/tasks',
      '/v1/text-to-3d/tasks',
      '/v2/text-to-3d/tasks',
      '/create/text-to-3d',
      '/v1/create/text-to-3d',
      '/v2/create/text-to-3d',
    ];

    console.log(`🚀 NUCLEAR OPTION: Testing ${endpointsToTest.length} endpoint combinations...`);
    
    for (let i = 0; i < endpointsToTest.length; i++) {
      const endpoint = endpointsToTest[i];
      
      try {
        console.log(`[${i + 1}/${endpointsToTest.length}] Testing: ${endpoint}`);
        
        const response = await ApiClient.post(endpoint, testPayload);
        
        if (response.success) {
          // FOUND A WORKING ENDPOINT!
          const message = `🎉 WORKING PATH FOUND: ${endpoint}`;
          console.log(message);
          alert(message);
          
          // Log the successful response
          console.log('✅ Successful response:', response);
          
          return {
            workingEndpoint: endpoint,
            response: response
          };
        } else {
          console.log(`❌ [${endpoint}] Failed:`, response.error || response.message);
        }
        
      } catch (error) {
        console.log(`💥 [${endpoint}] Error:`, error instanceof Error ? error.message : String(error));
      }
      
      // Small delay to avoid hammering the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const noWorkingMessage = '😢 No working endpoints found out of ' + endpointsToTest.length + ' attempts';
    console.log(noWorkingMessage);
    alert(noWorkingMessage);
    
    return null;
  }
}

// Make it available globally for easy testing
(window as any).testMeshyEndpoints = MeshyEndpointTester.testAllEndpoints;

// Add a test button to the UI for easy access
function addTestButton() {
  const button = document.createElement('button');
  button.textContent = '🚀 TEST ALL MESHY ENDPOINTS';
  button.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 10000;
    background: #ff6b6b;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  
  button.onclick = async () => {
    button.textContent = '⏳ TESTING...';
    button.disabled = true;
    
    try {
      await MeshyEndpointTester.testAllEndpoints();
    } finally {
      button.textContent = '🚀 TEST ALL MESHY ENDPOINTS';
      button.disabled = false;
    }
  };
  
  document.body.appendChild(button);
}

// Add the button when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addTestButton);
} else {
  addTestButton();
}