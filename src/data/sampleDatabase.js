/**
 * Built-in sample database - no external setup required
 * This provides immediate functionality for users to try the app
 * 
 * Enhanced version with 300+ nodes and rich relationships
 * Includes: People, Companies, Projects, Technologies, Departments, Teams, Locations, Skills, Events
 */

// Helper function to generate many nodes
function generatePeople(startId, count, departmentDistribution) {
	const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna', 'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Joshua', 'Michelle', 'Kenneth', 'Laura', 'Kevin', 'Emily', 'Brian', 'Kimberly', 'George', 'Deborah', 'Edward', 'Dorothy'];
	const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];
	const titles = {
		'Engineering': ['Software Engineer', 'Senior Developer', 'Tech Lead', 'Principal Engineer', 'DevOps Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Engineer', 'ML Engineer'],
		'Product': ['Product Manager', 'Senior PM', 'Group PM', 'Product Owner', 'Technical PM', 'Associate PM'],
		'Design': ['UX Designer', 'UI Designer', 'Product Designer', 'Design Lead', 'UX Researcher', 'Visual Designer'],
		'Data Science': ['Data Scientist', 'Senior Data Scientist', 'ML Researcher', 'Data Analyst', 'Analytics Lead', 'AI Engineer'],
		'Marketing': ['Marketing Manager', 'Content Strategist', 'Growth Manager', 'Brand Manager', 'Digital Marketing Lead', 'SEO Specialist'],
		'Sales': ['Sales Manager', 'Account Executive', 'Sales Engineer', 'Business Development', 'Customer Success Manager', 'Sales Director'],
		'HR': ['HR Manager', 'Recruiter', 'People Partner', 'Talent Acquisition', 'HR Director', 'Compensation Analyst'],
		'Finance': ['Finance Manager', 'Controller', 'Financial Analyst', 'Accountant', 'CFO', 'Budget Analyst'],
		'Operations': ['Operations Manager', 'Project Manager', 'Scrum Master', 'Program Manager', 'Operations Director', 'Business Analyst'],
		'Legal': ['Legal Counsel', 'Senior Attorney', 'Compliance Officer', 'Contract Manager', 'General Counsel', 'Paralegal']
	};
	
	const people = [];
	let currentId = startId;
	
	for (const [dept, deptCount] of Object.entries(departmentDistribution)) {
		for (let i = 0; i < deptCount; i++) {
			const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
			const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
			const name = `${firstName} ${lastName}`;
			const deptTitles = titles[dept] || ['Employee'];
			const title = deptTitles[Math.floor(Math.random() * deptTitles.length)];
			const age = 22 + Math.floor(Math.random() * 40); // Ages 22-62
			const experience = Math.max(0, age - 22 - Math.floor(Math.random() * 10));
			
			people.push({
				id: `person_${currentId}`,
				type: 'Person',
				label: name,
				properties: {
					name,
					age,
					department: dept,
					title,
					experience,
					email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
					skills: Math.floor(Math.random() * 5) + 1,
					performance: ['Excellent', 'Good', 'Average', 'Needs Improvement'][Math.floor(Math.random() * 4)]
				}
			});
			currentId++;
		}
	}
	
	return people;
}

// Generate nodes
const people = generatePeople(1, 180, {
	'Engineering': 60,
	'Product': 20,
	'Design': 20,
	'Data Science': 15,
	'Marketing': 15,
	'Sales': 15,
	'HR': 10,
	'Finance': 10,
	'Operations': 10,
	'Legal': 5
});

