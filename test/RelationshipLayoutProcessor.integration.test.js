import { RelationshipLayoutProcessor } from '../src/layouts/RelationshipLayoutProcessor.js';

// Test runner with better reporting
class IntegrationTestRunner {
    constructor(name) {
        this.name = name;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.startTime = Date.now();
    }

    scenario(description, fn) {
        this.tests.push({ description, fn, type: 'scenario' });
    }

    async run() {
        console.log(`\n🧪 ${this.name}\n`);
        console.log('=' .repeat(60));
        
        for (const test of this.tests) {
            console.log(`\n📋 Scenario: ${test.description}`);
            console.log('-'.repeat(40));
            
            try {
                await test.fn();
                this.passed++;
                console.log(`✅ Completed successfully`);
            } catch (error) {
                this.failed++;
                console.log(`❌ Failed: ${error.message}`);
                if (error.stack) {
                    console.log(`   ${error.stack.split('\n').slice(1, 3).join('\n   ')}`);
                }
            }
        }
        
        const duration = Date.now() - this.startTime;
        console.log('\n' + '='.repeat(60));
        console.log(`\n📊 Final Results: ${this.passed}/${this.tests.length} scenarios passed (${duration}ms)\n`);
        return this.failed === 0;
    }
}

// Test utilities
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function log(message) {
    console.log(`   ℹ️  ${message}`);
}

// Mock THREE.Vector3
class MockVector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    clone() {
        return new MockVector3(this.x, this.y, this.z);
    }
    
    distanceTo(other) {
        return Math.sqrt(
            Math.pow(this.x - other.x, 2) + 
            Math.pow(this.y - other.y, 2) + 
            Math.pow(this.z - other.z, 2)
        );
    }
}

global.THREE = { Vector3: MockVector3 };

// Integration Test Scenarios
const suite = new IntegrationTestRunner('RelationshipLayoutProcessor Integration Tests');

// Scenario 1: Social Network Visualization
suite.scenario('Social Network - Group friends by their companies', async () => {
    const processor = new RelationshipLayoutProcessor();
    
    // Set up schema
    const schema = {
        nodeTypes: ['Person', 'Company'],
        relationshipTypes: ['WORKS_AT', 'KNOWS']
    };
    processor.setSchema(schema);
    log('Schema configured with Person/Company nodes');
    
    // Create a social network
    const nodes = [
        // Tech company employees
        { id: 'alice', type: 'Person', name: 'Alice' },
        { id: 'bob', type: 'Person', name: 'Bob' },
        { id: 'charlie', type: 'Person', name: 'Charlie' },
        // Finance company employees
        { id: 'david', type: 'Person', name: 'David' },
        { id: 'eve', type: 'Person', name: 'Eve' },
        // Companies
        { id: 'techcorp', type: 'Company', name: 'TechCorp' },
        { id: 'fincorp', type: 'Company', name: 'FinCorp' }
    ];
    
    const edges = [
        // Employment
        { source: 'alice', target: 'techcorp', type: 'WORKS_AT' },
        { source: 'bob', target: 'techcorp', type: 'WORKS_AT' },
        { source: 'charlie', target: 'techcorp', type: 'WORKS_AT' },
        { source: 'david', target: 'fincorp', type: 'WORKS_AT' },
        { source: 'eve', target: 'fincorp', type: 'WORKS_AT' },
        // Friendships across companies
        { source: 'alice', target: 'david', type: 'KNOWS' },
        { source: 'bob', target: 'eve', type: 'KNOWS' }
    ];
    
    processor.setGraphData(nodes, edges);
    log(`Graph loaded: ${nodes.length} nodes, ${edges.length} edges`);
    
    // Process natural language command
    const command = 'group employees around their companies';
    const positions = await processor.processCommand(command);
    log(`Processed command: "${command}"`);
    
    // Verify results
    assert(positions.size === nodes.length, 'All nodes should have positions');
    
    // Check that tech employees are near TechCorp
    const techCorpPos = positions.get('techcorp');
    const alicePos = positions.get('alice');
    const bobPos = positions.get('bob');
    const davidPos = positions.get('david');
    
    const aliceToTech = alicePos.distanceTo(techCorpPos);
    const aliceToFin = alicePos.distanceTo(positions.get('fincorp'));
    
    assert(aliceToTech < aliceToFin, 'Alice should be closer to TechCorp than FinCorp');
    log('✓ Employees correctly grouped around their companies');
    
    // Check that companies are separated
    const companyDistance = techCorpPos.distanceTo(positions.get('fincorp'));
    assert(companyDistance > 10, 'Companies should be well separated');
    log('✓ Companies positioned with adequate separation');
});

