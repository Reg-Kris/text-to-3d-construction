/**
 * Text-to-3D Construction Platform - Model Processing Worker
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

interface ProcessingTask {
  id: string;
  type: 'optimize' | 'validate' | 'generateLOD' | 'calculateBounds' | 'extractMaterials';
  data: any;
  options?: any;
}

interface ProcessingResult {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
  metrics?: {
    processingTime: number;
    memoryUsed: number;
    inputSize: number;
    outputSize: number;
  };
}

interface GeometryData {
  positions: Float32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  indices?: Uint16Array | Uint32Array;
  materialInfo?: any;
}

interface LODLevel {
  level: number;
  targetTriangles: number;
  distance: number;
  geometry: GeometryData;
}

class ModelProcessor {
  public processingQueue: ProcessingTask[] = [];
  public isProcessing = false;

  constructor() {
    this.startProcessingLoop();
  }

  async processTask(task: ProcessingTask): Promise<ProcessingResult> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    try {
      let result: any;

      switch (task.type) {
        case 'optimize':
          result = await this.optimizeGeometry(task.data, task.options);
          break;
        case 'validate':
          result = await this.validateModel(task.data);
          break;
        case 'generateLOD':
          result = await this.generateLODLevels(task.data, task.options);
          break;
        case 'calculateBounds':
          result = await this.calculateBounds(task.data);
          break;
        case 'extractMaterials':
          result = await this.extractMaterials(task.data);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();

      return {
        id: task.id,
        success: true,
        result,
        metrics: {
          processingTime: endTime - startTime,
          memoryUsed: endMemory - startMemory,
          inputSize: this.calculateDataSize(task.data),
          outputSize: this.calculateDataSize(result),
        },
      };
    } catch (error) {
      return {
        id: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          processingTime: performance.now() - startTime,
          memoryUsed: this.getMemoryUsage() - startMemory,
          inputSize: this.calculateDataSize(task.data),
          outputSize: 0,
        },
      };
    }
  }

  private async optimizeGeometry(
    geometry: GeometryData,
    options: {
      mergeVertices?: boolean;
      computeNormals?: boolean;
      simplifyRatio?: number;
      removeUnusedVertices?: boolean;
    } = {}
  ): Promise<GeometryData> {
    let optimized = { ...geometry };

    // Merge duplicate vertices
    if (options.mergeVertices !== false) {
      optimized = this.mergeVertices(optimized, 0.0001);
    }

    // Remove unused vertices
    if (options.removeUnusedVertices) {
      optimized = this.removeUnusedVertices(optimized);
    }

    // Compute normals if missing or requested
    if (!optimized.normals || options.computeNormals) {
      optimized.normals = this.computeNormals(optimized);
    }

    // Simplify geometry if requested
    if (options.simplifyRatio && options.simplifyRatio < 1.0) {
      optimized = await this.simplifyGeometry(optimized, options.simplifyRatio);
    }

    return optimized;
  }

  private mergeVertices(geometry: GeometryData, tolerance: number): GeometryData {
    if (!geometry.indices) {
      return geometry; // Can't merge without indices
    }

    const positions = geometry.positions;
    const normals = geometry.normals;
    const uvs = geometry.uvs;
    const indices = geometry.indices;

    const vertexCount = positions.length / 3;
    const vertexMap = new Map<string, number>();
    const newPositions: number[] = [];
    const newNormals: number[] = [];
    const newUvs: number[] = [];
    const newIndices: number[] = [];

    for (let i = 0; i < vertexCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];

      // Create a hash key for the vertex position
      const key = `${Math.round(x / tolerance)},${Math.round(y / tolerance)},${Math.round(z / tolerance)}`;

      let vertexIndex = vertexMap.get(key);

      if (vertexIndex === undefined) {
        // New unique vertex
        vertexIndex = newPositions.length / 3;
        vertexMap.set(key, vertexIndex);

        newPositions.push(x, y, z);

        if (normals) {
          newNormals.push(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
        }

        if (uvs) {
          newUvs.push(uvs[i * 2], uvs[i * 2 + 1]);
        }
      }
    }

    // Update indices to point to merged vertices
    for (let i = 0; i < indices.length; i++) {
      const originalIndex = indices[i];
      const x = positions[originalIndex * 3];
      const y = positions[originalIndex * 3 + 1];
      const z = positions[originalIndex * 3 + 2];

      const key = `${Math.round(x / tolerance)},${Math.round(y / tolerance)},${Math.round(z / tolerance)}`;
      const newIndex = vertexMap.get(key)!;
      newIndices.push(newIndex);
    }

    return {
      positions: new Float32Array(newPositions),
      normals: normals ? new Float32Array(newNormals) : undefined,
      uvs: uvs ? new Float32Array(newUvs) : undefined,
      indices: indices instanceof Uint32Array 
        ? new Uint32Array(newIndices) 
        : new Uint16Array(newIndices),
      materialInfo: geometry.materialInfo,
    };
  }

  private removeUnusedVertices(geometry: GeometryData): GeometryData {
    if (!geometry.indices) {
      return geometry;
    }

    const positions = geometry.positions;
    const normals = geometry.normals;
    const uvs = geometry.uvs;
    const indices = geometry.indices;

    // Find used vertices
    const usedVertices = new Set<number>();
    for (let i = 0; i < indices.length; i++) {
      usedVertices.add(indices[i]);
    }

    // Create mapping from old to new indices
    const vertexMap = new Map<number, number>();
    let newVertexIndex = 0;

    for (const oldIndex of usedVertices) {
      vertexMap.set(oldIndex, newVertexIndex++);
    }

    // Build new vertex arrays
    const newPositions = new Float32Array(usedVertices.size * 3);
    const newNormals = normals ? new Float32Array(usedVertices.size * 3) : undefined;
    const newUvs = uvs ? new Float32Array(usedVertices.size * 2) : undefined;

    for (const [oldIndex, newIndex] of vertexMap) {
      newPositions[newIndex * 3] = positions[oldIndex * 3];
      newPositions[newIndex * 3 + 1] = positions[oldIndex * 3 + 1];
      newPositions[newIndex * 3 + 2] = positions[oldIndex * 3 + 2];

      if (normals && newNormals) {
        newNormals[newIndex * 3] = normals[oldIndex * 3];
        newNormals[newIndex * 3 + 1] = normals[oldIndex * 3 + 1];
        newNormals[newIndex * 3 + 2] = normals[oldIndex * 3 + 2];
      }

      if (uvs && newUvs) {
        newUvs[newIndex * 2] = uvs[oldIndex * 2];
        newUvs[newIndex * 2 + 1] = uvs[oldIndex * 2 + 1];
      }
    }

    // Update indices
    const newIndices = new (indices.constructor as any)(indices.length);
    for (let i = 0; i < indices.length; i++) {
      newIndices[i] = vertexMap.get(indices[i])!;
    }

    return {
      positions: newPositions,
      normals: newNormals,
      uvs: newUvs,
      indices: newIndices,
      materialInfo: geometry.materialInfo,
    };
  }

  private computeNormals(geometry: GeometryData): Float32Array {
    const positions = geometry.positions;
    const indices = geometry.indices;
    const vertexCount = positions.length / 3;
    const normals = new Float32Array(vertexCount * 3);

    if (indices) {
      // Face normals
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i] * 3;
        const b = indices[i + 1] * 3;
        const c = indices[i + 2] * 3;

        const v1x = positions[b] - positions[a];
        const v1y = positions[b + 1] - positions[a + 1];
        const v1z = positions[b + 2] - positions[a + 2];

        const v2x = positions[c] - positions[a];
        const v2y = positions[c + 1] - positions[a + 1];
        const v2z = positions[c + 2] - positions[a + 2];

        // Cross product
        const nx = v1y * v2z - v1z * v2y;
        const ny = v1z * v2x - v1x * v2z;
        const nz = v1x * v2y - v1y * v2x;

        // Add to vertex normals
        for (let j = 0; j < 3; j++) {
          const vertexIndex = indices[i + j] * 3;
          normals[vertexIndex] += nx;
          normals[vertexIndex + 1] += ny;
          normals[vertexIndex + 2] += nz;
        }
      }
    } else {
      // No indices, assume triangles
      for (let i = 0; i < positions.length; i += 9) {
        const v1x = positions[i + 3] - positions[i];
        const v1y = positions[i + 4] - positions[i + 1];
        const v1z = positions[i + 5] - positions[i + 2];

        const v2x = positions[i + 6] - positions[i];
        const v2y = positions[i + 7] - positions[i + 1];
        const v2z = positions[i + 8] - positions[i + 2];

        const nx = v1y * v2z - v1z * v2y;
        const ny = v1z * v2x - v1x * v2z;
        const nz = v1x * v2y - v1y * v2x;

        for (let j = 0; j < 3; j++) {
          normals[i + j * 3] = nx;
          normals[i + j * 3 + 1] = ny;
          normals[i + j * 3 + 2] = nz;
        }
      }
    }

    // Normalize
    for (let i = 0; i < normals.length; i += 3) {
      const length = Math.sqrt(
        normals[i] * normals[i] +
        normals[i + 1] * normals[i + 1] +
        normals[i + 2] * normals[i + 2]
      );

      if (length > 0) {
        normals[i] /= length;
        normals[i + 1] /= length;
        normals[i + 2] /= length;
      }
    }

    return normals;
  }

  private async simplifyGeometry(
    geometry: GeometryData,
    ratio: number
  ): Promise<GeometryData> {
    // Simple edge collapse algorithm
    if (!geometry.indices || ratio >= 1.0) {
      return geometry;
    }

    const targetTriangles = Math.floor((geometry.indices.length / 3) * ratio);
    const currentTriangles = geometry.indices.length / 3;

    if (targetTriangles >= currentTriangles) {
      return geometry;
    }

    // This is a simplified implementation
    // In a production environment, you'd use a more sophisticated algorithm
    const step = Math.floor(1 / ratio);
    const newIndices: number[] = [];

    for (let i = 0; i < geometry.indices.length; i += step * 3) {
      if (i + 2 < geometry.indices.length) {
        newIndices.push(
          geometry.indices[i],
          geometry.indices[i + 1],
          geometry.indices[i + 2]
        );
      }
    }

    return {
      ...geometry,
      indices: geometry.indices instanceof Uint32Array
        ? new Uint32Array(newIndices)
        : new Uint16Array(newIndices),
    };
  }

  private async validateModel(data: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    stats: any;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation checks
    if (!data.positions) {
      errors.push('Missing position data');
    } else if (data.positions.length % 3 !== 0) {
      errors.push('Position data length must be divisible by 3');
    }

    if (data.normals && data.normals.length !== data.positions.length) {
      warnings.push('Normal count does not match position count');
    }

    if (data.uvs && data.uvs.length !== (data.positions.length / 3) * 2) {
      warnings.push('UV count does not match vertex count');
    }

    if (data.indices) {
      if (data.indices.length % 3 !== 0) {
        errors.push('Index count must be divisible by 3');
      }

      const maxIndex = data.positions.length / 3 - 1;
      for (let i = 0; i < data.indices.length; i++) {
        if (data.indices[i] > maxIndex) {
          errors.push(`Index ${data.indices[i]} out of range (max: ${maxIndex})`);
          break;
        }
      }
    }

    const stats = {
      vertices: data.positions.length / 3,
      triangles: data.indices ? data.indices.length / 3 : data.positions.length / 9,
      hasNormals: !!data.normals,
      hasUVs: !!data.uvs,
      hasIndices: !!data.indices,
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats,
    };
  }

  private async generateLODLevels(
    geometry: GeometryData,
    options: {
      levels?: number;
      distances?: number[];
      reductionRatios?: number[];
    } = {}
  ): Promise<LODLevel[]> {
    const levels = options.levels || 4;
    const distances = options.distances || [10, 25, 50, 100];
    const reductionRatios = options.reductionRatios || [1.0, 0.5, 0.25, 0.1];

    const lodLevels: LODLevel[] = [];

    for (let i = 0; i < levels; i++) {
      const ratio = reductionRatios[i] || Math.pow(0.5, i);
      const distance = distances[i] || 10 * Math.pow(2, i);

      const optimizedGeometry = await this.simplifyGeometry(geometry, ratio);
      const targetTriangles = optimizedGeometry.indices
        ? optimizedGeometry.indices.length / 3
        : optimizedGeometry.positions.length / 9;

      lodLevels.push({
        level: i,
        targetTriangles: Math.floor(targetTriangles),
        distance,
        geometry: optimizedGeometry,
      });
    }

    return lodLevels;
  }

  private async calculateBounds(geometry: GeometryData): Promise<{
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    size: [number, number, number];
    radius: number;
  }> {
    const positions = geometry.positions;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;

    const radius = Math.sqrt(sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ) / 2;

    return {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
      center: [centerX, centerY, centerZ],
      size: [sizeX, sizeY, sizeZ],
      radius,
    };
  }

  private async extractMaterials(_data: any): Promise<{
    materials: any[];
    textureUrls: string[];
    shaderInfo: any;
  }> {
    const materials: any[] = [];
    const textureUrls: string[] = [];
    const shaderInfo: any = {};

    // This would extract material information from the model data
    // Implementation depends on the specific model format
    
    return {
      materials,
      textureUrls,
      shaderInfo,
    };
  }

  private startProcessingLoop(): void {
    const processNext = async () => {
      if (this.processingQueue.length > 0 && !this.isProcessing) {
        this.isProcessing = true;
        const task = this.processingQueue.shift()!;
        const result = await this.processTask(task);
        
        self.postMessage({
          type: 'TASK_COMPLETE',
          result,
        });
        
        this.isProcessing = false;
      }
      
      requestAnimationFrame(processNext);
    };
    
    requestAnimationFrame(processNext);
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private calculateDataSize(data: any): number {
    if (!data) return 0;
    
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    
    if (data instanceof Float32Array || data instanceof Uint32Array || data instanceof Uint16Array) {
      return data.byteLength;
    }
    
    // Rough estimate for objects
    return JSON.stringify(data).length * 2;
  }
}

// Worker instance
const processor = new ModelProcessor();

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const { type, task } = event.data;

  switch (type) {
    case 'PROCESS_TASK':
      processor.processingQueue.push(task);
      break;

    case 'GET_QUEUE_STATUS':
      self.postMessage({
        type: 'QUEUE_STATUS',
        queueLength: processor.processingQueue.length,
        isProcessing: processor.isProcessing,
      });
      break;

    case 'CLEAR_QUEUE':
      processor.processingQueue.length = 0;
      self.postMessage({
        type: 'QUEUE_CLEARED',
      });
      break;

    default:
      console.warn('[ModelProcessor] Unknown message type:', type);
  }
});

// Notify main thread that worker is ready
self.postMessage({
  type: 'WORKER_READY',
  capabilities: {
    optimization: true,
    validation: true,
    lodGeneration: true,
    boundsCalculation: true,
    materialExtraction: true,
  },
});