// Companies (20)
const companies = [
	{ id: 'company_1', type: 'Company', label: 'TechCorp', properties: { name: 'TechCorp', founded: 2010, industry: 'Software', employees: 5000, revenue: '2B', location: 'San Francisco' } },
	{ id: 'company_2', type: 'Company', label: 'DataSolutions Inc', properties: { name: 'DataSolutions Inc', founded: 2015, industry: 'Data Analytics', employees: 1200, revenue: '500M', location: 'Austin' } },
	{ id: 'company_3', type: 'Company', label: 'CloudVentures', properties: { name: 'CloudVentures', founded: 2018, industry: 'Cloud Services', employees: 800, revenue: '300M', location: 'Seattle' } },
	{ id: 'company_4', type: 'Company', label: 'AI Innovations', properties: { name: 'AI Innovations', founded: 2019, industry: 'Artificial Intelligence', employees: 400, revenue: '150M', location: 'Boston' } },
	{ id: 'company_5', type: 'Company', label: 'SecureNet', properties: { name: 'SecureNet', founded: 2012, industry: 'Cybersecurity', employees: 600, revenue: '400M', location: 'Washington DC' } },
	{ id: 'company_6', type: 'Company', label: 'FinTech Pro', properties: { name: 'FinTech Pro', founded: 2016, industry: 'Financial Technology', employees: 900, revenue: '600M', location: 'New York' } },
	{ id: 'company_7', type: 'Company', label: 'HealthTech Solutions', properties: { name: 'HealthTech Solutions', founded: 2014, industry: 'Healthcare Technology', employees: 700, revenue: '350M', location: 'Chicago' } },
	{ id: 'company_8', type: 'Company', label: 'EduPlatform', properties: { name: 'EduPlatform', founded: 2017, industry: 'Education Technology', employees: 450, revenue: '200M', location: 'Denver' } },
	{ id: 'company_9', type: 'Company', label: 'GreenEnergy Tech', properties: { name: 'GreenEnergy Tech', founded: 2013, industry: 'Clean Technology', employees: 550, revenue: '450M', location: 'Portland' } },
	{ id: 'company_10', type: 'Company', label: 'Robotics Corp', properties: { name: 'Robotics Corp', founded: 2011, industry: 'Robotics', employees: 800, revenue: '700M', location: 'Pittsburgh' } },
	{ id: 'client_1', type: 'Company', label: 'MegaRetail', properties: { name: 'MegaRetail', founded: 1995, industry: 'Retail', employees: 50000, revenue: '50B', location: 'Arkansas' } },
	{ id: 'client_2', type: 'Company', label: 'Global Bank', properties: { name: 'Global Bank', founded: 1850, industry: 'Banking', employees: 80000, revenue: '100B', location: 'New York' } },
	{ id: 'client_3', type: 'Company', label: 'AutoMakers Inc', properties: { name: 'AutoMakers Inc', founded: 1920, industry: 'Automotive', employees: 100000, revenue: '150B', location: 'Detroit' } },
	{ id: 'partner_1', type: 'Company', label: 'CloudProvider AWS', properties: { name: 'CloudProvider AWS', founded: 2006, industry: 'Cloud Infrastructure', employees: 150000, revenue: '80B', location: 'Seattle' } },
	{ id: 'partner_2', type: 'Company', label: 'DevTools Co', properties: { name: 'DevTools Co', founded: 2008, industry: 'Developer Tools', employees: 5000, revenue: '5B', location: 'San Francisco' } },
	{ id: 'partner_3', type: 'Company', label: 'Security Vendor', properties: { name: 'Security Vendor', founded: 2005, industry: 'Security Software', employees: 3000, revenue: '2B', location: 'San Jose' } },
	{ id: 'competitor_1', type: 'Company', label: 'TechRival', properties: { name: 'TechRival', founded: 2009, industry: 'Software', employees: 6000, revenue: '3B', location: 'San Francisco' } },
	{ id: 'competitor_2', type: 'Company', label: 'DataCompete', properties: { name: 'DataCompete', founded: 2014, industry: 'Data Analytics', employees: 1500, revenue: '800M', location: 'Boston' } },
	{ id: 'vendor_1', type: 'Company', label: 'Hardware Supplier', properties: { name: 'Hardware Supplier', founded: 2000, industry: 'Computer Hardware', employees: 2000, revenue: '1B', location: 'Taiwan' } },
	{ id: 'vendor_2', type: 'Company', label: 'Office Supplies Co', properties: { name: 'Office Supplies Co', founded: 1990, industry: 'Office Supplies', employees: 500, revenue: '100M', location: 'Ohio' } }
];

// Projects (40)
const projects = [];
const projectNames = [
	'Mobile App v3.0', 'Data Pipeline Upgrade', 'AI Integration Phase 2', 'Security Audit 2024', 'Cloud Migration',
	'Customer Portal', 'Analytics Dashboard', 'Payment Gateway', 'Inventory System', 'CRM Integration',
	'Machine Learning Platform', 'Real-time Analytics', 'Blockchain Pilot', 'IoT Gateway', 'Edge Computing',
	'Microservices Migration', 'API Gateway v2', 'Data Lake Implementation', 'CI/CD Pipeline', 'Monitoring System',
	'Recommendation Engine', 'Search Optimization', 'Mobile Backend', 'Social Media Integration', 'Chat System',
	'Video Platform', 'Content Management', 'Order Processing', 'Fraud Detection', 'Performance Optimization',
	'Database Upgrade', 'Network Redesign', 'Disaster Recovery', 'Compliance System', 'Training Platform',
	'Voice Assistant', 'AR Experience', 'VR Training', 'Digital Twin', 'Quantum Computing Research'
];

