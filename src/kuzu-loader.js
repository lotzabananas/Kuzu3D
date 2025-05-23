export class KuzuLoader {
	constructor() {
		this.apiUrl = '/api';
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
			return { success: false, message: `Failed to connect: ${error.message}` };
		}
	}

	async getNodes(tableName = null, limit = 500) {
		if (!this.connected) {
			return { success: false, message: 'Not connected to database' };
		}

		try {
			const params = new URLSearchParams();
			if (tableName) params.append('table', tableName);
			params.append('limit', limit);
			
			const response = await fetch(`${this.apiUrl}/nodes?${params}`);
			const result = await response.json();
			
			return result;
		} catch (error) {
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