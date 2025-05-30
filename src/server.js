import express from 'express';
import cors from 'cors';
import compression from 'compression';
import kuzu from 'kuzu';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import CypherQueryService from './services/CypherQueryService.js';
import { NaturalLanguageService } from './services/NaturalLanguageService.js';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, copyFile, readdir, stat } from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Debug environment loading
console.log('Environment variables loaded from .env.local');
console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) + '...' : 'NOT_FOUND');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Enable compression for all responses
app.use(compression({
	// Configure compression based on content type and size
	filter: (req, res) => {
		// Don't compress if explicitly disabled
		if (req.headers['x-no-compression']) {
			return false;
		}
		// Use compression for all content types by default
		return compression.filter(req, res);
	},
	level: 6, // Good balance between compression ratio and speed
	threshold: 1024, // Only compress responses larger than 1KB
	chunkSize: 16 * 1024, // 16KB chunks for optimal streaming
	// Cache compressed responses for common data
	cache: true
}));

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for large queries

// Request timeout middleware
const requestTimeout = (timeoutMs = 30000) => {
	return (req, res, next) => {
		// Set timeout for this request
		const timeout = setTimeout(() => {
			if (!res.headersSent) {
				console.warn(`⏰ Request timeout after ${timeoutMs}ms: ${req.method} ${req.path}`);
				res.status(408).json({
					success: false,
					error: {
						message: 'Request timeout',
						code: 'TIMEOUT',
						timeout: timeoutMs
					}
				});
			}
		}, timeoutMs);

		// Clear timeout when response finishes
		res.on('finish', () => {
			clearTimeout(timeout);
		});

		// Clear timeout when response closes
		res.on('close', () => {
			clearTimeout(timeout);
		});

		next();
	};
};

// Performance metrics collection
class PerformanceMetrics {
	constructor() {
		this.metrics = {
			requests: {
				total: 0,
				byEndpoint: {},
				byStatus: {},
				errors: 0
			},
			timing: {
				averageResponseTime: 0,
				slowestEndpoints: [],
				responseTimeHistory: []
			},
			database: {
				queryCount: 0,
				averageQueryTime: 0,
				slowQueries: [],
				connectionErrors: 0
			},
			system: {
				startTime: Date.now(),
				peakMemoryUsage: 0,
				currentConnections: 0
			}
		};
		
		// Track peak memory usage
		setInterval(() => {
			const memUsage = process.memoryUsage();
			if (memUsage.heapUsed > this.metrics.system.peakMemoryUsage) {
				this.metrics.system.peakMemoryUsage = memUsage.heapUsed;
			}
		}, 10000); // Check every 10 seconds
	}