for (let i = 0; i < projectNames.length; i++) {
	const statuses = ['Planning', 'In Progress', 'Testing', 'Completed', 'On Hold'];
	const status = statuses[Math.floor(Math.random() * statuses.length)];
	const budget = (Math.floor(Math.random() * 20) + 1) * 100000; // 100k - 2M
	
	projects.push({
		id: `project_${i + 1}`,
		type: 'Project',
		label: projectNames[i],
		properties: {
			name: projectNames[i],
			status,
			startDate: `2023-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
			deadline: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
			budget,
			priority: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
			completion: status === 'Completed' ? 100 : Math.floor(Math.random() * 90)
		}
	});
}

// Technologies (30)
const technologies = [
	{ id: 'tech_1', type: 'Technology', label: 'React', properties: { name: 'React', category: 'Frontend Framework', version: '18.2', popularity: 9, license: 'MIT' } },
	{ id: 'tech_2', type: 'Technology', label: 'Node.js', properties: { name: 'Node.js', category: 'Backend Runtime', version: '20.11', popularity: 8, license: 'MIT' } },
	{ id: 'tech_3', type: 'Technology', label: 'PostgreSQL', properties: { name: 'PostgreSQL', category: 'Database', version: '16.0', popularity: 8, license: 'PostgreSQL' } },
	{ id: 'tech_4', type: 'Technology', label: 'Docker', properties: { name: 'Docker', category: 'Containerization', version: '24.0', popularity: 9, license: 'Apache 2.0' } },
	{ id: 'tech_5', type: 'Technology', label: 'Kubernetes', properties: { name: 'Kubernetes', category: 'Orchestration', version: '1.29', popularity: 8, license: 'Apache 2.0' } },
	{ id: 'tech_6', type: 'Technology', label: 'Python', properties: { name: 'Python', category: 'Programming Language', version: '3.12', popularity: 10, license: 'PSF' } },
	{ id: 'tech_7', type: 'Technology', label: 'TensorFlow', properties: { name: 'TensorFlow', category: 'ML Framework', version: '2.15', popularity: 8, license: 'Apache 2.0' } },
	{ id: 'tech_8', type: 'Technology', label: 'MongoDB', properties: { name: 'MongoDB', category: 'NoSQL Database', version: '7.0', popularity: 7, license: 'SSPL' } },
	{ id: 'tech_9', type: 'Technology', label: 'Redis', properties: { name: 'Redis', category: 'Cache/Database', version: '7.2', popularity: 8, license: 'BSD' } },
	{ id: 'tech_10', type: 'Technology', label: 'Elasticsearch', properties: { name: 'Elasticsearch', category: 'Search Engine', version: '8.11', popularity: 7, license: 'Elastic' } },
	{ id: 'tech_11', type: 'Technology', label: 'GraphQL', properties: { name: 'GraphQL', category: 'API Query Language', version: '16.0', popularity: 7, license: 'MIT' } },
	{ id: 'tech_12', type: 'Technology', label: 'Vue.js', properties: { name: 'Vue.js', category: 'Frontend Framework', version: '3.4', popularity: 8, license: 'MIT' } },
	{ id: 'tech_13', type: 'Technology', label: 'Angular', properties: { name: 'Angular', category: 'Frontend Framework', version: '17.0', popularity: 7, license: 'MIT' } },
	{ id: 'tech_14', type: 'Technology', label: 'Java', properties: { name: 'Java', category: 'Programming Language', version: '21', popularity: 9, license: 'GPL' } },
	{ id: 'tech_15', type: 'Technology', label: 'Spring Boot', properties: { name: 'Spring Boot', category: 'Backend Framework', version: '3.2', popularity: 8, license: 'Apache 2.0' } },
	{ id: 'tech_16', type: 'Technology', label: 'Go', properties: { name: 'Go', category: 'Programming Language', version: '1.21', popularity: 7, license: 'BSD' } },
	{ id: 'tech_17', type: 'Technology', label: 'Rust', properties: { name: 'Rust', category: 'Programming Language', version: '1.75', popularity: 6, license: 'MIT/Apache' } },
	{ id: 'tech_18', type: 'Technology', label: 'TypeScript', properties: { name: 'TypeScript', category: 'Programming Language', version: '5.3', popularity: 9, license: 'Apache 2.0' } },
	{ id: 'tech_19', type: 'Technology', label: 'AWS', properties: { name: 'AWS', category: 'Cloud Platform', version: '2024', popularity: 10, license: 'Proprietary' } },
	{ id: 'tech_20', type: 'Technology', label: 'Azure', properties: { name: 'Azure', category: 'Cloud Platform', version: '2024', popularity: 9, license: 'Proprietary' } },
	{ id: 'tech_21', type: 'Technology', label: 'Kafka', properties: { name: 'Kafka', category: 'Message Queue', version: '3.6', popularity: 8, license: 'Apache 2.0' } },
	{ id: 'tech_22', type: 'Technology', label: 'RabbitMQ', properties: { name: 'RabbitMQ', category: 'Message Queue', version: '3.12', popularity: 7, license: 'MPL' } },
	{ id: 'tech_23', type: 'Technology', label: 'Jenkins', properties: { name: 'Jenkins', category: 'CI/CD', version: '2.426', popularity: 8, license: 'MIT' } },
	{ id: 'tech_24', type: 'Technology', label: 'GitLab', properties: { name: 'GitLab', category: 'DevOps Platform', version: '16.7', popularity: 7, license: 'MIT' } },
	{ id: 'tech_25', type: 'Technology', label: 'Terraform', properties: { name: 'Terraform', category: 'Infrastructure as Code', version: '1.6', popularity: 8, license: 'MPL' } },
	{ id: 'tech_26', type: 'Technology', label: 'Ansible', properties: { name: 'Ansible', category: 'Configuration Management', version: '2.16', popularity: 7, license: 'GPL' } },
	{ id: 'tech_27', type: 'Technology', label: 'Prometheus', properties: { name: 'Prometheus', category: 'Monitoring', version: '2.48', popularity: 8, license: 'Apache 2.0' } },
	{ id: 'tech_28', type: 'Technology', label: 'Grafana', properties: { name: 'Grafana', category: 'Visualization', version: '10.2', popularity: 8, license: 'AGPL' } },
	{ id: 'tech_29', type: 'Technology', label: 'Nginx', properties: { name: 'Nginx', category: 'Web Server', version: '1.25', popularity: 9, license: 'BSD' } },
	{ id: 'tech_30', type: 'Technology', label: 'Apache Spark', properties: { name: 'Apache Spark', category: 'Big Data', version: '3.5', popularity: 7, license: 'Apache 2.0' } }
];

// Departments (10)
const departments = [
	{ id: 'dept_1', type: 'Department', label: 'Engineering', properties: { name: 'Engineering', headcount: 60, budget: 15000000, location: 'San Francisco' } },
	{ id: 'dept_2', type: 'Department', label: 'Product', properties: { name: 'Product', headcount: 20, budget: 5000000, location: 'San Francisco' } },
	{ id: 'dept_3', type: 'Department', label: 'Design', properties: { name: 'Design', headcount: 20, budget: 4000000, location: 'San Francisco' } },
	{ id: 'dept_4', type: 'Department', label: 'Data Science', properties: { name: 'Data Science', headcount: 15, budget: 6000000, location: 'Boston' } },
	{ id: 'dept_5', type: 'Department', label: 'Marketing', properties: { name: 'Marketing', headcount: 15, budget: 8000000, location: 'New York' } },
	{ id: 'dept_6', type: 'Department', label: 'Sales', properties: { name: 'Sales', headcount: 15, budget: 10000000, location: 'New York' } },
	{ id: 'dept_7', type: 'Department', label: 'HR', properties: { name: 'HR', headcount: 10, budget: 3000000, location: 'San Francisco' } },
	{ id: 'dept_8', type: 'Department', label: 'Finance', properties: { name: 'Finance', headcount: 10, budget: 2000000, location: 'New York' } },
	{ id: 'dept_9', type: 'Department', label: 'Operations', properties: { name: 'Operations', headcount: 10, budget: 4000000, location: 'Austin' } },
	{ id: 'dept_10', type: 'Department', label: 'Legal', properties: { name: 'Legal', headcount: 5, budget: 3000000, location: 'Washington DC' } }
];

// Teams (20)
const teams = [
	{ id: 'team_1', type: 'Team', label: 'Frontend Team', properties: { name: 'Frontend Team', size: 8, department: 'Engineering', focus: 'User Interface' } },
	{ id: 'team_2', type: 'Team', label: 'Backend Team', properties: { name: 'Backend Team', size: 10, department: 'Engineering', focus: 'APIs and Services' } },
	{ id: 'team_3', type: 'Team', label: 'Mobile Team', properties: { name: 'Mobile Team', size: 6, department: 'Engineering', focus: 'iOS and Android' } },
	{ id: 'team_4', type: 'Team', label: 'DevOps Team', properties: { name: 'DevOps Team', size: 7, department: 'Engineering', focus: 'Infrastructure' } },
	{ id: 'team_5', type: 'Team', label: 'Data Platform', properties: { name: 'Data Platform', size: 9, department: 'Engineering', focus: 'Data Infrastructure' } },
	{ id: 'team_6', type: 'Team', label: 'Security Team', properties: { name: 'Security Team', size: 5, department: 'Engineering', focus: 'Security' } },
	{ id: 'team_7', type: 'Team', label: 'QA Team', properties: { name: 'QA Team', size: 8, department: 'Engineering', focus: 'Quality Assurance' } },
	{ id: 'team_8', type: 'Team', label: 'Product Design', properties: { name: 'Product Design', size: 10, department: 'Design', focus: 'Product UX' } },
	{ id: 'team_9', type: 'Team', label: 'Brand Design', properties: { name: 'Brand Design', size: 5, department: 'Design', focus: 'Brand Identity' } },
	{ id: 'team_10', type: 'Team', label: 'Research Team', properties: { name: 'Research Team', size: 5, department: 'Design', focus: 'User Research' } },
	{ id: 'team_11', type: 'Team', label: 'Growth Team', properties: { name: 'Growth Team', size: 6, department: 'Product', focus: 'User Growth' } },
	{ id: 'team_12', type: 'Team', label: 'Platform Team', properties: { name: 'Platform Team', size: 7, department: 'Product', focus: 'Platform Features' } },
	{ id: 'team_13', type: 'Team', label: 'Analytics Team', properties: { name: 'Analytics Team', size: 5, department: 'Data Science', focus: 'Business Analytics' } },
	{ id: 'team_14', type: 'Team', label: 'ML Team', properties: { name: 'ML Team', size: 8, department: 'Data Science', focus: 'Machine Learning' } },
	{ id: 'team_15', type: 'Team', label: 'Content Team', properties: { name: 'Content Team', size: 6, department: 'Marketing', focus: 'Content Creation' } },
	{ id: 'team_16', type: 'Team', label: 'Digital Marketing', properties: { name: 'Digital Marketing', size: 5, department: 'Marketing', focus: 'Online Marketing' } },
	{ id: 'team_17', type: 'Team', label: 'Enterprise Sales', properties: { name: 'Enterprise Sales', size: 8, department: 'Sales', focus: 'Enterprise Clients' } },
	{ id: 'team_18', type: 'Team', label: 'SMB Sales', properties: { name: 'SMB Sales', size: 6, department: 'Sales', focus: 'Small Business' } },
	{ id: 'team_19', type: 'Team', label: 'Talent Team', properties: { name: 'Talent Team', size: 6, department: 'HR', focus: 'Recruitment' } },
	{ id: 'team_20', type: 'Team', label: 'Finance Ops', properties: { name: 'Finance Ops', size: 5, department: 'Finance', focus: 'Financial Operations' } }
];

// Locations (15)
const locations = [
	{ id: 'location_1', type: 'Location', label: 'SF HQ', properties: { name: 'San Francisco HQ', address: '123 Tech Street', city: 'San Francisco', state: 'CA', capacity: 500, type: 'Headquarters' } },
	{ id: 'location_2', type: 'Location', label: 'Austin Office', properties: { name: 'Austin Office', address: '456 Innovation Blvd', city: 'Austin', state: 'TX', capacity: 200, type: 'Office' } },
	{ id: 'location_3', type: 'Location', label: 'NYC Office', properties: { name: 'New York Office', address: '789 Finance Ave', city: 'New York', state: 'NY', capacity: 300, type: 'Office' } },
	{ id: 'location_4', type: 'Location', label: 'Boston Lab', properties: { name: 'Boston R&D Lab', address: '321 Research Way', city: 'Boston', state: 'MA', capacity: 150, type: 'R&D' } },
	{ id: 'location_5', type: 'Location', label: 'Seattle Office', properties: { name: 'Seattle Office', address: '654 Cloud Street', city: 'Seattle', state: 'WA', capacity: 250, type: 'Office' } },
	{ id: 'location_6', type: 'Location', label: 'London Office', properties: { name: 'London Office', address: '10 Tech Square', city: 'London', state: 'UK', capacity: 100, type: 'International' } },
	{ id: 'location_7', type: 'Location', label: 'Tokyo Office', properties: { name: 'Tokyo Office', address: '5-1 Shibuya', city: 'Tokyo', state: 'Japan', capacity: 80, type: 'International' } },
	{ id: 'location_8', type: 'Location', label: 'Toronto Office', properties: { name: 'Toronto Office', address: '200 King Street', city: 'Toronto', state: 'Canada', capacity: 120, type: 'International' } },
	{ id: 'location_9', type: 'Location', label: 'Remote Hub', properties: { name: 'Remote Workers', address: 'Distributed', city: 'Various', state: 'Various', capacity: 1000, type: 'Remote' } },
	{ id: 'location_10', type: 'Location', label: 'DC Office', properties: { name: 'Washington DC Office', address: '1600 Gov Street', city: 'Washington', state: 'DC', capacity: 50, type: 'Office' } },
	{ id: 'location_11', type: 'Location', label: 'Denver Office', properties: { name: 'Denver Office', address: '420 Mountain View', city: 'Denver', state: 'CO', capacity: 100, type: 'Office' } },
	{ id: 'location_12', type: 'Location', label: 'Chicago Office', properties: { name: 'Chicago Office', address: '100 Loop Drive', city: 'Chicago', state: 'IL', capacity: 150, type: 'Office' } },
	{ id: 'location_13', type: 'Location', label: 'Miami Office', properties: { name: 'Miami Office', address: '50 Ocean Drive', city: 'Miami', state: 'FL', capacity: 80, type: 'Office' } },
	{ id: 'location_14', type: 'Location', label: 'Portland Office', properties: { name: 'Portland Office', address: '77 Green Street', city: 'Portland', state: 'OR', capacity: 90, type: 'Office' } },
	{ id: 'location_15', type: 'Location', label: 'Data Center', properties: { name: 'Primary Data Center', address: '1000 Server Farm Rd', city: 'Ashburn', state: 'VA', capacity: 0, type: 'Data Center' } }
];

// Skills (25)
const skills = [
	{ id: 'skill_1', type: 'Skill', label: 'JavaScript', properties: { name: 'JavaScript', category: 'Programming', difficulty: 'Intermediate', demand: 9 } },
	{ id: 'skill_2', type: 'Skill', label: 'Python', properties: { name: 'Python', category: 'Programming', difficulty: 'Intermediate', demand: 10 } },
	{ id: 'skill_3', type: 'Skill', label: 'Java', properties: { name: 'Java', category: 'Programming', difficulty: 'Advanced', demand: 8 } },
	{ id: 'skill_4', type: 'Skill', label: 'React', properties: { name: 'React', category: 'Framework', difficulty: 'Intermediate', demand: 9 } },
	{ id: 'skill_5', type: 'Skill', label: 'Machine Learning', properties: { name: 'Machine Learning', category: 'AI/ML', difficulty: 'Advanced', demand: 10 } },
	{ id: 'skill_6', type: 'Skill', label: 'UI/UX Design', properties: { name: 'UI/UX Design', category: 'Design', difficulty: 'Advanced', demand: 8 } },
	{ id: 'skill_7', type: 'Skill', label: 'DevOps', properties: { name: 'DevOps', category: 'Operations', difficulty: 'Advanced', demand: 9 } },
	{ id: 'skill_8', type: 'Skill', label: 'Product Management', properties: { name: 'Product Management', category: 'Business', difficulty: 'Advanced', demand: 8 } },
	{ id: 'skill_9', type: 'Skill', label: 'Data Analysis', properties: { name: 'Data Analysis', category: 'Analytics', difficulty: 'Intermediate', demand: 9 } },
	{ id: 'skill_10', type: 'Skill', label: 'Cloud Architecture', properties: { name: 'Cloud Architecture', category: 'Infrastructure', difficulty: 'Advanced', demand: 9 } },
	{ id: 'skill_11', type: 'Skill', label: 'Kubernetes', properties: { name: 'Kubernetes', category: 'DevOps', difficulty: 'Advanced', demand: 8 } },
	{ id: 'skill_12', type: 'Skill', label: 'SQL', properties: { name: 'SQL', category: 'Database', difficulty: 'Intermediate', demand: 8 } },
	{ id: 'skill_13', type: 'Skill', label: 'TypeScript', properties: { name: 'TypeScript', category: 'Programming', difficulty: 'Intermediate', demand: 8 } },
	{ id: 'skill_14', type: 'Skill', label: 'Go', properties: { name: 'Go', category: 'Programming', difficulty: 'Intermediate', demand: 7 } },
	{ id: 'skill_15', type: 'Skill', label: 'Security', properties: { name: 'Security', category: 'Infrastructure', difficulty: 'Advanced', demand: 9 } },
	{ id: 'skill_16', type: 'Skill', label: 'Project Management', properties: { name: 'Project Management', category: 'Business', difficulty: 'Intermediate', demand: 7 } },
	{ id: 'skill_17', type: 'Skill', label: 'Communication', properties: { name: 'Communication', category: 'Soft Skills', difficulty: 'Intermediate', demand: 10 } },
	{ id: 'skill_18', type: 'Skill', label: 'Leadership', properties: { name: 'Leadership', category: 'Soft Skills', difficulty: 'Advanced', demand: 9 } },
	{ id: 'skill_19', type: 'Skill', label: 'Agile/Scrum', properties: { name: 'Agile/Scrum', category: 'Methodology', difficulty: 'Intermediate', demand: 8 } },
	{ id: 'skill_20', type: 'Skill', label: 'Docker', properties: { name: 'Docker', category: 'DevOps', difficulty: 'Intermediate', demand: 8 } },
	{ id: 'skill_21', type: 'Skill', label: 'GraphQL', properties: { name: 'GraphQL', category: 'API', difficulty: 'Intermediate', demand: 7 } },
	{ id: 'skill_22', type: 'Skill', label: 'AWS', properties: { name: 'AWS', category: 'Cloud', difficulty: 'Advanced', demand: 9 } },
	{ id: 'skill_23', type: 'Skill', label: 'Marketing Analytics', properties: { name: 'Marketing Analytics', category: 'Marketing', difficulty: 'Intermediate', demand: 7 } },
	{ id: 'skill_24', type: 'Skill', label: 'Sales Strategy', properties: { name: 'Sales Strategy', category: 'Sales', difficulty: 'Advanced', demand: 8 } },
	{ id: 'skill_25', type: 'Skill', label: 'Financial Analysis', properties: { name: 'Financial Analysis', category: 'Finance', difficulty: 'Advanced', demand: 7 } }
];

// Events (10)
const events = [
	{ id: 'event_1', type: 'Event', label: 'Q1 All Hands', properties: { name: 'Q1 All Hands Meeting', date: '2024-01-15', location: 'SF HQ', attendees: 500, type: 'Company Meeting' } },
	{ id: 'event_2', type: 'Event', label: 'Tech Conference', properties: { name: 'Annual Tech Conference', date: '2024-06-20', location: 'Las Vegas', attendees: 5000, type: 'Conference' } },
	{ id: 'event_3', type: 'Event', label: 'Product Launch', properties: { name: 'Product 3.0 Launch', date: '2024-03-01', location: 'Virtual', attendees: 10000, type: 'Launch Event' } },
	{ id: 'event_4', type: 'Event', label: 'Hackathon', properties: { name: 'Internal Hackathon', date: '2024-04-15', location: 'All Offices', attendees: 200, type: 'Hackathon' } },
	{ id: 'event_5', type: 'Event', label: 'Training Week', properties: { name: 'Engineering Training Week', date: '2024-02-05', location: 'SF HQ', attendees: 150, type: 'Training' } },
	{ id: 'event_6', type: 'Event', label: 'Customer Summit', properties: { name: 'Customer Success Summit', date: '2024-05-10', location: 'NYC Office', attendees: 300, type: 'Customer Event' } },
	{ id: 'event_7', type: 'Event', label: 'Board Meeting', properties: { name: 'Q2 Board Meeting', date: '2024-04-30', location: 'SF HQ', attendees: 20, type: 'Board Meeting' } },
	{ id: 'event_8', type: 'Event', label: 'Team Offsite', properties: { name: 'Engineering Team Offsite', date: '2024-07-15', location: 'Lake Tahoe', attendees: 100, type: 'Team Building' } },
	{ id: 'event_9', type: 'Event', label: 'Partner Summit', properties: { name: 'Annual Partner Summit', date: '2024-09-20', location: 'Seattle Office', attendees: 150, type: 'Partner Event' } },
	{ id: 'event_10', type: 'Event', label: 'Holiday Party', properties: { name: 'Winter Holiday Party', date: '2024-12-15', location: 'SF HQ', attendees: 600, type: 'Social Event' } }
];

// Helper function to get sample data
export function getSampleData() {
	return SAMPLE_DATABASE;
}

// Sample queries for testing
export const SAMPLE_QUERIES = {
	'All People': 'MATCH (p:Person) RETURN p LIMIT 50',
	'People and Companies': 'MATCH (p:Person)-[r:WorksAt]->(c:Company) RETURN p, r, c LIMIT 25',
	'Project Teams': 'MATCH (p:Person)-[r:WorksOn]->(proj:Project) RETURN p, r, proj LIMIT 30',
	'Technology Stack': 'MATCH (proj:Project)-[r:Uses]->(t:Technology) RETURN proj, r, t LIMIT 40',
	'Department Structure': 'MATCH (p:Person)-[r:BelongsTo]->(d:Department) RETURN p, r, d LIMIT 35'
};

// Combine all nodes
export const SAMPLE_DATABASE = {
	nodes: [
		...people,
		...companies,
		...projects,
		...technologies,
		...departments,
		...teams,
		...locations,
		...skills,
		...events
	],
	
	// Generate relationships
	edges: (() => {
		const edges = [];
		let edgeId = 1;
		
		// People work at companies (main company + some consultants)
		people.forEach((person, index) => {
			const mainCompany = companies[index % 10]; // First 10 companies are employers
			edges.push({
				from: person.id,
				to: mainCompany.id,
				type: 'WorksAt',
				properties: { 
					since: `20${20 + Math.floor(Math.random() * 4)}`, 
					role: person.properties.title,
					salary: 80000 + Math.floor(Math.random() * 120000)
				}
			});
			
			// Some people consult for other companies
			if (Math.random() > 0.8) {
				const consultCompany = companies[10 + Math.floor(Math.random() * 10)];
				edges.push({
					from: person.id,
					to: consultCompany.id,
					type: 'ConsultsFor',
					properties: { 
						since: '2023',
						rate: 150 + Math.floor(Math.random() * 350),
						hours_per_week: Math.floor(Math.random() * 20) + 5
					}
				});
			}
		});
		
		// People belong to departments
		people.forEach(person => {
			const dept = departments.find(d => d.label === person.properties.department);
			if (dept) {
				edges.push({
					from: person.id,
					to: dept.id,
					type: 'BelongsTo',
					properties: { since: `20${18 + Math.floor(Math.random() * 6)}` }
				});
			}
		});
		
		// People are members of teams
		people.forEach((person, index) => {
			const teamIndex = Math.floor(index / 9); // ~9 people per team
			if (teamIndex < teams.length) {
				edges.push({
					from: person.id,
					to: teams[teamIndex].id,
					type: 'MemberOf',
					properties: { 
						role: index % 9 === 0 ? 'Team Lead' : 'Member',
						since: `20${20 + Math.floor(Math.random() * 4)}`
					}
				});
			}
		});
		
		// People work on projects (3-15 people per project)
		projects.forEach((project, projIndex) => {
			const teamSize = 3 + Math.floor(Math.random() * 13);
			const projectTeam = people.slice(projIndex * 4, projIndex * 4 + teamSize);
			
			projectTeam.forEach((person, personIndex) => {
				edges.push({
					from: person.id,
					to: project.id,
					type: 'WorksOn',
					properties: { 
						role: personIndex === 0 ? 'Project Lead' : 'Team Member',
						allocation: Math.floor(Math.random() * 60) + 40 // 40-100% allocation
					}
				});
			});
		});
		
		// People have skills (3-8 skills per person)
		people.forEach(person => {
			const numSkills = 3 + Math.floor(Math.random() * 6);
			const personSkills = [...skills].sort(() => Math.random() - 0.5).slice(0, numSkills);
			
			personSkills.forEach(skill => {
				edges.push({
					from: person.id,
					to: skill.id,
					type: 'HasSkill',
					properties: { 
						level: ['Beginner', 'Intermediate', 'Advanced', 'Expert'][Math.floor(Math.random() * 4)],
						years: Math.floor(Math.random() * 10) + 1
					}
				});
			});
		});
		
		// People report to managers (create hierarchy)
		const managers = people.filter(p => 
			p.properties.title.includes('Manager') || 
			p.properties.title.includes('Director') || 
			p.properties.title.includes('Lead')
		);
		
		people.forEach(person => {
			if (!person.properties.title.includes('Manager') && !person.properties.title.includes('Director')) {
				const manager = managers.find(m => 
					m.properties.department === person.properties.department && 
					m.id !== person.id
				);
				if (manager) {
					edges.push({
						from: person.id,
						to: manager.id,
						type: 'ReportsTo',
						properties: { since: `20${20 + Math.floor(Math.random() * 4)}` }
					});
				}
			}
		});
		
		// People work at locations
		people.forEach((person, index) => {
			const locationIndex = Math.floor(Math.random() * locations.length);
			edges.push({
				from: person.id,
				to: locations[locationIndex].id,
				type: 'WorksAt',
				properties: { 
					desk: `${Math.floor(Math.random() * 50) + 1}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
					floor: Math.floor(Math.random() * 10) + 1
				}
			});
		});
		
		// Projects use technologies (2-8 per project)
		projects.forEach(project => {
			const numTechs = 2 + Math.floor(Math.random() * 7);
			const projectTechs = [...technologies].sort(() => Math.random() - 0.5).slice(0, numTechs);
			
			projectTechs.forEach(tech => {
				edges.push({
					from: project.id,
					to: tech.id,
					type: 'Uses',
					properties: { 
						purpose: ['Frontend', 'Backend', 'Database', 'Infrastructure', 'Analytics'][Math.floor(Math.random() * 5)],
						critical: Math.random() > 0.5
					}
				});
			});
		});
		
		// Projects belong to departments
		projects.forEach((project, index) => {
			const deptIndex = Math.floor(index / 4) % departments.length;
			edges.push({
				from: project.id,
				to: departments[deptIndex].id,
				type: 'BelongsTo',
				properties: { approved: '2023' }
			});
		});
		
		// Companies have partnerships
		companies.slice(0, 10).forEach((company, index) => {
			// Partner relationships
			if (index < 5) {
				const partner = companies[13 + (index % 3)]; // Partner companies
				edges.push({
					from: company.id,
					to: partner.id,
					type: 'PartnersWith',
					properties: { 
						since: `20${15 + Math.floor(Math.random() * 9)}`,
						type: ['Technology', 'Marketing', 'Distribution'][Math.floor(Math.random() * 3)]
					}
				});
			}
			
			// Client relationships
			const client = companies[10 + (index % 3)]; // Client companies
			edges.push({
				from: company.id,
				to: client.id,
				type: 'Provides',
				properties: { 
					service: ['Software', 'Consulting', 'Support', 'Training'][Math.floor(Math.random() * 4)],
					contract_value: (Math.floor(Math.random() * 50) + 10) * 100000
				}
			});
			
			// Competitor relationships
			if (index < 8) {
				const competitor = companies[16 + (index % 2)]; // Competitor companies
				edges.push({
					from: company.id,
					to: competitor.id,
					type: 'CompetesWith',
					properties: { 
						market: ['Enterprise', 'SMB', 'Consumer'][Math.floor(Math.random() * 3)],
						intensity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
					}
				});
			}
		});
		
		// Teams belong to departments
		teams.forEach(team => {
			const dept = departments.find(d => d.label === team.properties.department);
			if (dept) {
				edges.push({
					from: team.id,
					to: dept.id,
					type: 'PartOf',
					properties: { formed: `20${18 + Math.floor(Math.random() * 6)}` }
				});
			}
		});
		
		// Teams collaborate with each other
		teams.forEach((team, index) => {
			if (index < teams.length - 1) {
				const collaborator = teams[Math.floor(Math.random() * teams.length)];
				if (collaborator.id !== team.id) {
					edges.push({
						from: team.id,
						to: collaborator.id,
						type: 'CollaboratesWith',
						properties: { 
							frequency: ['Daily', 'Weekly', 'Monthly'][Math.floor(Math.random() * 3)],
							project_count: Math.floor(Math.random() * 10) + 1
						}
					});
				}
			}
		});
		
		// Technologies depend on other technologies
		technologies.forEach((tech, index) => {
			if (index < technologies.length - 5) {
				const dependency = technologies[index + Math.floor(Math.random() * 5) + 1];
				edges.push({
					from: tech.id,
					to: dependency.id,
					type: 'DependsOn',
					properties: { 
						version_requirement: `>=${dependency.properties.version}`,
						optional: Math.random() > 0.7
					}
				});
			}
		});
		
		// Skills required by projects
		projects.forEach(project => {
			const numSkills = 3 + Math.floor(Math.random() * 5);
			const requiredSkills = [...skills].sort(() => Math.random() - 0.5).slice(0, numSkills);
			
			requiredSkills.forEach(skill => {
				edges.push({
					from: project.id,
					to: skill.id,
					type: 'Requires',
					properties: { 
						level: ['Intermediate', 'Advanced', 'Expert'][Math.floor(Math.random() * 3)],
						priority: ['Nice to have', 'Important', 'Critical'][Math.floor(Math.random() * 3)]
					}
				});
			});
		});
		
		// Events at locations
		events.forEach(event => {
			const locationIndex = Math.floor(Math.random() * locations.length);
			edges.push({
				from: event.id,
				to: locations[locationIndex].id,
				type: 'HeldAt',
				properties: { 
					room: ['Main Hall', 'Conference Room A', 'Auditorium', 'Meeting Room 1'][Math.floor(Math.random() * 4)],
					setup: ['Theater', 'Classroom', 'Banquet', 'U-Shape'][Math.floor(Math.random() * 4)]
				}
			});
		});
		
		// People attend events
		events.forEach(event => {
			const attendeeCount = Math.min(event.properties.attendees, Math.floor(people.length * 0.3));
			const attendees = [...people].sort(() => Math.random() - 0.5).slice(0, attendeeCount);
			
			attendees.forEach(person => {
				edges.push({
					from: person.id,
					to: event.id,
					type: 'Attends',
					properties: { 
						rsvp: ['Yes', 'Maybe', 'No'][Math.floor(Math.random() * 3)],
						role: Math.random() > 0.9 ? 'Speaker' : 'Attendee'
					}
				});
			});
		});
		
		// Departments located at offices
		departments.forEach(dept => {
			const location = locations.find(l => l.properties.city === dept.properties.location) || locations[0];
			edges.push({
				from: dept.id,
				to: location.id,
				type: 'LocatedAt',
				properties: { 
					floor: Math.floor(Math.random() * 10) + 1,
					area: ['North Wing', 'South Wing', 'East Wing', 'West Wing'][Math.floor(Math.random() * 4)]
				}
			});
		});
		
		// Add some cross-functional relationships for more complexity
		// Mentorship relationships
		const seniors = people.filter(p => p.properties.experience > 5);
		const juniors = people.filter(p => p.properties.experience <= 5);
		
		juniors.forEach((junior, index) => {
			if (index < seniors.length) {
				const mentor = seniors[index % seniors.length];
				edges.push({
					from: junior.id,
					to: mentor.id,
					type: 'MentoredBy',
					properties: { 
						since: '2023',
						focus: ['Career', 'Technical', 'Leadership'][Math.floor(Math.random() * 3)]
					}
				});
			}
		});
		
		// Social connections between people
		people.forEach((person, index) => {
			// Each person knows 5-15 other people
			const numConnections = 5 + Math.floor(Math.random() * 11);
			const connections = [...people]
				.filter(p => p.id !== person.id)
				.sort(() => Math.random() - 0.5)
				.slice(0, numConnections);
			
			connections.forEach(connection => {
				// Avoid duplicate connections
				if (!edges.find(e => 
					(e.from === person.id && e.to === connection.id && e.type === 'Knows') ||
					(e.from === connection.id && e.to === person.id && e.type === 'Knows')
				)) {
					edges.push({
						from: person.id,
						to: connection.id,
						type: 'Knows',
						properties: { 
							relationship: ['Colleague', 'Friend', 'Acquaintance'][Math.floor(Math.random() * 3)],
							years: Math.floor(Math.random() * 10) + 1
						}
					});
				}
			});
		});
		
		return edges;
	})(),
	
	// Node types for schema
	nodeTypes: [
		{ name: 'Person', count: 180 },
		{ name: 'Company', count: 20 },
		{ name: 'Project', count: 40 },
		{ name: 'Technology', count: 30 },
		{ name: 'Department', count: 10 },
		{ name: 'Team', count: 20 },
		{ name: 'Location', count: 15 },
		{ name: 'Skill', count: 25 },
		{ name: 'Event', count: 10 }
	],
	
	// Relationship types for schema
	relationshipTypes: [
		{ name: 'WorksAt', count: 200 },
		{ name: 'ConsultsFor', count: 36 },
		{ name: 'BelongsTo', count: 180 },
		{ name: 'MemberOf', count: 180 },
		{ name: 'WorksOn', count: 300 },
		{ name: 'HasSkill', count: 900 },
		{ name: 'ReportsTo', count: 150 },
		{ name: 'Uses', count: 200 },
		{ name: 'Requires', count: 160 },
		{ name: 'PartnersWith', count: 5 },
		{ name: 'Provides', count: 10 },
		{ name: 'CompetesWith', count: 8 },
		{ name: 'PartOf', count: 20 },
		{ name: 'CollaboratesWith', count: 20 },
		{ name: 'DependsOn', count: 25 },
		{ name: 'HeldAt', count: 10 },
		{ name: 'Attends', count: 1800 },
		{ name: 'LocatedAt', count: 190 },
		{ name: 'MentoredBy', count: 60 },
		{ name: 'Knows', count: 1800 }
	]
};

// Add some statistics for verification
console.log(`Sample database created with:`);
console.log(`- ${SAMPLE_DATABASE.nodes.length} nodes`);
console.log(`- ${SAMPLE_DATABASE.edges.length} edges`);
console.log(`Node types: ${[...new Set(SAMPLE_DATABASE.nodes.map(n => n.type))].join(', ')}`);
console.log(`Edge types: ${[...new Set(SAMPLE_DATABASE.edges.map(e => e.type))].join(', ')}`);