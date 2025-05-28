import * as THREE from 'three';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('RelationshipLayoutProcessor');

export class RelationshipLayoutProcessor {
    constructor() {
        this.schema = null;
        this.nodes = new Map(); // nodeId -> node data
        this.edges = []; // array of edge data
        this.nodePositions = new Map(); // nodeId -> THREE.Vector3
    }

    /**
     * Set the current graph schema
     */
    setSchema(schema) {
        this.schema = schema;
        logger.info('Schema set:', schema);
    }

    /**
     * Set the current graph data
     */
    setGraphData(nodes, edges) {
        // Clear previous data to prevent memory leaks
        this.nodes.clear();
        this.nodePositions.clear();
        
        // Validate and add nodes
        nodes.forEach(node => {
            if (!node || !node.id) {
                logger.warn('Skipping invalid node:', node);
                return;
            }
            
            this.nodes.set(node.id, node);
            // Initialize with current position if available
            if (node.mesh && node.mesh.position) {
                this.nodePositions.set(node.id, node.mesh.position.clone());
            } else {
                this.nodePositions.set(node.id, new THREE.Vector3());
            }
        });
        
        // Validate edges
        this.edges = edges.filter(edge => {
            if (!edge || !edge.source || !edge.target) {
                logger.warn('Skipping invalid edge:', edge);
                return false;
            }
            return true;
        });
        
        logger.info(`Graph data set: ${this.nodes.size} nodes, ${this.edges.length} edges`);
    }

    /**
     * Process a natural language layout command
     */
    async processCommand(command) {
        const commandLower = command.toLowerCase();
        
        // Detect grouping intent
        if (this.isGroupingCommand(commandLower)) {
            return this.processGroupingCommand(commandLower);
        }
        
        // Detect hierarchical layout
        if (this.isHierarchicalCommand(commandLower)) {
            return this.processHierarchicalCommand(commandLower);
        }
        
        // Detect circular/radial layout
        if (this.isCircularCommand(commandLower)) {
            return this.processCircularCommand(commandLower);
        }
        
        // Default to force-directed with specific parameters
        return this.processForceDirectedCommand(commandLower);
    }

    /**
     * Check if command is asking for grouping
     */
    isGroupingCommand(command) {
        const groupingKeywords = ['group', 'cluster', 'around', 'near', 'by their', 'by the'];
        return groupingKeywords.some(keyword => command.includes(keyword));
    }

    /**
     * Check if command is asking for hierarchy
     */
    isHierarchicalCommand(command) {
        const hierarchyKeywords = ['hierarchy', 'tree', 'parent', 'child', 'above', 'below'];
        return hierarchyKeywords.some(keyword => command.includes(keyword));
    }

    /**
     * Check if command is asking for circular layout
     */
    isCircularCommand(command) {
        const circularKeywords = ['circle', 'circular', 'radial', 'around the center'];
        return circularKeywords.some(keyword => command.includes(keyword));
    }

    /**
     * Process grouping commands like "group employees around companies"
     */
    processGroupingCommand(command) {
        logger.info('Processing grouping command:', command);
        
        // Extract potential node types and relationships from command
        const { sourceType, targetType, relationship } = this.extractGroupingIntent(command);
        
        if (!sourceType || !targetType) {
            // Fallback: group by node type
            return this.groupByNodeType();
        }
        
        // Find nodes of each type
        const sourceNodes = this.findNodesByType(sourceType);
        const targetNodes = this.findNodesByType(targetType);
        
        if (sourceNodes.length === 0 || targetNodes.length === 0) {
            logger.warn(`No nodes found for types: ${sourceType} or ${targetType}`);
            return this.groupByNodeType();
        }
        
        // Group source nodes around their connected target nodes
        return this.groupNodesAroundTargets(sourceNodes, targetNodes, relationship);
    }

