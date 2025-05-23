export class MockLoader {
	constructor() {
		this.connected = false;
		this.mockData = {
			Person: [
				{ id: 1, name: 'Alice', age: 30, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 2, name: 'Bob', age: 25, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 3, name: 'Charlie', age: 35, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 4, name: 'Diana', age: 28, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 5, name: 'Eve', age: 32, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 6, name: 'Frank', age: 45, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 7, name: 'Grace', age: 27, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 8, name: 'Henry', age: 38, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 9, name: 'Iris', age: 29, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 10, name: 'Jack', age: 31, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 11, name: 'Kate', age: 26, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 12, name: 'Leo', age: 34, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 13, name: 'Maya', age: 41, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 14, name: 'Noah', age: 23, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 15, name: 'Olivia', age: 36, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 16, name: 'Peter', age: 33, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 17, name: 'Quinn', age: 37, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 18, name: 'Rachel', age: 30, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 19, name: 'Sam', age: 28, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 },
				{ id: 20, name: 'Tara', age: 39, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 }
			],
			City: [
				{ id: 1, name: 'New York', population: 8000000 },
				{ id: 2, name: 'San Francisco', population: 900000 },
				{ id: 3, name: 'London', population: 9000000 },
				{ id: 4, name: 'Tokyo', population: 14000000 },
				{ id: 5, name: 'Paris', population: 2200000 }
			]
		};
	}

	async connect(dbPath) {
		// Simulate connection delay
		await new Promise(resolve => setTimeout(resolve, 500));
		this.connected = true;
		return { success: true, message: 'Connected to mock database' };
	}

	async getNodes(tableName = null, limit = 500) {
		if (!this.connected) {
			return { success: false, message: 'Not connected to database' };
		}

		// Simulate query delay
		await new Promise(resolve => setTimeout(resolve, 300));

		const table = tableName || 'Person';
		const nodes = this.mockData[table] || this.mockData.Person;
		
		return {
			success: true,
			tableName: table,
			nodes: nodes.slice(0, limit).map((node, index) => ({
				id: node.id,
				data: node,
				label: node.name || `Node ${index}`
			}))
		};
	}

	disconnect() {
		this.connected = false;
	}
}