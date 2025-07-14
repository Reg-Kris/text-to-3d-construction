/**
 * Text-to-3D Construction Platform - Three.js Viewer
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DeviceUtils } from './device-utils';

export interface ViewerConfig {
  container: HTMLElement;
  width?: number;
  height?: number;
  enableShadows?: boolean;
  enablePostProcessing?: boolean;
  backgroundColor?: number;
  cameraPosition?: THREE.Vector3;
}

export interface ModelInfo {
  triangles: number;
  vertices: number;
  textures: number;
  memoryUsage: number;
}

export class ThreeViewer {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private container: HTMLElement;
  private currentModel: THREE.Object3D | null = null;
  private animationId: number | null = null;
  private deviceInfo = DeviceUtils.getDeviceInfo();

  // Loaders
  private gltfLoader = new GLTFLoader();
  private fbxLoader = new FBXLoader();
  private objLoader = new OBJLoader();

  // Performance tracking
  private stats = {
    frameRate: 0,
    renderTime: 0,
    triangles: 0,
    lastFrameTime: 0
  };

  constructor(config: ViewerConfig) {
    this.container = config.container;
    this.initRenderer(config);
    this.initScene(config);
    this.initCamera(config);
    this.initControls();
    this.initLighting();
    this.startRenderLoop();
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private initRenderer(config: ViewerConfig): void {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: !this.deviceInfo.isMobile, // Disable antialiasing on mobile for performance
      alpha: true,
      powerPreference: this.deviceInfo.isMobile ? 'low-power' : 'high-performance'
    });

    const width = config.width || this.container.clientWidth;
    const height = config.height || this.container.clientHeight;
    
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.deviceInfo.isMobile ? 1.5 : 2));
    this.renderer.setClearColor(config.backgroundColor || 0xf5f5f5, 1);
    
    // Performance optimizations for mobile
    if (!this.deviceInfo.isMobile) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
    }

    // Enable shadows only on desktop
    if (config.enableShadows && !this.deviceInfo.isMobile) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.container.appendChild(this.renderer.domElement);
  }

  private initScene(_config: ViewerConfig): void {
    this.scene = new THREE.Scene();
    
    // Add environment map for reflections (desktop only)
    if (!this.deviceInfo.isMobile) {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      const envTexture = pmremGenerator.fromScene(new THREE.Scene()).texture;
      this.scene.environment = envTexture;
    }
  }

  private initCamera(config: ViewerConfig): void {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    
    if (config.cameraPosition) {
      this.camera.position.copy(config.cameraPosition);
    } else {
      this.camera.position.set(5, 5, 5);
    }
    
    this.camera.lookAt(0, 0, 0);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2;
    
    // Optimize controls for mobile
    if (this.deviceInfo.isMobile) {
      this.controls.enablePan = false;
      this.controls.rotateSpeed = 0.5;
      this.controls.zoomSpeed = 0.8;
    }
  }

  private initLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, this.deviceInfo.isMobile ? 0.8 : 0.6);
    this.scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, this.deviceInfo.isMobile ? 0.8 : 1.0);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = !this.deviceInfo.isMobile;
    
    if (directionalLight.castShadow) {
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
    }
    
    this.scene.add(directionalLight);

    // Fill light for better visibility
    if (!this.deviceInfo.isMobile) {
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(-10, 5, -10);
      this.scene.add(fillLight);
    }
  }

  private startRenderLoop(): void {
    const render = (timestamp: number) => {
      // Calculate frame rate and render time
      const deltaTime = timestamp - this.stats.lastFrameTime;
      this.stats.frameRate = 1000 / deltaTime;
      this.stats.lastFrameTime = timestamp;

      const renderStart = performance.now();
      
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      
      this.stats.renderTime = performance.now() - renderStart;
      
      this.animationId = requestAnimationFrame(render);
    };
    
    this.animationId = requestAnimationFrame(render);
  }

  async loadModel(url: string, format: 'glb' | 'fbx' | 'obj' = 'glb', onProgress?: (progress: number) => void): Promise<ModelInfo> {
    return new Promise((resolve, reject) => {
      // Clear previous model
      if (this.currentModel) {
        this.scene.remove(this.currentModel);
        this.disposeModel(this.currentModel);
      }

      const progressCallback = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress?.(progress);
        }
      };

      const successCallback = (object: THREE.Object3D) => {
        this.currentModel = object;
        this.scene.add(object);
        
        // Center and scale the model
        this.centerAndScaleModel(object);
        
        // Apply device-specific optimizations
        this.optimizeModel(object);
        
        // Get model info
        const info = this.getModelInfo(object);
        this.stats.triangles = info.triangles;
        
        resolve(info);
      };

      const errorCallback = (error: any) => {
        console.error('Model loading failed:', error);
        reject(new Error(`Failed to load ${format.toUpperCase()} model: ${error.message || 'Unknown error'}`));
      };

      // Load based on format
      switch (format) {
        case 'glb':
          this.gltfLoader.load(url, (gltf) => successCallback(gltf.scene), progressCallback, errorCallback);
          break;
        case 'fbx':
          this.fbxLoader.load(url, successCallback, progressCallback, errorCallback);
          break;
        case 'obj':
          this.objLoader.load(url, successCallback, progressCallback, errorCallback);
          break;
        default:
          reject(new Error(`Unsupported format: ${format}`));
      }
    });
  }

  private centerAndScaleModel(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Center the model
    object.position.sub(center);
    
    // Scale to fit in viewport
    const maxDimension = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDimension; // Fit in a 3-unit cube
    object.scale.setScalar(scale);
  }

  private optimizeModel(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child as THREE.Mesh;
        
        // Enable frustum culling
        mesh.frustumCulled = true;
        
        // Optimize materials for mobile
        if (this.deviceInfo.isMobile && mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => this.optimizeMaterial(mat));
          } else {
            this.optimizeMaterial(mesh.material);
          }
        }
        
        // Enable shadows only on desktop
        if (!this.deviceInfo.isMobile) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
    });
  }

  private optimizeMaterial(material: THREE.Material): void {
    if (material instanceof THREE.MeshStandardMaterial) {
      // Reduce quality for mobile performance
      if (this.deviceInfo.isMobile) {
        material.roughness = Math.max(material.roughness, 0.7);
        material.metalness = Math.min(material.metalness, 0.3);
      }
    }
  }

  private getModelInfo(object: THREE.Object3D): ModelInfo {
    let triangles = 0;
    let vertices = 0;
    let textures = 0;
    let memoryUsage = 0;

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        if (geometry.index) {
          triangles += geometry.index.count / 3;
        } else {
          triangles += geometry.attributes.position.count / 3;
        }
        vertices += geometry.attributes.position.count;
        
        // Estimate memory usage (rough calculation)
        memoryUsage += geometry.attributes.position.count * 3 * 4; // positions
        if (geometry.attributes.normal) {
          memoryUsage += geometry.attributes.normal.count * 3 * 4; // normals
        }
        if (geometry.attributes.uv) {
          memoryUsage += geometry.attributes.uv.count * 2 * 4; // uvs
        }
      }
    });

    return {
      triangles: Math.round(triangles),
      vertices,
      textures,
      memoryUsage: Math.round(memoryUsage / 1024 / 1024) // Convert to MB
    };
  }

  private disposeModel(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Public methods for controlling the viewer
  resetCamera(): void {
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);
    this.controls.reset();
  }

  setViewMode(mode: 'perspective' | 'top' | 'front' | 'side'): void {
    switch (mode) {
      case 'top':
        this.camera.position.set(0, 10, 0);
        this.camera.lookAt(0, 0, 0);
        break;
      case 'front':
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);
        break;
      case 'side':
        this.camera.position.set(10, 0, 0);
        this.camera.lookAt(0, 0, 0);
        break;
      default:
        this.resetCamera();
    }
    this.controls.update();
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  takeScreenshot(width = 1920, height = 1080): string {
    const originalSize = this.renderer.getSize(new THREE.Vector2());
    this.renderer.setSize(width, height);
    this.renderer.render(this.scene, this.camera);
    
    const canvas = this.renderer.domElement;
    const dataURL = canvas.toDataURL('image/png');
    
    // Restore original size
    this.renderer.setSize(originalSize.x, originalSize.y);
    
    return dataURL;
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.currentModel) {
      this.disposeModel(this.currentModel);
    }
    
    this.renderer.dispose();
    this.controls.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}