	recordRequest(req, res, responseTime) {
		this.metrics.requests.total++;
		
		// Track by endpoint
		const endpoint = `${req.method} ${req.route?.path || req.path}`;
		if (!this.metrics.requests.byEndpoint[endpoint]) {
			this.metrics.requests.byEndpoint[endpoint] = { count: 0, totalTime: 0 };
		}
		this.metrics.requests.byEndpoint[endpoint].count++;
		this.metrics.requests.byEndpoint[endpoint].totalTime += responseTime;
		
		// Track by status code
		const status = res.statusCode;
		if (!this.metrics.requests.byStatus[status]) {
			this.metrics.requests.byStatus[status] = 0;
		}
		this.metrics.requests.byStatus[status]++;
		
		// Track errors
		if (status >= 400) {
			this.metrics.requests.errors++;
		}
		
		// Update average response time
		const totalRequests = this.metrics.requests.total;
		this.metrics.timing.averageResponseTime = 
			(this.metrics.timing.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
		
		// Track response time history (keep last 1000)
		this.metrics.timing.responseTimeHistory.push({
			timestamp: Date.now(),
			responseTime,
			endpoint
		});
		if (this.metrics.timing.responseTimeHistory.length > 1000) {
			this.metrics.timing.responseTimeHistory.shift();
		}
		
		// Track slowest endpoints
		this.updateSlowestEndpoints(endpoint, responseTime);
	}

	recordDatabaseQuery(queryTime, query, isError = false) {
		this.metrics.database.queryCount++;
		
		if (isError) {
			this.metrics.database.connectionErrors++;
			return;
		}
		
		// Update average query time
		const totalQueries = this.metrics.database.queryCount - this.metrics.database.connectionErrors;
		this.metrics.database.averageQueryTime = 
			(this.metrics.database.averageQueryTime * (totalQueries - 1) + queryTime) / totalQueries;
		
		// Track slow queries (>1000ms)
		if (queryTime > 1000) {
			this.metrics.database.slowQueries.push({
				timestamp: Date.now(),
				queryTime,
				query: query?.substring(0, 100) + (query?.length > 100 ? '...' : '') // Truncate for storage
			});
			
			// Keep only last 50 slow queries
			if (this.metrics.database.slowQueries.length > 50) {
				this.metrics.database.slowQueries.shift();
			}
		}
	}

	updateSlowestEndpoints(endpoint, responseTime) {
		// Find existing entry or create new one
		let endpointEntry = this.metrics.timing.slowestEndpoints.find(e => e.endpoint === endpoint);
		
		if (!endpointEntry) {
			endpointEntry = {
				endpoint,
				slowestTime: responseTime,
				averageTime: responseTime,
				callCount: 1
			};
			this.metrics.timing.slowestEndpoints.push(endpointEntry);
		} else {
			// Update existing entry
			if (responseTime > endpointEntry.slowestTime) {
				endpointEntry.slowestTime = responseTime;
			}
			endpointEntry.averageTime = 
				(endpointEntry.averageTime * endpointEntry.callCount + responseTime) / (endpointEntry.callCount + 1);
			endpointEntry.callCount++;
		}
		
		// Sort by slowest time and keep top 10
		this.metrics.timing.slowestEndpoints.sort((a, b) => b.slowestTime - a.slowestTime);
		this.metrics.timing.slowestEndpoints = this.metrics.timing.slowestEndpoints.slice(0, 10);
	}

	getMetrics() {
		return {
			...this.metrics,
			system: {
				...this.metrics.system,
				uptime: Date.now() - this.metrics.system.startTime,
				currentMemoryUsage: process.memoryUsage()
			}
		};
	}

	resetMetrics() {
		this.metrics = {
			requests: { total: 0, byEndpoint: {}, byStatus: {}, errors: 0 },
			timing: { averageResponseTime: 0, slowestEndpoints: [], responseTimeHistory: [] },
			database: { queryCount: 0, averageQueryTime: 0, slowQueries: [], connectionErrors: 0 },
			system: { startTime: Date.now(), peakMemoryUsage: 0, currentConnections: 0 }
		};
	}
}

const performanceMetrics = new PerformanceMetrics();

// Performance tracking middleware
const performanceTracker = (req, res, next) => {
	const startTime = Date.now();
	
	performanceMetrics.metrics.system.currentConnections++;
	
	// Override res.end to capture response time
	const originalEnd = res.end;
	res.end = function(...args) {
		const responseTime = Date.now() - startTime;
		performanceMetrics.recordRequest(req, res, responseTime);
		performanceMetrics.metrics.system.currentConnections--;
		
		originalEnd.apply(this, args);
	};
	
	next();
};

// Apply performance tracking to all routes
app.use(performanceTracker);

// API Versioning system
class APIVersionManager {
	constructor() {
		this.supportedVersions = ['v1'];
		this.defaultVersion = 'v1';
		this.deprecatedVersions = []; // Future use for version deprecation
	}

	getVersionFromRequest(req) {
		// Check for version in header first (preferred for APIs)
		const headerVersion = req.headers['api-version'] || req.headers['x-api-version'];
		if (headerVersion) {
			return this.normalizeVersion(headerVersion);
		}

		// Check for version in query parameter
		const queryVersion = req.query.version || req.query.v;
		if (queryVersion) {
			return this.normalizeVersion(queryVersion);
		}

		// Check for version in URL path (e.g., /api/v1/nodes)
		const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
		if (pathMatch) {
			return pathMatch[1];
		}

		// Default version
		return this.defaultVersion;
	}

	normalizeVersion(version) {
		// Handle different version formats (1, v1, 1.0, etc.)
		if (typeof version === 'number') {
			return `v${version}`;
		}
		
		if (typeof version === 'string') {
			version = version.toLowerCase().trim();
			
			// Handle formats like "1", "1.0"
			if (/^\d+(\.\d+)*$/.test(version)) {
				return `v${version.split('.')[0]}`;
			}
			
			// Handle formats like "v1", "V1"
			if (/^v\d+/.test(version)) {
				return version;
			}
		}

		return this.defaultVersion;
	}

	isVersionSupported(version) {
		return this.supportedVersions.includes(version);
	}

	isVersionDeprecated(version) {
		return this.deprecatedVersions.includes(version);
	}

	addVersionHeaders(res, requestedVersion, actualVersion) {
		res.set({
			'API-Version': actualVersion,
			'API-Supported-Versions': this.supportedVersions.join(', '),
			'API-Default-Version': this.defaultVersion
		});

		// Add deprecation warning if applicable
		if (this.isVersionDeprecated(actualVersion)) {
			res.set('API-Deprecation-Warning', `Version ${actualVersion} is deprecated. Please upgrade to ${this.defaultVersion}.`);
		}

		// Add notice if version was not what was requested
		if (requestedVersion !== actualVersion) {
			res.set('API-Version-Notice', `Requested version ${requestedVersion} not supported. Using ${actualVersion}.`);
		}
	}
}

const apiVersionManager = new APIVersionManager();

// API versioning middleware
const apiVersioning = (req, res, next) => {
	// Only apply to API routes
	if (!req.path.startsWith('/api/')) {
		return next();
	}

	const requestedVersion = apiVersionManager.getVersionFromRequest(req);
	let actualVersion = requestedVersion;

	// If requested version is not supported, fall back to default
	if (!apiVersionManager.isVersionSupported(requestedVersion)) {
		actualVersion = apiVersionManager.defaultVersion;
		console.warn(`🔄 API version ${requestedVersion} not supported, using ${actualVersion}`);
	}

	// Store version info in request for use in handlers
	req.apiVersion = actualVersion;
	req.requestedApiVersion = requestedVersion;

	// Add version headers to response
	apiVersionManager.addVersionHeaders(res, requestedVersion, actualVersion);

	next();
};

// Apply API versioning to all routes
app.use(apiVersioning);

// Apply different timeouts for different endpoints
app.use('/api/voice/transcribe', requestTimeout(45000)); // 45s for audio processing
app.use('/api/cypher/execute', requestTimeout(60000)); // 60s for complex queries
app.use('/api/cypher/fromText', requestTimeout(30000)); // 30s for AI processing
app.use('/api', requestTimeout(20000)); // 20s for general API calls

// Initialize OpenAI
let openai;
try {
	openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	});
	console.log('✅ OpenAI client initialized successfully');
} catch (error) {
	console.error('❌ Failed to initialize OpenAI client:', error.message);
}