    /**
     * Extract grouping intent from natural language
     */
    extractGroupingIntent(command) {
        // This is a simplified version - could be enhanced with NLP
        const commandLower = command.toLowerCase();
        
        // Look for patterns like "group X around Y" or "cluster X by Y"
        let sourceType = null;
        let targetType = null;
        let relationship = null;
        
        // Common variations of node types
        const typeVariations = {
            'person': ['people', 'person', 'employee', 'employees', 'user', 'users', 'member', 'members'],
            'company': ['companies', 'company', 'organization', 'organizations', 'firm', 'firms'],
            'project': ['projects', 'project'],
            'technology': ['technologies', 'technology', 'tech'],
            'department': ['departments', 'department', 'dept', 'depts']
        };
        
        // Find node types mentioned in the command
        if (this.schema && this.schema.nodeTypes) {
            // First pass: look for exact variations
            for (const nodeType of this.schema.nodeTypes) {
                const typeLower = nodeType.toLowerCase();
                const variations = typeVariations[typeLower] || [typeLower, typeLower + 's'];
                
                for (const variation of variations) {
                    if (commandLower.includes(variation)) {
                        // Determine if this is source or target based on position and keywords
                        const varIndex = commandLower.indexOf(variation);
                        const beforeText = commandLower.substring(0, varIndex);
                        
                        // Check if this appears after "around", "to", "by", "at", "with", etc.
                        if (beforeText.includes('around') || beforeText.includes(' to ') || 
                            beforeText.includes(' at ') || beforeText.includes(' by ') ||
                            beforeText.includes(' with ')) {
                            targetType = targetType || nodeType;
                        } else {
                            sourceType = sourceType || nodeType;
                        }
                        break;
                    }
                }
            }
        }
        
        // Look for relationship types
        if (this.schema && this.schema.relationshipTypes) {
            for (const relType of this.schema.relationshipTypes) {
                if (command.includes(relType.toLowerCase())) {
                    relationship = relType;
                    break;
                }
            }
        }
        
        logger.info(`Extracted intent: ${sourceType} -> ${targetType} via ${relationship}`);
        return { sourceType, targetType, relationship };
    }

    /**
     * Find nodes by type (case-insensitive)
     */
    findNodesByType(type) {
        const nodes = [];
        const typeLower = type.toLowerCase();
        
        this.nodes.forEach(node => {
            const nodeType = (node.type || node.label || '').toLowerCase();
            if (nodeType === typeLower) {
                nodes.push(node);
            }
        });
        
        return nodes;
    }

    /**
     * Group source nodes around their connected target nodes
     */
    groupNodesAroundTargets(sourceNodes, targetNodes, relationshipType = null) {
        const positions = new Map();
        const targetPositions = new Map();
        
        // First, arrange target nodes in a grid or circle
        const targetCount = targetNodes.length;
        if (targetCount === 0) {
            logger.warn('No target nodes to arrange');
            return positions;
        }
        
        const targetRadius = Math.max(10, targetCount * 2);
        
        targetNodes.forEach((target, index) => {
            const angle = (index / targetCount) * Math.PI * 2;
            const x = Math.cos(angle) * targetRadius;
            const z = Math.sin(angle) * targetRadius;
            const position = new THREE.Vector3(x, 0, z);
            
            positions.set(target.id, position);
            targetPositions.set(target.id, position);
        });
        
        // Group source nodes around their connected targets
        const connectedSources = new Map(); // targetId -> array of connected source nodes
        
        // Build connection map
        sourceNodes.forEach(source => {
            const connectedTargets = this.findConnectedNodes(source.id, targetNodes, relationshipType);
            
            if (connectedTargets.length > 0) {
                // Place near the first connected target
                const target = connectedTargets[0];
                if (!connectedSources.has(target.id)) {
                    connectedSources.set(target.id, []);
                }
                connectedSources.get(target.id).push(source);
            } else {
                // No connection found, place in center
                positions.set(source.id, new THREE.Vector3(0, 0, 0));
            }
        });
        
        // Arrange connected sources around their targets
        connectedSources.forEach((sources, targetId) => {
            const targetPos = targetPositions.get(targetId);
            if (!targetPos) {
                logger.warn(`Target position not found for ${targetId}`);
                return;
            }
            
            const sourceCount = sources.length;
            if (sourceCount === 0) return;
            
            const sourceRadius = Math.min(5, Math.max(2, sourceCount * 0.5));
            
            sources.forEach((source, index) => {
                const angle = (index / sourceCount) * Math.PI * 2;
                const x = targetPos.x + Math.cos(angle) * sourceRadius;
                const z = targetPos.z + Math.sin(angle) * sourceRadius;
                const y = targetPos.y + (Math.random() - 0.5) * 2; // Slight vertical variation
                
                positions.set(source.id, new THREE.Vector3(x, y, z));
            });
        });
        
        // Position any remaining nodes that weren't source or target
        this.nodes.forEach((node, nodeId) => {
            if (!positions.has(nodeId)) {
                // Place unrelated nodes in a separate area
                const unrelatedAngle = Math.random() * Math.PI * 2;
                const unrelatedRadius = targetRadius * 1.5;
                positions.set(nodeId, new THREE.Vector3(
                    Math.cos(unrelatedAngle) * unrelatedRadius,
                    0,
                    Math.sin(unrelatedAngle) * unrelatedRadius
                ));
            }
        });
        
        return positions;
    }

