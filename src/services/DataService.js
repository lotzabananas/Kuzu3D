import { SERVER_CONFIG } from '../constants/index.js';
import { AuthUtils } from '../utils/AuthUtils.js';
import { SecurityUtils } from '../utils/SecurityUtils.js';
import { LoadingManager } from '../utils/LoadingManager.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { getSampleData, SAMPLE_QUERIES } from '../data/sampleDatabase.js';

export class DataService {
	constructor() {
		this.apiUrl = SERVER_CONFIG.apiUrl;
		this.connected = false;
		this.usingSampleData = false;
		this.sampleData = getSampleData();
	}
	
	async connect(dbPath) {
		return LoadingManager.withLoading('db-connect', async (updateProgress) => {
			try {
				updateProgress(10, 'Validating database path...');
				
				// Validate database path using security utils
				const validation = SecurityUtils.validateDatabasePath(dbPath);
				if (!validation.valid) {
					return {
						success: false,
						message: validation.error
					};
				}
				
				updateProgress(30, 'Checking rate limits...');
				
				// Check rate limiting
				if (!AuthUtils.checkClientRateLimit('connect', 10, 60000)) {
					return {
						success: false,
						message: 'Too many connection attempts. Please wait before retrying.'
					};
				}
				
				updateProgress(50, 'Connecting to database...');
				
				const response = await AuthUtils.secureRequest(`${this.apiUrl}/connect`, {
					method: 'POST',
					body: JSON.stringify({ dbPath: validation.sanitized }),
					signal: AbortSignal.timeout(SERVER_CONFIG.timeout)
				});
				
				updateProgress(80, 'Processing response...');
				
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				
				const result = await response.json();
				this.connected = result.success;
				
				updateProgress(100, 'Connection complete');
				
				return result;
			} catch (error) {
				ErrorHandler.handle(error, { component: 'DataService', method: 'connect' });
				return {
					success: false,
					message: `Failed to connect: ${error.message}`
				};
			}
		}, { 
			message: `Connecting to database...`,
			showProgress: true,
			timeout: 15000
		});
	}
	
	/**
	 * Load built-in sample database (no external setup required)
	 */
	async loadSampleDatabase() {
		return LoadingManager.withLoading('sample-db', async (updateProgress) => {
			try {
				updateProgress(25, 'Loading sample database...');
				
				// Simulate loading time for better UX
				await new Promise(resolve => setTimeout(resolve, 500));
				
				updateProgress(75, 'Preparing sample data...');
				
				this.connected = true;
				this.usingSampleData = true;
				
				updateProgress(100, 'Sample database ready!');
				
				return {
					success: true,
					message: 'Sample database loaded successfully',
					nodeCount: this.sampleData.nodes.length,
					edgeCount: this.sampleData.edges.length,
					sampleQueries: Object.keys(SAMPLE_QUERIES)
				};
			} catch (error) {
				ErrorHandler.handle(error, { component: 'DataService', method: 'loadSampleDatabase' });
				return {
					success: false,
					message: `Failed to load sample database: ${error.message}`
				};
			}
		}, {
			message: 'Loading sample database...',
			showProgress: true,
			timeout: 5000
		});
	}
	
