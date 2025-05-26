import * as THREE from 'three';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('GentleDriftManager');

/**
 * Gentle Node Drift Manager
 * 
 * Super lightweight spring system that just pushes overlapping nodes apart.
 * No complex physics - just gentle repulsion when nodes get too close.
 * Designed to be VR-friendly and standalone.
 */
export class GentleDriftManager {
    constructor(config = {}) {
        this.config = {
            // Stronger repulsion settings for faster separation
            minDistance: config.minDistance || 1.2,     // Start pushing when closer than this
            maxDistance: config.maxDistance || 3.0,     // Stop pushing when farther than this
            pushStrength: config.pushStrength || 0.02,  // 10x stronger force
            maxSpeed: config.maxSpeed || 0.08,          // Much faster movement
            
            // Performance settings
            updateInterval: config.updateInterval || 1,  // Check every frame for responsiveness
            maxChecksPerFrame: config.maxChecksPerFrame || 25, // More comparisons for faster results
            damping: config.damping || 0.85,            // Less damping = faster movement
            
            // Auto-disable when stable
            enableAutoStop: config.enableAutoStop !== false,
            stabilityThreshold: config.stabilityThreshold || 0.001,
            stabilityFrames: config.stabilityFrames || 60 // 1 second at 60fps
        };
        
        this.nodes = [];
        this.velocities = new Map(); // nodeId -> THREE.Vector3
        this.isEnabled = false;
        this.frameCounter = 0;
        this.stableFrameCount = 0;
        this.lastTotalMovement = 0;
        
        // Temp vectors for calculations (reuse to avoid garbage collection)
        this.tempVector1 = new THREE.Vector3();
        this.tempVector2 = new THREE.Vector3();
        
        logger.info('GentleDriftManager initialized - ultra lightweight mode');
    }
    
    /**
     * Set the nodes to manage (doesn't modify original objects)
     */
    setNodes(nodes) {
        this.nodes = nodes || [];
        
        // Initialize velocities for new nodes
        this.velocities.clear();
        this.nodes.forEach(node => {
            this.velocities.set(node.id, new THREE.Vector3(0, 0, 0));
        });
        
        this.frameCounter = 0;
        this.stableFrameCount = 0;
        
        logger.info(`GentleDrift managing ${this.nodes.length} nodes`);
    }
    
    /**
     * Enable gentle drifting
     */
    enable() {
        this.isEnabled = true;
        this.stableFrameCount = 0;
        logger.info('Gentle drift enabled');
    }
    
    /**
     * Disable gentle drifting
     */
    disable() {
        this.isEnabled = false;
        // Clear all velocities
        this.velocities.forEach(velocity => velocity.set(0, 0, 0));
        logger.info('Gentle drift disabled');
    }
    
    /**
     * Super lightweight update - call every frame
     */
    update() {
        if (!this.isEnabled || this.nodes.length < 2) return;
        
        this.frameCounter++;
        
        // Only process every N frames to save performance
        if (this.frameCounter % this.config.updateInterval !== 0) {
            this.applyVelocities(); // Still apply existing velocities for smoothness
            return;
        }
        
        // Calculate gentle repulsion forces
        this.calculateGentleForces();
        
        // Apply velocities to positions
        this.applyVelocities();
        
        // Check for stability and auto-disable
        if (this.config.enableAutoStop) {
            this.checkStability();
        }
    }
    
    /**
     * Calculate super gentle repulsion forces (performance optimized)
     */
    calculateGentleForces() {
        const nodes = this.nodes;
        const maxChecks = Math.min(this.config.maxChecksPerFrame, nodes.length * 2);
        let checksPerformed = 0;
        
        // Only check a subset of node pairs each frame for performance
        const startIndex = this.frameCounter % nodes.length;
        
        for (let i = 0; i < nodes.length && checksPerformed < maxChecks; i++) {
            const nodeIndex = (startIndex + i) % nodes.length;
            const nodeA = nodes[nodeIndex];
            
            // Check against a few nearby nodes (not all nodes)
            const nearbyCount = Math.min(5, nodes.length - 1);
            for (let j = 1; j <= nearbyCount && checksPerformed < maxChecks; j++) {
                const otherIndex = (nodeIndex + j) % nodes.length;
                const nodeB = nodes[otherIndex];
                
                if (nodeA.id === nodeB.id) continue;
                
                this.processNodePair(nodeA, nodeB);
                checksPerformed++;
            }
        }
    }
    
    /**
     * Process a single pair of nodes for repulsion
     */
    processNodePair(nodeA, nodeB) {
        // Calculate distance
        this.tempVector1.subVectors(nodeA.position, nodeB.position);
        const distance = this.tempVector1.length();
        
        // Only apply force if nodes are too close
        if (distance > this.config.maxDistance || distance < 0.01) return;
        
        // Calculate repulsion strength (stronger when closer)
        const overlap = Math.max(0, this.config.minDistance - distance);
        const forceMultiplier = overlap / this.config.minDistance;
        const force = this.config.pushStrength * forceMultiplier;
        
        // Normalize direction and apply force
        this.tempVector1.normalize().multiplyScalar(force);
        
        // Apply equal and opposite forces
        const velA = this.velocities.get(nodeA.id);
        const velB = this.velocities.get(nodeB.id);
        
        velA.add(this.tempVector1);
        velB.sub(this.tempVector1);
    }
    