// Scenario 2: Technology Stack Visualization
suite.scenario('Tech Stack - Arrange technologies by project usage', async () => {
    const processor = new RelationshipLayoutProcessor();
    
    const schema = {
        nodeTypes: ['Project', 'Technology', 'Developer'],
        relationshipTypes: ['USES', 'WORKS_ON', 'KNOWS']
    };
    processor.setSchema(schema);
    
    const nodes = [
        // Projects
        { id: 'webapp', type: 'Project', name: 'Web App' },
        { id: 'mobileapp', type: 'Project', name: 'Mobile App' },
        { id: 'backend', type: 'Project', name: 'Backend API' },
        // Technologies
        { id: 'react', type: 'Technology', name: 'React' },
        { id: 'nodejs', type: 'Technology', name: 'Node.js' },
        { id: 'python', type: 'Technology', name: 'Python' },
        { id: 'swift', type: 'Technology', name: 'Swift' },
        // Developers
        { id: 'dev1', type: 'Developer', name: 'Frontend Dev' },
        { id: 'dev2', type: 'Developer', name: 'Backend Dev' },
        { id: 'dev3', type: 'Developer', name: 'Mobile Dev' }
    ];
    
    const edges = [
        // Project tech stack
        { source: 'webapp', target: 'react', type: 'USES' },
        { source: 'webapp', target: 'nodejs', type: 'USES' },
        { source: 'mobileapp', target: 'swift', type: 'USES' },
        { source: 'mobileapp', target: 'react', type: 'USES' }, // React Native
        { source: 'backend', target: 'nodejs', type: 'USES' },
        { source: 'backend', target: 'python', type: 'USES' },
        // Developer assignments
        { source: 'dev1', target: 'webapp', type: 'WORKS_ON' },
        { source: 'dev2', target: 'backend', type: 'WORKS_ON' },
        { source: 'dev3', target: 'mobileapp', type: 'WORKS_ON' }
    ];
    
    processor.setGraphData(nodes, edges);
    log(`Tech stack graph loaded: ${nodes.length} nodes`);
    
    // Test different layouts
    const layouts = [
        'group technologies around projects',
        'arrange nodes in a circle',
        'create hierarchy'
    ];
    
    for (const layoutCmd of layouts) {
        const positions = await processor.processCommand(layoutCmd);
        assert(positions.size === nodes.length, `Layout "${layoutCmd}" should position all nodes`);
        log(`✓ Successfully applied: ${layoutCmd}`);
    }
    
    // Verify React is between webapp and mobileapp (shared tech)
    const finalPositions = await processor.processCommand('group technologies by projects');
    const reactPos = finalPositions.get('react');
    const webappPos = finalPositions.get('webapp');
    const mobilePos = finalPositions.get('mobileapp');
    
    const reactToWeb = reactPos.distanceTo(webappPos);
    const reactToMobile = reactPos.distanceTo(mobilePos);
    const reactToPython = reactPos.distanceTo(finalPositions.get('python'));
    
    // React should be positioned reasonably (not too far from either project)
    const maxDistance = Math.max(reactToWeb, reactToMobile);
    assert(maxDistance < 30, 'Shared tech should be within reasonable distance of projects');
    log('✓ Shared technologies positioned appropriately');
});

