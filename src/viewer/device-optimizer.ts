/**
 * Text-to-3D Construction Platform - Device Optimizer
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import * as THREE from 'three';
import { DeviceInfo } from '../device-utils';

export interface OptimizationSettings {
  enableShadows: boolean;
  enableAntialiasing: boolean;
  pixelRatio: number;
  enableEnvironmentMapping: boolean;
  enablePostProcessing: boolean;
  textureQuality: number;
}

export class DeviceOptimizer {
  private deviceInfo: DeviceInfo;
  private settings: OptimizationSettings;

  constructor(deviceInfo: DeviceInfo) {
    this.deviceInfo = deviceInfo;
    this.settings = this.createOptimizationSettings();
  }

  private createOptimizationSettings(): OptimizationSettings {
    if (this.deviceInfo.isMobile) {
      return {
        enableShadows: false,
        enableAntialiasing: false,
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
        enableEnvironmentMapping: false,
        enablePostProcessing: false,
        textureQuality: 0.5,
      };
    } else if (this.deviceInfo.isTablet) {
      return {
        enableShadows: false,
        enableAntialiasing: true,
        pixelRatio: Math.min(window.devicePixelRatio, 1.8),
        enableEnvironmentMapping: false,
        enablePostProcessing: false,
        textureQuality: 0.7,
      };
    } else {
      return {
        enableShadows: true,
        enableAntialiasing: true,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        enableEnvironmentMapping: true,
        enablePostProcessing: true,
        textureQuality: 1.0,
      };
    }
  }

  optimizeRenderer(renderer: THREE.WebGLRenderer): void {
    renderer.setPixelRatio(this.settings.pixelRatio);

    if (this.settings.enableShadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    if (!this.deviceInfo.isMobile) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
    }

    // Performance optimizations complete
  }

  optimizeCamera(camera: THREE.PerspectiveCamera): void {
    // Adjust FOV for mobile devices
    if (this.deviceInfo.isMobile) {
      camera.fov = 70; // Slightly wider FOV for mobile
    } else {
      camera.fov = 75; // Standard FOV for desktop
    }

    camera.updateProjectionMatrix();
  }

  optimizeControls(controls: any): void {
    // Optimize controls for mobile
    if (this.deviceInfo.isMobile) {
      controls.enablePan = false;
      controls.rotateSpeed = 0.5;
      controls.zoomSpeed = 0.8;
    } else {
      controls.enablePan = true;
      controls.rotateSpeed = 1.0;
      controls.zoomSpeed = 1.0;
    }

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
  }

  optimizeLighting(scene: THREE.Scene): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      this.deviceInfo.isMobile ? 0.8 : 0.6,
    );
    scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      this.deviceInfo.isMobile ? 0.8 : 1.0,
    );
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = this.settings.enableShadows;

    if (directionalLight.castShadow) {
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
    }

    scene.add(directionalLight);

    // Fill light for better visibility (desktop only)
    if (!this.deviceInfo.isMobile) {
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(-10, 5, -10);
      scene.add(fillLight);
    }
  }

  optimizeModel(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child as THREE.Mesh;

        // Enable frustum culling
        mesh.frustumCulled = true;

        // Optimize materials
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => this.optimizeMaterial(mat));
          } else {
            this.optimizeMaterial(mesh.material);
          }
        }

        // Enable shadows only on desktop
        if (this.settings.enableShadows) {
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

      // Optimize textures
      if (material.map) {
        this.optimizeTexture(material.map);
      }
      if (material.normalMap) {
        this.optimizeTexture(material.normalMap);
      }
      if (material.roughnessMap) {
        this.optimizeTexture(material.roughnessMap);
      }
    }
  }

  private optimizeTexture(texture: THREE.Texture): void {
    // Reduce texture quality for mobile
    if (this.deviceInfo.isMobile) {
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
    }

    // Set appropriate wrapping
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
  }

  setupEnvironmentMapping(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
  ): void {
    if (this.settings.enableEnvironmentMapping) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTexture = pmremGenerator.fromScene(new THREE.Scene()).texture;
      scene.environment = envTexture;
    }
  }

  getOptimizationSettings(): OptimizationSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<OptimizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  getPerformanceProfile(): string {
    if (this.deviceInfo.isMobile) {
      return 'Mobile Performance Profile';
    } else if (this.deviceInfo.isTablet) {
      return 'Tablet Performance Profile';
    } else {
      return 'Desktop Performance Profile';
    }
  }

  getOptimizationSummary(): string[] {
    const summary: string[] = [];

    summary.push(`Device: ${this.deviceInfo.type}`);
    summary.push(
      `Shadows: ${this.settings.enableShadows ? 'Enabled' : 'Disabled'}`,
    );
    summary.push(
      `Antialiasing: ${this.settings.enableAntialiasing ? 'Enabled' : 'Disabled'}`,
    );
    summary.push(`Pixel Ratio: ${this.settings.pixelRatio}`);
    summary.push(
      `Texture Quality: ${Math.round(this.settings.textureQuality * 100)}%`,
    );

    return summary;
  }
}