    /**
     * Find nodes connected to a given node
     */
    findConnectedNodes(nodeId, candidateNodes, relationshipType = null) {
        const connected = new Map(); // Use Map to avoid duplicates
        const candidateIds = new Set(candidateNodes.map(n => n.id));
        
        this.edges.forEach(edge => {
            // Skip self-referencing edges
            if (edge.source === edge.target) {
                return;
            }
            
            // Check if this edge connects our node to a candidate
            let connectedId = null;
            
            if (edge.source === nodeId && candidateIds.has(edge.target)) {
                connectedId = edge.target;
            } else if (edge.target === nodeId && candidateIds.has(edge.source)) {
                connectedId = edge.source;
            }
            
            // Check relationship type if specified
            if (connectedId && (!relationshipType || edge.type === relationshipType)) {
                const connectedNode = candidateNodes.find(n => n.id === connectedId);
                if (connectedNode && connectedId !== nodeId) { // Avoid self-connections
                    connected.set(connectedId, connectedNode);
                }
            }
        });
        
        return Array.from(connected.values());
    }

    /**
     * Group nodes by their type
     */
    groupByNodeType() {
        logger.info('Grouping nodes by type');
        
        const positions = new Map();
        const typeGroups = new Map();
        
        // Group nodes by type
        this.nodes.forEach(node => {
            const type = node.type || node.label || 'Unknown';
            if (!typeGroups.has(type)) {
                typeGroups.set(type, []);
            }
            typeGroups.get(type).push(node);
        });
        
        // Arrange each type group in a cluster
        const groupCount = typeGroups.size;
        let groupIndex = 0;
        const groupRadius = Math.max(15, groupCount * 5);
        
        typeGroups.forEach((nodes, type) => {
            const groupAngle = (groupIndex / groupCount) * Math.PI * 2;
            const groupCenterX = Math.cos(groupAngle) * groupRadius;
            const groupCenterZ = Math.sin(groupAngle) * groupRadius;
            
            // Arrange nodes within the group
            const nodeCount = nodes.length;
            const nodeRadius = Math.min(8, Math.max(3, nodeCount * 0.3));
            
            nodes.forEach((node, index) => {
                const nodeAngle = (index / nodeCount) * Math.PI * 2;
                const x = groupCenterX + Math.cos(nodeAngle) * nodeRadius;
                const z = groupCenterZ + Math.sin(nodeAngle) * nodeRadius;
                const y = 0; // Use fixed Y for stable layouts
                
                positions.set(node.id, new THREE.Vector3(x, y, z));
            });
            
            groupIndex++;
        });
        
        return positions;
    }

    /**
     * Process hierarchical layout commands
     */
    processHierarchicalCommand(command) {
        logger.info('Processing hierarchical command:', command);
        // For now, use a simple tree layout
        return this.createTreeLayout();
    }

    /**
     * Process circular layout commands
     */
    processCircularCommand(command) {
        logger.info('Processing circular command:', command);
        return this.createCircularLayout();
    }

