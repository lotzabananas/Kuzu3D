import { RelationshipLayoutProcessor } from '../src/layouts/RelationshipLayoutProcessor.js';

// Simple test runner
class TestRunner {
    constructor(name) {
        this.name = name;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(description, fn) {
        this.tests.push({ description, fn });
    }

    async run() {
        console.log(`\n🧪 Running ${this.name}\n`);
        
        for (const test of this.tests) {
            try {
                await test.fn();
                this.passed++;
                console.log(`  ✅ ${test.description}`);
            } catch (error) {
                this.failed++;
                console.log(`  ❌ ${test.description}`);
                console.log(`     Error: ${error.message}`);
            }
        }
        
        console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    }
}

// Test utilities
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

function assertIncludes(array, item, message) {
    if (!array.includes(item)) {
        throw new Error(message || `Array does not include ${item}`);
    }
}

// Mock THREE.Vector3 for testing
class MockVector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    clone() {
        return new MockVector3(this.x, this.y, this.z);
    }
}

// Override THREE for tests
global.THREE = { Vector3: MockVector3 };

// Test Suite
const suite = new TestRunner('RelationshipLayoutProcessor Tests');

// Test: Command Detection
suite.test('should detect grouping commands', () => {
    const processor = new RelationshipLayoutProcessor();
    
    assert(processor.isGroupingCommand('group employees around companies'));
    assert(processor.isGroupingCommand('cluster nodes by their type'));
    assert(processor.isGroupingCommand('put people near their departments'));
    assert(!processor.isGroupingCommand('show all nodes'));
    assert(!processor.isGroupingCommand('find employees'));
});

suite.test('should detect hierarchical commands', () => {
    const processor = new RelationshipLayoutProcessor();
    
    assert(processor.isHierarchicalCommand('show hierarchy'));
    assert(processor.isHierarchicalCommand('arrange in a tree'));
    assert(processor.isHierarchicalCommand('parent child relationships'));
    assert(!processor.isHierarchicalCommand('group nodes'));
});

suite.test('should detect circular commands', () => {
    const processor = new RelationshipLayoutProcessor();
    
    assert(processor.isCircularCommand('arrange in a circle'));
    assert(processor.isCircularCommand('circular layout'));
    assert(processor.isCircularCommand('radial arrangement'));
    assert(!processor.isCircularCommand('group nodes'));
});

// Test: Schema handling
suite.test('should set and use schema', () => {
    const processor = new RelationshipLayoutProcessor();
    const schema = {
        nodeTypes: ['Person', 'Company', 'Project'],
        relationshipTypes: ['WORKS_AT', 'MANAGES', 'CONTRIBUTES_TO']
    };
    
    processor.setSchema(schema);
    assertEquals(processor.schema, schema);
});

// Test: Graph data handling
suite.test('should handle graph data correctly', () => {
    const processor = new RelationshipLayoutProcessor();
    
    const nodes = [
        { id: 'n1', type: 'Person', mesh: { position: new MockVector3(1, 2, 3) } },
        { id: 'n2', type: 'Company', mesh: { position: new MockVector3(4, 5, 6) } }
    ];
    
    const edges = [
        { source: 'n1', target: 'n2', type: 'WORKS_AT' }
    ];
    
    processor.setGraphData(nodes, edges);
    
    assertEquals(processor.nodes.size, 2);
    assertEquals(processor.edges.length, 1);
    assert(processor.nodePositions.has('n1'));
    assert(processor.nodePositions.has('n2'));
});

// Test: Intent extraction
suite.test('should extract grouping intent from commands', () => {
    const processor = new RelationshipLayoutProcessor();
    processor.setSchema({
        nodeTypes: ['Person', 'Company', 'Department'],
        relationshipTypes: ['WORKS_AT', 'BELONGS_TO']
    });
    
    const intent1 = processor.extractGroupingIntent('group people around companies');
    assertEquals(intent1.sourceType, 'Person');
    assertEquals(intent1.targetType, 'Company');
    
    const intent2 = processor.extractGroupingIntent('cluster departments by company');
    assertEquals(intent2.sourceType, 'Department');
    assertEquals(intent2.targetType, 'Company');
});

