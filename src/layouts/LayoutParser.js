import { Logger } from '../utils/Logger.js';

const logger = new Logger('LayoutParser');

/**
 * Layout Parser - Validates and structures LLM output
 * 
 * Takes the raw LLM interpretation and converts it into a structured
 * layout specification that can be compiled into physics forces.
 * 
 * RESPONSIBILITIES:
 * 1. Validate that requested node types exist
 * 2. Verify relationships are real
 * 3. Structure the layout hierarchy
 * 4. Define spatial constraints
 * 5. Handle errors and provide defaults
 */
export class LayoutParser {
    constructor() {
        // Supported layout strategies
        this.strategies = {
            'hierarchical-grouping': this.parseHierarchicalGrouping.bind(this),
            'force-directed': this.parseForceDirected.bind(this),
            'radial': this.parseRadial.bind(this),
            'temporal': this.parseTemporal.bind(this),
            'semantic': this.parseSemantic.bind(this)
        };
        
        // Default force values for different relationships
        this.defaultForces = {
            parentChild: { strength: 0.8, distance: 2.0 },
            peer: { strength: 0.3, distance: 3.0 },
            weak: { strength: 0.1, distance: 5.0 }
        };
    }
    
    /**
     * Parse LLM output into structured layout specification
     * @param {Object} llmSpec - Raw LLM interpretation
     * @param {Object} graphContext - Graph analysis data
     * @returns {Object} Structured layout specification
     */
    parse(llmSpec, graphContext) {
        logger.info('Parsing layout specification:', llmSpec.strategy);
        
        try {
            // Validate basic structure
            this.validateSpec(llmSpec, graphContext);
            
            // Get the appropriate parser for the strategy
            const strategyParser = this.strategies[llmSpec.strategy];
            if (!strategyParser) {
                logger.warn(`Unknown strategy: ${llmSpec.strategy}, falling back to force-directed`);
                return this.parseForceDirected(llmSpec, graphContext);
            }
            
            // Parse using the strategy-specific parser
            const parsed = strategyParser(llmSpec, graphContext);
            
            // Add common elements
            parsed.metadata = {
                originalPrompt: llmSpec.originalPrompt,
                strategy: llmSpec.strategy,
                timestamp: Date.now()
            };
            
            logger.info('Parsing complete:', parsed);
            return parsed;
            
        } catch (error) {
            logger.error('Parsing failed:', error);
            // Return a safe default layout
            return this.getDefaultLayout(graphContext);
        }
    }
    
    /**
     * Validate that the LLM spec makes sense for this graph
     */
    validateSpec(spec, context) {
        // Check primary node type exists
        if (spec.primary && spec.primary.nodeType) {
            if (!context.nodeTypes.has(spec.primary.nodeType)) {
                throw new Error(`Node type '${spec.primary.nodeType}' not found in graph`);
            }
        }
        
        // Check secondary node type
        if (spec.secondary && spec.secondary.nodeType) {
            if (!context.nodeTypes.has(spec.secondary.nodeType)) {
                throw new Error(`Node type '${spec.secondary.nodeType}' not found in graph`);
            }
        }
        
        // Validate relationships mentioned
        if (spec.layout && spec.layout.modifications) {
            Object.keys(spec.layout.modifications).forEach(key => {
                if (key.includes(' via ')) {
                    const relationship = key.split(' via ')[1];
                    if (!context.relationshipTypes.has(relationship)) {
                        logger.warn(`Relationship '${relationship}' not found, will ignore`);
                    }
                }
            });
        }
    }
    
