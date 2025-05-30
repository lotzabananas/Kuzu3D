import * as THREE from 'three';
import { VISUAL_CONFIG } from '../constants/index.js';
import { colorGenerator } from '../utils/ColorGenerator.js';
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
		
		// Create both line and cylinder for better visibility
		// 1. Create simple line geometry (for thin representation)
		const lineGeometry = new THREE.BufferGeometry();
		const positions = new Float32Array(6); // 2 points * 3 coordinates
		lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		
		// Create line material with dynamically generated color
		const edgeColor = colorGenerator.getColorForType(edgeData.type || 'default');
		const lineMaterial = new THREE.LineBasicMaterial({
			color: edgeColor,
			linewidth: 2,
			transparent: true,
			opacity: VISUAL_CONFIG.edge.opacity,
			// Ensure lines render from all angles
			depthWrite: true,
			depthTest: true
		});
		
		const line = new THREE.Line(lineGeometry, lineMaterial);
		// Disable frustum culling so lines don't disappear
		line.frustumCulled = false;
		edgeGroup.add(line);
		
		// 2. Create cylinder for better visibility from all angles
		const cylinderGeometry = new THREE.CylinderGeometry(0.001, 0.001, 1, 6); // Ultra-thin lines
		const cylinderMaterial = new THREE.MeshBasicMaterial({
			color: edgeColor,
			transparent: true,
			opacity: VISUAL_CONFIG.edge.opacity * 0.6, // Slightly more transparent
			side: THREE.DoubleSide // Visible from all angles
		});
		
		const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
		cylinder.frustumCulled = false;
		edgeGroup.add(cylinder);
		
		// Create label for relationship type (using mesh instead of sprite for alignment)
		const label = this.createEdgeLabel(edgeData.type);
		edgeGroup.add(label);
		
		// Store references
		edgeGroup.fromNode = fromNode;
		edgeGroup.toNode = toNode;
		edgeGroup.line = line;
		edgeGroup.cylinder = cylinder;
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
			opacity: 0.9,        // Slightly transparent to see lines behind
			sizeAttenuation: true // Scale with distance
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
			const distance = direction.length();
			direction.normalize();
			
			// Update cylinder position and orientation
			if (edge.cylinder) {
				edge.cylinder.position.copy(midPoint);
				edge.cylinder.scale.set(1, distance, 1);
				edge.cylinder.lookAt(toPos);
				edge.cylinder.rotateX(Math.PI / 2); // Cylinders are oriented along Y by default
			}
			
			// Position label at midpoint of the line
			if (edge.label) {
				edge.label.position.copy(midPoint);
			}
			
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
			edge.cylinder.geometry.dispose();
			edge.cylinder.material.dispose();
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