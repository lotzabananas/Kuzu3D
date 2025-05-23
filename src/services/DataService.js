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
	
	disconnect() {
		this.connected = false;
	}
}