    /**
     * Parse hierarchical grouping layout
     * Example: "Show companies grouped by employees"
     */
    parseHierarchicalGrouping(spec, context) {
        const layout = {
            type: 'hierarchical-force',
            hierarchy: [],
            groups: [],
            forces: {},
            constraints: []
        };
        
        // Build hierarchy from primary -> secondary -> tertiary
        if (spec.primary) {
            layout.hierarchy.push({
                type: spec.primary.nodeType,
                level: 0,
                role: 'parent'
            });
        }
        
        if (spec.secondary) {
            layout.hierarchy.push({
                type: spec.secondary.nodeType,
                level: 1,
                role: 'child',
                groupBy: spec.secondary.groupBy
            });
        }
        
        if (spec.tertiary) {
            layout.hierarchy.push({
                type: spec.tertiary.nodeType,
                level: 2,
                role: spec.tertiary.role || 'related'
            });
        }
        
        // Define grouping rules
        if (spec.secondary && spec.secondary.groupBy) {
            layout.groups.push({
                parent: spec.primary.nodeType,
                children: spec.secondary.nodeType,
                relationship: this.extractRelationship(spec.secondary.groupBy),
                layout: 'circular', // How children arrange around parent
                radius: 3.0
            });
        }
        
        // Convert layout modifications to forces
        if (spec.layout && spec.layout.modifications) {
            layout.forces = this.parseForceModifications(spec.layout.modifications);
        }
        
        // Add spatial constraints
        layout.constraints = this.parseConstraints(spec);
        
        return layout;
    }
    
    /**
     * Parse force-directed layout
     */
    parseForceDirected(spec, context) {
        const layout = {
            type: 'force-directed',
            forces: {
                global: {
                    charge: -100,
                    gravity: 0.1,
                    damping: 0.9
                },
                nodes: {},
                edges: {}
            }
        };
        
        // Apply node-specific forces
        if (spec.primary) {
            layout.forces.nodes[spec.primary.nodeType] = {
                charge: spec.primary.spatialPriority === 'high' ? -500 : -200,
                mass: 2.0
            };
        }
        
        // Parse edge forces from modifications
        if (spec.layout && spec.layout.modifications) {
            Object.entries(spec.layout.modifications).forEach(([key, value]) => {
                const force = this.parseForceValue(value);
                if (key.includes('-')) {
                    // Node-to-node force
                    layout.forces.edges[key] = force;
                }
            });
        }
        
        return layout;
    }
    
    /**
     * Parse radial layout
     */
    parseRadial(spec, context) {
        return {
            type: 'radial',
            center: spec.primary?.nodeType || 'auto',
            rings: this.parseRings(spec),
            forces: {
                radial: 0.8,
                tangential: 0.3
            }
        };
    }
    
    /**
     * Parse temporal layout
     */
    parseTemporal(spec, context) {
        return {
            type: 'temporal',
            timeAxis: spec.layout?.timeAxis || 'z',
            timeProperty: this.findTimeProperty(context),
            grouping: {
                x: spec.layout?.groupByAxis?.x || 'type',
                y: spec.layout?.groupByAxis?.y || 'hierarchy'
            }
        };
    }
    
    /**
     * Parse semantic similarity layout
     */
    parseSemantic(spec, context) {
        return {
            type: 'semantic',
            attributes: this.parseSemanticAttributes(spec, context),
            algorithm: 'umap', // or 'tsne'
            dimensions: 3
        };
    }
    