// Scenario 3: Organizational Hierarchy
suite.scenario('Organization - Build department hierarchy', async () => {
    const processor = new RelationshipLayoutProcessor();
    
    const schema = {
        nodeTypes: ['Person', 'Department', 'Company'],
        relationshipTypes: ['WORKS_IN', 'MANAGES', 'REPORTS_TO', 'PART_OF']
    };
    processor.setSchema(schema);
    
    const nodes = [
        // Company
        { id: 'corp', type: 'Company', name: 'MegaCorp' },
        // Departments
        { id: 'eng', type: 'Department', name: 'Engineering' },
        { id: 'sales', type: 'Department', name: 'Sales' },
        { id: 'hr', type: 'Department', name: 'HR' },
        // People
        { id: 'ceo', type: 'Person', name: 'CEO', role: 'CEO' },
        { id: 'cto', type: 'Person', name: 'CTO', role: 'CTO' },
        { id: 'vpsales', type: 'Person', name: 'VP Sales', role: 'VP' },
        { id: 'eng1', type: 'Person', name: 'Engineer 1' },
        { id: 'eng2', type: 'Person', name: 'Engineer 2' },
        { id: 'sales1', type: 'Person', name: 'Sales Rep 1' }
    ];
    
    const edges = [
        // Department structure
        { source: 'eng', target: 'corp', type: 'PART_OF' },
        { source: 'sales', target: 'corp', type: 'PART_OF' },
        { source: 'hr', target: 'corp', type: 'PART_OF' },
        // Management hierarchy
        { source: 'cto', target: 'ceo', type: 'REPORTS_TO' },
        { source: 'vpsales', target: 'ceo', type: 'REPORTS_TO' },
        // Department membership
        { source: 'cto', target: 'eng', type: 'MANAGES' },
        { source: 'vpsales', target: 'sales', type: 'MANAGES' },
        { source: 'eng1', target: 'eng', type: 'WORKS_IN' },
        { source: 'eng2', target: 'eng', type: 'WORKS_IN' },
        { source: 'sales1', target: 'sales', type: 'WORKS_IN' }
    ];
    
    processor.setGraphData(nodes, edges);
    
    // Test hierarchical layout
    const positions = await processor.processCommand('show hierarchy');
    assert(positions.size === nodes.length, 'All nodes should be positioned');
    log('✓ Hierarchical layout created');
    
    // Test department grouping
    const deptPositions = await processor.processCommand('group people by departments');
    
    // Verify engineers are near engineering dept
    const engPos = deptPositions.get('eng');
    const eng1Pos = deptPositions.get('eng1');
    const eng2Pos = deptPositions.get('eng2');
    const sales1Pos = deptPositions.get('sales1');
    
    const eng1ToEng = eng1Pos.distanceTo(engPos);
    const eng1ToSales = eng1Pos.distanceTo(deptPositions.get('sales'));
    
    assert(eng1ToEng < eng1ToSales, 'Engineers should be near Engineering dept');
    log('✓ Employees grouped by departments correctly');
});

// Scenario 4: Complex Multi-Type Network
suite.scenario('Complex Network - Handle multiple node and edge types', async () => {
    const processor = new RelationshipLayoutProcessor();
    
    const schema = {
        nodeTypes: ['Person', 'Company', 'Project', 'Technology', 'Location'],
        relationshipTypes: ['WORKS_AT', 'WORKS_ON', 'USES', 'LOCATED_IN', 'KNOWS', 'MANAGES']
    };
    processor.setSchema(schema);
    
    // Create a complex interconnected graph
    const nodeCount = 50;
    const nodes = [];
    const edges = [];
    
    // Generate nodes of different types
    const types = Object.keys(schema.nodeTypes);
    for (let i = 0; i < nodeCount; i++) {
        const type = schema.nodeTypes[i % types.length];
        nodes.push({
            id: `node_${i}`,
            type: type,
            name: `${type}_${i}`
        });
    }
    
    // Generate various relationships
    for (let i = 0; i < nodeCount * 2; i++) {
        const source = `node_${Math.floor(Math.random() * nodeCount)}`;
        const target = `node_${Math.floor(Math.random() * nodeCount)}`;
        const relType = schema.relationshipTypes[Math.floor(Math.random() * schema.relationshipTypes.length)];
        
        if (source !== target) {
            edges.push({ source, target, type: relType });
        }
    }
    
    processor.setGraphData(nodes, edges);
    log(`Complex graph created: ${nodes.length} nodes, ${edges.length} edges`);
    
    // Test various layout algorithms with timing
    const layoutCommands = [
        'group nodes by type',
        'arrange people around companies',
        'cluster technologies near projects',
        'organize the entire graph',
        'spread everything apart'
    ];
    
    for (const command of layoutCommands) {
        const start = Date.now();
        const positions = await processor.processCommand(command);
        const duration = Date.now() - start;
        
        assert(positions.size === nodes.length, `All nodes positioned for: ${command}`);
        assert(duration < 100, `Layout should complete quickly (${duration}ms)`);
        log(`✓ "${command}" completed in ${duration}ms`);
    }
});