// Configure multer for audio file uploads
const upload = multer({ 
	storage: multer.memoryStorage(),
	limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Database connection management
class DatabaseManager {
	constructor() {
		this.db = null;
		this.conn = null;
		this.dbPath = null;
		this.isConnecting = false;
		this.connectionQueue = [];
		this.reconnectAttempts = 0;
		this.maxReconnectAttempts = 3;
		this.reconnectDelay = 1000; // Start with 1 second
	}

	async connect(dbPath) {
		if (this.isConnecting) {
			// Return a promise that resolves when current connection attempt finishes
			return new Promise((resolve, reject) => {
				this.connectionQueue.push({ resolve, reject });
			});
		}

		this.isConnecting = true;
		this.dbPath = dbPath;

		try {
			// Close existing connections
			await this.disconnect();

			console.log('🔌 Connecting to Kùzu database:', dbPath);
			
			this.db = new kuzu.Database(dbPath);
			this.conn = new kuzu.Connection(this.db);

			// Test connection
			await this.conn.query('RETURN 1');
			
			this.reconnectAttempts = 0;
			this.reconnectDelay = 1000;
			
			console.log('✅ Database connected successfully');

			// Resolve any queued connection attempts
			this.connectionQueue.forEach(({ resolve }) => resolve({ success: true }));
			this.connectionQueue = [];

			return { success: true, message: 'Connected to database' };

		} catch (error) {
			console.error('❌ Database connection failed:', error.message);
			
			// Reject queued attempts
			this.connectionQueue.forEach(({ reject }) => reject(error));
			this.connectionQueue = [];

			return { success: false, message: error.message };
		} finally {
			this.isConnecting = false;
		}
	}

	async disconnect() {
		try {
			if (this.conn) {
				this.conn = null;
				console.log('🔌 Database connection closed');
			}
			if (this.db) {
				this.db = null;
				console.log('🗄️ Database closed');
			}
		} catch (error) {
			console.warn('⚠️ Error during disconnect:', error.message);
		}
	}

	async executeQuery(queryFn, queryDescription = 'Unknown query') {
		if (!this.conn) {
			throw new Error('No database connection');
		}

		const startTime = Date.now();
		let isError = false;

		try {
			const result = await queryFn(this.conn);
			const queryTime = Date.now() - startTime;
			
			// Record successful query metrics
			if (typeof performanceMetrics !== 'undefined') {
				performanceMetrics.recordDatabaseQuery(queryTime, queryDescription, false);
			}
			
			return result;
		} catch (error) {
			isError = true;
			const queryTime = Date.now() - startTime;
			
			// Record error metrics
			if (typeof performanceMetrics !== 'undefined') {
				performanceMetrics.recordDatabaseQuery(queryTime, queryDescription, true);
			}
			
			// Check if it's a connection error
			if (this.isConnectionError(error)) {
				console.warn('🔄 Connection error detected, attempting reconnect...');
				
				if (this.reconnectAttempts < this.maxReconnectAttempts) {
					await this.attemptReconnect();
					// Retry the query with new connection - this will record new metrics
					return await this.executeQuery(queryFn, queryDescription);
				}
			}
			throw error;
		}
	}

	async attemptReconnect() {
		if (!this.dbPath) {
			throw new Error('No database path stored for reconnection');
		}

		this.reconnectAttempts++;
		
		console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
		
		// Exponential backoff
		await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
		this.reconnectDelay *= 2;

		const result = await this.connect(this.dbPath);
		if (!result.success) {
			throw new Error(`Reconnection failed: ${result.message}`);
		}
	}

	isConnectionError(error) {
		const connectionErrorPatterns = [
			'connection',
			'disconnected',
			'network',
			'timeout',
			'broken pipe',
			'socket'
		];
		
		const errorMessage = error.message.toLowerCase();
		return connectionErrorPatterns.some(pattern => errorMessage.includes(pattern));
	}

	isConnected() {
		return !!this.conn;
	}

	getConnection() {
		return this.conn;
	}

	getDatabase() {
		return this.db;
	}
}

const dbManager = new DatabaseManager();

// Automated backup system
class BackupManager {
	constructor() {
		this.backupDir = process.env.BACKUP_DIR || './backups';
		this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 10;
		this.backupInterval = parseInt(process.env.BACKUP_INTERVAL_HOURS) || 24; // hours
		this.isBackupRunning = false;
		this.lastBackupTime = null;
		this.backupHistory = [];
		
		// Ensure backup directory exists
		this.ensureBackupDirectory();
		
		// Start automated backup schedule (every 24 hours by default)
		if (process.env.NODE_ENV === 'production') {
			this.startAutomatedBackups();
		}
	}

	async ensureBackupDirectory() {
		try {
			await mkdir(this.backupDir, { recursive: true });
			console.log(`📁 Backup directory ready: ${this.backupDir}`);
		} catch (error) {
			console.error('❌ Failed to create backup directory:', error);
		}
	}

	startAutomatedBackups() {
		console.log(`🔄 Starting automated backups every ${this.backupInterval} hours`);
		
		// Run backup every specified interval
		setInterval(async () => {
			try {
				await this.createBackup('automated');
			} catch (error) {
				console.error('❌ Automated backup failed:', error);
			}
		}, this.backupInterval * 60 * 60 * 1000); // Convert hours to milliseconds
	}

	async createBackup(type = 'manual', description = '') {
		if (this.isBackupRunning) {
			throw new Error('Backup already in progress');
		}

		if (!dbManager.isConnected() || !dbManager.dbPath) {
			throw new Error('No database connected to backup');
		}

		this.isBackupRunning = true;
		const startTime = Date.now();

		try {
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const backupName = `kuzu-backup-${timestamp}`;
			const backupPath = path.join(this.backupDir, backupName);

			console.log(`📦 Creating ${type} backup: ${backupName}`);

			// Create backup directory
			await mkdir(backupPath, { recursive: true });

			// Copy all database files
			const dbFiles = await this.getDatabaseFiles(dbManager.dbPath);
			const copiedFiles = [];

			for (const file of dbFiles) {
				const sourcePath = path.join(dbManager.dbPath, file);
				const targetPath = path.join(backupPath, file);
				
				await copyFile(sourcePath, targetPath);
				copiedFiles.push(file);
			}

			// Create backup metadata
			const metadata = {
				backupName,
				type,
				description,
				timestamp: new Date().toISOString(),
				databasePath: dbManager.dbPath,
				files: copiedFiles,
				size: await this.getDirectorySize(backupPath),
				duration: Date.now() - startTime
			};

			// Save metadata
			const metadataPath = path.join(backupPath, 'backup-metadata.json');
			await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

			// Update backup history
			this.backupHistory.unshift(metadata);
			this.lastBackupTime = metadata.timestamp;

			// Clean up old backups
			await this.cleanupOldBackups();

			console.log(`✅ Backup completed: ${backupName} (${metadata.duration}ms)`);
			return metadata;

		} catch (error) {
			console.error('❌ Backup failed:', error);
			throw error;
		} finally {
			this.isBackupRunning = false;
		}
	}

	async getDatabaseFiles(dbPath) {
		try {
			const files = await readdir(dbPath);
			// Filter for typical Kùzu database files
			return files.filter(file => 
				file.endsWith('.kz') || 
				file.endsWith('.hindex') || 
				file.includes('catalog') || 
				file.includes('metadata') ||
				file.includes('data')
			);
		} catch (error) {
			console.error('Error reading database directory:', error);
			return [];
		}
	}

	async getDirectorySize(dirPath) {
		let totalSize = 0;
		try {
			const files = await readdir(dirPath);
			for (const file of files) {
				const filePath = path.join(dirPath, file);
				const stats = await stat(filePath);
				totalSize += stats.size;
			}
		} catch (error) {
			console.warn('Could not calculate directory size:', error);
		}
		return totalSize;
	}

	async cleanupOldBackups() {
		try {
			// Keep only the most recent backups
			while (this.backupHistory.length > this.maxBackups) {
				const oldBackup = this.backupHistory.pop();
				const backupPath = path.join(this.backupDir, oldBackup.backupName);
				
				try {
					await fs.promises.rm(backupPath, { recursive: true, force: true });
					console.log(`🗑️ Cleaned up old backup: ${oldBackup.backupName}`);
				} catch (cleanupError) {
					console.warn(`Failed to cleanup backup ${oldBackup.backupName}:`, cleanupError);
				}
			}
		} catch (error) {
			console.error('Error during backup cleanup:', error);
		}
	}

	async listBackups() {
		try {
			const backupDirs = await readdir(this.backupDir);
			const backups = [];

			for (const dir of backupDirs) {
				const backupPath = path.join(this.backupDir, dir);
				const metadataPath = path.join(backupPath, 'backup-metadata.json');

				try {
					const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));
					backups.push(metadata);
				} catch (error) {
					// Skip directories without valid metadata
					continue;
				}
			}

			// Sort by timestamp (newest first)
			return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
		} catch (error) {
			console.error('Error listing backups:', error);
			return [];
		}
	}

	getBackupStatus() {
		return {
			isRunning: this.isBackupRunning,
			lastBackupTime: this.lastBackupTime,
			backupCount: this.backupHistory.length,
			maxBackups: this.maxBackups,
			backupInterval: this.backupInterval,
			backupDir: this.backupDir,
			automatedBackupsEnabled: process.env.NODE_ENV === 'production'
		};
	}
}

