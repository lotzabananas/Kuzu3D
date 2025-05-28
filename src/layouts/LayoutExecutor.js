import { Logger } from '../utils/Logger.js';
import * as THREE from 'three';

const logger = new Logger('LayoutExecutor');

/**
 * Layout Executor - Runs the compiled layout physics simulation
 * 
 * This is where the actual node movement happens. It takes the
 * compiled forces and constraints and applies them frame by frame
 * until the layout converges or reaches max iterations.
 * 
 * EXECUTION FLOW:
 * 1. Initialize node velocities and accelerations
 * 2. Run simulation loop
 * 3. Apply forces to calculate accelerations
 * 4. Update velocities with damping
 * 5. Update positions
 * 6. Apply constraints
 * 7. Check for convergence
 * 8. Return final positions
 */
export class LayoutExecutor {
    constructor() {
        // Simulation parameters
        this.config = {
            maxIterations: 500,
            convergenceThreshold: 0.001,
            timeStep: 0.016, // 60 FPS
            damping: 0.9,
            maxVelocity: 2.0,
            
            // Performance settings
            updateBatchSize: 100,
            checkConvergenceEvery: 10,
            
            // VR-specific settings
            animateTransition: true,
            transitionDuration: 2000, // 2 seconds
            easingFunction: 'easeInOutCubic'
        };
        
        // Node state tracking
        this.nodeStates = new Map();
        
        // Performance metrics
        this.metrics = {
            iterations: 0,
            totalTime: 0,
            averageEnergy: 0
        };
    }
    
