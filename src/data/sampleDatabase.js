/**
 * Built-in sample database - no external setup required
 * This provides immediate functionality for users to try the app
 */

export const SAMPLE_DATABASE = {
	nodes: [
		// People
		{ id: 'person_1', type: 'Person', label: 'Alice Johnson', properties: { name: 'Alice Johnson', age: 30, department: 'Engineering', title: 'Senior Developer' } },
		{ id: 'person_2', type: 'Person', label: 'Bob Smith', properties: { name: 'Bob Smith', age: 28, department: 'Engineering', title: 'Frontend Developer' } },
		{ id: 'person_3', type: 'Person', label: 'Carol Davis', properties: { name: 'Carol Davis', age: 35, department: 'Design', title: 'UX Designer' } },
		{ id: 'person_4', type: 'Person', label: 'David Wilson', properties: { name: 'David Wilson', age: 32, department: 'Engineering', title: 'Backend Developer' } },
		{ id: 'person_5', type: 'Person', label: 'Eva Martinez', properties: { name: 'Eva Martinez', age: 29, department: 'Product', title: 'Product Manager' } },
		{ id: 'person_6', type: 'Person', label: 'Frank Chen', properties: { name: 'Frank Chen', age: 41, department: 'Engineering', title: 'Engineering Manager' } },
		{ id: 'person_7', type: 'Person', label: 'Grace Kim', properties: { name: 'Grace Kim', age: 26, department: 'Design', title: 'Visual Designer' } },
		{ id: 'person_8', type: 'Person', label: 'Henry Brown', properties: { name: 'Henry Brown', age: 38, department: 'Sales', title: 'Sales Director' } },
		{ id: 'person_9', type: 'Person', label: 'Ivy Rodriguez', properties: { name: 'Ivy Rodriguez', age: 33, department: 'Marketing', title: 'Marketing Manager' } },
		{ id: 'person_10', type: 'Person', label: 'Jack Thompson', properties: { name: 'Jack Thompson', age: 27, department: 'Engineering', title: 'DevOps Engineer' } },
		
		// Companies
		{ id: 'company_1', type: 'Company', label: 'TechCorp', properties: { name: 'TechCorp', founded: 2010, industry: 'Software', employees: 500, location: 'San Francisco' } },
		{ id: 'company_2', type: 'Company', label: 'DataSolutions', properties: { name: 'DataSolutions', founded: 2015, industry: 'Data Analytics', employees: 200, location: 'Austin' } },
		{ id: 'company_3', type: 'Company', label: 'CloudVentures', properties: { name: 'CloudVentures', founded: 2018, industry: 'Cloud Services', employees: 150, location: 'Seattle' } },
		
		// Projects
		{ id: 'project_1', type: 'Project', label: 'Mobile App v2.0', properties: { name: 'Mobile App v2.0', status: 'In Progress', startDate: '2024-01-15', deadline: '2024-06-30', budget: 500000 } },
		{ id: 'project_2', type: 'Project', label: 'Data Pipeline', properties: { name: 'Data Pipeline', status: 'Completed', startDate: '2023-09-01', deadline: '2024-02-28', budget: 300000 } },
		{ id: 'project_3', type: 'Project', label: 'AI Integration', properties: { name: 'AI Integration', status: 'Planning', startDate: '2024-07-01', deadline: '2024-12-31', budget: 800000 } },
		{ id: 'project_4', type: 'Project', label: 'Security Audit', properties: { name: 'Security Audit', status: 'In Progress', startDate: '2024-03-01', deadline: '2024-05-15', budget: 150000 } },
		
		// Technologies
		{ id: 'tech_1', type: 'Technology', label: 'React', properties: { name: 'React', type: 'Frontend Framework', version: '18.0', popularity: 9 } },
		{ id: 'tech_2', type: 'Technology', label: 'Node.js', properties: { name: 'Node.js', type: 'Backend Runtime', version: '20.0', popularity: 8 } },
		{ id: 'tech_3', type: 'Technology', label: 'PostgreSQL', properties: { name: 'PostgreSQL', type: 'Database', version: '15.0', popularity: 8 } },
		{ id: 'tech_4', type: 'Technology', label: 'Docker', properties: { name: 'Docker', type: 'Containerization', version: '24.0', popularity: 9 } },
		{ id: 'tech_5', type: 'Technology', label: 'Kubernetes', properties: { name: 'Kubernetes', type: 'Orchestration', version: '1.28', popularity: 7 } },
		{ id: 'tech_6', type: 'Technology', label: 'Python', properties: { name: 'Python', type: 'Programming Language', version: '3.11', popularity: 10 } },
		{ id: 'tech_7', type: 'Technology', label: 'TensorFlow', properties: { name: 'TensorFlow', type: 'ML Framework', version: '2.13', popularity: 8 } },
		
		// Locations
		{ id: 'location_1', type: 'Location', label: 'San Francisco Office', properties: { name: 'San Francisco Office', address: '123 Tech Street', city: 'San Francisco', state: 'CA', capacity: 300 } },
		{ id: 'location_2', type: 'Location', label: 'Austin Office', properties: { name: 'Austin Office', address: '456 Innovation Blvd', city: 'Austin', state: 'TX', capacity: 150 } },
		{ id: 'location_3', type: 'Location', label: 'Remote', properties: { name: 'Remote', address: 'Distributed', city: 'Various', state: 'Various', capacity: 1000 } },
		
		// Skills
		{ id: 'skill_1', type: 'Skill', label: 'JavaScript', properties: { name: 'JavaScript', category: 'Programming', difficulty: 'Intermediate', demand: 9 } },
		{ id: 'skill_2', type: 'Skill', label: 'UI/UX Design', properties: { name: 'UI/UX Design', category: 'Design', difficulty: 'Advanced', demand: 8 } },
		{ id: 'skill_3', type: 'Skill', label: 'Machine Learning', properties: { name: 'Machine Learning', category: 'AI', difficulty: 'Advanced', demand: 10 } },
		{ id: 'skill_4', type: 'Skill', label: 'DevOps', properties: { name: 'DevOps', category: 'Operations', difficulty: 'Advanced', demand: 8 } },
		{ id: 'skill_5', type: 'Skill', label: 'Product Strategy', properties: { name: 'Product Strategy', category: 'Business', difficulty: 'Advanced', demand: 7 } },
	],
	
	edges: [
		// Employment relationships
		{ from: 'person_1', to: 'company_1', type: 'WorksAt', properties: { since: '2021-03-15', role: 'Senior Developer' } },
		{ from: 'person_2', to: 'company_1', type: 'WorksAt', properties: { since: '2022-01-10', role: 'Frontend Developer' } },
		{ from: 'person_3', to: 'company_1', type: 'WorksAt', properties: { since: '2020-08-01', role: 'UX Designer' } },
		{ from: 'person_4', to: 'company_2', type: 'WorksAt', properties: { since: '2021-09-20', role: 'Backend Developer' } },
		{ from: 'person_5', to: 'company_1', type: 'WorksAt', properties: { since: '2023-02-01', role: 'Product Manager' } },
		{ from: 'person_6', to: 'company_1', type: 'WorksAt', properties: { since: '2019-05-15', role: 'Engineering Manager' } },
		{ from: 'person_7', to: 'company_3', type: 'WorksAt', properties: { since: '2023-06-01', role: 'Visual Designer' } },
		{ from: 'person_8', to: 'company_2', type: 'WorksAt', properties: { since: '2020-11-01', role: 'Sales Director' } },
		{ from: 'person_9', to: 'company_3', type: 'WorksAt', properties: { since: '2022-04-15', role: 'Marketing Manager' } },
		{ from: 'person_10', to: 'company_1', type: 'WorksAt', properties: { since: '2023-01-01', role: 'DevOps Engineer' } },
		
		// Management relationships
		{ from: 'person_6', to: 'person_1', type: 'Manages', properties: { since: '2021-03-15' } },
		{ from: 'person_6', to: 'person_2', type: 'Manages', properties: { since: '2022-01-10' } },
		{ from: 'person_6', to: 'person_10', type: 'Manages', properties: { since: 'project_1' } },
		
		// Project assignments
		{ from: 'person_1', to: 'project_1', type: 'WorksOn', properties: { role: 'Lead Developer', allocation: 0.8 } },
		{ from: 'person_2', to: 'project_1', type: 'WorksOn', properties: { role: 'Frontend Developer', allocation: 1.0 } },
		{ from: 'person_3', to: 'project_1', type: 'WorksOn', properties: { role: 'UX Designer', allocation: 0.6 } },
		{ from: 'person_5', to: 'project_1', type: 'WorksOn', properties: { role: 'Product Manager', allocation: 0.4 } },
		{ from: 'person_4', to: 'project_2', type: 'WorksOn', properties: { role: 'Backend Developer', allocation: 1.0 } },
		{ from: 'person_10', to: 'project_2', type: 'WorksOn', properties: { role: 'DevOps Engineer', allocation: 0.5 } },
		{ from: 'person_1', to: 'project_3', type: 'WorksOn', properties: { role: 'Technical Lead', allocation: 0.2 } },
		{ from: 'person_10', to: 'project_4', type: 'WorksOn', properties: { role: 'Security Engineer', allocation: 0.5 } },
		
		// Technology usage
		{ from: 'project_1', to: 'tech_1', type: 'Uses', properties: { primary: true, version: '18.0' } },
		{ from: 'project_1', to: 'tech_2', type: 'Uses', properties: { primary: true, version: '20.0' } },
		{ from: 'project_2', to: 'tech_3', type: 'Uses', properties: { primary: true, version: '15.0' } },
		{ from: 'project_2', to: 'tech_6', type: 'Uses', properties: { primary: true, version: '3.11' } },
		{ from: 'project_3', to: 'tech_6', type: 'Uses', properties: { primary: true, version: '3.11' } },
		{ from: 'project_3', to: 'tech_7', type: 'Uses', properties: { primary: true, version: '2.13' } },
		{ from: 'project_4', to: 'tech_4', type: 'Uses', properties: { primary: false, version: '24.0' } },
		{ from: 'project_4', to: 'tech_5', type: 'Uses', properties: { primary: false, version: '1.28' } },
		
		// Skills
		{ from: 'person_1', to: 'skill_1', type: 'HasSkill', properties: { level: 'Expert', years: 8 } },
		{ from: 'person_2', to: 'skill_1', type: 'HasSkill', properties: { level: 'Advanced', years: 5 } },
		{ from: 'person_2', to: 'tech_1', type: 'HasSkill', properties: { level: 'Expert', years: 4 } },
		{ from: 'person_3', to: 'skill_2', type: 'HasSkill', properties: { level: 'Expert', years: 10 } },
		{ from: 'person_4', to: 'tech_2', type: 'HasSkill', properties: { level: 'Advanced', years: 6 } },
		{ from: 'person_4', to: 'tech_3', type: 'HasSkill', properties: { level: 'Expert', years: 7 } },
		{ from: 'person_5', to: 'skill_5', type: 'HasSkill', properties: { level: 'Advanced', years: 5 } },
		{ from: 'person_6', to: 'skill_1', type: 'HasSkill', properties: { level: 'Expert', years: 12 } },
		{ from: 'person_7', to: 'skill_2', type: 'HasSkill', properties: { level: 'Intermediate', years: 3 } },
		{ from: 'person_10', to: 'skill_4', type: 'HasSkill', properties: { level: 'Advanced', years: 4 } },
		{ from: 'person_10', to: 'tech_4', type: 'HasSkill', properties: { level: 'Expert', years: 5 } },
		{ from: 'person_10', to: 'tech_5', type: 'HasSkill', properties: { level: 'Advanced', years: 3 } },
		
		// Location relationships
		{ from: 'company_1', to: 'location_1', type: 'HasOffice', properties: { primary: true, since: '2010-01-01' } },
		{ from: 'company_2', to: 'location_2', type: 'HasOffice', properties: { primary: true, since: '2015-01-01' } },
		{ from: 'company_3', to: 'location_3', type: 'HasOffice', properties: { primary: true, since: '2018-01-01' } },
		{ from: 'person_1', to: 'location_1', type: 'WorksFrom', properties: { primary: true } },
		{ from: 'person_2', to: 'location_3', type: 'WorksFrom', properties: { primary: true } },
		{ from: 'person_3', to: 'location_1', type: 'WorksFrom', properties: { primary: true } },
		{ from: 'person_4', to: 'location_2', type: 'WorksFrom', properties: { primary: true } },
		{ from: 'person_5', to: 'location_3', type: 'WorksFrom', properties: { primary: true } },
		
		// Collaboration relationships
		{ from: 'person_1', to: 'person_2', type: 'CollaboratesWith', properties: { project: 'project_1', frequency: 'Daily' } },
		{ from: 'person_1', to: 'person_3', type: 'CollaboratesWith', properties: { project: 'project_1', frequency: 'Weekly' } },
		{ from: 'person_2', to: 'person_3', type: 'CollaboratesWith', properties: { project: 'project_1', frequency: 'Daily' } },
		{ from: 'person_4', to: 'person_10', type: 'CollaboratesWith', properties: { project: 'project_2', frequency: 'Weekly' } },
	],
	
	relationshipTypes: [
		'WorksAt', 'Manages', 'WorksOn', 'Uses', 'HasSkill', 'HasOffice', 'WorksFrom', 'CollaboratesWith'
	],
	
	nodeTypes: [
		'Person', 'Company', 'Project', 'Technology', 'Location', 'Skill'
	]
};

