import express from 'express';
import cors from 'cors';
import kuzu from 'kuzu';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MockLoader } from './mock-loader.js';
import CypherQueryService from './services/CypherQueryService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

let db = null;
let conn = null;
let mockLoader = new MockLoader();
let cypherService = null;
let useMock = false;

// Endpoint to connect to database
app.post('/api/connect', async (req, res) => {
	const { dbPath } = req.body;
	
	console.log('Connect request received for:', dbPath);
	
	// Check if it's one of our sample databases or mock
	const sampleDatabases = ['mock', 'demo', 'social-network', 'knowledge-graph', 'movie-database'];
	if (!dbPath || sampleDatabases.includes(dbPath)) {
		console.log('Using mock data for:', dbPath);
		useMock = true;
		const result = await mockLoader.connect(dbPath);
		return res.json(result);
	}
	
	try {
		// Close existing connection if any
		if (conn) conn = null;
		if (db) db = null;
		useMock = false;
		
		console.log('Attempting to connect to Kùzu database:', dbPath);
		
		// Try to create new connection
		db = new kuzu.Database(dbPath);
		conn = new kuzu.Connection(db);
		
		// Test the connection
		console.log('Testing connection with RETURN 1...');
		await conn.query('RETURN 1');
		
		// Initialize CypherQueryService
		cypherService = new CypherQueryService({ conn });
		
		console.log('Successfully connected to Kùzu database');
		res.json({ success: true, message: 'Connected to Kùzu database' });
	} catch (error) {
		// Fall back to mock data
		console.error('Kùzu connection failed:', error);
		console.log('Error details:', error.message, error.stack);
		useMock = true;
		const result = await mockLoader.connect(dbPath);
		res.json({ ...result, message: result.message + ' (Kùzu unavailable)' });
	}
});

// Endpoint to get nodes
app.get('/api/nodes', async (req, res) => {
	if (useMock) {
		const tableName = req.query.table;
		const limit = parseInt(req.query.limit) || 500;
		const result = await mockLoader.getNodes(tableName, limit);
		return res.json(result);
	}
	
	if (!conn) {
		return res.json({ success: false, message: 'Not connected to database' });
	}
	
	try {
		const tableName = req.query.table;
		const limit = parseInt(req.query.limit) || 500;
		
		let targetTable = tableName;
		
		// If no table specified, get the first node table
		if (!targetTable) {
			const tables = await conn.query('CALL show_tables() RETURN *;');
			const result = await tables.getAll();
			
			// Find first node table
			const nodeTable = result.find(row => row.type === 'NODE');
			if (!nodeTable) {
				return res.json({ success: false, message: 'No node tables found' });
			}
			targetTable = nodeTable.name;
		}
		
		// Get nodes from the table
		const query = `MATCH (n:${targetTable}) RETURN n LIMIT ${limit};`;
		const queryResult = await conn.query(query);
		const nodes = await queryResult.getAll();
		
		res.json({
			success: true,
			tableName: targetTable,
			nodes: nodes.map((row) => {
				const node = row.n;
				// Create consistent ID that matches edge format
				const nodeId = `${node._label}_${node._id.offset}`;
				
				return {
					id: nodeId,
					data: node,
					label: node.name || node.id || node.title || `${node._label} ${node._id.offset}`
				};
			})
		});
	} catch (error) {
		res.json({ success: false, message: error.message });
	}
});

// Endpoint to get edges
app.get('/api/edges', async (req, res) => {
	if (useMock) {
		const result = await mockLoader.getEdges();
		return res.json(result);
	}
	
	if (!conn) {
		return res.json({ success: false, message: 'Not connected to database' });
	}
	
	try {
		// First get all relationship tables
		const tablesQuery = await conn.query('CALL show_tables() RETURN *');
		const tables = await tablesQuery.getAll();
		const relTables = tables.filter(t => t.type === 'REL').map(t => t.name);
		
		if (relTables.length === 0) {
			return res.json({ success: true, edges: [] });
		}
		
		// Query all relationships from all tables
		const allEdges = [];
		
		for (const relTable of relTables) {
			try {
				// Query pattern: MATCH (a)-[r:RelType]->(b) RETURN a, r, b
				const query = `MATCH (a)-[r:${relTable}]->(b) RETURN a, r, b LIMIT 1000`;
				const result = await conn.query(query);
				const edges = await result.getAll();
				
				// Transform to our edge format
				edges.forEach(edge => {
					// Extract node IDs from the internal _id structure
					const fromId = `${edge.a._label}_${edge.a._id.offset}`;
					const toId = `${edge.b._label}_${edge.b._id.offset}`;
					
					allEdges.push({
						from: fromId,
						to: toId,
						type: relTable,
						properties: Object.keys(edge.r).reduce((props, key) => {
							if (!key.startsWith('_')) {
								props[key] = edge.r[key];
							}
							return props;
						}, {})
					});
				});
			} catch (err) {
				console.warn(`Failed to query relationship table ${relTable}:`, err.message);
			}
		}
		
		res.json({
			success: true,
			edges: allEdges
		});
		
	} catch (error) {
		console.error('Failed to fetch edges:', error);
		res.json({ 
			success: false, 
			message: `Failed to fetch edges: ${error.message}` 
		});
	}
});

// Cypher query endpoints

// Execute Cypher query
app.post('/api/cypher/execute', async (req, res) => {
	if (useMock) {
		return res.json({
			success: false,
			error: { message: 'Cypher queries not supported in mock mode' }
		});
	}
	
	if (!cypherService) {
		return res.json({
			success: false,
			error: { message: 'Not connected to database' }
		});
	}
	
	try {
		const { query, parameters = {}, options = {} } = req.body;
		
		if (!query) {
			return res.status(400).json({
				success: false,
				error: { message: 'Query is required' }
			});
		}
		
		const result = await cypherService.executeQuery(query, parameters, options);
		res.json(result);
	} catch (error) {
		console.error('Query execution error:', error);
		res.status(500).json({
			success: false,
			error: { message: error.message }
		});
	}
});

// Validate Cypher query
app.post('/api/cypher/validate', async (req, res) => {
	if (useMock) {
		return res.json({
			valid: false,
			errors: [{ message: 'Cypher validation not supported in mock mode' }]
		});
	}
	
	if (!cypherService) {
		return res.json({
			valid: false,
			errors: [{ message: 'Not connected to database' }]
		});
	}
	
	try {
		const { query } = req.body;
		
		if (!query) {
			return res.status(400).json({
				valid: false,
				errors: [{ message: 'Query is required' }]
			});
		}
		
		const result = await cypherService.validateQuery(query);
		res.json(result);
	} catch (error) {
		console.error('Query validation error:', error);
		res.status(500).json({
			valid: false,
			errors: [{ message: error.message }]
		});
	}
});

// Get query templates
app.get('/api/cypher/templates', (req, res) => {
	if (!cypherService) {
		cypherService = new CypherQueryService({ conn: null });
	}
	
	res.json({
		success: true,
		templates: cypherService.getQueryTemplates()
	});
});

// Get query history
app.get('/api/cypher/history', (req, res) => {
	if (!cypherService) {
		return res.json({
			success: false,
			history: [],
			message: 'Not connected to database'
		});
	}
	
	res.json({
		success: true,
		history: cypherService.getQueryHistory()
	});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Kùzu server running on http://localhost:${PORT}`);
});