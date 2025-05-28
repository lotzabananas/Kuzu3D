import { Logger } from '../utils/Logger.js';
import * as THREE from 'three';

const logger = new Logger('LayoutCompiler');

/**
 * Layout Compiler - Converts parsed specifications into executable physics
 * 
 * Takes the structured layout from the parser and compiles it into
 * actual force calculations, position constraints, and update functions
 * that can be executed frame by frame.
 * 
 * COMPILATION STEPS:
 * 1. Create force functions for each relationship
 * 2. Set up position constraints
 * 3. Define update order and dependencies
 * 4. Optimize for performance (spatial indexing, etc.)
 * 5. Generate executable layout object
 */
export class LayoutCompiler {
    constructor() {
        // Force function generators
        this.forceGenerators = {
            'spring': this.generateSpringForce.bind(this),
            'attraction': this.generateAttractionForce.bind(this),
            'repulsion': this.generateRepulsionForce.bind(this),
            'gravity': this.generateGravityForce.bind(this),
            'orbit': this.generateOrbitForce.bind(this)
        };
        
        // Constraint compilers
        this.constraintCompilers = {
            'vertical': this.compileVerticalConstraint.bind(this),
            'proximity': this.compileProximityConstraint.bind(this),
            'separation': this.compileSeparationConstraint.bind(this),
            'alignment': this.compileAlignmentConstraint.bind(this)
        };
        
        // Performance optimizations
        this.optimizations = {
            useOctree: true,
            batchUpdates: true,
            parallelizable: true
        };
    }
    
    /**
     * Compile parsed layout into executable format
     * @param {Object} parsedLayout - Structured layout from parser
     * @param {Object} graphData - The actual graph data
     * @returns {Object} Executable layout with update functions
     */
    compile(parsedLayout, graphData) {
        logger.info(`Compiling ${parsedLayout.type} layout`);
        
        try {
            // Create base executable layout
            const executable = {
                type: parsedLayout.type,
                metadata: parsedLayout.metadata,
                
                // Core functions that will be called each frame
                forces: [],
                constraints: [],
                
                // Node and edge lookups for performance
                nodeIndex: this.createNodeIndex(graphData),
                edgeIndex: this.createEdgeIndex(graphData),
                
                // Configuration
                config: {
                    iterations: 500,
                    tolerance: 0.001,
                    damping: 0.9,
                    timeStep: 0.016
                },
                
                // State tracking
                state: {
                    iteration: 0,
                    totalEnergy: Infinity,
                    converged: false
                }
            };
            
            // Compile based on layout type
            switch (parsedLayout.type) {
                case 'hierarchical-force':
                    this.compileHierarchicalForce(parsedLayout, executable, graphData);
                    break;
                case 'force-directed':
                    this.compileForceDirected(parsedLayout, executable, graphData);
                    break;
                case 'radial':
                    this.compileRadial(parsedLayout, executable, graphData);
                    break;
                case 'temporal':
                    this.compileTemporal(parsedLayout, executable, graphData);
                    break;
                default:
                    this.compileForceDirected(parsedLayout, executable, graphData);
            }
            
            // Compile constraints
            if (parsedLayout.constraints) {
                parsedLayout.constraints.forEach(constraint => {
                    const compiled = this.compileConstraint(constraint, executable);
                    if (compiled) {
                        executable.constraints.push(compiled);
                    }
                });
            }
            
            // Add main update function
            executable.update = this.createUpdateFunction(executable);
            
            logger.info(`Compiled layout with ${executable.forces.length} forces and ${executable.constraints.length} constraints`);
            
            return executable;
            
        } catch (error) {
            logger.error('Compilation failed:', error);
            throw error;
        }
    }
    
