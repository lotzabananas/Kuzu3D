import * as THREE from 'three';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('ForceLayoutManager');

/**
 * 3D Force-Directed Graph Layout Manager
 * 
 * Implements spring-force physics simulation for graph visualization:
 * - Attractive forces between connected nodes (springs)
 * - Repulsive forces between all nodes (charge)
 * - Configurable damping and constraints
 * - VR-optimized for real-time interaction
 */
export class ForceLayoutManager {
    constructor(config = {}) {
        // Physics configuration
        this.config = {
            // Spring forces (attractive)
            springStrength: config.springStrength || 0.1,
            restLength: config.restLength || 2.0, // Ideal edge length
            
            // Charge forces (repulsive)
            chargeStrength: config.chargeStrength || -300,
            maxForce: config.maxForce || 10.0,
            
            // Simulation parameters
            damping: config.damping || 0.9,
            timeStep: config.timeStep || 0.016, // 60fps
            alpha: config.alpha || 1.0, // Overall simulation strength
            alphaDecay: config.alphaDecay || 0.998,
            minAlpha: config.minAlpha || 0.001,
            
            // Boundaries (VR space limits)
            bounds: config.bounds || {
                x: [-10, 10],
                y: [-5, 8],
                z: [-10, 10]
            },
            
            // Performance
            maxIterationsPerFrame: config.maxIterationsPerFrame || 3,
            enableBounds: config.enableBounds !== false
        };
        
        // Simulation state
        this.nodes = [];
        this.edges = [];
        this.forces = new Map(); // nodeId -> THREE.Vector3
        this.velocities = new Map(); // nodeId -> THREE.Vector3
        this.isRunning = false;
        this.isStable = false;
        this.frameCount = 0;
        
        // Performance tracking
        this.lastUpdateTime = 0;
        this.avgForce = 0;
        
        logger.info('ForceLayoutManager initialized with config:', this.config);
    }
    
    /**
     * Initialize the simulation with nodes and edges
     */
    setGraph(nodes, edges) {
        this.nodes = nodes || [];
        this.edges = edges || [];
        
        // Initialize physics state for each node
        this.forces.clear();
        this.velocities.clear();
        
        this.nodes.forEach(node => {
            this.forces.set(node.id, new THREE.Vector3(0, 0, 0));
            this.velocities.set(node.id, new THREE.Vector3(0, 0, 0));
            
            // If node doesn't have a position, give it a random one
            if (!node.position || typeof node.position.set !== 'function') {
                node.position = new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10
                );
            }
        });
        
        // Reset simulation state
        this.config.alpha = 1.0;
        this.isStable = false;
        this.frameCount = 0;
        