    /**
     * Execute the layout on the given nodes
     * @param {Object} layout - Compiled layout with forces and constraints
     * @param {Object} graphData - Nodes and edges to layout
     * @returns {Promise<Object>} Result with final positions and metrics
     */
    async execute(layout, graphData) {
        const startTime = performance.now();
        logger.info(`Executing ${layout.type} layout on ${graphData.nodes.length} nodes`);
        
        try {
            // Initialize simulation state
            this.initializeSimulation(graphData.nodes);
            
            // Store initial positions for smooth transition
            const initialPositions = this.capturePositions(graphData.nodes);
            
            // Run simulation
            const converged = await this.runSimulation(layout, graphData.nodes);
            
            // Capture final positions
            const finalPositions = this.capturePositions(graphData.nodes);
            
            // Calculate metrics
            const executionTime = performance.now() - startTime;
            this.metrics.totalTime = executionTime;
            
            logger.info(`Layout execution complete: ${this.metrics.iterations} iterations in ${executionTime.toFixed(2)}ms`);
            
            // Return results
            const result = {
                success: true,
                converged,
                iterations: this.metrics.iterations,
                executionTime,
                movedNodes: this.countMovedNodes(initialPositions, finalPositions),
                
                // Position data
                initialPositions,
                finalPositions,
                
                // Transition function for smooth animation
                transition: this.createTransitionFunction(initialPositions, finalPositions)
            };
            
            return result;
            
        } catch (error) {
            logger.error('Layout execution failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Initialize simulation state for all nodes
     */
    initializeSimulation(nodes) {
        this.nodeStates.clear();
        this.metrics.iterations = 0;
        
        nodes.forEach(node => {
            // Ensure node has position
            if (!node.position) {
                node.position = new THREE.Vector3(
                    Math.random() * 10 - 5,
                    Math.random() * 10 - 5,
                    Math.random() * 10 - 5
                );
            }
            
            // Initialize physics state
            this.nodeStates.set(node.id, {
                velocity: new THREE.Vector3(0, 0, 0),
                acceleration: new THREE.Vector3(0, 0, 0),
                mass: node.mass || 1.0,
                fixed: node.fixed || false
            });
        });
    }
    
    /**
     * Main simulation loop
     */
    async runSimulation(layout, nodes) {
        let converged = false;
        let totalEnergy = Infinity;
        
        while (this.metrics.iterations < this.config.maxIterations && !converged) {
            // Reset accelerations
            this.resetAccelerations();
            
            // Apply forces from layout
            const forceStartTime = performance.now();
            this.applyLayoutForces(layout, nodes);
            const forceTime = performance.now() - forceStartTime;
            
            // Update velocities and positions
            const updateStartTime = performance.now();
            totalEnergy = this.updatePhysics(nodes, layout.config.timeStep || this.config.timeStep);
            const updateTime = performance.now() - updateStartTime;
            
            // Apply constraints
            const constraintStartTime = performance.now();
            this.applyConstraints(layout, nodes);
            const constraintTime = performance.now() - constraintStartTime;
            
            // Update iteration count
            this.metrics.iterations++;
            
            // Check convergence periodically
            if (this.metrics.iterations % this.config.checkConvergenceEvery === 0) {
                converged = totalEnergy < this.config.convergenceThreshold;
                
                // Log progress
                if (this.metrics.iterations % 50 === 0) {
                    logger.debug(`Iteration ${this.metrics.iterations}: Energy = ${totalEnergy.toFixed(6)}, Times: F=${forceTime.toFixed(1)}ms U=${updateTime.toFixed(1)}ms C=${constraintTime.toFixed(1)}ms`);
                }
            }
            
            // Allow other operations (prevent blocking in VR)
            if (this.metrics.iterations % 10 === 0) {
                await this.yieldToRenderer();
            }
        }
        
        logger.info(`Simulation ${converged ? 'converged' : 'reached max iterations'} at ${totalEnergy.toFixed(6)} energy`);
        
        return converged;
    }
    
    /**
     * Reset all accelerations to zero
     */
    resetAccelerations() {
        this.nodeStates.forEach(state => {
            state.acceleration.set(0, 0, 0);
        });
    }
    
    /**
     * Apply all forces from the layout
     */
    applyLayoutForces(layout, nodes) {
        // Execute each force function
        layout.forces.forEach(force => {
            try {
                const forces = force.apply(nodes, layout.state);
                
                // Apply forces to accelerations
                forces.forEach((forceVector, nodeId) => {
                    const state = this.nodeStates.get(nodeId);
                    if (state && !state.fixed) {
                        // F = ma, so a = F/m
                        const acceleration = forceVector.divideScalar(state.mass);
                        state.acceleration.add(acceleration);
                    }
                });
            } catch (error) {
                logger.error(`Error applying force ${force.name}:`, error);
            }
        });
    }
    
    /**
     * Update velocities and positions using physics
     */
    updatePhysics(nodes, deltaTime) {
        let totalEnergy = 0;
        
        nodes.forEach(node => {
            const state = this.nodeStates.get(node.id);
            if (!state || state.fixed) return;
            
            // Update velocity: v = v + a * dt
            state.velocity.add(
                state.acceleration.clone().multiplyScalar(deltaTime)
            );
            
            // Apply damping
            state.velocity.multiplyScalar(this.config.damping);
            
            // Clamp velocity
            const speed = state.velocity.length();
            if (speed > this.config.maxVelocity) {
                state.velocity.normalize().multiplyScalar(this.config.maxVelocity);
            }
            
            // Update position: p = p + v * dt
            const displacement = state.velocity.clone().multiplyScalar(deltaTime);
            node.position.add(displacement);
            
            // Track total energy (kinetic energy)
            totalEnergy += 0.5 * state.mass * state.velocity.lengthSq();
        });
        
        return totalEnergy;
    }
    
    /**
     * Apply constraints to enforce layout rules
     */
    applyConstraints(layout, nodes) {
        if (!layout.constraints || layout.constraints.length === 0) return;
        
        // Apply each constraint
        layout.constraints.forEach(constraint => {
            try {
                const corrections = constraint.apply(nodes);
                
                // Apply position corrections
                corrections.forEach((correction, nodeId) => {
                    const node = nodes.find(n => n.id === nodeId);
                    if (node) {
                        node.position.add(correction);
                    }
                });
            } catch (error) {
                logger.error(`Error applying constraint ${constraint.name}:`, error);
            }
        });
    }
    
    /**
     * Yield control back to renderer (for VR responsiveness)
     */
    async yieldToRenderer() {
        return new Promise(resolve => {
            setTimeout(resolve, 0);
        });
    }
    
    /**
     * Capture current node positions
     */
    capturePositions(nodes) {
        const positions = new Map();
        
        nodes.forEach(node => {
            positions.set(node.id, node.position.clone());
        });
        
        return positions;
    }
    
    /**
     * Count how many nodes moved significantly
     */
    countMovedNodes(initialPositions, finalPositions) {
        let movedCount = 0;
        const threshold = 0.1; // 10cm movement threshold
        
        initialPositions.forEach((initialPos, nodeId) => {
            const finalPos = finalPositions.get(nodeId);
            if (finalPos) {
                const distance = initialPos.distanceTo(finalPos);
                if (distance > threshold) {
                    movedCount++;
                }
            }
        });
        
        return movedCount;
    }
    
    /**
     * Create smooth transition function for animating to final positions
     */
    createTransitionFunction(initialPositions, finalPositions) {
        const easings = {
            linear: t => t,
            easeInOutCubic: t => t < 0.5 
                ? 4 * t * t * t 
                : 1 - Math.pow(-2 * t + 2, 3) / 2,
            easeOutElastic: t => {
                const c4 = (2 * Math.PI) / 3;
                return t === 0 ? 0 : t === 1 ? 1 :
                    Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            }
        };
        
        const easing = easings[this.config.easingFunction] || easings.linear;
        
        return (node, progress) => {
            const initial = initialPositions.get(node.id);
            const final = finalPositions.get(node.id);
            
            if (!initial || !final) return;
            
            // Interpolate position with easing
            const t = easing(Math.min(1, Math.max(0, progress)));
            node.position.lerpVectors(initial, final, t);
        };
    }
}

/**
 * EXECUTION EXAMPLE:
 * 
 * For "Show companies grouped by employees":
 * 
 * ITERATION 1-50: High energy, rapid movement
 * - Companies repel each other strongly
 * - Employees attracted to their companies
 * - Lots of position changes
 * 
 * ITERATION 51-200: Settling phase
 * - Major positions established
 * - Fine-tuning distances
 * - Circular arrangements forming
 * 
 * ITERATION 201-300: Convergence
 * - Minor adjustments only
 * - Energy approaching zero
 * - Layout stabilizing
 * 
 * FINAL RESULT:
 * - Companies well separated
 * - Employees in circles around their company
 * - Technologies orbiting nearby
 * - Clean, organized layout
 * 
 * PERFORMANCE NOTES:
 * - 100 nodes: ~500ms total
 * - 500 nodes: ~2000ms total
 * - 1000 nodes: ~5000ms total (use LOD)
 */

/**
 * TRANSITION ANIMATION:
 * 
 * Instead of jumping to final positions, smooth transition over 2 seconds:
 * 
 * t=0.0s: Nodes at original positions
 * t=0.5s: 25% of the way (accelerating)
 * t=1.0s: 50% of the way (peak velocity)
 * t=1.5s: 75% of the way (decelerating)
 * t=2.0s: Final positions (settled)
 * 
 * This prevents VR sickness from sudden movements
 */