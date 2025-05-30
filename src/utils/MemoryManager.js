/**
 * Memory management and performance optimization
 */

import { logger } from './Logger.js';

export class MemoryManager {
	static disposableObjects = new Set();
	static geometryCache = new Map();
	static materialCache = new Map();
	static textureCache = new Map();
	static stats = {
		totalAllocated: 0,
		totalDisposed: 0,
		currentlyAllocated: 0,
		peakMemory: 0
	};
	
	/**
	 * Register object for disposal tracking
	 */
	static register(object, type = 'unknown') {
		if (object && typeof object.dispose === 'function') {
			this.disposableObjects.add({
				object,
				type,
				timestamp: Date.now()
			});
			
			this.stats.totalAllocated++;
			this.stats.currentlyAllocated++;
			this.stats.peakMemory = Math.max(this.stats.peakMemory, this.stats.currentlyAllocated);
		}
	}
	
	/**
	 * Dispose single object
	 */
	static dispose(object) {
		if (!object) return;
		
		try {
			// Dispose Three.js objects
			if (object.geometry) {
				this.disposeGeometry(object.geometry);
			}
			
			if (object.material) {
				this.disposeMaterial(object.material);
			}
			
			if (object.texture) {
				this.disposeTexture(object.texture);
			}
			
			// Dispose the object itself
			if (typeof object.dispose === 'function') {
				object.dispose();
				this.stats.totalDisposed++;
				this.stats.currentlyAllocated--;
			}
			
			// Remove from scene if applicable
			if (object.parent) {
				object.parent.remove(object);
			}
			
			// Clear references
			object.userData = null;
			
		} catch (error) {
			logger.error('Error disposing object:', error);
		}
	}
	
	/**
	 * Dispose geometry with caching
	 */
	static disposeGeometry(geometry) {
		if (!geometry || geometry.userData?.cached) return;
		
		try {
			geometry.dispose();
		} catch (error) {
			logger.error('Error disposing geometry:', error);
		}
	}
	
	/**
	 * Dispose material with caching
	 */
	static disposeMaterial(material) {
		if (!material || material.userData?.cached) return;
		
		try {
			// Dispose textures in material
			if (material.map) this.disposeTexture(material.map);
			if (material.normalMap) this.disposeTexture(material.normalMap);
			if (material.envMap) this.disposeTexture(material.envMap);
			
			material.dispose();
		} catch (error) {
			logger.error('Error disposing material:', error);
		}
	}
	
	/**
	 * Dispose texture with caching
	 */
	static disposeTexture(texture) {
		if (!texture || texture.userData?.cached) return;
		
		try {
			texture.dispose();
		} catch (error) {
			logger.error('Error disposing texture:', error);
		}
	}
	
	/**
	 * Dispose all registered objects
	 */
	static disposeAll() {
		logger.info(`Disposing ${this.disposableObjects.size} objects`);
		
		this.disposableObjects.forEach(({ object }) => {
			this.dispose(object);
		});
		
		this.disposableObjects.clear();
		this.clearCaches();
	}
	
	/**
	 * Clear all caches
	 */
	static clearCaches() {
		// Dispose cached geometries
		this.geometryCache.forEach(geometry => {
			try {
				geometry.dispose();
			} catch (error) {
				logger.error('Error disposing cached geometry:', error);
			}
		});
		this.geometryCache.clear();
		
		// Dispose cached materials
		this.materialCache.forEach(material => {
			try {
				material.dispose();
			} catch (error) {
				logger.error('Error disposing cached material:', error);
			}
		});
		this.materialCache.clear();
		
		// Dispose cached textures
		this.textureCache.forEach(texture => {
			try {
				texture.dispose();
			} catch (error) {
				logger.error('Error disposing cached texture:', error);
			}
		});
		this.textureCache.clear();
	}
	
	/**
	 * Get or create cached geometry
	 */
	static getCachedGeometry(key, createFn) {
		if (this.geometryCache.has(key)) {
			return this.geometryCache.get(key);
		}
		
		const geometry = createFn();
		geometry.userData = { cached: true };
		this.geometryCache.set(key, geometry);
		return geometry;
	}
	
