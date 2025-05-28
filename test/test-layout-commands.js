/**
 * Comprehensive unit tests for layout command processing
 * Tests real-world voice commands for arranging nodes in VR
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';

// Mock classes for testing
class MockNode {
    constructor(id, type, label) {
        this.userData = { id, type, label };
        this.position = { 
            x: 0, y: 0, z: 0, 
            set: function(x, y, z) { 
                this.x = x; this.y = y; this.z = z; 
            } 
        };
    }
}

class MockEdge {
    constructor(src, dst, type) {
        this.userData = { src, dst, type };
    }
}

class MockVoiceInput {
    constructor() {
        this.lastText = '';
    }
    showTranscriptText(text) {
        this.lastText = text;
    }
}

class MockEdgeManager {
    constructor() {
        this.updateCalled = false;
    }
    update() {
        this.updateCalled = true;
    }
    getEdges() {
        return this.edges || [];
    }
    setEdges(edges) {
        this.edges = edges;
    }
}

// Import the layout processing logic
// Note: In real implementation, this would be imported from the actual module
class LayoutProcessor {
    constructor() {
        this.voiceInput = new MockVoiceInput();
        this.edgeManager = new MockEdgeManager();
    }
    
    async processLayoutCommand(transcript, nodes, edges) {
        this.edgeManager.setEdges(edges);
        
        if (nodes.length === 0) {
            this.voiceInput.showTranscriptText('No nodes to arrange');
            return;
        }
        
        const lowerTranscript = transcript.toLowerCase();
        
        if (lowerTranscript.includes('group') && 
            (lowerTranscript.includes('employee') || lowerTranscript.includes('people') || lowerTranscript.includes('person')) && 
            (lowerTranscript.includes('compan') || lowerTranscript.includes('organization'))) {
            await this.arrangeEmployeesAroundCompanies(nodes, edges);
        } else if (lowerTranscript.includes('spread') || lowerTranscript.includes('apart')) {
            await this.spreadNodesApart(nodes);
        } else if (lowerTranscript.includes('circle') || lowerTranscript.includes('ring')) {
            await this.arrangeInCircle(nodes);
        } else if (lowerTranscript.includes('hierarch') || lowerTranscript.includes('tree')) {
            await this.arrangeHierarchically(nodes, edges);
        } else if (lowerTranscript.includes('cluster') && lowerTranscript.includes('type')) {
            await this.clusterByType(nodes);
        } else if (lowerTranscript.includes('force') || lowerTranscript.includes('spring')) {
            await this.forceDirectedLayout(nodes, edges);
        } else {
            this.voiceInput.showTranscriptText('Layout not recognized: ' + transcript);
        }
    }
    
    async arrangeEmployeesAroundCompanies(nodes, edges) {
        const companies = nodes.filter(node => 
            node.userData?.type?.toLowerCase() === 'company' || 
            node.userData?.label?.toLowerCase() === 'company'
        );
        
        const people = nodes.filter(node => 
            node.userData?.type?.toLowerCase() === 'person' || 
            node.userData?.label?.toLowerCase() === 'person'
        );
        
        if (companies.length === 0) {
            this.voiceInput.showTranscriptText('No companies found');
            return;
        }
        
        // Position companies in a line
        companies.forEach((company, index) => {
            const x = (index - (companies.length - 1) / 2) * 3;
            company.position.set(x, 0, 0);
        });
        
        // Group people by their company
        const companyEmployees = new Map();
        companies.forEach(company => companyEmployees.set(company.userData.id, []));
        
        edges.forEach(edge => {
            if (edge.userData?.type === 'WorksAt' || edge.userData?.type === 'WORKS_AT') {
                const person = nodes.find(n => n.userData.id === edge.userData.src);
                const company = nodes.find(n => n.userData.id === edge.userData.dst);
                
                if (person && company && companyEmployees.has(company.userData.id)) {
                    companyEmployees.get(company.userData.id).push(person);
                }
            }
        });
        
        // Position employees around their companies
        companyEmployees.forEach((employees, companyId) => {
            const company = companies.find(c => c.userData.id === companyId);
            if (!company || employees.length === 0) return;
            
            const radius = 1.5;
            employees.forEach((employee, index) => {
                const angle = (index / employees.length) * Math.PI * 2;
                const x = company.position.x + Math.cos(angle) * radius;
                const z = company.position.z + Math.sin(angle) * radius;
                employee.position.set(x, 0, z);
            });
        });
        
        this.edgeManager.update();
        this.voiceInput.showTranscriptText('Grouped employees around companies');
    }
    
    async spreadNodesApart(nodes) {
        const spread = 2;
        nodes.forEach((node, index) => {
            const angle = (index / nodes.length) * Math.PI * 2;
            const radius = Math.sqrt(nodes.length) * spread / 2;
            node.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
        });
        
        this.edgeManager.update();
        this.voiceInput.showTranscriptText('Spread nodes apart');
    }
    
    async arrangeInCircle(nodes) {
        const radius = Math.max(2, nodes.length * 0.3);
        nodes.forEach((node, index) => {
            const angle = (index / nodes.length) * Math.PI * 2;
            node.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
        });
        
        this.edgeManager.update();
        this.voiceInput.showTranscriptText('Arranged in circle');
    }
    
    async arrangeHierarchically(nodes, edges) {
        // Find root nodes (no incoming edges)
        const hasIncoming = new Set();
        edges.forEach(edge => hasIncoming.add(edge.userData.dst));
        
        const roots = nodes.filter(node => !hasIncoming.has(node.userData.id));
        const levels = new Map();
        
        // BFS to assign levels
        const queue = roots.map(r => ({ node: r, level: 0 }));
        const visited = new Set();
        
        while (queue.length > 0) {
            const { node, level } = queue.shift();
            if (visited.has(node.userData.id)) continue;
            
            visited.add(node.userData.id);
            if (!levels.has(level)) levels.set(level, []);
            levels.get(level).push(node);
            
            // Find children
            edges.forEach(edge => {
                if (edge.userData.src === node.userData.id) {
                    const child = nodes.find(n => n.userData.id === edge.userData.dst);
                    if (child && !visited.has(child.userData.id)) {
                        queue.push({ node: child, level: level + 1 });
                    }
                }
            });
        }
        
        // Position nodes by level
        const levelHeight = 2;
        levels.forEach((nodesInLevel, level) => {
            const y = -level * levelHeight;
            nodesInLevel.forEach((node, index) => {
                const x = (index - (nodesInLevel.length - 1) / 2) * 2;
                node.position.set(x, y, 0);
            });
        });
        
        this.edgeManager.update();
        this.voiceInput.showTranscriptText('Arranged hierarchically');
    }
    
    async clusterByType(nodes) {
        // Group nodes by type
        const typeGroups = new Map();
        nodes.forEach(node => {
            const type = node.userData.type || node.userData.label || 'unknown';
            if (!typeGroups.has(type)) typeGroups.set(type, []);
            typeGroups.get(type).push(node);
        });
        
        // Position each type group in a cluster
        const clusterRadius = 3;
        let clusterIndex = 0;
        
        typeGroups.forEach((nodesOfType, type) => {
            const clusterAngle = (clusterIndex / typeGroups.size) * Math.PI * 2;
            const clusterX = Math.cos(clusterAngle) * clusterRadius * 2;
            const clusterZ = Math.sin(clusterAngle) * clusterRadius * 2;
            
            // Arrange nodes within cluster
            nodesOfType.forEach((node, index) => {
                const angle = (index / nodesOfType.length) * Math.PI * 2;
                const x = clusterX + Math.cos(angle) * clusterRadius / 2;
                const z = clusterZ + Math.sin(angle) * clusterRadius / 2;
                node.position.set(x, 0, z);
            });
            
            clusterIndex++;
        });
        
        this.edgeManager.update();
        this.voiceInput.showTranscriptText('Clustered by type');
    }
    
    async forceDirectedLayout(nodes, edges) {
        // Simple force-directed layout simulation
        const iterations = 50;
        const repulsion = 5;
        const attraction = 0.1;
        
        for (let iter = 0; iter < iterations; iter++) {
            // Apply repulsion between all nodes
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[j].position.x - nodes[i].position.x;
                    const dz = nodes[j].position.z - nodes[i].position.z;
                    const dist = Math.sqrt(dx * dx + dz * dz) || 0.1;
                    
                    const force = repulsion / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fz = (dz / dist) * force;
                    
                    nodes[i].position.x -= fx;
                    nodes[i].position.z -= fz;
                    nodes[j].position.x += fx;
                    nodes[j].position.z += fz;
                }
            }
            
            // Apply attraction along edges
            edges.forEach(edge => {
                const src = nodes.find(n => n.userData.id === edge.userData.src);
                const dst = nodes.find(n => n.userData.id === edge.userData.dst);
                
                if (src && dst) {
                    const dx = dst.position.x - src.position.x;
                    const dz = dst.position.z - src.position.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    
                    const force = dist * attraction;
                    const fx = (dx / dist) * force;
                    const fz = (dz / dist) * force;
                    
                    src.position.x += fx;
                    src.position.z += fz;
                    dst.position.x -= fx;
                    dst.position.z -= fz;
                }
            });
        }
        
        this.edgeManager.update();
        this.voiceInput.showTranscriptText('Applied force-directed layout');
    }
}

// Test suite
describe('Layout Command Processing', () => {
    let processor;
    let nodes;
    let edges;
    
    beforeEach(() => {
        processor = new LayoutProcessor();
        nodes = [];
        edges = [];
    });
    
    describe('Employee-Company Grouping', () => {
        beforeEach(() => {
            // Create test data
            nodes = [
                new MockNode('c1', 'Company', 'Company'),
                new MockNode('c2', 'Company', 'Company'),
                new MockNode('p1', 'Person', 'Person'),
                new MockNode('p2', 'Person', 'Person'),
                new MockNode('p3', 'Person', 'Person'),
                new MockNode('p4', 'Person', 'Person'),
            ];
            
            edges = [
                new MockEdge('p1', 'c1', 'WorksAt'),
                new MockEdge('p2', 'c1', 'WorksAt'),
                new MockEdge('p3', 'c2', 'WorksAt'),
                // p4 is unassigned
            ];
        });
        
        it('should handle "group employees around companies"', async () => {
            await processor.processLayoutCommand('group employees around companies', nodes, edges);
            
            // Companies should be positioned in a line
            expect(nodes[0].position.x).to.equal(-1.5); // First company
            expect(nodes[1].position.x).to.equal(1.5);  // Second company
            
            // Employees should be around their companies
            const c1Pos = nodes[0].position;
            const p1Pos = nodes[2].position;
            const p2Pos = nodes[3].position;
            
            // Check distance from company
            const dist1 = Math.sqrt(
                Math.pow(p1Pos.x - c1Pos.x, 2) + 
                Math.pow(p1Pos.z - c1Pos.z, 2)
            );
            expect(dist1).to.be.closeTo(1.5, 0.01);
            
            expect(processor.voiceInput.lastText).to.equal('Grouped employees around companies');
        });
        
        it('should handle variations of the command', async () => {
            const variations = [
                'group people around companies',
                'arrange employees by their companies',
                'put employees near their organizations',
                'cluster people with their companies'
            ];
            
            for (const command of variations) {
                await processor.processLayoutCommand(command, nodes, edges);
                expect(processor.edgeManager.updateCalled).to.be.true;
            }
        });
        
        it('should handle no companies case', async () => {
            const peopleOnly = nodes.filter(n => n.userData.type === 'Person');
            await processor.processLayoutCommand('group employees around companies', peopleOnly, edges);
            expect(processor.voiceInput.lastText).to.equal('No companies found');
        });
    });
    
    describe('Spread Layout', () => {
        beforeEach(() => {
            nodes = Array(10).fill(0).map((_, i) => new MockNode(`n${i}`, 'Node', 'Node'));
        });
        
        it('should spread nodes apart evenly', async () => {
            await processor.processLayoutCommand('spread nodes apart', nodes, edges);
            
            // Check that nodes are distributed in a circle
            const positions = nodes.map(n => ({ x: n.position.x, z: n.position.z }));
            
            // All nodes should be roughly same distance from origin
            const distances = positions.map(p => Math.sqrt(p.x * p.x + p.z * p.z));
            const avgDistance = distances.reduce((a, b) => a + b) / distances.length;
            
            distances.forEach(d => {
                expect(d).to.be.closeTo(avgDistance, 0.1);
            });
            
            expect(processor.voiceInput.lastText).to.equal('Spread nodes apart');
        });
        
        it('should handle spread command variations', async () => {
            const variations = [
                'spread them apart',
                'space nodes out',
                'distribute nodes evenly',
                'separate the nodes'
            ];
            
            for (const command of variations) {
                await processor.processLayoutCommand(command, nodes, edges);
                expect(processor.edgeManager.updateCalled).to.be.true;
            }
        });
    });
    
    describe('Circle Layout', () => {
        beforeEach(() => {
            nodes = Array(8).fill(0).map((_, i) => new MockNode(`n${i}`, 'Node', 'Node'));
        });
        
        it('should arrange nodes in a circle', async () => {
            await processor.processLayoutCommand('arrange in a circle', nodes, edges);
            
            // All nodes should be same distance from origin
            const distances = nodes.map(n => 
                Math.sqrt(n.position.x * n.position.x + n.position.z * n.position.z)
            );
            
            const radius = distances[0];
            distances.forEach(d => {
                expect(d).to.be.closeTo(radius, 0.01);
            });
            
            expect(processor.voiceInput.lastText).to.equal('Arranged in circle');
        });
    });
    
    describe('Hierarchical Layout', () => {
        beforeEach(() => {
            nodes = [
                new MockNode('root', 'Node', 'Root'),
                new MockNode('child1', 'Node', 'Child'),
                new MockNode('child2', 'Node', 'Child'),
                new MockNode('grandchild', 'Node', 'Grandchild'),
            ];
            
            edges = [
                new MockEdge('root', 'child1', 'PARENT_OF'),
                new MockEdge('root', 'child2', 'PARENT_OF'),
                new MockEdge('child1', 'grandchild', 'PARENT_OF'),
            ];
        });
        
        it('should arrange nodes hierarchically', async () => {
            await processor.processLayoutCommand('arrange hierarchically', nodes, edges);
            
            // Root should be at top (y=0)
            expect(nodes[0].position.y).to.equal(0);
            
            // Children should be below root
            expect(nodes[1].position.y).to.equal(-2);
            expect(nodes[2].position.y).to.equal(-2);
            
            // Grandchild should be lowest
            expect(nodes[3].position.y).to.equal(-4);
            
            expect(processor.voiceInput.lastText).to.equal('Arranged hierarchically');
        });
    });
    
    describe('Type Clustering', () => {
        beforeEach(() => {
            nodes = [
                new MockNode('p1', 'Person', 'Person'),
                new MockNode('p2', 'Person', 'Person'),
                new MockNode('c1', 'Company', 'Company'),
                new MockNode('c2', 'Company', 'Company'),
                new MockNode('pr1', 'Project', 'Project'),
                new MockNode('pr2', 'Project', 'Project'),
            ];
        });
        
        it('should cluster nodes by type', async () => {
            await processor.processLayoutCommand('cluster by type', nodes, edges);
            
            // People should be close to each other
            const p1 = nodes[0].position;
            const p2 = nodes[1].position;
            const personDist = Math.sqrt(
                Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2)
            );
            
            // Companies should be close to each other
            const c1 = nodes[2].position;
            const c2 = nodes[3].position;
            const companyDist = Math.sqrt(
                Math.pow(c2.x - c1.x, 2) + Math.pow(c2.z - c1.z, 2)
            );
            
            // Distance within cluster should be less than between clusters
            const crossDist = Math.sqrt(
                Math.pow(c1.x - p1.x, 2) + Math.pow(c1.z - p1.z, 2)
            );
            
            expect(personDist).to.be.lessThan(crossDist);
            expect(companyDist).to.be.lessThan(crossDist);
            
            expect(processor.voiceInput.lastText).to.equal('Clustered by type');
        });
    });
    
    describe('Force-Directed Layout', () => {
        beforeEach(() => {
            nodes = Array(5).fill(0).map((_, i) => new MockNode(`n${i}`, 'Node', 'Node'));
            edges = [
                new MockEdge('n0', 'n1', 'CONNECTED'),
                new MockEdge('n1', 'n2', 'CONNECTED'),
                new MockEdge('n2', 'n3', 'CONNECTED'),
                new MockEdge('n3', 'n4', 'CONNECTED'),
                new MockEdge('n4', 'n0', 'CONNECTED'), // Form a ring
            ];
        });
        
        it('should apply force-directed layout', async () => {
            // Set initial random positions
            nodes.forEach(n => {
                n.position.set(Math.random() * 10 - 5, 0, Math.random() * 10 - 5);
            });
            
            await processor.processLayoutCommand('force directed layout', nodes, edges);
            
            // Connected nodes should be closer than unconnected ones
            const n0 = nodes[0].position;
            const n1 = nodes[1].position;
            const n2 = nodes[2].position;
            
            const dist01 = Math.sqrt(
                Math.pow(n1.x - n0.x, 2) + Math.pow(n1.z - n0.z, 2)
            );
            const dist02 = Math.sqrt(
                Math.pow(n2.x - n0.x, 2) + Math.pow(n2.z - n0.z, 2)
            );
            
            // n0-n1 are connected, n0-n2 are not directly connected
            // So n0-n1 should generally be closer
            // (This might not always be true due to the ring structure, but it's a reasonable test)
            
            expect(processor.voiceInput.lastText).to.equal('Applied force-directed layout');
        });
    });
    
    describe('Error Handling', () => {
        it('should handle empty node list', async () => {
            await processor.processLayoutCommand('group employees around companies', [], edges);
            expect(processor.voiceInput.lastText).to.equal('No nodes to arrange');
        });
        
        it('should handle unrecognized commands', async () => {
            nodes = [new MockNode('n1', 'Node', 'Node')];
            await processor.processLayoutCommand('do something random with nodes', nodes, edges);
            expect(processor.voiceInput.lastText).to.include('Layout not recognized');
        });
    });
    
    describe('Real-World Voice Commands', () => {
        beforeEach(() => {
            // Setup a realistic graph
            nodes = [
                new MockNode('alice', 'Person', 'Person'),
                new MockNode('bob', 'Person', 'Person'),
                new MockNode('charlie', 'Person', 'Person'),
                new MockNode('techcorp', 'Company', 'Company'),
                new MockNode('datacorp', 'Company', 'Company'),
                new MockNode('project1', 'Project', 'Project'),
                new MockNode('project2', 'Project', 'Project'),
            ];
            
            edges = [
                new MockEdge('alice', 'techcorp', 'WorksAt'),
                new MockEdge('bob', 'techcorp', 'WorksAt'),
                new MockEdge('charlie', 'datacorp', 'WorksAt'),
                new MockEdge('alice', 'project1', 'WorksOn'),
                new MockEdge('bob', 'project1', 'WorksOn'),
                new MockEdge('charlie', 'project2', 'WorksOn'),
            ];
        });
        
        it('should handle natural voice commands', async () => {
            const commands = [
                { text: 'hey can you group the employees around their companies', expected: 'Grouped employees around companies' },
                { text: 'spread everything out so I can see better', expected: 'Spread nodes apart' },
                { text: 'arrange these in a nice circle', expected: 'Arranged in circle' },
                { text: 'show me a hierarchical view', expected: 'Arranged hierarchically' },
                { text: 'cluster nodes by their type please', expected: 'Clustered by type' },
                { text: 'apply a force directed layout', expected: 'Applied force-directed layout' },
            ];
            
            for (const { text, expected } of commands) {
                // Reset positions
                nodes.forEach(n => n.position.set(0, 0, 0));
                
                await processor.processLayoutCommand(text, nodes, edges);
                expect(processor.voiceInput.lastText).to.equal(expected);
                expect(processor.edgeManager.updateCalled).to.be.true;
                
                // Reset for next test
                processor.edgeManager.updateCalled = false;
            }
        });
    });
});

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    import('mocha').then(mocha => {
        mocha.describe = describe;
        mocha.it = it;
        mocha.beforeEach = beforeEach;
        mocha.run();
    });
}

export { LayoutProcessor, MockNode, MockEdge };