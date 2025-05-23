import express from 'express';
import cors from 'cors';
import kuzu from 'kuzu';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MockLoader } from './mock-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

let db = null;
let conn = null;
let mockLoader = new MockLoader();
let useMock = false;

// Endpoint to connect to database
app.post('/api/connect', async (req, res) => {
	const { dbPath } = req.body;
	
	// If path is 'mock' or empty, use mock data
	if (!dbPath || dbPath === 'mock') {
		useMock = true;
		const result = await mockLoader.connect(dbPath);
		return res.json(result);
	}
	
	try {
		// Close existing connection if any
		if (conn) conn = null;
		if (db) db = null;
		useMock = false;
		
		// Try to create new connection
		db = new kuzu.Database(dbPath);
		conn = new kuzu.Connection(db);
		
		// Test the connection
		await conn.execute('RETURN 1');
		
		res.json({ success: true, message: 'Connected to Kùzu database' });
	} catch (error) {
		// Fall back to mock data
		console.log('Kùzu connection failed, using mock data:', error.message);
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
			const tables = await conn.execute('CALL show_tables() RETURN *;');
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
		const queryResult = await conn.execute(query);
		const nodes = await queryResult.getAll();
		
		res.json({
			success: true,
			tableName: targetTable,
			nodes: nodes.map((row, index) => ({
				id: index,
				data: row.n,
				label: row.n.id || row.n.name || `Node ${index}`
			}))
		});
	} catch (error) {
		res.json({ success: false, message: error.message });
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Kùzu server running on http://localhost:${PORT}`);
});