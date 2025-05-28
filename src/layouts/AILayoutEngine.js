import { Logger } from '../utils/Logger.js';
import { LayoutParser } from './LayoutParser.js';
import { LayoutCompiler } from './LayoutCompiler.js';
import { LayoutExecutor } from './LayoutExecutor.js';

const logger = new Logger('AILayoutEngine');

/**
 * AI Layout Engine - Natural Language to 3D Graph Layout
 * 
 * This is the main orchestrator that translates human requests like
 * "Show me companies grouped by employees" into actual 3D positions.
 * 
 * FLOW:
 * 1. User says: "Show me companies grouped by employees"
 * 2. LLM interprets this into a layout specification
 * 3. Parser validates and structures the specification
 * 4. Compiler converts it into executable physics/constraints
 * 5. Executor runs the layout algorithm
 * 6. Nodes move to their new positions in 3D space
 * 
 * EXAMPLE FLOW:
 * Input: "Show me companies grouped by employees with technologies nearby"
 * 
 * LLM Output: {
 *   intent: "hierarchical-grouping",
 *   primary: "Company",
 *   groupBy: "employees",
 *   secondary: "Technology",
 *   spatialRelation: "nearby"
 * }
 * 
 * Parser Output: {
 *   layoutType: "hierarchical-force",
 *   hierarchy: ["Company", "Person", "Technology"],
 *   constraints: [
 *     { type: "group", parent: "Company", children: "Person", via: "WorksAt" },
 *     { type: "proximity", nodes: "Technology", nearTo: "relatedNodes", distance: 3 }
 *   ]
 * }
 * 
 * Compiler Output: {
 *   forces: [
 *     { type: "centerGravity", targets: "Company", strength: 0.1 },
 *     { type: "attract", from: "Person", to: "theirCompany", strength: 0.8 },
 *     { type: "orbit", satellites: "Technology", around: "users", radius: 3 }
 *   ]
 * }
 * 
 * Executor: Runs physics simulation until stable
 */
export class AILayoutEngine {
    constructor(llmService) {
        this.llmService = llmService;
        this.parser = new LayoutParser();
        this.compiler = new LayoutCompiler();
        this.executor = new LayoutExecutor();
        
        // Cache for layout specifications
        this.layoutCache = new Map();
        
        // Default layout templates
        this.templates = {
            'company-employee': {
                description: "Companies as centers with employees around them",
                specification: {
                    layoutType: "hierarchical-force",
                    hierarchy: ["Company", "Person"],
                    forces: {
                        "Company": {
                            repulsion: -500,
                            centerGravity: 0.1
                        },
                        "Person": {
                            repulsion: -100,
                            attractToParent: {
                                via: "WorksAt",
                                strength: 0.8,
                                restLength: 2.0
                            }
                        }
                    }
                }
            },
            'project-centered': {
                description: "Projects in center with contributors around",
                specification: {
                    layoutType: "radial-grouping",
                    center: "Project",
                    rings: [
                        { type: "Person", relation: "WorksOn", distance: 2 },
                        { type: "Technology", relation: "Uses", distance: 4 }
                    ]
                }
            },
            'timeline': {
                description: "Nodes arranged by time along Z-axis",
                specification: {
                    layoutType: "temporal",
                    timeAxis: "z",
                    timeProperty: "createdAt",
                    groupByAxis: {
                        x: "type",
                        y: "importance"
                    }
                }
            }
        };
        
        logger.info('AILayoutEngine initialized');
    }
    
    /**
     * Main entry point - converts natural language to layout
     * @param {string} prompt - User's natural language request
     * @param {Object} graphData - Current graph structure
     * @returns {Promise<Object>} - Layout specification ready for execution
     */
    async generateLayout(prompt, graphData) {
        logger.info(`Generating layout for prompt: "${prompt}"`);
        
        try {
            // Step 1: Analyze graph structure
            const graphContext = this.analyzeGraph(graphData);
            
            // Step 2: Send to LLM for interpretation
            const llmSpec = await this.interpretPrompt(prompt, graphContext);
            
            // Step 3: Parse LLM output into structured format
            const parsedSpec = this.parser.parse(llmSpec, graphContext);
            
            // Step 4: Compile into executable layout
            const compiledLayout = this.compiler.compile(parsedSpec, graphData);
            
            // Step 5: Return executable layout
            return compiledLayout;
            
        } catch (error) {
            logger.error('Failed to generate layout:', error);
            throw error;
        }
    }
    
    /**
     * Analyze the graph to understand its structure
     * This context helps the LLM make better decisions
     */
    analyzeGraph(graphData) {
        const analysis = {
            nodeTypes: new Set(),
            relationshipTypes: new Set(),
            nodeCount: graphData.nodes.length,
            edgeCount: graphData.edges.length,
            properties: new Set(),
            statistics: {}
        };
        
        // Analyze nodes
        graphData.nodes.forEach(node => {
            analysis.nodeTypes.add(node.type);
            Object.keys(node.properties || {}).forEach(prop => {
                analysis.properties.add(`${node.type}.${prop}`);
            });
        });
        
        // Analyze edges
        graphData.edges.forEach(edge => {
            analysis.relationshipTypes.add(edge.type);
        });
        
        // Calculate statistics
        analysis.statistics = {
            avgDegree: (graphData.edges.length * 2) / graphData.nodes.length,
            nodeTypeDistribution: this.getTypeDistribution(graphData.nodes),
            relationshipDistribution: this.getTypeDistribution(graphData.edges)
        };
        
        return analysis;
    }
    