	async getNodes(tableName = null, limit = 500) {
		if (!this.connected) {
			return {
				success: false,
				message: 'Not connected to database'
			};
		}
		
		// Return sample data if using built-in database
		if (this.usingSampleData) {
			let nodes = this.sampleData.nodes;
			
			// Filter by table name (node type) if specified
			if (tableName) {
				nodes = nodes.filter(node => 
					node.type.toLowerCase() === tableName.toLowerCase()
				);
			}
			
			// Apply limit
			nodes = nodes.slice(0, limit);
			
			return {
				success: true,
				nodes: nodes,
				tableName: tableName || 'All',
				message: `Loaded ${nodes.length} nodes from sample database`
			};
		}
		
		// Validate inputs
		if (tableName && typeof tableName !== 'string') {
			return {
				success: false,
				message: 'Table name must be a string'
			};
		}
		
		if (tableName && tableName.length > 100) {
			return {
				success: false,
				message: 'Table name is too long'
			};
		}
		
		// Validate and sanitize limit
		const numLimit = parseInt(limit, 10);
		if (isNaN(numLimit) || numLimit < 1 || numLimit > 10000) {
			return {
				success: false,
				message: 'Limit must be a number between 1 and 10000'
			};
		}
		
		try {
			const params = new URLSearchParams();
			if (tableName) {
				// Sanitize table name - only allow alphanumeric and underscore
				const sanitizedTable = tableName.replace(/[^a-zA-Z0-9_]/g, '');
				if (sanitizedTable !== tableName) {
					return {
						success: false,
						message: 'Table name contains invalid characters'
					};
				}
				params.append('table', sanitizedTable);
			}
			params.append('limit', numLimit.toString());
			
			const response = await fetch(`${this.apiUrl}/nodes?${params}`, {
				signal: AbortSignal.timeout(SERVER_CONFIG.timeout)
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Failed to fetch nodes:', error);
			return {
				success: false,
				message: `Failed to fetch nodes: ${error.message}`
			};
		}
	}
	
	async getEdges() {
		if (!this.connected) {
			return {
				success: false,
				message: 'Not connected to database'
			};
		}
		
		// Return sample edges if using built-in database
		if (this.usingSampleData) {
			return {
				success: true,
				edges: this.sampleData.edges.map(edge => ({
					src: edge.from,
					dst: edge.to,
					type: edge.type,
					properties: edge.properties
				})),
				message: `Loaded ${this.sampleData.edges.length} edges from sample database`
			};
		}
		
		try {
			const response = await fetch(`${this.apiUrl}/edges`, {
				signal: AbortSignal.timeout(SERVER_CONFIG.timeout)
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Failed to fetch edges:', error);
			return {
				success: false,
				message: `Failed to fetch edges: ${error.message}`
			};
		}
	}
	
	// Get database schema
	async getSchema() {
		// Return sample schema if using built-in database
		if (this.usingSampleData) {
			return {
				success: true,
				schema: {
					nodeTypes: this.sampleData.nodeTypes,
					relationshipTypes: this.sampleData.relationshipTypes
				},
				message: 'Sample database schema loaded'
			};
		}
		
		try {
			const response = await fetch(`${this.apiUrl}/schema`);
			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Failed to fetch schema:', error);
			return {
				success: false,
				message: `Failed to fetch schema: ${error.message}`
			};
		}
	}
	
	// Cypher query methods
	
	async executeCypherQuery(query, parameters = {}, options = {}) {
		// Validate inputs
		if (!query || typeof query !== 'string') {
			return {
				success: false,
				error: 'Query is required and must be a string'
			};
		}
		
		// Basic Cypher query validation
		const trimmedQuery = query.trim();
		if (trimmedQuery.length === 0) {
			return {
				success: false,
				error: 'Query cannot be empty'
			};
		}
		
		if (trimmedQuery.length > 10000) {
			return {
				success: false,
				error: 'Query is too long (max 10000 characters)'
			};
		}
		
		// Check for dangerous patterns
		const dangerousPatterns = [
			/drop\s+database/i,
			/delete\s+from/i,
			/truncate/i,
			/alter\s+database/i,
			/<script/i,
			/javascript:/i
		];
		
		for (const pattern of dangerousPatterns) {
			if (pattern.test(trimmedQuery)) {
				return {
					success: false,
					error: 'Query contains potentially dangerous patterns'
				};
			}
		}
		
		// Validate parameters object
		if (parameters && typeof parameters !== 'object') {
			return {
				success: false,
				error: 'Parameters must be an object'
			};
		}
		
		if (!this.connected) {
			console.log('❌ Step 3: Not connected to database');
			return {
				success: false,
				error: { message: 'Not connected to database' }
			};
		}
		
		try {
			const requestUrl = `${this.apiUrl}/cypher/execute`;
			const requestBody = { query, parameters, options };
			
			console.log('🔍 Step 4: Making fetch request to:', requestUrl);
			console.log('🔍 Step 4: Request body:', JSON.stringify(requestBody, null, 2));
			
			const response = await fetch(requestUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
				signal: AbortSignal.timeout(options.timeout || SERVER_CONFIG.timeout)
			});
			
			console.log('🔍 Step 5: Response received');
			console.log('🔍 Step 5: Status:', response.status);
			console.log('🔍 Step 5: OK:', response.ok);
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const result = await response.json();
			console.log('🔍 Step 6: Response JSON parsed');
			console.log('🔍 Step 6: Result:', JSON.stringify(result, null, 2));
			return result;
		} catch (error) {
			console.error('Cypher query execution error:', error);
			return {
				success: false,
				error: { 
					message: `Query execution failed: ${error.message}`,
					code: 'QUERY_ERROR'
				}
			};
		}
	}
	
	async validateCypherQuery(query) {
		try {
			const response = await fetch(`${this.apiUrl}/cypher/validate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ query }),
				signal: AbortSignal.timeout(SERVER_CONFIG.timeout)
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Cypher query validation error:', error);
			return {
				valid: false,
				errors: [{ message: `Validation failed: ${error.message}` }]
			};
		}
	}
	
	async getCypherTemplates() {
		try {
			const response = await fetch(`${this.apiUrl}/cypher/templates`, {
				signal: AbortSignal.timeout(SERVER_CONFIG.timeout)
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Failed to fetch Cypher templates:', error);
			return {
				success: false,
				templates: {},
				error: { message: `Failed to fetch templates: ${error.message}` }
			};
		}
	}
	
	async getCypherHistory() {
		try {
			const response = await fetch(`${this.apiUrl}/cypher/history`, {
				signal: AbortSignal.timeout(SERVER_CONFIG.timeout)
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Failed to fetch query history:', error);
			return {
				success: false,
				history: [],
				error: { message: `Failed to fetch history: ${error.message}` }
			};
		}
	}
	
	disconnect() {
		this.connected = false;
	}
}