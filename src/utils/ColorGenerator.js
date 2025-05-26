import * as THREE from 'three';
import { VISUAL_CONFIG } from '../constants/index.js';

/**
 * Generates consistent colors for relationship types based on a hash
 * Uses HSL color space for evenly distributed, visually distinct colors
 */
export class ColorGenerator {
    constructor() {
        // Cache generated colors for consistency
        this.colorCache = new Map();
        this.colorIndex = 0;
    }
    
    /**
     * Get a color for a relationship type
     * @param {string} type - The relationship type (e.g., "WorksAt", "Knows")
     * @returns {number} - Three.js color hex value
     */
    getColorForType(type) {
        // Return cached color if exists
        if (this.colorCache.has(type)) {
            return this.colorCache.get(type);
        }
        
        // Generate new color
        const color = this.generateColor(type);
        this.colorCache.set(type, color);
        return color;
    }
    
    /**
     * Generate a color based on the type string
     * Uses golden ratio for good distribution
     */
    generateColor(type) {
        // Use a simple hash of the string for consistency
        const hash = this.hashString(type);
        
        // Golden ratio conjugate for good distribution
        const goldenRatio = 0.618033988749895;
        
        // Calculate hue based on hash and golden ratio
        const hue = (hash * goldenRatio) % 1.0;
        
        // Use config values for saturation and lightness
        const { saturation, lightness } = VISUAL_CONFIG.edge.colorPalette;
        
        // Convert HSL to RGB
        const color = new THREE.Color();
        color.setHSL(hue, saturation, lightness);
        
        return color.getHex();
    }
    
    /**
     * Simple string hash function
     * Generates a number between 0 and 1 from a string
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        // Convert to 0-1 range
        return Math.abs(hash) / 2147483647;
    }
    
    /**
     * Get all generated colors (for legend)
     * @returns {Map} - Map of type -> color
     */
    getAllColors() {
        return new Map(this.colorCache);
    }
    
    /**
     * Generate colors for a list of types
     * Useful for pre-generating colors from schema
     */
    generateColorsForTypes(types) {
        types.forEach(type => {
            this.getColorForType(type);
        });
    }
    
    /**
     * Clear the color cache
     */
    clearCache() {
        this.colorCache.clear();
        this.colorIndex = 0;
    }
}

// Singleton instance
export const colorGenerator = new ColorGenerator();