    /**
     * Send prompt to LLM for interpretation
     */
    async interpretPrompt(prompt, graphContext) {
        const systemPrompt = `You are a graph layout expert. Convert natural language requests into graph layout specifications.

Available node types: ${Array.from(graphContext.nodeTypes).join(', ')}
Available relationships: ${Array.from(graphContext.relationshipTypes).join(', ')}
Graph size: ${graphContext.nodeCount} nodes, ${graphContext.edgeCount} edges

Output a JSON specification that describes:
1. The primary layout strategy (hierarchical, force, radial, etc.)
2. Which nodes are most important
3. How nodes should be grouped
4. Spatial relationships and constraints
5. Any special visual emphasis

Example input: "Show me companies grouped by their employees"
Example output: {
  "strategy": "hierarchical-grouping",
  "primary": {
    "nodeType": "Company",
    "role": "group-center",
    "spatialPriority": "high"
  },
  "secondary": {
    "nodeType": "Person",
    "role": "group-member",
    "groupBy": "WorksAt relationship to Company"
  },
  "layout": {
    "type": "force-directed",
    "modifications": {
      "Company-Company": { "repulsion": "strong" },
      "Person-Company": { "attraction": "strong via WorksAt" },
      "Person-Person": { "repulsion": "medium within same company" }
    }
  },
  "visual": {
    "emphasis": "Company nodes larger",
    "spacing": "Companies well separated, employees clustered"
  }
}`;

        const response = await this.llmService.complete({
            systemPrompt,
            userPrompt: prompt,
            temperature: 0.3, // Low temperature for consistent layouts
            responseFormat: 'json'
        });
        
        return JSON.parse(response);
    }
    
    /**
     * Get distribution of types in the data
     */
    getTypeDistribution(items) {
        const distribution = {};
        items.forEach(item => {
            const type = item.type || 'unknown';
            distribution[type] = (distribution[type] || 0) + 1;
        });
        return distribution;
    }
    
    /**
     * Execute a compiled layout on the graph
     * @param {Object} compiledLayout - The compiled layout specification
     * @param {Object} graphData - The graph data to layout
     * @returns {Promise<Object>} - Updated node positions
     */
    async executeLayout(compiledLayout, graphData) {
        logger.info('Executing layout...');
        
        // Create a copy of nodes with current positions
        const nodes = graphData.nodes.map(node => ({
            ...node,
            position: node.position || { x: 0, y: 0, z: 0 }
        }));
        
        // Execute the layout
        const result = await this.executor.execute(compiledLayout, {
            nodes,
            edges: graphData.edges
        });
        
        logger.info(`Layout complete. Moved ${result.movedNodes} nodes`);
        
        return result;
    }
    
    /**
     * Get available layout templates
     */
    getTemplates() {
        return Object.entries(this.templates).map(([key, value]) => ({
            key,
            description: value.description,
            example: this.getTemplateExample(key)
        }));
    }
    
    /**
     * Get example prompt for a template
     */
    getTemplateExample(templateKey) {
        const examples = {
            'company-employee': "Show me companies with their employees grouped around them",
            'project-centered': "Organize by projects with contributors nearby",
            'timeline': "Arrange everything by when it was created"
        };
        return examples[templateKey] || "Use this layout";
    }
}

/**
 * DETAILED EXAMPLE WALKTHROUGH:
 * 
 * User says: "Show me companies grouped by employees with technologies they use"
 * 
 * 1. ANALYSIS PHASE:
 *    - Found node types: [Company, Person, Technology]
 *    - Found relationships: [WorksAt, Uses]
 *    - Graph has 100 nodes, 150 edges
 * 
 * 2. LLM INTERPRETATION:
 *    {
 *      "strategy": "hierarchical-grouping",
 *      "primary": {
 *        "nodeType": "Company",
 *        "role": "group-center",
 *        "spatialPriority": "high"
 *      },
 *      "secondary": {
 *        "nodeType": "Person",
 *        "role": "group-member",
 *        "groupBy": "WorksAt"
 *      },
 *      "tertiary": {
 *        "nodeType": "Technology",
 *        "role": "satellite",
 *        "nearTo": "users"
 *      }
 *    }
 * 
 * 3. PARSING PHASE:
 *    - Validates node types exist
 *    - Checks relationships are valid
 *    - Structures into executable format
 * 
 * 4. COMPILATION PHASE:
 *    - Company nodes get strong repulsion (-500 charge)
 *    - Person nodes attract to their company (0.8 spring strength)
 *    - Technology nodes orbit around users (3 unit radius)
 * 
 * 5. EXECUTION PHASE:
 *    - Run physics simulation for 500 iterations
 *    - Companies spread out in space
 *    - Employees cluster around their company
 *    - Technologies position near their users
 */