/**
 * Sample queries that work with this dataset
 */
export const SAMPLE_QUERIES = {
	'Show all people': 'MATCH (p:Person) RETURN p',
	'Show companies and employees': 'MATCH (p:Person)-[r:WorksAt]->(c:Company) RETURN p, r, c',
	'Find project teams': 'MATCH (p:Person)-[r:WorksOn]->(proj:Project) RETURN p, r, proj',
	'Show technology stack': 'MATCH (proj:Project)-[r:Uses]->(tech:Technology) RETURN proj, r, tech',
	'Find managers': 'MATCH (manager:Person)-[r:Manages]->(employee:Person) RETURN manager, r, employee',
	'Show skills by person': 'MATCH (p:Person)-[r:HasSkill]->(s:Skill) RETURN p, r, s',
	'Find remote workers': 'MATCH (p:Person)-[r:WorksFrom]->(l:Location {name: "Remote"}) RETURN p, r, l',
	'Show collaboration network': 'MATCH (p1:Person)-[r:CollaboratesWith]->(p2:Person) RETURN p1, r, p2',
	'Find TechCorp employees': 'MATCH (p:Person)-[r:WorksAt]->(c:Company {name: "TechCorp"}) RETURN p, r, c',
	'Show JavaScript experts': 'MATCH (p:Person)-[r:HasSkill]->(s:Skill {name: "JavaScript"}) WHERE r.level = "Expert" RETURN p, r, s'
};

/**
 * Get sample data in the format expected by the app
 */
export function getSampleData() {
	return {
		nodes: SAMPLE_DATABASE.nodes.map(node => ({
			id: node.id,
			data: node.properties,
			label: node.label,
			type: node.type
		})),
		edges: SAMPLE_DATABASE.edges.map(edge => ({
			from: edge.from,
			to: edge.to,
			type: edge.type,
			properties: edge.properties
		})),
		relationshipTypes: SAMPLE_DATABASE.relationshipTypes,
		nodeTypes: SAMPLE_DATABASE.nodeTypes
	};
}