    /**
     * Compile hierarchical force layout
     * Example: Companies with employees grouped around them
     */
    compileHierarchicalForce(parsed, executable, graphData) {
        // Step 1: Create node groups based on hierarchy
        const groups = this.createHierarchicalGroups(parsed, graphData);
        
        // Step 2: Add inter-group repulsion (keep companies apart)
        if (groups.parents.length > 1) {
            executable.forces.push({
                name: 'parent-repulsion',
                type: 'repulsion',
                apply: this.generateRepulsionForce({
                    nodes: groups.parents,
                    strength: -500,
                    minDistance: 10
                })
            });
        }
        
        // Step 3: Add parent-child attraction (employees to companies)
        parsed.groups.forEach(group => {
            const parentChildPairs = this.findParentChildPairs(
                group,
                graphData,
                executable.edgeIndex
            );
            
            executable.forces.push({
                name: `${group.parent}-${group.children}-attraction`,
                type: 'spring',
                apply: this.generateSpringForce({
                    pairs: parentChildPairs,
                    strength: 0.8,
                    restLength: group.radius || 3.0
                })
            });
        });
        
        // Step 4: Add within-group organization (circular layout)
        groups.childGroups.forEach((children, parentId) => {
            executable.forces.push({
                name: `circular-layout-${parentId}`,
                type: 'circular',
                apply: this.generateCircularForce({
                    center: groups.parentMap.get(parentId),
                    nodes: children,
                    radius: 3.0
                })
            });
        });
        
        // Step 5: Add global centering force
        executable.forces.push({
            name: 'center-gravity',
            type: 'gravity',
            apply: this.generateGravityForce({
                center: { x: 0, y: 0, z: 0 },
                strength: 0.1
            })
        });
    }
    
    /**
     * Compile standard force-directed layout
     */
    compileForceDirected(parsed, executable, graphData) {
        // Global repulsion between all nodes
        executable.forces.push({
            name: 'global-repulsion',
            type: 'repulsion',
            apply: this.generateRepulsionForce({
                strength: parsed.forces?.global?.charge || -200,
                theta: 0.8 // Barnes-Hut approximation
            })
        });
        
        // Edge-based attraction
        const edgeForces = new Map();
        
        // Group edges by type for different spring strengths
        graphData.edges.forEach(edge => {
            const forceKey = `${edge.type}-spring`;
            if (!edgeForces.has(forceKey)) {
                edgeForces.set(forceKey, []);
            }
            edgeForces.get(forceKey).push(edge);
        });
        
        // Create spring force for each edge type
        edgeForces.forEach((edges, forceKey) => {
            const edgeType = forceKey.replace('-spring', '');
            const forceConfig = parsed.forces?.edges?.[edgeType] || {
                strength: 0.5,
                distance: 3.0
            };
            
            executable.forces.push({
                name: forceKey,
                type: 'spring',
                apply: this.generateSpringForce({
                    edges: edges,
                    strength: forceConfig.strength,
                    restLength: forceConfig.distance
                })
            });
        });
        
        // Center gravity
        executable.forces.push({
            name: 'center-gravity',
            type: 'gravity',
            apply: this.generateGravityForce({
                strength: parsed.forces?.global?.gravity || 0.1
            })
        });
    }
    
    /**
     * Create hierarchical groups from parsed layout
     */
    createHierarchicalGroups(parsed, graphData) {
        const groups = {
            parents: [],
            children: [],
            parentMap: new Map(),
            childGroups: new Map()
        };
        
        // Identify parent and child nodes
        graphData.nodes.forEach(node => {
            const hierarchy = parsed.hierarchy.find(h => h.type === node.type);
            if (hierarchy) {
                if (hierarchy.role === 'parent') {
                    groups.parents.push(node);
                    groups.parentMap.set(node.id, node);
                    groups.childGroups.set(node.id, []);
                } else if (hierarchy.role === 'child') {
                    groups.children.push(node);
                }
            }
        });
        
        // Group children by their parent using relationships
        if (parsed.groups[0]) {
            const groupDef = parsed.groups[0];
            graphData.edges.forEach(edge => {
                if (edge.type === groupDef.relationship) {
                    const parent = groups.parentMap.get(edge.to);
                    const child = graphData.nodes.find(n => n.id === edge.from);
                    
                    if (parent && child) {
                        groups.childGroups.get(edge.to).push(child);
                    }
                }
            });
        }
        
        return groups;
    }
    
    /**
     * Find parent-child pairs based on relationships
     */
    findParentChildPairs(groupDef, graphData, edgeIndex) {
        const pairs = [];
        
        graphData.edges.forEach(edge => {
            if (edge.type === groupDef.relationship) {
                const parent = graphData.nodes.find(n => n.id === edge.to);
                const child = graphData.nodes.find(n => n.id === edge.from);
                
                if (parent && child && 
                    parent.type === groupDef.parent && 
                    child.type === groupDef.children) {
                    pairs.push({ source: child, target: parent, edge });
                }
            }
        });
        
        return pairs;
    }
    