// Test: Node type finding
suite.test('should find nodes by type', () => {
    const processor = new RelationshipLayoutProcessor();
    
    const nodes = [
        { id: 'n1', type: 'Person' },
        { id: 'n2', type: 'Person' },
        { id: 'n3', type: 'Company' },
        { id: 'n4', type: 'Project' }
    ];
    
    processor.setGraphData(nodes, []);
    
    const people = processor.findNodesByType('Person');
    assertEquals(people.length, 2);
    assertEquals(people[0].id, 'n1');
    assertEquals(people[1].id, 'n2');
    
    const companies = processor.findNodesByType('Company');
    assertEquals(companies.length, 1);
    assertEquals(companies[0].id, 'n3');
});

// Test: Connected nodes finding
suite.test('should find connected nodes', () => {
    const processor = new RelationshipLayoutProcessor();
    
    const nodes = [
        { id: 'n1', type: 'Person' },
        { id: 'n2', type: 'Company' },
        { id: 'n3', type: 'Company' },
        { id: 'n4', type: 'Person' }
    ];
    
    const edges = [
        { source: 'n1', target: 'n2', type: 'WORKS_AT' },
        { source: 'n1', target: 'n3', type: 'CONSULTS_FOR' },
        { source: 'n4', target: 'n2', type: 'WORKS_AT' }
    ];
    
    processor.setGraphData(nodes, edges);
    
    const companies = [nodes[1], nodes[2]]; // n2, n3
    const connectedToN1 = processor.findConnectedNodes('n1', companies);
    assertEquals(connectedToN1.length, 2);
    
    const connectedToN4 = processor.findConnectedNodes('n4', companies);
    assertEquals(connectedToN4.length, 1);
    assertEquals(connectedToN4[0].id, 'n2');
});

// Test: Grouping algorithm
suite.test('should group nodes around targets', () => {
    const processor = new RelationshipLayoutProcessor();
    
    const sourceNodes = [
        { id: 'p1', type: 'Person' },
        { id: 'p2', type: 'Person' },
        { id: 'p3', type: 'Person' }
    ];
    
    const targetNodes = [
        { id: 'c1', type: 'Company' },
        { id: 'c2', type: 'Company' }
    ];
    
    const edges = [
        { source: 'p1', target: 'c1', type: 'WORKS_AT' },
        { source: 'p2', target: 'c1', type: 'WORKS_AT' },
        { source: 'p3', target: 'c2', type: 'WORKS_AT' }
    ];
    
    processor.setGraphData([...sourceNodes, ...targetNodes], edges);
    
    const positions = processor.groupNodesAroundTargets(sourceNodes, targetNodes, 'WORKS_AT');
    
    // Check that all nodes have positions
    assertEquals(positions.size, 5);
    
    // Check that companies are positioned in a circle
    assert(positions.has('c1'));
    assert(positions.has('c2'));
    
    // Check that people are positioned near their companies
    assert(positions.has('p1'));
    assert(positions.has('p2'));
    assert(positions.has('p3'));
    
    // Verify p1 and p2 are near c1
    const c1Pos = positions.get('c1');
    const p1Pos = positions.get('p1');
    const p2Pos = positions.get('p2');
    const p3Pos = positions.get('p3');
    const c2Pos = positions.get('c2');
    
    // Distance from p1 to c1 should be less than distance from p1 to c2
    const p1ToC1Dist = Math.sqrt(
        Math.pow(p1Pos.x - c1Pos.x, 2) + 
        Math.pow(p1Pos.z - c1Pos.z, 2)
    );
    const p1ToC2Dist = Math.sqrt(
        Math.pow(p1Pos.x - c2Pos.x, 2) + 
        Math.pow(p1Pos.z - c2Pos.z, 2)
    );
    assert(p1ToC1Dist < p1ToC2Dist, 'p1 should be closer to c1 than c2');
});

// Test: Group by node type
suite.test('should group nodes by type', () => {
    const processor = new RelationshipLayoutProcessor();
    
    const nodes = [
        { id: 'p1', type: 'Person' },
        { id: 'p2', type: 'Person' },
        { id: 'c1', type: 'Company' },
        { id: 'c2', type: 'Company' },
        { id: 'pr1', type: 'Project' }
    ];
    
    processor.setGraphData(nodes, []);
    
    const positions = processor.groupByNodeType();
    
    // All nodes should have positions
    assertEquals(positions.size, 5);
    
    // Nodes of same type should be closer together
    const p1Pos = positions.get('p1');
    const p2Pos = positions.get('p2');
    const c1Pos = positions.get('c1');
    
    const p1ToP2Dist = Math.sqrt(
        Math.pow(p1Pos.x - p2Pos.x, 2) + 
        Math.pow(p1Pos.z - p2Pos.z, 2)
    );
    const p1ToC1Dist = Math.sqrt(
        Math.pow(p1Pos.x - c1Pos.x, 2) + 
        Math.pow(p1Pos.z - c1Pos.z, 2)
    );
    
    assert(p1ToP2Dist < p1ToC1Dist, 'People should be grouped together');
});

