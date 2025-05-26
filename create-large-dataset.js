import kuzu from 'kuzu';
import fs from 'fs';

async function createLargeDataset() {
    const dbPath = './test-kuzu-db';
    
    // Remove existing database if it exists
    if (fs.existsSync(dbPath)) {
        fs.rmSync(dbPath, { recursive: true, force: true });
    }
    
    console.log('Creating large test Kùzu database with 100+ nodes...\n');
    
    try {
        // Create database
        const db = new kuzu.Database(dbPath);
        const conn = new kuzu.Connection(db);
        
        // Create node tables
        await conn.query(`
            CREATE NODE TABLE Person (
                id INT64,
                name STRING,
                age INT64,
                department STRING,
                PRIMARY KEY (id)
            )
        `);
        
        await conn.query(`
            CREATE NODE TABLE Company (
                id INT64,
                name STRING,
                founded INT64,
                industry STRING,
                PRIMARY KEY (id)
            )
        `);
        
        await conn.query(`
            CREATE NODE TABLE Project (
                id INT64,
                name STRING,
                budget INT64,
                status STRING,
                PRIMARY KEY (id)
            )
        `);
        
        await conn.query(`
            CREATE NODE TABLE Technology (
                id INT64,
                name STRING,
                category STRING,
                PRIMARY KEY (id)
            )
        `);
        
        // Create edge tables
        await conn.query(`
            CREATE REL TABLE WorksAt (
                FROM Person TO Company,
                since INT64
            )
        `);
        
        await conn.query(`
            CREATE REL TABLE WorksOn (
                FROM Person TO Project,
                role STRING
            )
        `);
        
        await conn.query(`
            CREATE REL TABLE Uses (
                FROM Project TO Technology
            )
        `);
        
        await conn.query(`
            CREATE REL TABLE Knows (
                FROM Person TO Person,
                since INT64
            )
        `);
        
        // Generate data
        const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack',
                           'Kate', 'Leo', 'Maya', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Ruby', 'Sam', 'Tara',
                           'Uma', 'Victor', 'Wendy', 'Xavier', 'Yara', 'Zoe'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
        const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Research'];
        
        // Add 50 people
        console.log('Adding 50 people...');
        for (let i = 1; i <= 50; i++) {
            const firstName = firstNames[i % firstNames.length];
            const lastName = lastNames[i % lastNames.length];
            const name = `${firstName} ${lastName}${i > 26 ? Math.floor(i/26) : ''}`;
            const age = 22 + (i % 40);
            const dept = departments[i % departments.length];
            
            await conn.query(`CREATE (p:Person {id: ${i}, name: '${name}', age: ${age}, department: '${dept}'})`);
        }
        
        // Add 20 companies
        console.log('Adding 20 companies...');
        const companyPrefixes = ['Tech', 'Data', 'Cloud', 'AI', 'Cyber', 'Digital', 'Smart', 'Future', 'Next', 'Global'];
        const companySuffixes = ['Corp', 'Solutions', 'Systems', 'Works', 'Labs', 'Inc', 'Group', 'Dynamics'];
        const industries = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing'];
        
        for (let i = 1; i <= 20; i++) {
            const prefix = companyPrefixes[i % companyPrefixes.length];
            const suffix = companySuffixes[i % companySuffixes.length];
            const name = `${prefix}${suffix}${i > 10 ? i : ''}`;
            const founded = 2000 + (i % 24);
            const industry = industries[i % industries.length];
            
            await conn.query(`CREATE (c:Company {id: ${i}, name: '${name}', founded: ${founded}, industry: '${industry}'})`);
        }
        
        // Add 25 projects
        console.log('Adding 25 projects...');
        const projectTypes = ['Platform', 'App', 'System', 'Tool', 'Service', 'API', 'Dashboard', 'Engine'];
        const projectNames = ['Analytics', 'Migration', 'Integration', 'Optimization', 'Automation', 'Security'];
        const statuses = ['Active', 'Planning', 'Completed', 'On Hold'];
        
        for (let i = 1; i <= 25; i++) {
            const type = projectTypes[i % projectTypes.length];
            const name = projectNames[i % projectNames.length];
            const projectName = `${name} ${type} ${i}`;
            const budget = (i * 50000) + 100000;
            const status = statuses[i % statuses.length];
            
            await conn.query(`CREATE (p:Project {id: ${i}, name: '${projectName}', budget: ${budget}, status: '${status}'})`);
        }
        
        // Add 15 technologies
        console.log('Adding 15 technologies...');
        const technologies = [
            { name: 'JavaScript', category: 'Language' },
            { name: 'Python', category: 'Language' },
            { name: 'Java', category: 'Language' },
            { name: 'React', category: 'Framework' },
            { name: 'Node.js', category: 'Runtime' },
            { name: 'Docker', category: 'Container' },
            { name: 'Kubernetes', category: 'Orchestration' },
            { name: 'PostgreSQL', category: 'Database' },
            { name: 'MongoDB', category: 'Database' },
            { name: 'Redis', category: 'Cache' },
            { name: 'AWS', category: 'Cloud' },
            { name: 'GraphQL', category: 'API' },
            { name: 'TensorFlow', category: 'ML Framework' },
            { name: 'Kuzu', category: 'Graph Database' },
            { name: 'Three.js', category: 'Graphics' }
        ];
        
        for (let i = 0; i < technologies.length; i++) {
            const tech = technologies[i];
            await conn.query(`CREATE (t:Technology {id: ${i + 1}, name: '${tech.name}', category: '${tech.category}'})`);
        }
        
        console.log('\nTotal nodes: 110 (50 People + 20 Companies + 25 Projects + 15 Technologies)');
        
        // Create relationships
        console.log('\nCreating relationships...');
        
        // WorksAt: Each person works at a company
        console.log('Creating WorksAt relationships...');
        for (let i = 1; i <= 50; i++) {
            const companyId = ((i - 1) % 20) + 1;
            const since = 2015 + (i % 9);
            await conn.query(`
                MATCH (p:Person), (c:Company)
                WHERE p.id = ${i} AND c.id = ${companyId}
                CREATE (p)-[:WorksAt {since: ${since}}]->(c)
            `);
        }
        
        // WorksOn: People work on projects
        console.log('Creating WorksOn relationships...');
        const roles = ['Developer', 'Manager', 'Designer', 'Analyst', 'Engineer', 'Lead'];
        for (let i = 1; i <= 80; i++) {
            const personId = ((i - 1) % 50) + 1;
            const projectId = ((i - 1) % 25) + 1;
            const role = roles[i % roles.length];
            await conn.query(`
                MATCH (p:Person), (pr:Project)
                WHERE p.id = ${personId} AND pr.id = ${projectId}
                CREATE (p)-[:WorksOn {role: '${role}'}]->(pr)
            `);
        }
        
        // Uses: Projects use technologies
        console.log('Creating Uses relationships...');
        for (let i = 1; i <= 60; i++) {
            const projectId = ((i - 1) % 25) + 1;
            const techId = ((i - 1) % 15) + 1;
            await conn.query(`
                MATCH (p:Project), (t:Technology)
                WHERE p.id = ${projectId} AND t.id = ${techId}
                CREATE (p)-[:Uses]->(t)
            `);
        }
        
        // Knows: People know each other
        console.log('Creating Knows relationships...');
        for (let i = 1; i <= 40; i++) {
            const person1Id = i;
            const person2Id = ((i + 5) % 50) + 1;
            if (person1Id !== person2Id) {
                const since = 2010 + (i % 14);
                await conn.query(`
                    MATCH (p1:Person), (p2:Person)
                    WHERE p1.id = ${person1Id} AND p2.id = ${person2Id}
                    CREATE (p1)-[:Knows {since: ${since}}]->(p2)
                `);
            }
        }
        
        console.log('\nDatabase created successfully!');
        console.log('\nSummary:');
        console.log('- 110 total nodes');
        console.log('  - 50 People');
        console.log('  - 20 Companies');
        console.log('  - 25 Projects');
        console.log('  - 15 Technologies');
        console.log('- 230 total relationships');
        console.log('  - 50 WorksAt relationships');
        console.log('  - 80 WorksOn relationships');
        console.log('  - 60 Uses relationships');
        console.log('  - 40 Knows relationships');
        
    } catch (error) {
        console.error('Error creating database:', error);
    }
}

createLargeDataset();