	/**
	 * Get or create cached material
	 */
	static getCachedMaterial(key, createFn) {
		if (this.materialCache.has(key)) {
			return this.materialCache.get(key);
		}
		
		const material = createFn();
		material.userData = { cached: true };
		this.materialCache.set(key, material);
		return material;
	}
	
	/**
	 * Get or create cached texture
	 */
	static getCachedTexture(key, createFn) {
		if (this.textureCache.has(key)) {
			return this.textureCache.get(key);
		}
		
		const texture = createFn();
		texture.userData = { cached: true };
		this.textureCache.set(key, texture);
		return texture;
	}
	
	/**
	 * Monitor memory usage
	 */
	static getMemoryInfo() {
		const info = {
			...this.stats,
			cacheStats: {
				geometries: this.geometryCache.size,
				materials: this.materialCache.size,
				textures: this.textureCache.size
			}
		};
		
		// Try to get browser memory info
		if (performance.memory) {
			info.browser = {
				used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
				total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
				limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
			};
		}
		
		return info;
	}
	
	/**
	 * Check memory pressure and cleanup if needed
	 */
	static checkMemoryPressure() {
		const info = this.getMemoryInfo();
		
		if (info.browser) {
			const memoryUsage = info.browser.used / info.browser.limit;
			
			if (memoryUsage > 0.8) {
				logger.warn('High memory usage detected:', info);
				this.performCleanup();
				return true;
			}
		}
		
		return false;
	}
	
	/**
	 * Perform emergency cleanup
	 */
	static performCleanup() {
		logger.info('Performing memory cleanup');
		
		// Clear old objects
		const now = Date.now();
		const oldObjects = Array.from(this.disposableObjects).filter(
			({ timestamp }) => now - timestamp > 300000 // 5 minutes
		);
		
		oldObjects.forEach(({ object }) => {
			this.dispose(object);
			this.disposableObjects.delete(object);
		});
		
		// Force garbage collection if available
		if (window.gc) {
			window.gc();
		}
		
		logger.info(`Cleaned up ${oldObjects.length} old objects`);
	}
	
	/**
	 * Set up automatic memory monitoring
	 */
	static startMonitoring(intervalMs = 30000) {
		return setInterval(() => {
			this.checkMemoryPressure();
		}, intervalMs);
	}
	
	/**
	 * Create memory-aware object factory
	 */
	static createFactory(type, createFn, disposeFn = null) {
		return (...args) => {
			const object = createFn(...args);
			
			// Add custom dispose function if provided
			if (disposeFn && !object.dispose) {
				object.dispose = () => disposeFn(object);
			}
			
			this.register(object, type);
			return object;
		};
	}
	
	/**
	 * Optimize object for memory usage
	 */
	static optimize(object) {
		if (!object) return;
		
		// Optimize geometries
		if (object.geometry) {
			// Remove unnecessary attributes
			const geometry = object.geometry;
			if (geometry.attributes.uv && !object.material?.map) {
				geometry.deleteAttribute('uv');
			}
			if (geometry.attributes.normal && object.material?.flatShading) {
				geometry.deleteAttribute('normal');
			}
		}
		
		// Optimize materials
		if (object.material) {
			const material = object.material;
			
			// Disable features that aren't used
			if (!material.transparent && material.opacity === 1) {
				material.transparent = false;
			}
			
			// Use simpler materials when possible
			if (material.type === 'MeshStandardMaterial' && !material.normalMap && !material.metalnessMap) {
				// Could potentially replace with MeshLambertMaterial
			}
		}
		
		// Traverse children
		if (object.children) {
			object.children.forEach(child => this.optimize(child));
		}
	}
	
	/**
	 * Create LOD (Level of Detail) system
	 */
	static createLOD(highDetail, mediumDetail, lowDetail, distances = [10, 50, 100]) {
		const lod = new THREE.LOD();
		
		if (highDetail) lod.addLevel(highDetail, distances[0]);
		if (mediumDetail) lod.addLevel(mediumDetail, distances[1]);
		if (lowDetail) lod.addLevel(lowDetail, distances[2]);
		
		this.register(lod, 'lod');
		return lod;
	}
}