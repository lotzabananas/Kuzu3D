import kuzu from 'kuzu';

async function addMoreData() {
    const dbPath = './test-kuzu-db';
    
    console.log('Adding more data to test Kùzu database...');
    
    try {
        // Connect to existing database
        const db = new kuzu.Database(dbPath);
        const conn = new kuzu.Connection(db);
        
        // Add more people
        const morePeople = [
            { id: 5, name: 'Eve', age: 26 },
            { id: 6, name: 'Frank', age: 45 },
            { id: 7, name: 'Grace', age: 32 },
            { id: 8, name: 'Henry', age: 29 },
            { id: 9, name: 'Iris', age: 31 },
            { id: 10, name: 'Jack', age: 27 }
        ];
        
        for (const person of morePeople) {
            await conn.query(`CREATE (p:Person {id: ${person.id}, name: '${person.name}', age: ${person.age}})`);
            console.log(`Added ${person.name}`);
        }
        
        // Add more companies
        const moreCompanies = [
            { id: 3, name: 'AI Innovations', founded: 2018 },
            { id: 4, name: 'CloudWorks', founded: 2020 }
        ];
        
        for (const company of moreCompanies) {
            await conn.query(`CREATE (c:Company {id: ${company.id}, name: '${company.name}', founded: ${company.founded}})`);
            console.log(`Added ${company.name}`);
        }
        
        // Add more relationships
        const moreRelationships = [
            { personId: 5, companyId: 3, since: 2020 },
            { personId: 6, companyId: 3, since: 2018 },
            { personId: 7, companyId: 4, since: 2021 },
            { personId: 8, companyId: 4, since: 2020 },
            { personId: 9, companyId: 1, since: 2023 },
            { personId: 10, companyId: 2, since: 2021 }
        ];
        
        for (const rel of moreRelationships) {
            await conn.query(`
                MATCH (p:Person), (c:Company)
                WHERE p.id = ${rel.personId} AND c.id = ${rel.companyId}
                CREATE (p)-[:WorksAt {since: ${rel.since}}]->(c)
            `);
            console.log(`Connected person ${rel.personId} to company ${rel.companyId}`);
        }
        
        // Add a new table for Projects
        await conn.query(`
            CREATE NODE TABLE Project (
                id INT64,
                name STRING,
                budget INT64,
                PRIMARY KEY (id)
            )
        `);
        
        // Add projects
        const projects = [
            { id: 1, name: 'VR Explorer', budget: 500000 },
            { id: 2, name: 'AI Assistant', budget: 750000 },
            { id: 3, name: 'Cloud Migration', budget: 300000 },
            { id: 4, name: 'Data Analytics', budget: 400000 }
        ];
        
        for (const project of projects) {
            await conn.query(`CREATE (p:Project {id: ${project.id}, name: '${project.name}', budget: ${project.budget}})`);
            console.log(`Added project ${project.name}`);
        }
        
        // Create a WorksOn relationship table
        await conn.query(`
            CREATE REL TABLE WorksOn (
                FROM Person TO Project,
                role STRING
            )
        `);
        
        // Add project assignments
        const assignments = [
            { personId: 1, projectId: 1, role: 'Lead Developer' },
            { personId: 2, projectId: 1, role: 'UI Designer' },
            { personId: 3, projectId: 2, role: 'Project Manager' },
            { personId: 5, projectId: 2, role: 'ML Engineer' },
            { personId: 7, projectId: 3, role: 'Cloud Architect' },
            { personId: 8, projectId: 3, role: 'DevOps Engineer' },
            { personId: 9, projectId: 4, role: 'Data Scientist' },
            { personId: 10, projectId: 4, role: 'Data Engineer' }
        ];
        
        for (const assign of assignments) {
            await conn.query(`
                MATCH (p:Person), (proj:Project)
                WHERE p.id = ${assign.personId} AND proj.id = ${assign.projectId}
                CREATE (p)-[:WorksOn {role: '${assign.role}'}]->(proj)
            `);
            console.log(`Assigned person ${assign.personId} to project ${assign.projectId}`);
        }
        
        console.log('\nDatabase now contains:');
        console.log('- 10 People (Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Henry, Iris, Jack)');
        console.log('- 4 Companies (TechCorp, DataSolutions, AI Innovations, CloudWorks)');
        console.log('- 4 Projects (VR Explorer, AI Assistant, Cloud Migration, Data Analytics)');
        console.log('- 10 WorksAt relationships');
        console.log('- 8 WorksOn relationships');
        console.log('\nTotal: 18 nodes and 18 edges!');
        
    } catch (error) {
        console.error('Error adding data:', error);
    }
}

addMoreData();