    /**
     * Generate spring force function
     */
    generateSpringForce(config) {
        return (nodes, state) => {
            const forces = new Map();
            
            // Initialize forces for all nodes
            nodes.forEach(node => {
                forces.set(node.id, new THREE.Vector3(0, 0, 0));
            });
            
            // Apply spring forces for pairs or edges
            const items = config.pairs || config.edges || [];
            
            items.forEach(item => {
                const source = item.source || nodes.find(n => n.id === item.from);
                const target = item.target || nodes.find(n => n.id === item.to);
                
                if (!source || !target) return;
                
                // Calculate spring force
                const delta = new THREE.Vector3().subVectors(
                    target.position,
                    source.position
                );
                const distance = delta.length();
                
                if (distance > 0) {
                    const displacement = distance - config.restLength;
                    const force = delta.normalize().multiplyScalar(
                        config.strength * displacement
                    );
                    
                    // Apply equal and opposite forces
                    forces.get(source.id).sub(force);
                    forces.get(target.id).add(force);
                }
            });
            
            return forces;
        };
    }
    
    /**
     * Generate repulsion force function
     */
    generateRepulsionForce(config) {
        return (nodes, state) => {
            const forces = new Map();
            const theta = config.theta || 0.8;
            
            // Initialize forces
            nodes.forEach(node => {
                forces.set(node.id, new THREE.Vector3(0, 0, 0));
            });
            
            // Calculate repulsion between all node pairs
            // In production, use octree for O(n log n) performance
            const nodeList = config.nodes || nodes;
            
            for (let i = 0; i < nodeList.length; i++) {
                for (let j = i + 1; j < nodeList.length; j++) {
                    const nodeA = nodeList[i];
                    const nodeB = nodeList[j];
                    
                    const delta = new THREE.Vector3().subVectors(
                        nodeA.position,
                        nodeB.position
                    );
                    const distanceSq = delta.lengthSq();
                    
                    if (distanceSq > 0 && distanceSq < 10000) { // Cutoff for performance
                        const force = delta.normalize().multiplyScalar(
                            config.strength / distanceSq
                        );
                        
                        forces.get(nodeA.id).add(force);
                        forces.get(nodeB.id).sub(force);
                    }
                }
            }
            
            return forces;
        };
    }
    
    /**
     * Generate gravity force function
     */
    generateGravityForce(config) {
        const center = new THREE.Vector3(
            config.center?.x || 0,
            config.center?.y || 0,
            config.center?.z || 0
        );
        
        return (nodes, state) => {
            const forces = new Map();
            
            nodes.forEach(node => {
                const delta = new THREE.Vector3().subVectors(
                    center,
                    node.position
                );
                const force = delta.multiplyScalar(config.strength);
                forces.set(node.id, force);
            });
            
            return forces;
        };
    }
    
    /**
     * Generate circular arrangement force
     */
    generateCircularForce(config) {
        return (nodes, state) => {
            const forces = new Map();
            const centerNode = config.center;
            const targetNodes = config.nodes;
            const radius = config.radius;
            
            // Calculate angle step
            const angleStep = (Math.PI * 2) / targetNodes.length;
            
            targetNodes.forEach((node, index) => {
                // Calculate target position on circle
                const angle = index * angleStep;
                const targetPos = new THREE.Vector3(
                    centerNode.position.x + Math.cos(angle) * radius,
                    centerNode.position.y,
                    centerNode.position.z + Math.sin(angle) * radius
                );
                
                // Force toward target position
                const delta = new THREE.Vector3().subVectors(
                    targetPos,
                    node.position
                );
                forces.set(node.id, delta.multiplyScalar(0.5));
            });
            
            return forces;
        };
    }
    
    /**
     * Generate orbit force (for technologies around users)
     */
    generateOrbitForce(config) {
        return (nodes, state) => {
            const forces = new Map();
            
            // Implementation for orbital motion
            // Similar to circular but with dynamic radius based on connections
            
            return forces;
        };
    }
    
    /**
     * Compile a constraint into executable form
     */
    compileConstraint(constraint, executable) {
        const compiler = this.constraintCompilers[constraint.type];
        if (!compiler) {
            logger.warn(`Unknown constraint type: ${constraint.type}`);
            return null;
        }
        
        return compiler(constraint, executable);
    }
    