const backupManager = new BackupManager();

let cypherService = null;
let nlService = null;

// Initialize Natural Language Service
if (process.env.OPENAI_API_KEY) {
	nlService = new NaturalLanguageService(process.env.OPENAI_API_KEY);
	console.log('✅ Natural Language Service initialized');
} else {
	console.warn('⚠️  No OpenAI API key found, natural language features disabled');
}

// Endpoint to connect to database
app.post('/api/connect', async (req, res) => {
	const { dbPath } = req.body;
	
	console.log('Connect request received for:', dbPath);
	
	// Require real database path
	if (!dbPath) {
		return res.json({ 
			success: false, 
			message: 'Database path required - please provide a valid Kùzu database path' 
		});
	}
	
	try {
		const result = await dbManager.connect(dbPath);
		
		if (result.success) {
			// Initialize CypherQueryService with managed connection
			cypherService = new CypherQueryService(dbManager.getConnection());
			console.log('✅ CypherQueryService initialized');
		}
		
		res.json(result);
	} catch (error) {
		console.error('Connection error:', error);
		res.json({ 
			success: false, 
			message: `Failed to connect to database: ${error.message}` 
		});
	}
});

// Endpoint to get nodes
app.get('/api/nodes', async (req, res) => {
	if (!dbManager.isConnected()) {
		return res.json({ success: false, message: 'Not connected to database' });
	}
	
	try {
		const result = await dbManager.executeQuery(async (conn) => {
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
					throw new Error('No node tables found');
				}
				targetTable = nodeTable.name;
			}
			
			// Get nodes from the table
			const query = `MATCH (n:${targetTable}) RETURN n LIMIT ${limit};`;
			const queryResult = await conn.query(query);
			const nodes = await queryResult.getAll();
			
			return {
				success: true,
				tableName: targetTable,
				nodes: nodes.map((row) => {
					const node = row.n;
					// Create consistent ID that matches edge format
					const nodeId = `${node._label}_${node._id.offset}`;
					
					return {
						id: nodeId,
						data: node,
						type: node._label, // Extract the node type for color coding
						label: node.name || node.id || node.title || `${node._label} ${node._id.offset}`
					};
				})
			};
		});
		
		res.json(result);
	} catch (error) {
		res.json({ success: false, message: error.message });
	}
});

