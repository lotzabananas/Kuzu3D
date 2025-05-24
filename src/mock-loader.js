export class MockLoader {
	constructor() {
		this.connected = false;
		this.currentDatabase = null;
		this.loadedData = null;
		
		// Available sample databases
		this.databases = {
			'demo': null, // Built-in demo data
			'social-network': this.getSocialNetworkData(),
			'knowledge-graph': this.getKnowledgeGraphData(),
			'movie-database': this.getMovieData()
		};
		
		// Built-in demo data
		this.demoData = {
			name: 'Demo Database',
			nodes: [
				{ id: 1, type: 'Person', label: 'Alice', properties: { age: 30, role: 'Engineer' } },
				{ id: 2, type: 'Person', label: 'Bob', properties: { age: 25, role: 'Designer' } },
				{ id: 3, type: 'Person', label: 'Charlie', properties: { age: 35, role: 'Manager' } },
				{ id: 4, type: 'Person', label: 'Diana', properties: { age: 28, role: 'Developer' } },
				{ id: 5, type: 'Person', label: 'Eve', properties: { age: 32, role: 'Researcher' } },
				{ id: 6, type: 'Company', label: 'TechCorp', properties: { employees: 100, founded: 2010 } },
				{ id: 7, type: 'Company', label: 'DataSolutions', properties: { employees: 50, founded: 2015 } },
				{ id: 8, type: 'Project', label: 'VR Explorer', properties: { status: 'Active', budget: 500000 } },
				{ id: 9, type: 'Project', label: 'Graph Analytics', properties: { status: 'Planning', budget: 300000 } },
				{ id: 10, type: 'Technology', label: 'WebXR', properties: { type: 'Framework', year: 2018 } },
				{ id: 11, type: 'Technology', label: 'Three.js', properties: { type: 'Library', year: 2010 } },
				{ id: 12, type: 'Technology', label: 'Kùzu', properties: { type: 'Database', year: 2022 } },
				{ id: 13, type: 'Location', label: 'San Francisco', properties: { country: 'USA', lat: 37.7749, lng: -122.4194 } },
				{ id: 14, type: 'Location', label: 'Seattle', properties: { country: 'USA', lat: 47.6062, lng: -122.3321 } },
				{ id: 15, type: 'Event', label: 'Tech Conference 2024', properties: { date: '2024-06-15', attendees: 500 } },
				{ id: 16, type: 'Person', label: 'Frank', properties: { age: 45, role: 'CEO' } },
				{ id: 17, type: 'Person', label: 'Grace', properties: { age: 27, role: 'Analyst' } },
				{ id: 18, type: 'Person', label: 'Henry', properties: { age: 38, role: 'Architect' } },
				{ id: 19, type: 'Person', label: 'Iris', properties: { age: 29, role: 'Product Manager' } },
				{ id: 20, type: 'Person', label: 'Jack', properties: { age: 31, role: 'Data Scientist' } }
			],
			edges: [
				{ from: 1, to: 6, type: 'WORKS_AT', properties: { since: 2020 } },
				{ from: 2, to: 6, type: 'WORKS_AT', properties: { since: 2021 } },
				{ from: 3, to: 6, type: 'MANAGES', properties: { department: 'Engineering' } },
				{ from: 4, to: 7, type: 'WORKS_AT', properties: { since: 2019 } },
				{ from: 5, to: 7, type: 'WORKS_AT', properties: { since: 2022 } },
				{ from: 8, to: 10, type: 'USES', properties: {} },
				{ from: 8, to: 11, type: 'USES', properties: {} },
				{ from: 9, to: 12, type: 'USES', properties: {} },
				{ from: 1, to: 8, type: 'WORKS_ON', properties: { role: 'Lead Developer' } },
				{ from: 2, to: 8, type: 'WORKS_ON', properties: { role: 'UI Designer' } },
				{ from: 6, to: 13, type: 'LOCATED_IN', properties: {} },
				{ from: 7, to: 14, type: 'LOCATED_IN', properties: {} },
				{ from: 1, to: 15, type: 'ATTENDING', properties: {} },
				{ from: 3, to: 15, type: 'SPEAKING_AT', properties: { topic: 'Graph Databases' } }
			]
		};
	}

	async connect(dbPath) {
		// Simulate connection delay
		await new Promise(resolve => setTimeout(resolve, 300));
		
		// Check if it's one of our sample databases
		if (this.databases.hasOwnProperty(dbPath)) {
			this.currentDatabase = dbPath;
			
			// Load the database data
			if (dbPath !== 'demo' && this.databases[dbPath]) {
				this.loadedData = this.databases[dbPath];
			} else {
				this.loadedData = this.demoData;
			}
			
			this.connected = true;
			return { 
				success: true, 
				message: `Connected to ${this.loadedData.name || dbPath}` 
			};
		}
		
		// Default to demo if unknown database
		this.currentDatabase = 'demo';
		this.loadedData = this.demoData;
		this.connected = true;
		return { success: true, message: 'Connected to demo database' };
	}

	async getNodes(tableName = null, limit = 500) {
		if (!this.connected || !this.loadedData) {
			return { success: false, message: 'Not connected to database' };
		}

		// Simulate query delay
		await new Promise(resolve => setTimeout(resolve, 200));

		const nodes = this.loadedData.nodes || [];
		
		// Filter by type if tableName is provided
		let filteredNodes = nodes;
		if (tableName) {
			filteredNodes = nodes.filter(node => node.type === tableName);
		}
		
		// Apply limit
		const limitedNodes = filteredNodes.slice(0, limit);
		
		// Format nodes for the app
		const formattedNodes = limitedNodes.map(node => ({
			id: node.id,
			data: {
				...node.properties,
				name: node.label,
				type: node.type
			},
			label: node.label || `Node ${node.id}`
		}));
		
		return {
			success: true,
			tableName: tableName || 'All Nodes',
			nodes: formattedNodes
		};
	}
	
	async getEdges() {
		if (!this.connected || !this.loadedData) {
			return { success: false, message: 'Not connected to database' };
		}
		
		// Simulate query delay
		await new Promise(resolve => setTimeout(resolve, 100));
		
		return {
			success: true,
			edges: this.loadedData.edges || []
		};
	}
	
	async getNodeTypes() {
		if (!this.connected || !this.loadedData) {
			return { success: false, message: 'Not connected to database' };
		}
		
		const types = new Set();
		this.loadedData.nodes.forEach(node => {
			if (node.type) types.add(node.type);
		});
		
		return {
			success: true,
			types: Array.from(types)
		};
	}

	disconnect() {
		this.connected = false;
		this.currentDatabase = null;
		this.loadedData = null;
	}
	
	getSocialNetworkData() {
		return {
			name: "Social Network",
			description: "A social network of people, their relationships, and interests",
			nodes: [
				{id: "p1", type: "Person", label: "Alice Chen", properties: {age: 28, city: "San Francisco", profession: "Software Engineer"}},
				{id: "p2", type: "Person", label: "Bob Smith", properties: {age: 32, city: "New York", profession: "Data Scientist"}},
				{id: "p3", type: "Person", label: "Carol Johnson", properties: {age: 29, city: "Seattle", profession: "Product Manager"}},
				{id: "p4", type: "Person", label: "David Lee", properties: {age: 35, city: "Austin", profession: "UX Designer"}},
				{id: "p5", type: "Person", label: "Emma Wilson", properties: {age: 27, city: "Boston", profession: "Marketing Manager"}},
				{id: "p6", type: "Person", label: "Frank Garcia", properties: {age: 31, city: "Los Angeles", profession: "Entrepreneur"}},
				{id: "p7", type: "Person", label: "Grace Kim", properties: {age: 26, city: "Chicago", profession: "Consultant"}},
				{id: "p8", type: "Person", label: "Henry Brown", properties: {age: 33, city: "Denver", profession: "Architect"}},
				{id: "p9", type: "Person", label: "Ivy Martinez", properties: {age: 30, city: "Miami", profession: "Teacher"}},
				{id: "p10", type: "Person", label: "Jack Davis", properties: {age: 34, city: "Portland", profession: "Chef"}},
				{id: "p11", type: "Person", label: "Karen Miller", properties: {age: 29, city: "Phoenix", profession: "Nurse"}},
				{id: "p12", type: "Person", label: "Liam Anderson", properties: {age: 28, city: "Philadelphia", profession: "Lawyer"}},
				{id: "p13", type: "Person", label: "Mia Thompson", properties: {age: 27, city: "San Diego", profession: "Graphic Designer"}},
				{id: "p14", type: "Person", label: "Noah White", properties: {age: 32, city: "Dallas", profession: "Financial Analyst"}},
				{id: "p15", type: "Person", label: "Olivia Harris", properties: {age: 31, city: "Houston", profession: "Research Scientist"}},
				{id: "p16", type: "Person", label: "Peter Clark", properties: {age: 36, city: "Atlanta", profession: "Sales Manager"}},
				{id: "p17", type: "Person", label: "Quinn Lewis", properties: {age: 29, city: "Minneapolis", profession: "Writer"}},
				{id: "p18", type: "Person", label: "Rachel Walker", properties: {age: 28, city: "Detroit", profession: "Musician"}},
				{id: "p19", type: "Person", label: "Sam Hall", properties: {age: 30, city: "Tampa", profession: "Photographer"}},
				{id: "p20", type: "Person", label: "Tina Young", properties: {age: 33, city: "Nashville", profession: "Doctor"}},
				{id: "c1", type: "Company", label: "TechCorp", properties: {industry: "Technology", size: "Large"}},
				{id: "c2", type: "Company", label: "DataSolutions", properties: {industry: "Analytics", size: "Medium"}},
				{id: "c3", type: "Company", label: "DesignHub", properties: {industry: "Design", size: "Small"}},
				{id: "c4", type: "Company", label: "HealthPlus", properties: {industry: "Healthcare", size: "Large"}},
				{id: "c5", type: "Company", label: "EduTech", properties: {industry: "Education", size: "Medium"}},
				{id: "l1", type: "Location", label: "San Francisco", properties: {state: "CA", population: 874961}},
				{id: "l2", type: "Location", label: "New York", properties: {state: "NY", population: 8336817}},
				{id: "l3", type: "Location", label: "Seattle", properties: {state: "WA", population: 753675}},
				{id: "l4", type: "Location", label: "Austin", properties: {state: "TX", population: 978908}},
				{id: "l5", type: "Location", label: "Boston", properties: {state: "MA", population: 692600}}
			],
			edges: [
				{from: "p1", to: "p2", type: "FRIENDS_WITH", properties: {since: "2020"}},
				{from: "p1", to: "p3", type: "FRIENDS_WITH", properties: {since: "2021"}},
				{from: "p2", to: "p4", type: "FRIENDS_WITH", properties: {since: "2019"}},
				{from: "p1", to: "c1", type: "WORKS_AT", properties: {position: "Senior Engineer", since: "2021"}},
				{from: "p2", to: "c2", type: "WORKS_AT", properties: {position: "Lead Data Scientist", since: "2020"}},
				{from: "p3", to: "c1", type: "WORKS_AT", properties: {position: "Product Manager", since: "2022"}},
				{from: "p1", to: "l1", type: "LIVES_IN", properties: {since: "2019"}},
				{from: "p2", to: "l2", type: "LIVES_IN", properties: {since: "2018"}},
				{from: "p3", to: "l3", type: "LIVES_IN", properties: {since: "2020"}}
			]
		};
	}
	
	getKnowledgeGraphData() {
		return {
			name: "Computer Science Knowledge Graph",
			description: "A knowledge graph of computer science concepts, languages, and their relationships",
			nodes: [
				{id: "cs1", type: "Field", label: "Computer Science", properties: {founded: "1940s", importance: "Critical"}},
				{id: "cs2", type: "Field", label: "Artificial Intelligence", properties: {founded: "1956", importance: "High"}},
				{id: "cs3", type: "Field", label: "Machine Learning", properties: {founded: "1959", importance: "High"}},
				{id: "cs4", type: "Field", label: "Deep Learning", properties: {founded: "2006", importance: "High"}},
				{id: "cs5", type: "Field", label: "Data Science", properties: {founded: "2008", importance: "High"}},
				{id: "lang1", type: "Language", label: "Python", properties: {year: 1991, paradigm: "Multi-paradigm"}},
				{id: "lang2", type: "Language", label: "JavaScript", properties: {year: 1995, paradigm: "Multi-paradigm"}},
				{id: "lang3", type: "Language", label: "Java", properties: {year: 1995, paradigm: "Object-oriented"}},
				{id: "lang4", type: "Language", label: "C++", properties: {year: 1985, paradigm: "Multi-paradigm"}},
				{id: "lang5", type: "Language", label: "Go", properties: {year: 2009, paradigm: "Concurrent"}},
				{id: "tech1", type: "Technology", label: "TensorFlow", properties: {type: "ML Framework", year: 2015}},
				{id: "tech2", type: "Technology", label: "PyTorch", properties: {type: "ML Framework", year: 2016}},
				{id: "tech3", type: "Technology", label: "React", properties: {type: "Web Framework", year: 2013}},
				{id: "tech4", type: "Technology", label: "Docker", properties: {type: "Container", year: 2013}},
				{id: "tech5", type: "Technology", label: "Kubernetes", properties: {type: "Orchestration", year: 2014}},
				{id: "person1", type: "Person", label: "Alan Turing", properties: {birth: 1912, contribution: "Turing Machine"}},
				{id: "person2", type: "Person", label: "Grace Hopper", properties: {birth: 1906, contribution: "First Compiler"}},
				{id: "person3", type: "Person", label: "Tim Berners-Lee", properties: {birth: 1955, contribution: "World Wide Web"}},
				{id: "org1", type: "Organization", label: "MIT", properties: {founded: 1861, type: "University"}},
				{id: "org2", type: "Organization", label: "Google", properties: {founded: 1998, type: "Company"}}
			],
			edges: [
				{from: "cs2", to: "cs1", type: "SUBFIELD_OF", properties: {}},
				{from: "cs3", to: "cs2", type: "SUBFIELD_OF", properties: {}},
				{from: "cs4", to: "cs3", type: "SUBFIELD_OF", properties: {}},
				{from: "lang1", to: "cs3", type: "USED_IN", properties: {popularity: "Very High"}},
				{from: "lang2", to: "cs1", type: "USED_IN", properties: {popularity: "Very High"}},
				{from: "tech1", to: "lang1", type: "WRITTEN_IN", properties: {}},
				{from: "tech2", to: "lang1", type: "WRITTEN_IN", properties: {}},
				{from: "person1", to: "cs1", type: "PIONEER_OF", properties: {}},
				{from: "person2", to: "cs1", type: "PIONEER_OF", properties: {}},
				{from: "org1", to: "cs2", type: "RESEARCH_CENTER", properties: {}}
			]
		};
	}
	
	getMovieData() {
		return {
			name: "Movie Database",
			description: "A comprehensive movie database with films, actors, directors, and their relationships",
			nodes: [
				{id: "m1", type: "Movie", label: "The Matrix", properties: {year: 1999, rating: 8.7, budget: 63000000}},
				{id: "m2", type: "Movie", label: "Inception", properties: {year: 2010, rating: 8.8, budget: 160000000}},
				{id: "m3", type: "Movie", label: "The Dark Knight", properties: {year: 2008, rating: 9.0, budget: 185000000}},
				{id: "m4", type: "Movie", label: "Pulp Fiction", properties: {year: 1994, rating: 8.9, budget: 8000000}},
				{id: "m5", type: "Movie", label: "Interstellar", properties: {year: 2014, rating: 8.6, budget: 165000000}},
				{id: "a1", type: "Actor", label: "Keanu Reeves", properties: {birth_year: 1964, nationality: "Canadian"}},
				{id: "a2", type: "Actor", label: "Leonardo DiCaprio", properties: {birth_year: 1974, nationality: "American"}},
				{id: "a3", type: "Actor", label: "Christian Bale", properties: {birth_year: 1974, nationality: "British"}},
				{id: "a4", type: "Actor", label: "John Travolta", properties: {birth_year: 1954, nationality: "American"}},
				{id: "a5", type: "Actor", label: "Matthew McConaughey", properties: {birth_year: 1969, nationality: "American"}},
				{id: "d1", type: "Director", label: "Lana Wachowski", properties: {birth_year: 1965, nationality: "American"}},
				{id: "d2", type: "Director", label: "Christopher Nolan", properties: {birth_year: 1970, nationality: "British"}},
				{id: "d3", type: "Director", label: "Quentin Tarantino", properties: {birth_year: 1963, nationality: "American"}},
				{id: "g1", type: "Genre", label: "Science Fiction", properties: {popularity: "High"}},
				{id: "g2", type: "Genre", label: "Action", properties: {popularity: "Very High"}},
				{id: "g3", type: "Genre", label: "Drama", properties: {popularity: "High"}},
				{id: "g4", type: "Genre", label: "Crime", properties: {popularity: "Medium"}},
				{id: "g5", type: "Genre", label: "Thriller", properties: {popularity: "High"}},
				{id: "s1", type: "Studio", label: "Warner Bros", properties: {founded: 1923, headquarters: "California"}},
				{id: "s2", type: "Studio", label: "Paramount Pictures", properties: {founded: 1912, headquarters: "California"}},
				{id: "s3", type: "Studio", label: "Universal Pictures", properties: {founded: 1912, headquarters: "California"}}
			],
			edges: [
				{from: "a1", to: "m1", type: "ACTED_IN", properties: {role: "Neo", billing: 1}},
				{from: "a2", to: "m2", type: "ACTED_IN", properties: {role: "Dom Cobb", billing: 1}},
				{from: "a3", to: "m3", type: "ACTED_IN", properties: {role: "Bruce Wayne/Batman", billing: 1}},
				{from: "a4", to: "m4", type: "ACTED_IN", properties: {role: "Vincent Vega", billing: 1}},
				{from: "a5", to: "m5", type: "ACTED_IN", properties: {role: "Cooper", billing: 1}},
				{from: "d1", to: "m1", type: "DIRECTED", properties: {}},
				{from: "d2", to: "m2", type: "DIRECTED", properties: {}},
				{from: "d2", to: "m3", type: "DIRECTED", properties: {}},
				{from: "d3", to: "m4", type: "DIRECTED", properties: {}},
				{from: "d2", to: "m5", type: "DIRECTED", properties: {}},
				{from: "m1", to: "g1", type: "BELONGS_TO", properties: {}},
				{from: "m1", to: "g2", type: "BELONGS_TO", properties: {}},
				{from: "m2", to: "g1", type: "BELONGS_TO", properties: {}},
				{from: "m2", to: "g5", type: "BELONGS_TO", properties: {}},
				{from: "m3", to: "g2", type: "BELONGS_TO", properties: {}},
				{from: "m4", to: "g4", type: "BELONGS_TO", properties: {}},
				{from: "m5", to: "g1", type: "BELONGS_TO", properties: {}},
				{from: "m1", to: "s1", type: "PRODUCED_BY", properties: {}},
				{from: "m2", to: "s1", type: "PRODUCED_BY", properties: {}},
				{from: "m3", to: "s1", type: "PRODUCED_BY", properties: {}}
			]
		};
	}
}