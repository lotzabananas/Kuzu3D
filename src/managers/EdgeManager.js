import * as THREE from 'three';
import { logger } from '../utils/Logger.js';

export class EdgeManager {
	constructor(scene) {
		this.scene = scene;
		this.edgeGroup = new THREE.Group();
		this.edges = [];
		this.edgeMap = new Map(); // Map for quick lookup
		
		this.scene.add(this.edgeGroup);
	}
	
	createEdges(edgeDataArray, nodeManager) {
		// Clear existing edges
		this.clearEdges();
		
		const nodes = nodeManager.getNodes();
		const nodeMap = new Map();
		
		// Create a map of node IDs to node objects
		nodes.forEach(node => {
			nodeMap.set(node.userData.id, node);
		});
		
		// Create edges
		edgeDataArray.forEach((edgeData, index) => {
			const fromNode = nodeMap.get(edgeData.from);
			const toNode = nodeMap.get(edgeData.to);
			
			if (fromNode && toNode) {
				const edge = this.createEdge(fromNode, toNode, edgeData);
				this.edges.push(edge);
				this.edgeGroup.add(edge);
				
				// Store in map for quick lookup
				const key = `${edgeData.from}-${edgeData.to}`;
				this.edgeMap.set(key, edge);
			}
		});
		
		logger.info(`Created ${this.edges.length} edges`);
	}
	
	createEdge(fromNode, toNode, edgeData) {
		const edgeGroup = new THREE.Group();
		edgeGroup.userData = edgeData;
		
		// Create simple line geometry
		const geometry = new THREE.BufferGeometry();
		const positions = new Float32Array(6); // 2 points * 3 coordinates
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		
		// Create line material
		const material = new THREE.LineBasicMaterial({
			color: this.getEdgeColor(edgeData.type),
			linewidth: 2,
			transparent: true,
			opacity: 0.6
		});
		
		const line = new THREE.Line(geometry, material);
		edgeGroup.add(line);
		
		// Create label for relationship type (using mesh instead of sprite for alignment)
		const label = this.createEdgeLabel(edgeData.type);
		edgeGroup.add(label);
		
		// Store references
		edgeGroup.fromNode = fromNode;
		edgeGroup.toNode = toNode;
		edgeGroup.line = line;
		edgeGroup.label = label;
		
		return edgeGroup;
	}
	
	createEdgeLabel(text) {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.width = 512;
		canvas.height = 128;
		
		// Clear canvas (transparent background)
		context.clearRect(0, 0, canvas.width, canvas.height);
		
		// Add subtle text shadow for readability
		context.shadowColor = 'rgba(0, 0, 0, 0.8)';
		context.shadowBlur = 4;
		context.shadowOffsetX = 2;
		context.shadowOffsetY = 2;
		
		// Text
		context.fillStyle = 'white';
		context.font = 'bold 32px Arial';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(text, canvas.width / 2, canvas.height / 2);
		
		const texture = new THREE.CanvasTexture(canvas);
		const spriteMaterial = new THREE.SpriteMaterial({
			map: texture,
			transparent: true
		});
		
		const sprite = new THREE.Sprite(spriteMaterial);
		sprite.scale.set(1, 0.25, 1);
		
		return sprite;
	}
	
	getEdgeColor(type) {
		// Define colors for different edge types
		const edgeColors = {
			'WORKS_AT': 0x4a90e2,     // Blue
			'MANAGES': 0xf5a623,      // Orange
			'WORKS_ON': 0x7ed321,     // Green
			'USES': 0xbd10e0,         // Purple
			'LOCATED_IN': 0x50e3c2,   // Teal
			'ATTENDING': 0xf8e71c,    // Yellow
			'SPEAKING_AT': 0xff6b6b,  // Red
			'KNOWS': 0x9013fe,        // Violet
			'FOLLOWS': 0x00bcd4,      // Cyan
			'LIKES': 0xff4081,        // Pink
			// Default
			'default': 0x888888       // Gray
		};
		
		return edgeColors[type] || edgeColors.default;
	}
	
	update() {
		// Update edge positions based on node positions
		this.edges.forEach(edge => {
			const fromPos = new THREE.Vector3();
			const toPos = new THREE.Vector3();
			
			// Get sphere positions for GraphNode groups
			if (edge.fromNode.sphere) {
				edge.fromNode.sphere.getWorldPosition(fromPos);
			} else {
				edge.fromNode.getWorldPosition(fromPos);
			}
			
			if (edge.toNode.sphere) {
				edge.toNode.sphere.getWorldPosition(toPos);
			} else {
				edge.toNode.getWorldPosition(toPos);
			}
			
			// Update line geometry
			const positions = edge.line.geometry.attributes.position;
			positions.setXYZ(0, fromPos.x, fromPos.y, fromPos.z);
			positions.setXYZ(1, toPos.x, toPos.y, toPos.z);
			positions.needsUpdate = true;
			
			// Calculate midpoint and direction
			const midPoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
			const direction = new THREE.Vector3().subVectors(toPos, fromPos);
			const distance = direction.length();
			direction.normalize();
			
			// Position label at midpoint of the line
			edge.label.position.copy(midPoint);
			
			// Get the graph scale from node's parent (the nodeGroup)
			const nodeGroup = edge.fromNode.parent;
			const graphScale = nodeGroup ? nodeGroup.scale.x : 1;
			
			// Scale label with the graph
			const baseScale = 1.0;
			const labelScale = baseScale * graphScale;
			edge.label.scale.set(labelScale, labelScale * 0.25, 1);
		});
	}
	
	clearEdges() {
		this.edges.forEach(edge => {
			this.edgeGroup.remove(edge);
			edge.line.geometry.dispose();
			edge.line.material.dispose();
			if (edge.label.material.map) {
				edge.label.material.map.dispose();
			}
			edge.label.material.dispose();
		});
		this.edges = [];
		this.edgeMap.clear();
	}
	
	setVisibility(visible) {
		this.edgeGroup.visible = visible;
	}
	
	dispose() {
		this.clearEdges();
		this.scene.remove(this.edgeGroup);
	}
}