        logger.info(`Graph initialized: ${this.nodes.length} nodes, ${this.edges.length} edges`);
    }
    
    /**
     * Start the physics simulation
     */
    start() {
        this.isRunning = true;
        this.config.alpha = 1.0;
        this.isStable = false;
        logger.info('Force simulation started');
    }
    
    /**
     * Stop the physics simulation
     */
    stop() {
        this.isRunning = false;
        logger.info('Force simulation stopped');
    }
    
    /**
     * Main simulation step - call this every frame
     */
    update(deltaTime = this.config.timeStep) {
        if (!this.isRunning || this.isStable) return;
        
        const startTime = performance.now();
        
        for (let i = 0; i < this.config.maxIterationsPerFrame; i++) {
            this.simulationStep(deltaTime);
        }
        
        // Update performance metrics
        this.lastUpdateTime = performance.now() - startTime;
        this.frameCount++;
        
        // Check if simulation has stabilized
        if (this.config.alpha < this.config.minAlpha) {
            this.isStable = true;
            this.isRunning = false;
            logger.info(`Simulation stabilized after ${this.frameCount} frames`);
        }
    }
    
    /**
     * Single physics simulation step
     */
    simulationStep(deltaTime) {
        // 1. Clear forces
        this.forces.forEach(force => force.set(0, 0, 0));
        
        // 2. Calculate spring forces (attractive)
        this.calculateSpringForces();
        
        // 3. Calculate charge forces (repulsive)
        this.calculateChargeForces();
        
        // 4. Apply forces to update positions
        this.integrateForces(deltaTime);
        
        // 5. Apply constraints
        if (this.config.enableBounds) {
            this.applyBoundaryConstraints();
        }
        
        // 6. Decay simulation strength
        this.config.alpha *= this.config.alphaDecay;
        
        // 7. Update average force for stability detection
        this.updateForceMetrics();
    }
    
    /**
     * Calculate attractive spring forces between connected nodes
     */
    calculateSpringForces() {
        const tempVector = new THREE.Vector3();
        
        this.edges.forEach(edge => {
            const sourceNode = this.getNodeById(edge.source);
            const targetNode = this.getNodeById(edge.target);
            
            if (!sourceNode || !targetNode) return;
            
            // Calculate distance and direction
            tempVector.subVectors(targetNode.position, sourceNode.position);
            const distance = tempVector.length();
            
            if (distance === 0) return;
            
            // Hooke's law: F = k * (distance - restLength)
            const displacement = distance - this.config.restLength;
            const forceMagnitude = this.config.springStrength * displacement * this.config.alpha;
            
            // Normalize direction and apply force magnitude
            tempVector.normalize().multiplyScalar(forceMagnitude);
            
            // Apply equal and opposite forces
            this.forces.get(sourceNode.id).add(tempVector);
            this.forces.get(targetNode.id).sub(tempVector);
        });
    }
    
    /**
     * Calculate repulsive charge forces between all nodes
     */
    calculateChargeForces() {
        const tempVector = new THREE.Vector3();
        const nodes = this.nodes;
        
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeA = nodes[i];
                const nodeB = nodes[j];
                
                // Calculate distance and direction
                tempVector.subVectors(nodeA.position, nodeB.position);
                const distanceSquared = tempVector.lengthSq();
                
                if (distanceSquared === 0) continue;
                
                // Coulomb's law: F = k * q1 * q2 / r^2
                const forceMagnitude = this.config.chargeStrength * this.config.alpha / distanceSquared;
                
                // Clamp force to prevent instability
                const clampedMagnitude = Math.max(-this.config.maxForce, 
                                                 Math.min(this.config.maxForce, forceMagnitude));
                
                // Normalize direction and apply force magnitude
                tempVector.normalize().multiplyScalar(clampedMagnitude);
                
                // Apply equal and opposite forces
                this.forces.get(nodeA.id).add(tempVector);
                this.forces.get(nodeB.id).sub(tempVector);
            }
        }
    }
    
    /**
     * Apply forces to update node positions (Verlet integration)
     */
    integrateForces(deltaTime) {
        this.nodes.forEach(node => {
            const force = this.forces.get(node.id);
            const velocity = this.velocities.get(node.id);
            
            // Update velocity: v = v + a * dt
            velocity.add(force.clone().multiplyScalar(deltaTime));
            
            // Apply damping
            velocity.multiplyScalar(this.config.damping);
            
            // Update position: p = p + v * dt
            node.position.add(velocity.clone().multiplyScalar(deltaTime));
        });
    }
    
    /**
     * Keep nodes within VR space boundaries
     */
    applyBoundaryConstraints() {
        const bounds = this.config.bounds;
        
        this.nodes.forEach(node => {
            const pos = node.position;
            const vel = this.velocities.get(node.id);
            
            // X bounds
            if (pos.x < bounds.x[0]) {
                pos.x = bounds.x[0];
                vel.x = Math.abs(vel.x) * 0.5; // Bounce with energy loss
            } else if (pos.x > bounds.x[1]) {
                pos.x = bounds.x[1];
                vel.x = -Math.abs(vel.x) * 0.5;
            }
            
            // Y bounds
            if (pos.y < bounds.y[0]) {
                pos.y = bounds.y[0];
                vel.y = Math.abs(vel.y) * 0.5;
            } else if (pos.y > bounds.y[1]) {
                pos.y = bounds.y[1];
                vel.y = -Math.abs(vel.y) * 0.5;
            }
            
            // Z bounds
            if (pos.z < bounds.z[0]) {
                pos.z = bounds.z[0];
                vel.z = Math.abs(vel.z) * 0.5;
            } else if (pos.z > bounds.z[1]) {
                pos.z = bounds.z[1];
                vel.z = -Math.abs(vel.z) * 0.5;
            }
        });
    }
    
    /**
     * Update force metrics for performance monitoring
     */
    updateForceMetrics() {
        let totalForce = 0;
        this.forces.forEach(force => {
            totalForce += force.length();
        });
        this.avgForce = totalForce / this.forces.size;
    }
    
    /**
     * Helper method to find node by ID
     */
    getNodeById(id) {
        return this.nodes.find(node => node.id === id);
    }
    
    /**
     * Get simulation statistics
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            isStable: this.isStable,
            alpha: this.config.alpha,
            frameCount: this.frameCount,
            avgForce: this.avgForce,
            lastUpdateTime: this.lastUpdateTime,
            nodeCount: this.nodes.length,
            edgeCount: this.edges.length
        };
    }
    
    /**
     * Manual node positioning (when user grabs a node in VR)
     */
    setNodePosition(nodeId, position) {
        const node = this.getNodeById(nodeId);
        if (node) {
            node.position.copy(position);
            // Reset velocity for this node
            this.velocities.get(nodeId).set(0, 0, 0);
            // Restart simulation with some energy
            if (this.config.alpha < 0.1) {
                this.config.alpha = 0.3;
                this.isStable = false;
                this.isRunning = true;
            }
        }
    }
    
    /**
     * Cleanup
     */
    dispose() {
        this.stop();
        this.forces.clear();
        this.velocities.clear();
        this.nodes = [];
        this.edges = [];
        logger.info('ForceLayoutManager disposed');
    }
}

/**
 * Factory function for common layout presets
 */
export const ForceLayoutPresets = {
    // Tight clustering - good for small graphs
    tight: () => new ForceLayoutManager({
        springStrength: 0.2,
        restLength: 1.5,
        chargeStrength: -200,
        damping: 0.95
    }),
    
    // Spread out - good for large graphs
    spread: () => new ForceLayoutManager({
        springStrength: 0.05,
        restLength: 3.0,
        chargeStrength: -500,
        damping: 0.9
    }),
    
    // Hierarchical - good for organizational data
    hierarchical: () => new ForceLayoutManager({
        springStrength: 0.1,
        restLength: 2.5,
        chargeStrength: -400,
        damping: 0.92,
        bounds: {
            x: [-15, 15],
            y: [-3, 12], // Emphasize vertical hierarchy
            z: [-10, 10]
        }
    })
};