    /**
     * Compile vertical constraint (hierarchy)
     */
    compileVerticalConstraint(constraint, executable) {
        return {
            name: `vertical-${constraint.higher}-${constraint.lower}`,
            type: 'vertical',
            apply: (nodes) => {
                const corrections = new Map();
                
                nodes.forEach(node => {
                    if (node.type === constraint.lower) {
                        // Find parent node
                        const parent = nodes.find(n => 
                            n.type === constraint.higher &&
                            this.areConnected(node, n, executable.edgeIndex)
                        );
                        
                        if (parent && parent.position.y <= node.position.y) {
                            // Push child down
                            const correction = new THREE.Vector3(
                                0,
                                parent.position.y - node.position.y - constraint.minDistance,
                                0
                            );
                            corrections.set(node.id, correction);
                        }
                    }
                });
                
                return corrections;
            }
        };
    }
    
    /**
     * Create node index for fast lookups
     */
    createNodeIndex(graphData) {
        const index = {
            byId: new Map(),
            byType: new Map()
        };
        
        graphData.nodes.forEach(node => {
            index.byId.set(node.id, node);
            
            if (!index.byType.has(node.type)) {
                index.byType.set(node.type, []);
            }
            index.byType.get(node.type).push(node);
        });
        
        return index;
    }
    
    /**
     * Create edge index for fast lookups
     */
    createEdgeIndex(graphData) {
        const index = {
            byNodes: new Map(),
            byType: new Map()
        };
        
        graphData.edges.forEach(edge => {
            // Index by node pairs
            const key = `${edge.from}-${edge.to}`;
            index.byNodes.set(key, edge);
            
            // Index by type
            if (!index.byType.has(edge.type)) {
                index.byType.set(edge.type, []);
            }
            index.byType.get(edge.type).push(edge);
        });
        
        return index;
    }
    
    /**
     * Check if two nodes are connected
     */
    areConnected(nodeA, nodeB, edgeIndex) {
        return edgeIndex.byNodes.has(`${nodeA.id}-${nodeB.id}`) ||
               edgeIndex.byNodes.has(`${nodeB.id}-${nodeA.id}`);
    }
    
    /**
     * Create the main update function for the layout
     */
    createUpdateFunction(executable) {
        return (nodes, deltaTime) => {
            // Apply all forces
            const allForces = new Map();
            
            // Initialize forces to zero
            nodes.forEach(node => {
                allForces.set(node.id, new THREE.Vector3(0, 0, 0));
            });
            
            // Accumulate forces from all force functions
            executable.forces.forEach(force => {
                const forces = force.apply(nodes, executable.state);
                forces.forEach((f, nodeId) => {
                    allForces.get(nodeId).add(f);
                });
            });
            
            // Apply constraints
            executable.constraints.forEach(constraint => {
                const corrections = constraint.apply(nodes);
                corrections.forEach((c, nodeId) => {
                    allForces.get(nodeId).add(c);
                });
            });
            
            // Update positions with damping
            let totalMovement = 0;
            nodes.forEach(node => {
                const force = allForces.get(node.id);
                if (force) {
                    // Simple Euler integration
                    const velocity = force.multiplyScalar(deltaTime);
                    node.position.add(velocity);
                    totalMovement += velocity.length();
                }
            });
            
            // Update state
            executable.state.iteration++;
            executable.state.totalEnergy = totalMovement;
            executable.state.converged = totalMovement < executable.config.tolerance;
            
            return executable.state;
        };
    }
}

/**
 * COMPILATION EXAMPLE:
 * 
 * From parsed layout:
 * {
 *   type: "hierarchical-force",
 *   groups: [{
 *     parent: "Company",
 *     children: "Person",
 *     relationship: "WorksAt"
 *   }]
 * }
 * 
 * Compiles to executable with:
 * - Repulsion force keeping companies apart
 * - Spring forces pulling employees to their company
 * - Circular arrangement of employees around company
 * - Gravity keeping everything centered
 * - Vertical constraint ensuring hierarchy
 * 
 * Each frame:
 * 1. Calculate all forces in parallel
 * 2. Sum forces for each node
 * 3. Apply constraints
 * 4. Update positions
 * 5. Check convergence
 */