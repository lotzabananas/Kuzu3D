import kuzu from 'kuzu';
import fs from 'fs';
import path from 'path';

async function createTestDatabase() {
    const dbPath = './test-kuzu-db';
    
    // Remove existing database if it exists
    if (fs.existsSync(dbPath)) {
        fs.rmSync(dbPath, { recursive: true, force: true });
    }
    
    console.log('Creating test Kùzu database...');
    
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
                PRIMARY KEY (id)
            )
        `);
        
        await conn.query(`
            CREATE NODE TABLE Company (
                id INT64,
                name STRING,
                founded INT64,
                PRIMARY KEY (id)
            )
        `);
        
        // Create edge table
        await conn.query(`
            CREATE REL TABLE WorksAt (
                FROM Person TO Company,
                since INT64
            )
        `);
        
        // Insert some data using CREATE statements
        await conn.query(`CREATE (p:Person {id: 1, name: 'Alice', age: 30})`);
        await conn.query(`CREATE (p:Person {id: 2, name: 'Bob', age: 25})`);
        await conn.query(`CREATE (p:Person {id: 3, name: 'Charlie', age: 35})`);
        await conn.query(`CREATE (p:Person {id: 4, name: 'Diana', age: 28})`);
        
        await conn.query(`CREATE (c:Company {id: 1, name: 'TechCorp', founded: 2010})`);
        await conn.query(`CREATE (c:Company {id: 2, name: 'DataSolutions', founded: 2015})`);
        
        // Create relationships
        await conn.query(`
            MATCH (p:Person), (c:Company)
            WHERE p.id = 1 AND c.id = 1
            CREATE (p)-[:WorksAt {since: 2020}]->(c)
        `);
        
        await conn.query(`
            MATCH (p:Person), (c:Company)
            WHERE p.id = 2 AND c.id = 1
            CREATE (p)-[:WorksAt {since: 2021}]->(c)
        `);
        
        await conn.query(`
            MATCH (p:Person), (c:Company)
            WHERE p.id = 3 AND c.id = 2
            CREATE (p)-[:WorksAt {since: 2019}]->(c)
        `);
        
        await conn.query(`
            MATCH (p:Person), (c:Company)
            WHERE p.id = 4 AND c.id = 2
            CREATE (p)-[:WorksAt {since: 2022}]->(c)
        `);
        
        console.log('Test database created successfully at:', path.resolve(dbPath));
        console.log('\nTo use this database:');
        console.log('1. Start the server: npm run server');
        console.log('2. In the web UI, enter the path:', path.resolve(dbPath));
        
    } catch (error) {
        console.error('Error creating database:', error);
    }
}

createTestDatabase();