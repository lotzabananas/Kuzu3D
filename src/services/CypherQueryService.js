import { Logger } from '../utils/Logger.js';

export default class CypherQueryService {
  constructor(database) {
    this.db = database;
    this.logger = new Logger('CypherQueryService');
    this.queryCache = new Map();
    this.cacheMaxSize = 100;
    this.queryHistory = [];
    this.historyMaxSize = 50;
  }

  /**
   * Execute a Cypher query and return formatted results
   * @param {string} cypher - The Cypher query to execute
   * @param {Object} params - Query parameters
   * @param {Object} options - Execution options (limit, timeout, format)
   * @returns {Object} Formatted query results
   */
  async executeQuery(cypher, params = {}, options = {}) {
    const startTime = Date.now();
    const { limit = 1000, timeout = 30000, format = 'vr' } = options;
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(cypher, params);
      if (this.queryCache.has(cacheKey)) {
        this.logger.info('Returning cached result for query');
        return this.queryCache.get(cacheKey);
      }

      // Apply limit if not present in query
      const limitedQuery = this.applyLimit(cypher, limit);
      
      // Execute query with timeout
      const result = await this.executeWithTimeout(
        this.db.conn.query(limitedQuery, params),
        timeout
      );
      
      // Get all results
      const rawResults = await result.getAll();
      
      // Format results based on requested format
      const formattedResults = format === 'vr' 
        ? await this.formatResultsForVR(rawResults, cypher)
        : { raw: rawResults };
      
      // Add metadata
      const response = {
        success: true,
        data: formattedResults,
        metadata: {
          queryTime: Date.now() - startTime,
          nodeCount: formattedResults.nodes?.length || 0,
          edgeCount: formattedResults.edges?.length || 0,
          truncated: rawResults.length >= limit
        },
        error: null
      };
      
      // Cache the result
      this.addToCache(cacheKey, response);
      
      // Save to history
      await this.saveQueryToHistory(cypher, response);
      
      return response;
      
    } catch (error) {
      this.logger.error('Query execution failed:', error);
      return {
        success: false,
        data: null,
        error: {
          message: error.message,
          code: error.code || 'QUERY_ERROR',
          details: this.getErrorDetails(error)
        }
      };
    }
  }

  /**
   * Validate Cypher query syntax without executing
   * @param {string} cypher - The Cypher query to validate
   * @returns {Object} Validation result
   */
  async validateQuery(cypher) {
    try {
      // Kuzu doesn't have a separate validation API, so we'll do basic checks
      // and attempt a dry run with LIMIT 0
      const validationQuery = `${cypher} LIMIT 0`;
      
      // Basic syntax checks
      const syntaxErrors = this.basicSyntaxCheck(cypher);
      if (syntaxErrors.length > 0) {
        return {
          valid: false,
          errors: syntaxErrors,
          suggestions: this.getSyntaxSuggestions(syntaxErrors)
        };
      }
      
      // Try to execute with limit 0
      await this.db.conn.query(validationQuery);
      
      return {
        valid: true,
        errors: [],
        suggestions: []
      };
      
    } catch (error) {
      return {
        valid: false,
        errors: [{
          message: error.message,
          position: this.extractErrorPosition(error.message)
        }],
        suggestions: this.getQuerySuggestions(cypher, error)
      };
    }
  }

  /**
   * Format raw query results for VR visualization
   * @param {Array} rawResults - Raw query results from Kuzu
   * @param {string} query - Original query (for context)
   * @returns {Object} Formatted results with nodes and edges
   */
  async formatResultsForVR(rawResults, query) {
    const nodes = new Map();
    const edges = [];
    const nodePositions = new Map();
    
    // Process each result row
    for (const row of rawResults) {
      this.extractNodesAndEdges(row, nodes, edges);
    }
    
    // Convert nodes map to array and assign positions if needed
    const nodeArray = Array.from(nodes.values());
    
    // Add layout hints based on query type
    if (this.isPathQuery(query)) {
      this.addPathLayout(nodeArray, edges);
    } else if (this.isHierarchicalQuery(query)) {
      this.addHierarchicalLayout(nodeArray, edges);
    }
    
    return {
      nodes: nodeArray,
      edges: edges,
      queryType: this.detectQueryType(query)
    };
  }

  /**
   * Extract nodes and edges from a result row
   */
  extractNodesAndEdges(obj, nodes, edges, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if this is a node
    if (obj._label && obj._id) {
      const nodeId = this.formatNodeId(obj._label, obj._id);
      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          label: obj._label,
          properties: this.extractProperties(obj),
          type: obj._label // For coloring
        });
      }
    }
    
    // Check if this is a relationship
    if (obj._src && obj._dst && !obj._label) {
      // This is likely a relationship
      const edgeId = `edge_${edges.length + 1}`;
      edges.push({
        id: edgeId,
        source: obj._src,
        target: obj._dst,
        type: obj._type || 'RELATED',
        properties: this.extractProperties(obj)
      });
    }
    
    // Recursively process nested objects and arrays
    if (Array.isArray(obj)) {
      obj.forEach(item => this.extractNodesAndEdges(item, nodes, edges, path));
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        if (!key.startsWith('_') && typeof value === 'object') {
          this.extractNodesAndEdges(value, nodes, edges, `${path}.${key}`);
        }
      });
    }
  }

  /**
   * Get predefined query templates
   * @returns {Object} Categorized query templates
   */
  getQueryTemplates() {
    return {
      exploration: [
        {
          name: 'Find All Nodes',
          template: 'MATCH (n:${nodeType}) RETURN n LIMIT 100',
          description: 'Retrieve all nodes of a specific type',
          parameters: ['nodeType']
        },
        {
          name: 'Find Connected Nodes',
          template: 'MATCH (n:${nodeType})-[r]-(m) WHERE n.${property} = "${value}" RETURN n, r, m LIMIT 50',
          description: 'Find nodes connected to a specific node',
          parameters: ['nodeType', 'property', 'value']
        },
        {
          name: 'Shortest Path',
          template: 'MATCH path = shortestPath((a:${typeA})-[*]-(b:${typeB})) WHERE a.id = ${startId} AND b.id = ${endId} RETURN path',
          description: 'Find the shortest path between two nodes',
          parameters: ['typeA', 'typeB', 'startId', 'endId']
        }
      ],
      analysis: [
        {
          name: 'Node Degree',
          template: 'MATCH (n:${nodeType}) RETURN n, count((n)-[]-()) as degree ORDER BY degree DESC LIMIT 20',
          description: 'Find nodes with the most connections',
          parameters: ['nodeType']
        },
        {
          name: 'Relationship Count',
          template: 'MATCH ()-[r:${relType}]->() RETURN count(r) as count',
          description: 'Count relationships of a specific type',
          parameters: ['relType']
        }
      ],
      modification: [
        {
          name: 'Create Node',
          template: 'CREATE (n:${nodeType} {name: "${name}"}) RETURN n',
          description: 'Create a new node',
          parameters: ['nodeType', 'name']
        },
        {
          name: 'Create Relationship',
          template: 'MATCH (a:${typeA} {id: ${aId}}), (b:${typeB} {id: ${bId}}) CREATE (a)-[r:${relType}]->(b) RETURN a, r, b',
          description: 'Create a relationship between two nodes',
          parameters: ['typeA', 'aId', 'typeB', 'bId', 'relType']
        }
      ]
    };
  }

  /**
   * Save query to history
   */
  async saveQueryToHistory(query, results) {
    const historyEntry = {
      query,
      timestamp: new Date().toISOString(),
      success: results.success,
      resultCount: results.data?.nodes?.length || 0,
      executionTime: results.metadata?.queryTime
    };
    
    this.queryHistory.unshift(historyEntry);
    
    // Trim history if needed
    if (this.queryHistory.length > this.historyMaxSize) {
      this.queryHistory = this.queryHistory.slice(0, this.historyMaxSize);
    }
  }

  /**
   * Get query history
   */
  getQueryHistory() {
    return this.queryHistory;
  }

  // Helper methods
  
  formatNodeId(label, idObj) {
    const offset = idObj?.offset || idObj;
    return `${label}_${offset}`;
  }
  
  extractProperties(obj) {
    const props = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (!key.startsWith('_') && value !== null && value !== undefined) {
        props[key] = value;
      }
    });
    return props;
  }
  
  getCacheKey(query, params) {
    return `${query}::${JSON.stringify(params)}`;
  }
  
  addToCache(key, value) {
    // Simple LRU cache implementation
    if (this.queryCache.size >= this.cacheMaxSize) {
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }
    this.queryCache.set(key, value);
  }
  
  applyLimit(query, limit) {
    // Only add LIMIT if the query doesn't already have one
    const upperQuery = query.toUpperCase();
    if (!upperQuery.includes('LIMIT')) {
      return `${query} LIMIT ${limit}`;
    }
    return query;
  }
  
  executeWithTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )
    ]);
  }
  
  basicSyntaxCheck(cypher) {
    const errors = [];
    
    // Check for balanced parentheses
    const openParens = (cypher.match(/\(/g) || []).length;
    const closeParens = (cypher.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push({
        message: 'Unbalanced parentheses',
        type: 'SYNTAX_ERROR'
      });
    }
    
    // Check for balanced brackets
    const openBrackets = (cypher.match(/\[/g) || []).length;
    const closeBrackets = (cypher.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push({
        message: 'Unbalanced brackets',
        type: 'SYNTAX_ERROR'
      });
    }
    
    return errors;
  }
  
  detectQueryType(query) {
    const upperQuery = query.toUpperCase();
    if (upperQuery.includes('SHORTEST') && upperQuery.includes('PATH')) {
      return 'path';
    } else if (upperQuery.includes('CREATE')) {
      return 'create';
    } else if (upperQuery.includes('DELETE')) {
      return 'delete';
    } else if (upperQuery.includes('MATCH')) {
      return 'match';
    }
    return 'unknown';
  }
  
  isPathQuery(query) {
    return query.toUpperCase().includes('PATH');
  }
  
  isHierarchicalQuery(query) {
    // Simple heuristic - queries with depth patterns like [*] or [*..n]
    return /\[\*[\d\.]*\]/.test(query);
  }
  
  addPathLayout(nodes, edges) {
    // Simple linear layout for path queries
    nodes.forEach((node, index) => {
      node.position = {
        x: index * 3,
        y: 0,
        z: 0
      };
    });
  }
  
  addHierarchicalLayout(nodes, edges) {
    // Simple hierarchical layout
    const levels = this.calculateNodeLevels(nodes, edges);
    nodes.forEach((node, index) => {
      const level = levels.get(node.id) || 0;
      node.position = {
        x: (index % 5) * 3,
        y: level * 3,
        z: 0
      };
    });
  }
  
  calculateNodeLevels(nodes, edges) {
    // Simple BFS to assign levels
    const levels = new Map();
    const visited = new Set();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    // Start from nodes with no incoming edges
    const startNodes = nodes.filter(node => 
      !edges.some(edge => edge.target === node.id)
    );
    
    startNodes.forEach(node => {
      levels.set(node.id, 0);
      visited.add(node.id);
    });
    
    // BFS to assign levels
    let currentLevel = 0;
    let currentNodes = startNodes.map(n => n.id);
    
    while (currentNodes.length > 0) {
      const nextNodes = [];
      currentNodes.forEach(nodeId => {
        edges.filter(e => e.source === nodeId).forEach(edge => {
          if (!visited.has(edge.target)) {
            visited.add(edge.target);
            levels.set(edge.target, currentLevel + 1);
            nextNodes.push(edge.target);
          }
        });
      });
      currentNodes = nextNodes;
      currentLevel++;
    }
    
    return levels;
  }
  
  getErrorDetails(error) {
    // Extract useful details from Kuzu errors
    if (error.message.includes('Binder exception')) {
      return 'Query references non-existent nodes, relationships, or properties';
    } else if (error.message.includes('Parser exception')) {
      return 'Invalid Cypher syntax';
    } else if (error.message.includes('Runtime exception')) {
      return 'Query execution error - check your data and query logic';
    }
    return 'Unknown error - check query syntax and database connection';
  }
  
  extractErrorPosition(message) {
    // Try to extract line/column from error message
    const match = message.match(/line (\d+), column (\d+)/);
    if (match) {
      return {
        line: parseInt(match[1]),
        column: parseInt(match[2])
      };
    }
    return null;
  }
  
  getSyntaxSuggestions(errors) {
    const suggestions = [];
    errors.forEach(error => {
      if (error.message.includes('parentheses')) {
        suggestions.push('Check that all opening parentheses ( have matching closing parentheses )');
      }
      if (error.message.includes('brackets')) {
        suggestions.push('Check that all opening brackets [ have matching closing brackets ]');
      }
    });
    return suggestions;
  }
  
  getQuerySuggestions(query, error) {
    const suggestions = [];
    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes('table') && errorMsg.includes('not exist')) {
      suggestions.push('Check node labels - use CALL show_tables() to see available tables');
    }
    if (errorMsg.includes('property') && errorMsg.includes('not exist')) {
      suggestions.push('Check property names - they are case-sensitive');
    }
    if (errorMsg.includes('syntax')) {
      suggestions.push('Check Cypher syntax - common issues: missing commas, incorrect keywords');
    }
    
    return suggestions;
  }
}