    /**
     * Apply velocities to node positions
     */
    applyVelocities() {
        let totalMovement = 0;
        
        this.nodes.forEach(node => {
            const velocity = this.velocities.get(node.id);
            
            // Clamp velocity to max speed
            if (velocity.length() > this.config.maxSpeed) {
                velocity.normalize().multiplyScalar(this.config.maxSpeed);
            }
            
            // Apply velocity to position
            if (velocity.length() > 0.0001) {
                node.position.add(velocity);
                totalMovement += velocity.length();
            }
            
            // Apply damping
            velocity.multiplyScalar(this.config.damping);
        });
        
        this.lastTotalMovement = totalMovement;
    }
    
    /**
     * Check if system has stabilized and auto-disable if needed
     */
    checkStability() {
        if (this.lastTotalMovement < this.config.stabilityThreshold) {
            this.stableFrameCount++;
            
            if (this.stableFrameCount >= this.config.stabilityFrames) {
                logger.info('Gentle drift auto-disabled - system stable');
                this.disable();
                
                // Trigger callback for UI updates
                if (this.onAutoDisableCallback) {
                    this.onAutoDisableCallback();
                }
            }
        } else {
            this.stableFrameCount = 0;
        }
    }
    
    /**
     * Manual trigger for when nodes might overlap (e.g., after query results)
     */
    nudgeNodes() {
        if (!this.isEnabled) {
            this.enable();
        }
        
        // Add stronger random velocities to get things moving faster
        this.nodes.forEach(node => {
            const velocity = this.velocities.get(node.id);
            velocity.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,  // 20x stronger initial push
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            ));
        });
        
        this.stableFrameCount = 0;
        logger.info('Nodes nudged - stronger drift activated');
    }
    
    /**
     * Instant spread - calculate final positions and snap nodes there immediately
     */
    instantSpread() {
        if (this.nodes.length < 2) return;
        
        logger.info('Calculating instant spread positions...');
        
        // Find overlapping nodes
        const overlapping = [];
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const nodeA = this.nodes[i];
                const nodeB = this.nodes[j];
                const distance = nodeA.position.distanceTo(nodeB.position);
                
                if (distance < this.config.minDistance) {
                    overlapping.push({ nodeA, nodeB, distance });
                }
            }
        }
        
        if (overlapping.length === 0) {
            logger.info('No overlapping nodes found');
            return;
        }
        
        // Simple repulsion algorithm - push overlapping nodes apart
        const pushIterations = 20; // Multiple iterations for better spread
        
        for (let iter = 0; iter < pushIterations; iter++) {
            overlapping.forEach(({ nodeA, nodeB, distance: _distance }) => {
                // Recalculate distance each iteration
                this.tempVector1.subVectors(nodeA.position, nodeB.position);
                const currentDistance = this.tempVector1.length();
                
                if (currentDistance < this.config.minDistance && currentDistance > 0.01) {
                    // Calculate push direction and strength
                    const pushDistance = (this.config.minDistance - currentDistance) * 0.6;
                    this.tempVector1.normalize().multiplyScalar(pushDistance);
                    
                    // Push nodes apart (half distance each)
                    nodeA.position.add(this.tempVector1.clone().multiplyScalar(0.5));
                    nodeB.position.sub(this.tempVector1.clone().multiplyScalar(0.5));
                }
            });
            
            // Recalculate overlapping for next iteration
            if (iter < pushIterations - 1) {
                overlapping.length = 0;
                for (let i = 0; i < this.nodes.length; i++) {
                    for (let j = i + 1; j < this.nodes.length; j++) {
                        const nodeA = this.nodes[i];
                        const nodeB = this.nodes[j];
                        const distance = nodeA.position.distanceTo(nodeB.position);
                        
                        if (distance < this.config.minDistance) {
                            overlapping.push({ nodeA, nodeB, distance });
                        }
                    }
                }
                
                if (overlapping.length === 0) break; // Early exit if no more overlaps
            }
        }
        
        // Clear all velocities since we just moved nodes directly
        this.velocities.forEach(velocity => velocity.set(0, 0, 0));
        
        logger.info(`Instant spread complete - resolved ${overlapping.length} overlaps`);
    }
    
    /**
     * Set callback for when drift auto-disables
     */
    onAutoDisable(callback) {
        this.onAutoDisableCallback = callback;
    }
    
    /**
     * Get current system stats
     */
    getStats() {
        return {
            isEnabled: this.isEnabled,
            nodeCount: this.nodes.length,
            totalMovement: this.lastTotalMovement,
            stableFrameCount: this.stableFrameCount,
            frameCounter: this.frameCounter
        };
    }
    
    /**
     * Cleanup
     */
    dispose() {
        this.disable();
        this.velocities.clear();
        this.nodes = [];
        logger.info('GentleDriftManager disposed');
    }
}

/**
 * Simple factory for different drift modes
 */
export const DriftModes = {
    // Super gentle - barely noticeable
    whisper: () => new GentleDriftManager({
        pushStrength: 0.001,
        maxSpeed: 0.005,
        updateInterval: 5
    }),
    
    // Normal gentle drift (default)
    gentle: () => new GentleDriftManager(),
    
    // More noticeable but still smooth
    firm: () => new GentleDriftManager({
        pushStrength: 0.005,
        maxSpeed: 0.02,
        updateInterval: 2
    })
};