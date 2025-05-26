import { SERVER_CONFIG } from '../constants/index.js';

export class DataService {
	constructor() {
		this.apiUrl = SERVER_CONFIG.apiUrl;
		this.connected = false;
	}
	
	async connect(dbPath) {
		try {
			const response = await fetch(`${this.apiUrl}/connect`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ dbPath })
			});
			
			const result = await response.json();
			this.connected = result.success;
			return result;
		} catch (error) {
			console.error('Connection error:', error);
			return {
				success: false,
				message: `Failed to connect: ${error.message}`
			};
		}
	}
	
	async getNodes(tableName = null, limit = 500) {
		if (!this.connected) {
			return {
				success: false,
				message: 'Not connected to database'
			};
		}
		
		try {
			const params = new URLSearchParams();
			if (tableName) params.append('table', tableName);
			params.append('limit', limit.toString());
			
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
		console.log('🔍 Step 3: DataService.executeCypherQuery called');
		console.log('🔍 Step 3: Connected:', this.connected);
		console.log('🔍 Step 3: Query:', query);
		console.log('🔍 Step 3: Parameters:', parameters);
		console.log('🔍 Step 3: Options:', options);
		
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