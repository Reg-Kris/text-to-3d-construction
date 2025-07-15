/**
 * Text-to-3D Construction Platform - Three.js Viewer (Refactored)
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import * as THREE from 'three';
import { DeviceUtils } from '../device-utils';
import { LODSystem } from './lod-system';
import { PerformanceMonitor } from './performance-monitor';
import { DeviceOptimizer } from './device-optimizer';
import {
  loadGLTFLoader,
  loadFBXLoader,
  loadOBJLoader,
  loadOrbitControls,
} from '../utils/dynamic-imports';

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
  private controls!: any; // OrbitControls loaded dynamically
  private container: HTMLElement;
  private currentModel: THREE.Object3D | null = null;
  private animationId: number | null = null;

  // Loaders (loaded dynamically)
  private gltfLoader: any = null;
  private fbxLoader: any = null;
  private objLoader: any = null;

  // Systems
  private deviceInfo = DeviceUtils.getDeviceInfo();
  private lodSystem: LODSystem;
  private performanceMonitor: PerformanceMonitor;
  private deviceOptimizer: DeviceOptimizer;

  constructor(config: ViewerConfig) {
    this.container = config.container;

    // Initialize systems
    this.lodSystem = new LODSystem(this.deviceInfo);
    this.performanceMonitor = new PerformanceMonitor(this.deviceInfo);
    this.deviceOptimizer = new DeviceOptimizer(this.deviceInfo);

    // Link systems
    this.performanceMonitor.setLODSystem(this.lodSystem);

    // Initialize Three.js components
    this.initRenderer(config);
    this.initScene(config);
    this.initCamera(config);
    this.initAsync();

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private async initAsync(): Promise<void> {
    await this.initControls();
    this.initLighting();
    this.startRenderLoop();
  }

  private initRenderer(config: ViewerConfig): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias:
        this.deviceOptimizer.getOptimizationSettings().enableAntialiasing,
      alpha: true,
      powerPreference: this.deviceInfo.isMobile
        ? 'low-power'
        : 'high-performance',
    });

    const width = config.width || this.container.clientWidth;
    const height = config.height || this.container.clientHeight;

    this.renderer.setSize(width, height);
    this.renderer.setClearColor(config.backgroundColor || 0xf5f5f5, 1);

    // Apply device-specific optimizations
    this.deviceOptimizer.optimizeRenderer(this.renderer);
    this.container.appendChild(this.renderer.domElement);
  }

  private initScene(_config: ViewerConfig): void {
    this.scene = new THREE.Scene();

    // Setup environment mapping if enabled
    this.deviceOptimizer.setupEnvironmentMapping(this.scene, this.renderer);
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
    this.deviceOptimizer.optimizeCamera(this.camera);
  }

  private async initControls(): Promise<void> {
    const OrbitControls = await loadOrbitControls();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.minDistance = 1;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2;

    this.deviceOptimizer.optimizeControls(this.controls);
  }

  private initLighting(): void {
    this.deviceOptimizer.optimizeLighting(this.scene);
  }

  private startRenderLoop(): void {
    const render = (timestamp: number) => {
      const renderStart = performance.now();

      this.controls.update();
      this.lodSystem.update(this.camera);

      this.renderer.render(this.scene, this.camera);

      const renderTime = performance.now() - renderStart;
      this.performanceMonitor.updateStats(timestamp, renderTime);

      this.animationId = requestAnimationFrame(render);
    };

    this.animationId = requestAnimationFrame(render);
  }

  async loadModel(
    url: string,
    format: 'glb' | 'fbx' | 'obj' = 'glb',
    onProgress?: (progress: number) => void,
  ): Promise<ModelInfo> {
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
        this.deviceOptimizer.optimizeModel(object);

        // Set model for LOD system
        this.lodSystem.setCurrentModel(object);

        // Get model info
        const info = this.getModelInfo(object);
        this.performanceMonitor.setTriangleCount(info.triangles);

        resolve(info);
      };

      const errorCallback = (error: any) => {
        console.error('Model loading failed:', error);
        reject(
          new Error(
            `Failed to load ${format.toUpperCase()} model: ${error.message || 'Unknown error'}`,
          ),
        );
      };

      // Load based on format with dynamic imports
      switch (format) {
        case 'glb':
          this.loadGLTFModel(
            url,
            successCallback,
            progressCallback,
            errorCallback,
          );
          break;
        case 'fbx':
          this.loadFBXModel(
            url,
            successCallback,
            progressCallback,
            errorCallback,
          );
          break;
        case 'obj':
          this.loadOBJModel(
            url,
            successCallback,
            progressCallback,
            errorCallback,
          );
          break;
        default:
          reject(new Error(`Unsupported format: ${format}`));
      }
    });
  }

  private async loadGLTFModel(
    url: string,
    successCallback: (object: THREE.Object3D) => void,
    progressCallback: (event: ProgressEvent) => void,
    errorCallback: (error: any) => void,
  ): Promise<void> {
    if (!this.gltfLoader) {
      const GLTFLoader = await loadGLTFLoader();
      this.gltfLoader = new GLTFLoader();
    }
    this.gltfLoader.load(
      url,
      (gltf: any) => successCallback(gltf.scene),
      progressCallback,
      errorCallback,
    );
  }

  private async loadFBXModel(
    url: string,
    successCallback: (object: THREE.Object3D) => void,
    progressCallback: (event: ProgressEvent) => void,
    errorCallback: (error: any) => void,
  ): Promise<void> {
    if (!this.fbxLoader) {
      const FBXLoader = await loadFBXLoader();
      this.fbxLoader = new FBXLoader();
    }
    this.fbxLoader.load(url, successCallback, progressCallback, errorCallback);
  }

  private async loadOBJModel(
    url: string,
    successCallback: (object: THREE.Object3D) => void,
    progressCallback: (event: ProgressEvent) => void,
    errorCallback: (error: any) => void,
  ): Promise<void> {
    if (!this.objLoader) {
      const OBJLoader = await loadOBJLoader();
      this.objLoader = new OBJLoader();
    }
    this.objLoader.load(url, successCallback, progressCallback, errorCallback);
  }

  private centerAndScaleModel(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    object.position.sub(center);

    // Scale to fit in viewport
    const maxDimension = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDimension;
    object.scale.setScalar(scale);
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

        // Estimate memory usage
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
      memoryUsage: Math.round(memoryUsage / 1024 / 1024), // Convert to MB
    };
  }

  private disposeModel(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
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

  getStats() {
    return {
      performance: this.performanceMonitor.getStats(),
      lod: this.lodSystem.getStats(),
      optimization: this.deviceOptimizer.getOptimizationSummary(),
    };
  }

  // LOD Control Methods
  toggleLOD(enabled?: boolean): void {
    this.lodSystem.toggleLOD(enabled);
  }

  setLODLevel(level: number): void {
    this.lodSystem.setLODLevel(level);
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