// Scenario 5: Real-world Database Schema
suite.scenario('Real Database - Work with actual Kuzu schema', async () => {
    const processor = new RelationshipLayoutProcessor();
    
    // Simulate a real Kuzu database schema
    const schema = {
        nodeTypes: ['Person', 'Company', 'Project', 'Technology'],
        relationshipTypes: ['WorksAt', 'Knows', 'LeadsProject', 'UsedIn']
    };
    processor.setSchema(schema);
    
    // Create nodes that match test database structure
    const nodes = [
        { id: '0:0', type: 'Person', name: 'Alice', age: 30 },
        { id: '0:1', type: 'Person', name: 'Bob', age: 25 },
        { id: '0:2', type: 'Person', name: 'Charlie', age: 35 },
        { id: '0:3', type: 'Person', name: 'Diana', age: 28 },
        { id: '1:0', type: 'Company', name: 'TechCorp', founded: 2010 },
        { id: '1:1', type: 'Company', name: 'DataSolutions', founded: 2015 },
        { id: '2:0', type: 'Project', name: 'AI Platform' },
        { id: '2:1', type: 'Project', name: 'Data Pipeline' },
        { id: '3:0', type: 'Technology', name: 'Python' },
        { id: '3:1', type: 'Technology', name: 'JavaScript' },
        { id: '3:2', type: 'Technology', name: 'Kubernetes' }
    ];
    
    const edges = [
        { source: '0:0', target: '1:0', type: 'WorksAt' },
        { source: '0:1', target: '1:0', type: 'WorksAt' },
        { source: '0:2', target: '1:1', type: 'WorksAt' },
        { source: '0:3', target: '1:1', type: 'WorksAt' },
        { source: '0:0', target: '0:1', type: 'Knows' },
        { source: '0:2', target: '0:3', type: 'Knows' },
        { source: '0:0', target: '2:0', type: 'LeadsProject' },
        { source: '0:2', target: '2:1', type: 'LeadsProject' },
        { source: '3:0', target: '2:0', type: 'UsedIn' },
        { source: '3:1', target: '2:0', type: 'UsedIn' },
        { source: '3:2', target: '2:1', type: 'UsedIn' }
    ];
    
    processor.setGraphData(nodes, edges);
    log('Loaded Kuzu-style graph data');
    
    // Test natural language queries that match user expectations
    const userCommands = [
        'show me all the relationships to Python',
        'group employees around their companies',
        'arrange projects with their technologies',
        'cluster people who know each other'
    ];
    
    for (const command of userCommands) {
        const positions = await processor.processCommand(command);
        assert(positions.size === nodes.length, `Failed to layout: ${command}`);
        
        // Verify some semantic correctness
        if (command.includes('employees around their companies')) {
            const alice = positions.get('0:0');
            const techCorp = positions.get('1:0');
            const dataSolutions = positions.get('1:1');
            
            assert(
                alice.distanceTo(techCorp) < alice.distanceTo(dataSolutions),
                'Alice should be closer to TechCorp where she works'
            );
        }
        
        log(`✓ Successfully processed: "${command}"`);
    }
});

// Run all integration tests
suite.run().then(success => {
    if (success) {
        console.log('🎉 All integration tests passed!\n');
    } else {
        console.log('💔 Some integration tests failed.\n');
    }
    process.exit(success ? 0 : 1);
});