import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function testCypherAPI() {
  console.log('Testing Cypher API endpoints...\n');
  
  // First, connect to the test database
  console.log('1. Connecting to test database...');
  try {
    const connectResponse = await fetch(`${API_BASE}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbPath: './test-kuzu-db' })
    });
    const connectResult = await connectResponse.json();
    console.log('Connection result:', connectResult);
  } catch (error) {
    console.error('Failed to connect:', error);
    return;
  }
  
  // Test query templates endpoint
  console.log('\n2. Testing query templates...');
  try {
    const templatesResponse = await fetch(`${API_BASE}/cypher/templates`);
    const templates = await templatesResponse.json();
    console.log('Templates available:', Object.keys(templates.templates));
    console.log('Example template:', templates.templates.exploration[0]);
  } catch (error) {
    console.error('Failed to get templates:', error);
  }
  
  // Test query execution
  console.log('\n3. Testing query execution...');
  const testQueries = [
    {
      name: 'Find all Person nodes',
      query: 'MATCH (n:Person) RETURN n'
    },
    {
      name: 'Find people who work at companies',
      query: 'MATCH (p:Person)-[r:WorksAt]->(c:Company) RETURN p, r, c'
    },
    {
      name: 'Count nodes by type',
      query: 'MATCH (n) RETURN labels(n)[0] as type, count(n) as count'
    }
  ];
  
  for (const test of testQueries) {
    console.log(`\nExecuting: ${test.name}`);
    console.log(`Query: ${test.query}`);
    
    try {
      const response = await fetch(`${API_BASE}/cypher/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: test.query,
          options: { limit: 10 }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`Success! Found ${result.data.nodes?.length || 0} nodes and ${result.data.edges?.length || 0} edges`);
        console.log('Metadata:', result.metadata);
        
        // Show sample data
        if (result.data.nodes && result.data.nodes.length > 0) {
          console.log('Sample node:', result.data.nodes[0]);
        }
        if (result.data.edges && result.data.edges.length > 0) {
          console.log('Sample edge:', result.data.edges[0]);
        }
      } else {
        console.error('Query failed:', result.error);
      }
    } catch (error) {
      console.error('Request failed:', error);
    }
  }
  
  // Test query validation
  console.log('\n4. Testing query validation...');
  const testValidation = [
    { query: 'MATCH (n:Person) RETURN n', expected: 'valid' },
    { query: 'MATCH (n:Person RETURN n', expected: 'invalid' },  // Missing )
    { query: 'MTCH (n:Person) RETURN n', expected: 'invalid' }   // Wrong keyword
  ];
  
  for (const test of testValidation) {
    console.log(`\nValidating: ${test.query}`);
    try {
      const response = await fetch(`${API_BASE}/cypher/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: test.query })
      });
      
      const result = await response.json();
      console.log(`Valid: ${result.valid} (expected: ${test.expected === 'valid'})`);
      if (!result.valid) {
        console.log('Errors:', result.errors);
        console.log('Suggestions:', result.suggestions);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }
  
  // Test query history
  console.log('\n5. Testing query history...');
  try {
    const historyResponse = await fetch(`${API_BASE}/cypher/history`);
    const history = await historyResponse.json();
    console.log(`Query history has ${history.history?.length || 0} entries`);
    if (history.history && history.history.length > 0) {
      console.log('Most recent query:', history.history[0]);
    }
  } catch (error) {
    console.error('Failed to get history:', error);
  }
  
  console.log('\n✅ Cypher API testing complete!');
}

// Run the tests
testCypherAPI().catch(console.error);