// Test: Circular layout
suite.test('should create circular layout', () => {
    const processor = new RelationshipLayoutProcessor();
    
    const nodes = [
        { id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }
    ];
    
    processor.setGraphData(nodes, []);
    
    const positions = processor.createCircularLayout();
    
    assertEquals(positions.size, 4);
    
    // All nodes should be equidistant from center
    const distances = [];
    positions.forEach(pos => {
        const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        distances.push(dist);
    });
    
    // Check all distances are similar (within 0.1)
    const firstDist = distances[0];
    distances.forEach(dist => {
        assert(Math.abs(dist - firstDist) < 0.1, 'All nodes should be equidistant from center');
    });
});

// Test: Tree layout levels
suite.test('should calculate node levels for tree layout', () => {
    const processor = new RelationshipLayoutProcessor();
    
    const nodes = [
        { id: 'root' },
        { id: 'child1' },
        { id: 'child2' },
        { id: 'grandchild1' },
        { id: 'grandchild2' }
    ];
    
    const edges = [
        { source: 'root', target: 'child1' },
        { source: 'root', target: 'child2' },
        { source: 'child1', target: 'grandchild1' },
        { source: 'child2', target: 'grandchild2' }
    ];
    
    processor.setGraphData(nodes, edges);
    
    const levels = processor.calculateNodeLevels();
    
    assertEquals(levels.get('root'), 0);
    assertEquals(levels.get('child1'), 1);
    assertEquals(levels.get('child2'), 1);
    assertEquals(levels.get('grandchild1'), 2);
    assertEquals(levels.get('grandchild2'), 2);
});

// Test: Command processing integration
suite.test('should process grouping command end-to-end', async () => {
    const processor = new RelationshipLayoutProcessor();
    
    processor.setSchema({
        nodeTypes: ['Person', 'Company'],
        relationshipTypes: ['WORKS_AT']
    });
    
    const nodes = [
        { id: 'p1', type: 'Person' },
        { id: 'p2', type: 'Person' },
        { id: 'c1', type: 'Company' }
    ];
    
    const edges = [
        { source: 'p1', target: 'c1', type: 'WORKS_AT' },
        { source: 'p2', target: 'c1', type: 'WORKS_AT' }
    ];
    
    processor.setGraphData(nodes, edges);
    
    const positions = await processor.processCommand('group people around companies');
    
    assert(positions.size > 0, 'Should return positions');
    assert(positions.has('p1'), 'Should have position for p1');
    assert(positions.has('p2'), 'Should have position for p2');
    assert(positions.has('c1'), 'Should have position for c1');
});

// Test: Edge cases
suite.test('should handle empty graph', async () => {
    const processor = new RelationshipLayoutProcessor();
    processor.setGraphData([], []);
    
    const positions = await processor.processCommand('group nodes');
    assertEquals(positions.size, 0);
});

suite.test('should handle missing schema gracefully', async () => {
    const processor = new RelationshipLayoutProcessor();
    
    const nodes = [{ id: 'n1' }, { id: 'n2' }];
    processor.setGraphData(nodes, []);
    
    const positions = await processor.processCommand('group nodes by type');
    assert(positions.size > 0, 'Should still return positions without schema');
});

suite.test('should handle disconnected nodes', () => {
    const processor = new RelationshipLayoutProcessor();
    
    const sourceNodes = [
        { id: 'p1', type: 'Person' },
        { id: 'p2', type: 'Person' } // Not connected to any company
    ];
    
    const targetNodes = [
        { id: 'c1', type: 'Company' }
    ];
    
    const edges = [
        { source: 'p1', target: 'c1', type: 'WORKS_AT' }
    ];
    
    processor.setGraphData([...sourceNodes, ...targetNodes], edges);
    
    const positions = processor.groupNodesAroundTargets(sourceNodes, targetNodes);
    
    assert(positions.has('p2'), 'Disconnected nodes should still get positions');
    const p2Pos = positions.get('p2');
    assertEquals(p2Pos.x, 0, 'Disconnected nodes should be at center');
    assertEquals(p2Pos.z, 0, 'Disconnected nodes should be at center');
});

// Run tests
suite.run().then(success => {
    process.exit(success ? 0 : 1);
});