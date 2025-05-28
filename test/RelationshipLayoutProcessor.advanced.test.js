import { RelationshipLayoutProcessor } from '../src/layouts/RelationshipLayoutProcessor.js';

// Test utilities
class TestRunner {
    constructor(name) {
        this.name = name;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.startTime = Date.now();
    }

    test(description, fn) {
        this.tests.push({ description, fn });
    }

    async run() {
        console.log(`\n🧪 Running ${this.name}\n`);
        
        for (const test of this.tests) {
            const testStart = Date.now();
            try {
                await test.fn();
                const duration = Date.now() - testStart;
                this.passed++;
                console.log(`  ✅ ${test.description} (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - testStart;
                this.failed++;
                console.log(`  ❌ ${test.description} (${duration}ms)`);
                console.log(`     Error: ${error.message}`);
                if (error.stack) {
                    console.log(`     Stack: ${error.stack.split('\n')[1].trim()}`);
                }
            }
        }
        
        const totalDuration = Date.now() - this.startTime;
        console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed in ${totalDuration}ms`);
        return this.failed === 0;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertDeepEquals(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(message || `Expected ${expectedStr}, got ${actualStr}`);
    }
}

function assertThrows(fn, expectedError, message) {
    let thrown = false;
    try {
        fn();
    } catch (error) {
        thrown = true;
        if (expectedError && !error.message.includes(expectedError)) {
            throw new Error(message || `Expected error containing "${expectedError}", got "${error.message}"`);
        }
    }
    if (!thrown) {
        throw new Error(message || 'Expected function to throw');
    }
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

// Advanced Test Suite
const suite = new TestRunner('Advanced RelationshipLayoutProcessor Tests');

// Test: Complex graph scenarios
suite.test('should handle large graphs efficiently', async () => {
    const processor = new RelationshipLayoutProcessor();
    
    // Create a large graph
    const nodes = [];
    const edges = [];
    const nodeCount = 1000;
    const edgeCount = 2000;
    
    // Generate nodes
    for (let i = 0; i < nodeCount; i++) {
        nodes.push({
            id: `n${i}`,
            type: i % 3 === 0 ? 'Person' : i % 3 === 1 ? 'Company' : 'Project'
        });
    }
    
    // Generate random edges
    for (let i = 0; i < edgeCount; i++) {
        edges.push({
            source: `n${Math.floor(Math.random() * nodeCount)}`,
            target: `n${Math.floor(Math.random() * nodeCount)}`,
            type: 'RELATES_TO'
        });
    }
    
    const startTime = Date.now();
    processor.setGraphData(nodes, edges);
    
    const positions = await processor.processCommand('group nodes by type');
    const duration = Date.now() - startTime;
    
    assertEquals(positions.size, nodeCount, 'All nodes should have positions');
    assert(duration < 1000, `Should process ${nodeCount} nodes in under 1 second (took ${duration}ms)`);
});

// Test: Multiple relationship types
suite.test('should handle multiple relationship types between same nodes', () => {
    const processor = new RelationshipLayoutProcessor();
    
    const nodes = [
        { id: 'p1', type: 'Person' },
        { id: 'c1', type: 'Company' }
    ];
    
    const edges = [
        { source: 'p1', target: 'c1', type: 'WORKS_AT' },
        { source: 'p1', target: 'c1', type: 'OWNS' },
        { source: 'p1', target: 'c1', type: 'CONSULTS_FOR' }
    ];
    
    processor.setGraphData(nodes, edges);
    
    // Test finding connections with specific relationship
    const worksAtConnections = processor.findConnectedNodes('p1', [nodes[1]], 'WORKS_AT');
    assertEquals(worksAtConnections.length, 1);
    
    // Test finding all connections
    const allConnections = processor.findConnectedNodes('p1', [nodes[1]]);
    assertEquals(allConnections.length, 1); // Still one node, but connected multiple times
});

// Test: Bidirectional edges
suite.test('should handle bidirectional relationships correctly', () => {
    const processor = new RelationshipLayoutProcessor();
    
    const nodes = [
        { id: 'p1', type: 'Person' },
        { id: 'p2', type: 'Person' }
    ];
    
    const edges = [
        { source: 'p1', target: 'p2', type: 'KNOWS' },
        { source: 'p2', target: 'p1', type: 'KNOWS' }
    ];
    
    processor.setGraphData(nodes, edges);
    
    const p1Connections = processor.findConnectedNodes('p1', nodes);
    const p2Connections = processor.findConnectedNodes('p2', nodes);
    
    assertEquals(p1Connections.length, 1);
    assertEquals(p2Connections.length, 1);
});

// Test: Complex command parsing
suite.test('should parse complex natural language commands', () => {
    const processor = new RelationshipLayoutProcessor();
    processor.setSchema({
        nodeTypes: ['Person', 'Company', 'Department', 'Project'],
        relationshipTypes: ['WORKS_AT', 'MANAGES', 'BELONGS_TO']
    });
    
    // Test various phrasings
    const tests = [
        {
            command: 'organize employees by their departments',
            expected: { sourceType: 'Person', targetType: 'Department' }
        },
        {
            command: 'cluster all the people who work at companies',
            expected: { sourceType: 'Person', targetType: 'Company' }
        },
        {
            command: 'group departments with their companies',
            expected: { sourceType: 'Department', targetType: 'Company' }
        }
    ];
    
    tests.forEach(({ command, expected }) => {
        const intent = processor.extractGroupingIntent(command);
        assertEquals(intent.sourceType, expected.sourceType, `Failed for command: ${command}`);
        assertEquals(intent.targetType, expected.targetType, `Failed for command: ${command}`);
    });
});

// Test: Layout stability
suite.test('should produce stable layouts for same input', async () => {
    const processor = new RelationshipLayoutProcessor();
    
    const nodes = [
        { id: 'n1', type: 'A' },
        { id: 'n2', type: 'B' },
        { id: 'n3', type: 'A' }
    ];
    
    processor.setGraphData(nodes, []);
    
    // Run layout multiple times
    const positions1 = await processor.processCommand('group nodes by type');
    const positions2 = await processor.processCommand('group nodes by type');
    
    // Positions should be identical
    positions1.forEach((pos1, nodeId) => {
        const pos2 = positions2.get(nodeId);
        assertEquals(pos1.x, pos2.x, `X position should be stable for ${nodeId}`);
        assertEquals(pos1.y, pos2.y, `Y position should be stable for ${nodeId}`);
        assertEquals(pos1.z, pos2.z, `Z position should be stable for ${nodeId}`);
    });
});

// Test: Self-referencing edges
suite.test('should handle self-referencing edges', () => {
    const processor = new RelationshipLayoutProcessor();
    
    const nodes = [
        { id: 'n1', type: 'Node' },
        { id: 'n2', type: 'Node' }
    ];
    
    const edges = [
        { source: 'n1', target: 'n1', type: 'SELF_REF' },
        { source: 'n1', target: 'n2', type: 'CONNECTS' }
    ];
    
    processor.setGraphData(nodes, edges);
    
    const connections = processor.findConnectedNodes('n1', nodes);
    // Should find n2 but not count self-reference as connection to another node
    assertEquals(connections.length, 1);
    assertEquals(connections[0].id, 'n2');
});

// Test: Isolated subgraphs
suite.test('should handle disconnected subgraphs', async () => {
    const processor = new RelationshipLayoutProcessor();
    
    // Create two disconnected groups
    const nodes = [
        // Group 1
        { id: 'g1n1', type: 'Person' },
        { id: 'g1n2', type: 'Person' },
        { id: 'g1c1', type: 'Company' },
        // Group 2
        { id: 'g2n1', type: 'Person' },
        { id: 'g2n2', type: 'Person' },
        { id: 'g2c1', type: 'Company' }
    ];
    
    const edges = [
        // Group 1 edges
        { source: 'g1n1', target: 'g1c1', type: 'WORKS_AT' },
        { source: 'g1n2', target: 'g1c1', type: 'WORKS_AT' },
        // Group 2 edges
        { source: 'g2n1', target: 'g2c1', type: 'WORKS_AT' },
        { source: 'g2n2', target: 'g2c1', type: 'WORKS_AT' }
    ];
    
    processor.setGraphData(nodes, edges);
    processor.setSchema({
        nodeTypes: ['Person', 'Company'],
        relationshipTypes: ['WORKS_AT']
    });
    
    const positions = await processor.processCommand('group people around companies');
    
    // All nodes should have positions
    assertEquals(positions.size, 6);
    
    // Check that groups are separated
    const g1c1Pos = positions.get('g1c1');
    const g2c1Pos = positions.get('g2c1');
    const distance = g1c1Pos.distanceTo(g2c1Pos);
    assert(distance > 5, 'Disconnected groups should be separated');
});

// Test: Command variations
suite.test('should handle various command variations', async () => {
    const processor = new RelationshipLayoutProcessor();
    processor.setGraphData([{ id: 'n1' }, { id: 'n2' }], []);
    
    const commands = [
        'arrange in a circle',
        'circular layout please',
        'make a radial arrangement',
        'put nodes around the center'
    ];
    
    for (const command of commands) {
        const positions = await processor.processCommand(command);
        assert(positions.size > 0, `Should process: ${command}`);
    }
});

// Test: Position constraints
suite.test('should respect existing positions when possible', () => {
    const processor = new RelationshipLayoutProcessor();
    
    const fixedPos = new MockVector3(10, 20, 30);
    const nodes = [
        { id: 'fixed', type: 'Special', mesh: { position: fixedPos } },
        { id: 'movable', type: 'Normal' }
    ];
    
    processor.setGraphData(nodes, []);
    
    // Check that initial position is preserved
    const savedPos = processor.nodePositions.get('fixed');
    assertEquals(savedPos.x, 10);
    assertEquals(savedPos.y, 20);
    assertEquals(savedPos.z, 30);
});

// Test: Empty commands
suite.test('should handle empty or invalid commands gracefully', async () => {
    const processor = new RelationshipLayoutProcessor();
    processor.setGraphData([{ id: 'n1' }], []);
    
    const invalidCommands = [
        '',
        '   ',
        'asdfghjkl',
        'do something',
        null,
        undefined
    ];
    
    for (const command of invalidCommands) {
        try {
            const positions = await processor.processCommand(command || '');
            assert(positions.size >= 0, 'Should return valid positions map');
        } catch (error) {
            // Should not throw errors
            assert(false, `Should not throw for command: ${command}`);
        }
    }
});

// Test: Performance with complex relationships
suite.test('should handle highly connected graphs', () => {
    const processor = new RelationshipLayoutProcessor();
    
    // Create a fully connected graph
    const nodeCount = 50;
    const nodes = [];
    const edges = [];
    
    for (let i = 0; i < nodeCount; i++) {
        nodes.push({ id: `n${i}`, type: 'Node' });
    }
    
    // Connect every node to every other node
    for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
            edges.push({
                source: `n${i}`,
                target: `n${j}`,
                type: 'CONNECTED'
            });
        }
    }
    
    const startTime = Date.now();
    processor.setGraphData(nodes, edges);
    
    // Find connections for a single node
    const connections = processor.findConnectedNodes('n0', nodes);
    const duration = Date.now() - startTime;
    
    assertEquals(connections.length, nodeCount - 1, 'Should be connected to all other nodes');
    assert(duration < 100, `Should handle ${edges.length} edges efficiently (took ${duration}ms)`);
});

// Test: Hierarchical layout with cycles
suite.test('should handle cycles in hierarchical layout', () => {
    const processor = new RelationshipLayoutProcessor();
    
    // Create a graph with a cycle
    const nodes = [
        { id: 'a' },
        { id: 'b' },
        { id: 'c' }
    ];
    
    const edges = [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
        { source: 'c', target: 'a' } // Creates cycle
    ];
    
    processor.setGraphData(nodes, edges);
    
    // Should not crash or infinite loop
    const levels = processor.calculateNodeLevels();
    assertEquals(levels.size, 3, 'All nodes should have levels');
    
    // Check that levels are assigned (exact values may vary due to cycle)
    assert(levels.has('a'));
    assert(levels.has('b'));
    assert(levels.has('c'));
});

// Run all tests
suite.run().then(success => {
    process.exit(success ? 0 : 1);
});