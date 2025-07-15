/**
 * Text-to-3D Construction Platform - Level of Detail System
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import * as THREE from 'three';
import { DeviceInfo } from '../device-utils';

export interface LODLevel {
  distance: number;
  quality: number;
}

export interface LODSystemConfig {
  enabled: boolean;
  levels: LODLevel[];
  currentLevel: number;
}

export class LODSystem {
  private config: LODSystemConfig;
  private currentModel: THREE.Object3D | null = null;

  constructor(deviceInfo: DeviceInfo) {
    this.config = this.createLODConfig(deviceInfo);
  }

  private createLODConfig(deviceInfo: DeviceInfo): LODSystemConfig {
    if (deviceInfo.isMobile) {
      return {
        enabled: true,
        levels: [
          { distance: 5, quality: 0.3 }, // Close - 30% quality
          { distance: 15, quality: 0.15 }, // Medium - 15% quality
          { distance: 30, quality: 0.05 }, // Far - 5% quality
        ],
        currentLevel: 0,
      };
    } else if (deviceInfo.isTablet) {
      return {
        enabled: true,
        levels: [
          { distance: 8, quality: 0.7 }, // Close - 70% quality
          { distance: 20, quality: 0.4 }, // Medium - 40% quality
          { distance: 40, quality: 0.2 }, // Far - 20% quality
        ],
        currentLevel: 0,
      };
    } else {
      return {
        enabled: false,
        levels: [
          { distance: 10, quality: 1.0 }, // Close - 100% quality
          { distance: 25, quality: 0.8 }, // Medium - 80% quality
          { distance: 50, quality: 0.5 }, // Far - 50% quality
        ],
        currentLevel: 0,
      };
    }
  }

  setCurrentModel(model: THREE.Object3D | null): void {
    this.currentModel = model;
  }

  update(camera: THREE.Camera): void {
    if (!this.config.enabled || !this.currentModel) return;

    const cameraDistance = camera.position.distanceTo(
      this.currentModel.position,
    );
    let newLevel = this.config.levels.length - 1;

    // Find appropriate LOD level
    for (let i = 0; i < this.config.levels.length; i++) {
      if (cameraDistance <= this.config.levels[i].distance) {
        newLevel = i;
        break;
      }
    }

    // Only update if level changed
    if (newLevel !== this.config.currentLevel) {
      this.config.currentLevel = newLevel;
      this.applyLODLevel(newLevel);
    }
  }

  private applyLODLevel(level: number): void {
    if (!this.currentModel) return;

    const quality = this.config.levels[level].quality;

    this.currentModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child as THREE.Mesh;

        // Adjust material quality based on LOD level
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) =>
              this.adjustMaterialForLOD(mat, quality),
            );
          } else {
            this.adjustMaterialForLOD(mesh.material, quality);
          }
        }

        // Hide very small objects at low LOD levels
        const boundingBox = new THREE.Box3().setFromObject(mesh);
        const size = boundingBox.getSize(new THREE.Vector3()).length();
        mesh.visible = size > 0.1 / quality;
      }
    });
  }

  private adjustMaterialForLOD(
    material: THREE.Material,
    quality: number,
  ): void {
    if (material instanceof THREE.MeshStandardMaterial) {
      // Reduce texture resolution and detail for lower quality
      if (quality < 0.5) {
        material.roughness = Math.max(material.roughness, 0.8);
        material.metalness = Math.min(material.metalness, 0.2);

        // Disable normal maps for very low quality
        if (quality < 0.2 && material.normalMap) {
          material.normalMap = null;
          material.needsUpdate = true;
        }
      }
    }
  }

  toggleLOD(enabled?: boolean): void {
    this.config.enabled =
      enabled !== undefined ? enabled : !this.config.enabled;

    if (!this.config.enabled && this.currentModel) {
      // Reset to full quality when LOD is disabled
      this.applyLODLevel(0);
    }
  }

  setLODLevel(level: number): void {
    if (level >= 0 && level < this.config.levels.length) {
      this.config.currentLevel = level;
      this.applyLODLevel(level);
    }
  }

  getStats() {
    return {
      enabled: this.config.enabled,
      currentLevel: this.config.currentLevel,
      totalLevels: this.config.levels.length,
      currentQuality:
        this.config.levels[this.config.currentLevel]?.quality || 1.0,
    };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getCurrentLevel(): number {
    return this.config.currentLevel;
  }

  getLevels(): LODLevel[] {
    return [...this.config.levels];
  }
}