    /**
     * Extract relationship name from LLM description
     * "WorksAt relationship to Company" -> "WorksAt"
     */
    extractRelationship(description) {
        const patterns = [
            /(\w+) relationship/i,
            /via (\w+)/i,
            /through (\w+)/i,
            /^(\w+)$/i
        ];
        
        for (const pattern of patterns) {
            const match = description.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return description; // Fallback to original
    }
    
    /**
     * Parse force modifications from LLM
     * "strong attraction" -> { strength: 0.8, distance: 2.0 }
     */
    parseForceModifications(modifications) {
        const forces = {};
        
        Object.entries(modifications).forEach(([key, value]) => {
            forces[key] = this.parseForceValue(value);
        });
        
        return forces;
    }
    
    /**
     * Convert force descriptions to numeric values
     */
    parseForceValue(description) {
        const force = {
            strength: 0.5,
            distance: 3.0,
            type: 'spring'
        };
        
        // Parse strength
        if (description.includes('strong')) {
            force.strength = 0.8;
            force.distance = 2.0;
        } else if (description.includes('medium')) {
            force.strength = 0.5;
            force.distance = 3.0;
        } else if (description.includes('weak')) {
            force.strength = 0.2;
            force.distance = 5.0;
        }
        
        // Parse type
        if (description.includes('repulsion')) {
            force.type = 'repulsion';
            force.strength = -Math.abs(force.strength) * 500; // Convert to charge
        } else if (description.includes('attraction')) {
            force.type = 'attraction';
        }
        
        return force;
    }
    
    /**
     * Parse spatial constraints from spec
     */
    parseConstraints(spec) {
        const constraints = [];
        
        // Vertical hierarchy constraint
        if (spec.primary && spec.secondary) {
            constraints.push({
                type: 'vertical',
                higher: spec.primary.nodeType,
                lower: spec.secondary.nodeType,
                minDistance: 2.0
            });
        }
        
        // Proximity constraints
        if (spec.tertiary && spec.tertiary.nearTo) {
            constraints.push({
                type: 'proximity',
                nodes: spec.tertiary.nodeType,
                nearTo: spec.tertiary.nearTo,
                maxDistance: 5.0
            });
        }
        
        // Separation constraints
        if (spec.visual && spec.visual.spacing) {
            if (spec.visual.spacing.includes('well separated')) {
                constraints.push({
                    type: 'separation',
                    nodeType: spec.primary?.nodeType,
                    minDistance: 10.0
                });
            }
        }
        
        return constraints;
    }
    
    /**
     * Parse ring structure for radial layout
     */
    parseRings(spec) {
        const rings = [];
        
        if (spec.primary) {
            rings.push({
                nodeType: spec.primary.nodeType,
                radius: 0, // Center
                angle: 'fixed'
            });
        }
        
        if (spec.secondary) {
            rings.push({
                nodeType: spec.secondary.nodeType,
                radius: 3,
                angle: 'distribute'
            });
        }
        
        if (spec.tertiary) {
            rings.push({
                nodeType: spec.tertiary.nodeType,
                radius: 6,
                angle: 'distribute'
            });
        }
        
        return rings;
    }
    
    /**
     * Find time-related property in the graph
     */
    findTimeProperty(context) {
        const timeProperties = [
            'createdAt', 'created', 'date', 'timestamp',
            'joinedAt', 'since', 'startDate', 'founded'
        ];
        
        for (const prop of context.properties) {
            const propName = prop.split('.')[1];
            if (timeProperties.includes(propName)) {
                return propName;
            }
        }
        
        return 'createdAt'; // Default
    }
    
    /**
     * Parse attributes for semantic similarity
     */
    parseSemanticAttributes(spec, context) {
        // Extract mentioned attributes or use all available
        const attributes = [];
        
        if (spec.layout && spec.layout.attributes) {
            attributes.push(...spec.layout.attributes);
        } else {
            // Use all properties as features
            context.properties.forEach(prop => {
                attributes.push(prop);
            });
        }
        
        return attributes;
    }
    
    /**
     * Get a safe default layout when parsing fails
     */
    getDefaultLayout(context) {
        logger.info('Using default force-directed layout');
        
        return {
            type: 'force-directed',
            forces: {
                global: {
                    charge: -200,
                    gravity: 0.1,
                    damping: 0.9
                },
                nodes: {},
                edges: {
                    default: {
                        strength: 0.5,
                        distance: 3.0
                    }
                }
            },
            metadata: {
                strategy: 'default',
                reason: 'parsing-failed'
            }
        };
    }
}

/**
 * EXAMPLE PARSING FLOW:
 * 
 * Input from LLM:
 * {
 *   "strategy": "hierarchical-grouping",
 *   "primary": { "nodeType": "Company", "role": "group-center" },
 *   "secondary": { "nodeType": "Person", "groupBy": "WorksAt" },
 *   "layout": {
 *     "modifications": {
 *       "Company-Company": { "repulsion": "strong" },
 *       "Person-Company": { "attraction": "strong via WorksAt" }
 *     }
 *   }
 * }
 * 
 * Parser Output:
 * {
 *   "type": "hierarchical-force",
 *   "hierarchy": [
 *     { "type": "Company", "level": 0, "role": "parent" },
 *     { "type": "Person", "level": 1, "role": "child", "groupBy": "WorksAt" }
 *   ],
 *   "groups": [{
 *     "parent": "Company",
 *     "children": "Person",
 *     "relationship": "WorksAt",
 *     "layout": "circular",
 *     "radius": 3.0
 *   }],
 *   "forces": {
 *     "Company-Company": { "type": "repulsion", "strength": -400 },
 *     "Person-Company": { "type": "attraction", "strength": 0.8, "distance": 2.0 }
 *   },
 *   "constraints": [
 *     { "type": "vertical", "higher": "Company", "lower": "Person", "minDistance": 2.0 }
 *   ]
 * }
 */