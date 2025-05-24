import kuzu from 'kuzu';

async function testKuzuAPI() {
    try {
        // Create in-memory database for testing
        const db = new kuzu.Database(':memory:');
        const conn = new kuzu.Connection(db);
        
        console.log('Testing Kùzu API...\n');
        
        // Create schema
        console.log('Creating schema...');
        let result = await conn.query('CREATE NODE TABLE Person (id INT64, name STRING, PRIMARY KEY(id))');
        console.log('Person table created');
        
        result = await conn.query('CREATE NODE TABLE Company (id INT64, name STRING, PRIMARY KEY(id))');
        console.log('Company table created');
        
        result = await conn.query('CREATE REL TABLE WorksAt (FROM Person TO Company, since INT64)');
        console.log('WorksAt relationship created\n');
        
        // Insert data
        console.log('Inserting data...');
        result = await conn.query('CREATE (p:Person {id: 1, name: "Alice"})');
        result = await conn.query('CREATE (p:Person {id: 2, name: "Bob"})');
        result = await conn.query('CREATE (c:Company {id: 1, name: "TechCorp"})');
        console.log('Nodes created\n');
        
        // Create relationships
        result = await conn.query(`
            MATCH (p:Person), (c:Company)
            WHERE p.id = 1 AND c.id = 1
            CREATE (p)-[:WorksAt {since: 2020}]->(c)
        `);
        console.log('Relationship created\n');
        
        // Query nodes
        console.log('Querying nodes:');
        result = await conn.query('MATCH (n:Person) RETURN n');
        const nodes = await result.getAll();
        console.log('Nodes:', JSON.stringify(nodes, null, 2));
        
        // Query relationships
        console.log('\nQuerying relationships:');
        result = await conn.query('MATCH (p:Person)-[r:WorksAt]->(c:Company) RETURN p, r, c');
        const relationships = await result.getAll();
        console.log('Relationships:', JSON.stringify(relationships, null, 2));
        
        // Show tables
        console.log('\nShowing tables:');
        result = await conn.query('CALL show_tables() RETURN *');
        const tables = await result.getAll();
        console.log('Tables:', JSON.stringify(tables, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testKuzuAPI();