    /**
     * Process force-directed layout with specific parameters
     */
    processForceDirectedCommand(command) {
        logger.info('Processing force-directed command:', command);
        
        // Adjust parameters based on command
        const params = {
            separation: command.includes('tight') ? 2 : command.includes('spread') ? 8 : 5,
            strength: command.includes('strong') ? 0.8 : 0.5
        };
        
        return this.createForceDirectedLayout(params);
    }

    /**
     * Create a simple tree layout
     */
    createTreeLayout() {
        const positions = new Map();
        const levels = this.calculateNodeLevels();
        
        // Handle empty graph
        if (levels.size === 0) {
            return positions;
        }
        
        const maxLevel = Math.max(...levels.values());
        
        // Group nodes by level
        const levelGroups = new Map();
        levels.forEach((level, nodeId) => {
            if (!levelGroups.has(level)) {
                levelGroups.set(level, []);
            }
            levelGroups.get(level).push(nodeId);
        });
        
        // Position nodes by level
        levelGroups.forEach((nodeIds, level) => {
            const y = (maxLevel - level) * 5;
            const count = nodeIds.length;
            if (count === 0) return;
            
            const spacing = 4;
            
            nodeIds.forEach((nodeId, index) => {
                const x = (index - count / 2) * spacing;
                positions.set(nodeId, new THREE.Vector3(x, y, 0));
            });
        });
        
        return positions;
    }

    /**
     * Calculate node levels for tree layout
     */
    calculateNodeLevels() {
        const levels = new Map();
        const visited = new Set();
        
        // Find root nodes (no incoming edges)
        const roots = [];
        const hasIncoming = new Set();
        
        this.edges.forEach(edge => {
            // Skip self-references
            if (edge.source !== edge.target) {
                hasIncoming.add(edge.target);
            }
        });
        
        this.nodes.forEach((node, nodeId) => {
            if (!hasIncoming.has(nodeId)) {
                roots.push(nodeId);
                levels.set(nodeId, 0);
            }
        });
        
        // BFS to assign levels
        const queue = [...roots];
        const maxIterations = this.nodes.size * 2; // Prevent infinite loops
        let iterations = 0;
        
        while (queue.length > 0 && iterations < maxIterations) {
            iterations++;
            const nodeId = queue.shift();
            const currentLevel = levels.get(nodeId) || 0;
            
            this.edges.forEach(edge => {
                if (edge.source === nodeId && !levels.has(edge.target)) {
                    levels.set(edge.target, currentLevel + 1);
                    queue.push(edge.target);
                }
            });
        }
        
        // Assign default level to unvisited nodes
        this.nodes.forEach((node, nodeId) => {
            if (!levels.has(nodeId)) {
                levels.set(nodeId, 0);
            }
        });
        
        return levels;
    }

    /**
     * Create a circular layout
     */
    createCircularLayout() {
        const positions = new Map();
        const nodeArray = Array.from(this.nodes.values());
        const count = nodeArray.length;
        
        if (count === 0) {
            return positions;
        }
        
        const radius = Math.max(10, count * 1.5);
        
        nodeArray.forEach((node, index) => {
            const angle = (index / count) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            positions.set(node.id, new THREE.Vector3(x, 0, z));
        });
        
        return positions;
    }

    /**
     * Create a force-directed layout
     */
    createForceDirectedLayout(params) {
        // This is a placeholder - in practice, you'd run a force simulation
        // For now, just spread nodes with some randomness
        const positions = new Map();
        const nodeArray = Array.from(this.nodes.values());
        
        if (nodeArray.length === 0) {
            return positions;
        }
        
        const gridSize = Math.ceil(Math.sqrt(nodeArray.length)) || 1;
        
        nodeArray.forEach((node, index) => {
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;
            const x = (col - gridSize / 2) * params.separation;
            const z = (row - gridSize / 2) * params.separation;
            const y = (Math.random() - 0.5) * 2;
            
            positions.set(node.id, new THREE.Vector3(x, y, z));
        });
        
        return positions;
    }
}