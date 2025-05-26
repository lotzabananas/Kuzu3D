import fetch from 'node-fetch';
import assert from 'assert';

// Test configuration
const API_BASE = 'http://localhost:3000/api';
const TEST_DB_PATH = '/Users/timmac/Desktop/Kuzu3D/test-kuzu-db';

// Color codes for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`${BLUE}=== CYPHER PIPELINE BACKEND TEST ===${RESET}\n`);

async function test(name, fn) {
    try {
        await fn();
        console.log(`${GREEN}✓${RESET} ${name}`);
    } catch (error) {
        console.log(`${RED}✗${RESET} ${name}`);
        console.error(`  ${RED}Error: ${error.message}${RESET}`);
        process.exit(1);
    }
}

async function runTests() {
    // Test 1: Connect to database
    await test('Database connection', async () => {
        const response = await fetch(`${API_BASE}/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dbPath: TEST_DB_PATH })
        });
        
        const result = await response.json();
        console.log(`  Response: ${JSON.stringify(result)}`);
        
        assert(result.success === true, 'Connection should succeed');
        assert(result.message.includes('Connected'), 'Should have success message');
    });

    // Test 2: Execute simple Cypher query
    await test('Execute MATCH (p:Person) query', async () => {
        const response = await fetch(`${API_BASE}/cypher/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: 'MATCH (p:Person) RETURN p',
                parameters: {},
                options: {}
            })
        });
        
        const result = await response.json();
        console.log(`  Full response structure:`);
        console.log(`  ${JSON.stringify(result, null, 2)}`);
        
        assert(result.success === true, 'Query should succeed');
        assert(result.data, 'Should have data property');
        assert(result.data.nodes, 'Should have nodes array');
        assert(result.data.nodes.length === 4, `Should have 4 nodes, got ${result.data.nodes.length}`);
        
        // Check first node structure
        const firstNode = result.data.nodes[0];
        console.log(`  First node: ${JSON.stringify(firstNode, null, 2)}`);
        
        assert(firstNode.properties, 'Node should have properties');
        assert(firstNode.properties.name, 'Node should have name property');
        assert(firstNode.type === 'Person', 'Node type should be Person');
    });

    // Test 3: Test different query formats
    await test('Execute CALL show_tables() query', async () => {
        const response = await fetch(`${API_BASE}/cypher/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: 'CALL show_tables() RETURN *',
                parameters: {},
                options: {}
            })
        });
        
        const result = await response.json();
        console.log(`  Tables query response: ${JSON.stringify(result, null, 2)}`);
        
        assert(result.success === true, 'Query should succeed');
        // Note: This might return empty results based on earlier tests
    });

    // Test 4: Test query with LIMIT
    await test('Execute query with LIMIT 2', async () => {
        const response = await fetch(`${API_BASE}/cypher/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: 'MATCH (p:Person) RETURN p LIMIT 2',
                parameters: {},
                options: {}
            })
        });
        
        const result = await response.json();
        console.log(`  Limited query returned ${result.data?.nodes?.length} nodes`);
        
        assert(result.success === true, 'Query should succeed');
        assert(result.data.nodes.length === 2, 'Should return exactly 2 nodes');
    });

    // Test 5: Test relationship query
    await test('Execute relationship query', async () => {
        const response = await fetch(`${API_BASE}/cypher/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: 'MATCH (p:Person)-[r:WorksAt]->(c:Company) RETURN p, r, c',
                parameters: {},
                options: {}
            })
        });
        
        const result = await response.json();
        console.log(`  Relationship query response:`);
        console.log(`  - Success: ${result.success}`);
        console.log(`  - Node count: ${result.data?.nodes?.length || 0}`);
        console.log(`  - Edge count: ${result.data?.edges?.length || 0}`);
        
        assert(result.success === true, 'Query should succeed');
    });

    // Test 6: Check exact response format for VR consumption
    await test('Verify response format for VR', async () => {
        const response = await fetch(`${API_BASE}/cypher/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: 'MATCH (p:Person) RETURN p LIMIT 1',
                parameters: {},
                options: { format: 'vr' }
            })
        });
        
        const result = await response.json();
        console.log(`${YELLOW}  EXACT VR RESPONSE FORMAT:${RESET}`);
        console.log(`${YELLOW}  ${JSON.stringify(result, null, 2)}${RESET}`);
        
        // This is what the VR app should expect
        console.log(`\n${BLUE}  VR App should check:${RESET}`);
        console.log(`  - result.success === true`);
        console.log(`  - result.data.nodes (array of nodes)`);
        console.log(`  - result.data.nodes.length for count`);
    });

    console.log(`\n${GREEN}All backend tests passed!${RESET}`);
    
    // Generate simple frontend test code
    console.log(`\n${BLUE}=== SIMPLE VR TEST CODE ===${RESET}`);
    console.log(`Replace your thumb menu option 3 with this simple test:\n`);
    
    console.log(`${YELLOW}case 3: {
    console.log('🧪 SIMPLE CYPHER TEST');
    
    // Direct API call to bypass any DataService issues
    fetch('/api/cypher/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            query: 'MATCH (p:Person) RETURN p',
            parameters: {},
            options: {}
        })
    })
    .then(response => response.json())
    .then(result => {
        console.log('🧪 RAW SERVER RESPONSE:', result);
        
        if (result.success && result.data && result.data.nodes) {
            const count = result.data.nodes.length;
            console.log('🧪 FOUND', count, 'NODES');
            
            if (this.voiceInput) {
                this.voiceInput.showTranscriptText(\`Found \${count} Person nodes!\`);
            }
            
            // Log first node as proof
            if (count > 0) {
                console.log('🧪 FIRST NODE:', result.data.nodes[0]);
            }
        } else {
            console.log('🧪 UNEXPECTED RESPONSE FORMAT');
            if (this.voiceInput) {
                this.voiceInput.showTranscriptText('Unexpected response format');
            }
        }
    })
    .catch(error => {
        console.error('🧪 FETCH ERROR:', error);
        if (this.voiceInput) {
            this.voiceInput.showTranscriptText('Error: ' + error.message);
        }
    });
    
    break;
}${RESET}`);
}

// Run all tests
runTests().catch(error => {
    console.error(`${RED}Test suite failed:${RESET}`, error);
    process.exit(1);
});