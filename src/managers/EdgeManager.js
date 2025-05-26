import * as THREE from 'three';
import { logger } from '../utils/Logger.js';
import { VISUAL_CONFIG } from '../constants/index.js';
import { colorGenerator } from '../utils/ColorGenerator.js';

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
		edgeDataArray.forEach((edgeData, _index) => {
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
		
		// Create line material with dynamically generated color
		const edgeColor = colorGenerator.getColorForType(edgeData.type || 'default');
		const material = new THREE.LineBasicMaterial({
			color: edgeColor,
			linewidth: 2,
			transparent: true,
			opacity: VISUAL_CONFIG.edge.opacity
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
			transparent: true,
			depthTest: false,    // Don't test depth - allows other lines to show through
			depthWrite: false,   // Don't write to depth buffer
			opacity: 0.9        // Slightly transparent to see lines behind
		});
		
		const sprite = new THREE.Sprite(spriteMaterial);
		sprite.scale.set(1, 0.25, 1);
		sprite.renderOrder = 1000; // Render labels after lines
		
		return sprite;
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
			// const distance = direction.length(); // Reserved for future use
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
	
	/**
	 * Pre-generate colors for relationship types from schema
	 * This ensures consistent colors throughout the session
	 */
	generateColorsFromSchema(relationshipTypes) {
		if (relationshipTypes && relationshipTypes.length > 0) {
			colorGenerator.generateColorsForTypes(relationshipTypes);
			logger.info(`Generated colors for ${relationshipTypes.length} relationship types`);
		}
	}
	
	/**
	 * Get the color mapping for legend display
	 */
	getEdgeColorMap() {
		return colorGenerator.getAllColors();
	}
	
	dispose() {
		this.clearEdges();
		this.scene.remove(this.edgeGroup);
	}
}