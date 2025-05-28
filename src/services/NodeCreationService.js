import { Logger } from '../utils/Logger.js';

const logger = new Logger('NodeCreationService');

/**
 * Service for creating and editing nodes in the graph database
 */
export class NodeCreationService {
    constructor(dataService) {
        this.dataService = dataService;
        this.isEditMode = false; // Start in read-only mode for safety
        this.schema = null;
    }

    /**
     * Set edit mode (with confirmation)
     */
    async setEditMode(enabled, confirmCallback = null) {
        if (enabled && !this.isEditMode) {
            // Switching to edit mode requires confirmation
            if (confirmCallback) {
                const confirmed = await confirmCallback(
                    'Enable Edit Mode?',
                    'You will be able to create, edit, and delete nodes. This can modify your database.'
                );
                if (!confirmed) return false;
            }
        }
        
        this.isEditMode = enabled;
        logger.info(`Edit mode ${enabled ? 'enabled' : 'disabled'}`);
        return true;
    }

    /**
     * Get current edit mode status
     */
    isInEditMode() {
        return this.isEditMode;
    }

    /**
     * Fetch and cache the database schema
     */
    async fetchSchema() {
        try {
            const response = await fetch('/api/schema');
            if (response.ok) {
                this.schema = await response.json();
                logger.info('Schema loaded:', this.schema);
                return this.schema;
            }
        } catch (error) {
            logger.error('Failed to fetch schema:', error);
        }
        return null;
    }

    /**
     * Get available node types from schema
     */
    getNodeTypes() {
        if (!this.schema) {
            logger.warn('Schema not loaded');
            return [];
        }
        return this.schema.nodeTypes || [];
    }

    /**
     * Create a new node with voice input support
     * @param {string} type - Node type (e.g., 'Person', 'Company')
     * @param {Object} properties - Node properties
     * @param {THREE.Vector3} position - Position in 3D space
     */
    async createNode(type, properties = {}, position = null) {
        if (!this.isEditMode) {
            throw new Error('Cannot create nodes in read-only mode');
        }

        // Validate node type against schema
        const validTypes = this.getNodeTypes();
        if (validTypes.length > 0 && !validTypes.includes(type)) {
            throw new Error(`Invalid node type: ${type}. Valid types: ${validTypes.join(', ')}`);
        }

        // Build CREATE query
        const propsList = [];
        const params = {};
        
        Object.entries(properties).forEach(([key, value], index) => {
            const paramName = `prop${index}`;
            propsList.push(`${key}: $${paramName}`);
            params[paramName] = value;
        });

        const propsString = propsList.length > 0 ? `{${propsList.join(', ')}}` : '';
        const query = `CREATE (n:${type} ${propsString}) RETURN n`;

        logger.info('Creating node with query:', query, params);

        try {
            // Execute the query
            const result = await this.dataService.executeCypherQuery(query, params);
            
            if (result.success && result.data.nodes.length > 0) {
                const newNode = result.data.nodes[0];
                logger.info('Node created successfully:', newNode);
                
                // Add position information if provided
                if (position) {
                    newNode._position = {
                        x: position.x,
                        y: position.y,
                        z: position.z
                    };
                }
                
                return {
                    success: true,
                    node: newNode,
                    message: `Created ${type} node`
                };
            } else {
                throw new Error('Node creation failed');
            }
        } catch (error) {
            logger.error('Failed to create node:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update node properties
     */
    async updateNodeProperties(nodeId, properties) {
        if (!this.isEditMode) {
            throw new Error('Cannot update nodes in read-only mode');
        }

        const setPairs = [];
        const params = { nodeId };
        
        Object.entries(properties).forEach(([key, value], index) => {
            const paramName = `prop${index}`;
            setPairs.push(`n.${key} = $${paramName}`);
            params[paramName] = value;
        });

        const query = `
            MATCH (n)
            WHERE id(n) = $nodeId
            SET ${setPairs.join(', ')}
            RETURN n
        `;

        try {
            const result = await this.dataService.executeCypherQuery(query, params);
            if (result.success) {
                logger.info('Node updated successfully');
                return { success: true };
            }
        } catch (error) {
            logger.error('Failed to update node:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a node (with confirmation)
     */
    async deleteNode(nodeId, confirmCallback = null) {
        if (!this.isEditMode) {
            throw new Error('Cannot delete nodes in read-only mode');
        }

        if (confirmCallback) {
            const confirmed = await confirmCallback(
                'Delete Node?',
                'This action cannot be undone. The node and all its relationships will be deleted.'
            );
            if (!confirmed) return { success: false, cancelled: true };
        }

        const query = `
            MATCH (n)
            WHERE id(n) = $nodeId
            DETACH DELETE n
            RETURN count(n) as deleted
        `;

        try {
            const result = await this.dataService.executeCypherQuery(query, { nodeId });
            if (result.success) {
                logger.info('Node deleted successfully');
                return { success: true };
            }
        } catch (error) {
            logger.error('Failed to delete node:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a relationship between two nodes
     */
    async createRelationship(sourceId, targetId, relationshipType, properties = {}) {
        if (!this.isEditMode) {
            throw new Error('Cannot create relationships in read-only mode');
        }

        const propsList = [];
        const params = { sourceId, targetId };
        
        Object.entries(properties).forEach(([key, value], index) => {
            const paramName = `prop${index}`;
            propsList.push(`${key}: $${paramName}`);
            params[paramName] = value;
        });

        const propsString = propsList.length > 0 ? `{${propsList.join(', ')}}` : '';
        const query = `
            MATCH (source), (target)
            WHERE id(source) = $sourceId AND id(target) = $targetId
            CREATE (source)-[r:${relationshipType} ${propsString}]->(target)
            RETURN r
        `;

        try {
            const result = await this.dataService.executeCypherQuery(query, params);
            if (result.success) {
                logger.info('Relationship created successfully');
                return { success: true };
            }
        } catch (error) {
            logger.error('Failed to create relationship:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Parse voice command for node creation
     * Examples:
     * - "Create person named John Smith"
     * - "Add company called TechCorp"
     * - "New project named AI Research"
     */
    parseVoiceCreateCommand(transcript) {
        const createPatterns = [
            /create\s+(\w+)\s+(?:named|called)\s+(.+)/i,
            /add\s+(\w+)\s+(?:named|called)\s+(.+)/i,
            /new\s+(\w+)\s+(?:named|called)\s+(.+)/i
        ];

        for (const pattern of createPatterns) {
            const match = transcript.match(pattern);
            if (match) {
                const type = this.normalizeNodeType(match[1]);
                const name = match[2].trim();
                
                return {
                    action: 'create',
                    type: type,
                    properties: { name }
                };
            }
        }

        return null;
    }

    /**
     * Normalize node type from voice input
     */
    normalizeNodeType(input) {
        const lowered = input.toLowerCase();
        
        // Map common variations to schema types
        const typeMap = {
            'person': 'Person',
            'people': 'Person',
            'company': 'Company',
            'companies': 'Company',
            'project': 'Project',
            'projects': 'Project',
            'technology': 'Technology',
            'tech': 'Technology'
        };

        return typeMap[lowered] || input.charAt(0).toUpperCase() + input.slice(1);
    }
}