// Endpoint to get edges
app.get('/api/edges', async (req, res) => {
	if (!dbManager.isConnected()) {
		return res.json({ success: false, message: 'Not connected to database' });
	}
	
	try {
		const result = await dbManager.executeQuery(async (conn) => {
			// First get all relationship tables
			const tablesQuery = await conn.query('CALL show_tables() RETURN *');
			const tables = await tablesQuery.getAll();
			const relTables = tables.filter(t => t.type === 'REL').map(t => t.name);
			
			if (relTables.length === 0) {
				return { success: true, edges: [] };
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
			
			return {
				success: true,
				edges: allEdges
			};
		});
		
		res.json(result);
		
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
		// Return templates without creating a service with null connection
		res.json({
			success: true,
			templates: [
				{ name: "Show all nodes", query: "MATCH (n) RETURN n LIMIT 100" },
				{ name: "Show node types", query: "MATCH (n) RETURN DISTINCT labels(n) as types" },
				{ name: "Show relationships", query: "MATCH ()-[r]->() RETURN DISTINCT type(r) as relationships" }
			]
		});
		return;
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

// Voice endpoints

// Frontend logging endpoint - so we can see VR logs in terminal
app.post('/api/log', (req, res) => {
	const { level, message, data } = req.body;
	const timestamp = new Date().toISOString();
	
	const logPrefix = {
		'info': '📘',
		'warn': '⚠️',
		'error': '❌',
		'debug': '🔍'
	}[level] || '📄';
	
	console.log(`\n${logPrefix} [FRONTEND ${timestamp}] ${message}`);
	if (data) {
		console.log('Data:', JSON.stringify(data, null, 2));
	}
	
	res.json({ success: true });
});

// Debug endpoint to test API key
app.get('/api/voice/debug', (req, res) => {
	const hasApiKey = !!process.env.OPENAI_API_KEY;
	const openaiReady = !!openai;
	
	res.json({
		success: true,
		debug: {
			hasApiKey,
			openaiReady,
			apiKeyPrefix: hasApiKey ? process.env.OPENAI_API_KEY.substring(0, 7) + '...' : 'NOT_FOUND',
			nodeVersion: process.version,
			platform: process.platform
		}
	});
});

// Test endpoint to verify OpenAI API connectivity
app.get('/api/voice/test', async (req, res) => {
	try {
		if (!openai) {
			return res.status(500).json({
				success: false,
				error: 'OpenAI client not initialized'
			});
		}

		console.log('🧪 Testing OpenAI API connectivity...');
		
		// Test with a simple completion request
		const completion = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo',
			messages: [{ role: 'user', content: 'Say "API test successful"' }],
			max_tokens: 10
		});

		console.log('✅ OpenAI API test successful');
		
		res.json({
			success: true,
			message: 'OpenAI API is working',
			testResponse: completion.choices[0].message.content
		});

	} catch (error) {
		console.error('❌ OpenAI API test failed:', error.message);
		res.status(500).json({
			success: false,
			error: error.message,
			type: error.constructor.name
		});
	}
});

// Transcribe audio using Whisper
app.post('/api/voice/transcribe', upload.single('audio'), async (req, res) => {
	console.log('\n🎤 === VOICE TRANSCRIPTION REQUEST RECEIVED ===');
	console.log('Timestamp:', new Date().toISOString());
	
	try {
		if (!req.file) {
			console.log('❌ No audio file provided in request');
			return res.status(400).json({
				success: false,
				error: { message: 'No audio file provided' }
			});
		}

		console.log('✅ Audio file received:', {
			size: req.file.size,
			mimetype: req.file.mimetype,
			originalname: req.file.originalname
		});

		// Check if API key is configured
		const hasApiKey = !!process.env.OPENAI_API_KEY;
		console.log('OpenAI API Key status:', hasApiKey ? '✅ Configured' : '❌ Missing');
		
		if (!hasApiKey) {
			console.log('❌ OpenAI API key not found in environment variables');
			return res.status(500).json({
				success: false,
				error: { message: 'OpenAI API key not configured' }
			});
		}

		// Check if openai client exists
		if (!openai) {
			console.log('❌ OpenAI client not initialized');
			return res.status(500).json({
				success: false,
				error: { message: 'OpenAI client not initialized' }
			});
		}

		// Write audio to temporary file - this is the most reliable method
		console.log('📝 Writing audio to temporary file...');
		const tempDir = '/tmp';
		const tempFilePath = `${tempDir}/audio_${Date.now()}.webm`;
		
		try {
			// Write buffer to temporary file
			fs.writeFileSync(tempFilePath, req.file.buffer);
			console.log('✅ Audio file written to:', tempFilePath);
			console.log('File size:', fs.statSync(tempFilePath).size, 'bytes');

			// Send to Whisper API using file path
			console.log('🚀 Sending request to OpenAI Whisper API...');
			console.log('Request details:', {
				model: 'whisper-1',
				language: 'en',
				filePath: tempFilePath
			});
			
			const transcription = await openai.audio.transcriptions.create({
				file: fs.createReadStream(tempFilePath),
				model: 'whisper-1',
				language: 'en'
			});
			console.log('✅ OpenAI API response received');
			
			// Clean up temporary file
			try {
				fs.unlinkSync(tempFilePath);
				console.log('🗑️ Temporary file deleted');
			} catch (cleanupError) {
				console.warn('⚠️ Failed to delete temp file:', cleanupError.message);
			}

			const transcript = transcription.text.trim();
			console.log('\n========================================');
			console.log('🎤 VOICE TRANSCRIPT RECEIVED:');
			console.log(`"${transcript}"`);
			console.log('========================================\n');

			res.json({
				success: true,
				transcript: transcript,
				confidence: 1.0 // Whisper doesn't provide confidence scores
			});
			
		} catch (fileError) {
			console.error('❌ File processing error:', fileError.message);
			throw fileError; // Re-throw to be caught by main catch block
		}

	} catch (error) {
		console.error('\n❌ === TRANSCRIPTION ERROR ===');
		console.error('Error type:', error.constructor.name);
		console.error('Error message:', error.message);
		console.error('Error stack:', error.stack);
		if (error.response) {
			console.error('API response status:', error.response.status);
			console.error('API response data:', error.response.data);
		}
		console.error('=================================\n');
		
		res.status(500).json({
			success: false,
			error: {
				message: 'Failed to transcribe audio',
				details: error.message,
				type: error.constructor.name
			}
		});
	}
});

// Get database schema
app.get('/api/schema', async (req, res) => {
	if (!dbManager.isConnected()) {
		return res.json({ success: false, message: 'Not connected to database' });
	}
	
	try {
		const result = await dbManager.executeQuery(async (conn) => {
			// Get all tables and their types
			const tablesQuery = await conn.query('CALL show_tables() RETURN *');
			const tables = await tablesQuery.getAll();
			
			const nodeTypes = tables.filter(t => t.type === 'NODE').map(t => t.name);
			const relationshipTypes = tables.filter(t => t.type === 'REL').map(t => t.name);
			
			// Get sample data to understand common properties
			const sampleData = {};
			for (const nodeType of nodeTypes.slice(0, 5)) { // Limit to first 5 for performance
				try {
					const sampleQuery = await conn.query(`MATCH (n:${nodeType}) RETURN n LIMIT 3`);
					const samples = await sampleQuery.getAll();
					if (samples.length > 0) {
						const properties = Object.keys(samples[0].n).filter(key => !key.startsWith('_'));
						sampleData[nodeType] = properties;
					}
				} catch (err) {
					console.warn(`Failed to get sample for ${nodeType}:`, err.message);
				}
			}
			
			return {
				success: true,
				schema: {
					nodeTypes,
					relationshipTypes,
					sampleProperties: sampleData
				}
			};
		});
		
		res.json(result);
	} catch (error) {
		console.error('Failed to get schema:', error);
		res.json({ 
			success: false, 
			message: `Failed to get schema: ${error.message}` 
		});
	}
});

// Database health monitoring
let dbHealthStatus = {
	isConnected: false,
	lastCheck: null,
	lastError: null,
	checkCount: 0,
	errorCount: 0
};

// Health check function
const checkDatabaseHealth = async () => {
	dbHealthStatus.checkCount++;
	dbHealthStatus.lastCheck = new Date().toISOString();

	try {
		if (!dbManager.isConnected()) {
			throw new Error('No database connection');
		}

		// Simple query to test connection using managed connection
		await dbManager.executeQuery(async (conn) => {
			return await conn.query('RETURN 1 as test');
		}, 'Health check query');
		
		dbHealthStatus.isConnected = true;
		dbHealthStatus.lastError = null;
		
		return true;
	} catch (error) {
		dbHealthStatus.isConnected = false;
		dbHealthStatus.lastError = error.message;
		dbHealthStatus.errorCount++;
		
		console.warn(`❌ Database health check failed: ${error.message}`);
		return false;
	}
};

// Periodic health check (every 5 minutes)
setInterval(checkDatabaseHealth, 5 * 60 * 1000);

// Health endpoint for monitoring systems
app.get('/api/health', async (req, res) => {
	const isHealthy = await checkDatabaseHealth();
	
	const response = {
		status: isHealthy ? 'healthy' : 'unhealthy',
		timestamp: new Date().toISOString(),
		database: dbHealthStatus,
		server: {
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			pid: process.pid,
			version: process.version
		}
	};

	res.status(isHealthy ? 200 : 503).json(response);
});

// Detailed health endpoint for debugging
app.get('/api/health/detailed', async (req, res) => {
	const isHealthy = await checkDatabaseHealth();
	
	const response = {
		status: isHealthy ? 'healthy' : 'unhealthy',
		timestamp: new Date().toISOString(),
		database: {
			...dbHealthStatus,
			connectionExists: dbManager.isConnected(),
			databaseExists: !!dbManager.getDatabase()
		},
		server: {
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			pid: process.pid,
			version: process.version,
			platform: process.platform,
			arch: process.arch
		},
		services: {
			openai: !!openai,
			nlService: !!nlService,
			cypherService: !!cypherService
		}
	};

	res.status(isHealthy ? 200 : 503).json(response);
});

// Performance metrics endpoints
app.get('/api/metrics', (req, res) => {
	const metrics = performanceMetrics.getMetrics();
	res.json({
		success: true,
		metrics,
		timestamp: new Date().toISOString()
	});
});

// Performance metrics summary (for monitoring dashboards)
app.get('/api/metrics/summary', (req, res) => {
	const metrics = performanceMetrics.getMetrics();
	
	const summary = {
		requests: {
			total: metrics.requests.total,
			errors: metrics.requests.errors,
			errorRate: metrics.requests.total > 0 ? (metrics.requests.errors / metrics.requests.total * 100).toFixed(2) + '%' : '0%'
		},
		performance: {
			averageResponseTime: Math.round(metrics.timing.averageResponseTime) + 'ms',
			slowestEndpoint: metrics.timing.slowestEndpoints[0]?.endpoint || 'N/A',
			slowestTime: metrics.timing.slowestEndpoints[0]?.slowestTime ? Math.round(metrics.timing.slowestEndpoints[0].slowestTime) + 'ms' : 'N/A'
		},
		database: {
			queryCount: metrics.database.queryCount,
			averageQueryTime: Math.round(metrics.database.averageQueryTime) + 'ms',
			connectionErrors: metrics.database.connectionErrors,
			slowQueriesCount: metrics.database.slowQueries.length
		},
		system: {
			uptime: Math.round(metrics.system.uptime / 1000) + 's',
			currentConnections: metrics.system.currentConnections,
			memoryUsage: Math.round(metrics.system.currentMemoryUsage.heapUsed / 1024 / 1024) + 'MB',
			peakMemory: Math.round(metrics.system.peakMemoryUsage / 1024 / 1024) + 'MB'
		}
	};
	
	res.json({
		success: true,
		summary,
		timestamp: new Date().toISOString()
	});
});

// Reset metrics (for testing/debugging)
app.post('/api/metrics/reset', (req, res) => {
	performanceMetrics.resetMetrics();
	res.json({
		success: true,
		message: 'Performance metrics reset',
		timestamp: new Date().toISOString()
	});
});

// API information endpoint
app.get('/api/info', (req, res) => {
	res.json({
		success: true,
		api: {
			name: 'Kùzu 3D VR API',
			version: req.apiVersion,
			supportedVersions: apiVersionManager.supportedVersions,
			defaultVersion: apiVersionManager.defaultVersion,
			deprecatedVersions: apiVersionManager.deprecatedVersions
		},
		server: {
			nodeVersion: process.version,
			platform: process.platform,
			arch: process.arch,
			uptime: process.uptime()
		},
		features: {
			compression: true,
			healthMonitoring: true,
			performanceMetrics: true,
			apiVersioning: true,
			gracefulShutdown: true,
			requestTimeouts: true,
			databaseConnectionManagement: true,
			automatedBackups: true
		},
		timestamp: new Date().toISOString()
	});
});

// Backup system endpoints
app.get('/api/backup/status', (req, res) => {
	const status = backupManager.getBackupStatus();
	res.json({
		success: true,
		status,
		timestamp: new Date().toISOString()
	});
});

app.get('/api/backup/list', async (req, res) => {
	try {
		const backups = await backupManager.listBackups();
		res.json({
			success: true,
			backups,
			count: backups.length,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

app.post('/api/backup/create', async (req, res) => {
	try {
		const { description = '' } = req.body;
		
		const backup = await backupManager.createBackup('manual', description);
		res.json({
			success: true,
			backup,
			message: 'Manual backup created successfully',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

// Convert natural language to Cypher (for future use)
app.post('/api/cypher/fromText', async (req, res) => {
	try {
		const { text, context = {} } = req.body;

		if (!text) {
			return res.status(400).json({
				success: false,
				error: { message: 'Text is required' }
			});
		}

		if (!nlService) {
			return res.status(503).json({
				success: false,
				error: { message: 'Natural language service not available. Please set OPENAI_API_KEY.' }
			});
		}

		// Check if this is a layout command
		if (nlService.isLayoutCommand(text)) {
			return res.json({
				success: true,
				isLayoutCommand: true,
				cypher: null,
				message: 'This is a layout command, not a query'
			});
		}

		// Get current database schema
		let schema = null;
		if (dbManager.isConnected()) {
			try {
				const schemaResult = await dbManager.executeQuery(async (conn) => {
					const tablesQuery = await conn.query('CALL show_tables() RETURN *');
					const tables = await tablesQuery.getAll();
					
					const nodeTypes = tables.filter(t => t.type === 'NODE').map(t => t.name);
					const relationshipTypes = tables.filter(t => t.type === 'REL').map(t => t.name);
					
					return { nodeTypes, relationshipTypes };
				});
				
				schema = schemaResult;
				
				console.log('🔍 Database Schema for NL conversion:');
				console.log('Node Types:', schema.nodeTypes);
				console.log('Relationship Types:', schema.relationshipTypes);
				
			} catch (schemaError) {
				console.warn('Failed to get schema for NL conversion:', schemaError.message);
			}
		}

		try {
			const cypherQuery = await nlService.convertToCypher(text, schema);
			res.json({
				success: true,
				cypher: cypherQuery,
				originalText: text
			});
		} catch (conversionError) {
			console.error('Cypher conversion error:', conversionError);
			throw conversionError;
		}

	} catch (error) {
		console.error('Cypher generation error:', error);
		res.status(500).json({
			success: false,
			error: {
				message: 'Failed to generate Cypher',
				details: error.message
			}
		});
	}
});

const PORT = process.env.PORT || 3000;

// Check if port is already in use before starting
const server = app.listen(PORT, (err) => {
	if (err) {
		if (err.code === 'EADDRINUSE') {
			console.error(`❌ Port ${PORT} is already in use. Please stop other processes or use a different port.`);
			console.log(`💡 To fix: Run "lsof -ti:${PORT} | xargs kill -9" or set PORT environment variable`);
			process.exit(1);
		} else {
			console.error(`❌ Server failed to start:`, err);
			process.exit(1);
		}
	} else {
		console.log(`✅ Kùzu server running on http://localhost:${PORT}`);
	}
});

// Graceful shutdown handling
let isShuttingDown = false;

// Set server timeout for graceful shutdown
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

const gracefulShutdown = (signal) => {
	if (isShuttingDown) {
		console.log(`Forceful shutdown initiated by ${signal}`);
		process.exit(1);
	}

	console.log(`\n🛑 Graceful shutdown initiated by ${signal}...`);
	isShuttingDown = true;

	// Stop accepting new connections
	server.close((err) => {
		if (err) {
			console.error('❌ Error during server close:', err);
			process.exit(1);
		}

		console.log('✅ HTTP server closed');

		// Close database connections
		const closeDatabase = async () => {
			try {
				console.log('🔌 Closing database connections...');
				await dbManager.disconnect();
				console.log('✅ Database connections closed');
			} catch (error) {
				console.error('❌ Error closing database:', error);
			}

			console.log('👋 Graceful shutdown complete');
			process.exit(0);
		};

		closeDatabase();
	});

	// Force shutdown after 30 seconds
	setTimeout(() => {
		console.error('❌ Forced shutdown - timeout exceeded');
		process.exit(1);
	}, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
	console.error('❌ Uncaught Exception:', error);
	gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
	gracefulShutdown('unhandledRejection');
});