import * as THREE from 'three';
import { VISUAL_CONFIG } from '../constants/index.js';

export class GraphNode extends THREE.Group {
	constructor(nodeData, index, totalNodes) {
		super();
		
		// Create sphere
		const geometry = new THREE.SphereGeometry(
			VISUAL_CONFIG.node.radius,
			VISUAL_CONFIG.node.segments,
			VISUAL_CONFIG.node.segments
		);
		
		// Get color based on node type - check multiple possible locations
		const nodeType = nodeData.type || nodeData.data?._label || nodeData.data?.type || 'default';
		const nodeColor = VISUAL_CONFIG.node.typeColors[nodeType] || VISUAL_CONFIG.node.typeColors.default;
		
		const material = new THREE.MeshPhongMaterial({
			color: nodeColor,
			emissive: nodeColor,
			emissiveIntensity: 0.2,
			shininess: 100
		});
		
		this.sphere = new THREE.Mesh(geometry, material);
		this.add(this.sphere);
		
		// Create text label
		this.createTextLabel(nodeData.label || nodeData.name || `Node ${index}`);
		
		// Store node data
		this.userData = nodeData;
		this.nodeIndex = index;
		this.originalColor = material.color.clone();
		this.material = material; // Store reference for color changes
		
		// Set initial position
		this.setPosition(index, totalNodes);
		
		// State
		this.isHovered = false;
		this.isSelected = false;
	}
	
	createTextLabel(text) {
		// Truncate text to 60 characters
		const displayText = text.length > 60 ? text.substring(0, 57) + '...' : text;
		
		// Create canvas for text
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.width = 512;
		canvas.height = 128;
		
		// Configure text style
		context.font = 'bold 32px Arial';
		context.fillStyle = 'white';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		
		// Add background for better readability
		const metrics = context.measureText(displayText);
		const textWidth = metrics.width + 20;
		const textHeight = 40;
		
		context.fillStyle = 'rgba(0, 0, 0, 0.7)';
		context.fillRect(
			(canvas.width - textWidth) / 2,
			(canvas.height - textHeight) / 2,
			textWidth,
			textHeight
		);
		
		// Draw text
		context.fillStyle = 'white';
		context.fillText(displayText, canvas.width / 2, canvas.height / 2);
		
		// Create texture and sprite
		const texture = new THREE.CanvasTexture(canvas);
		const spriteMaterial = new THREE.SpriteMaterial({ 
			map: texture,
			depthTest: false,
			depthWrite: false
		});
		
		this.textSprite = new THREE.Sprite(spriteMaterial);
		this.textSprite.scale.set(1, 0.25, 1);
		this.textSprite.position.set(0, 0, 0);
		this.add(this.textSprite);
	}
	
	setPosition(index, totalNodes) {
		// Calculate 3D grid position
		const gridSize = Math.ceil(Math.cbrt(totalNodes));
		const { spacing, offsetY, offsetZ } = VISUAL_CONFIG.grid;
		const offset = (gridSize - 1) * spacing / 2;
		
		const x = (index % gridSize) * spacing - offset;
		const y = (Math.floor(index / gridSize) % gridSize) * spacing - offset;
		const z = Math.floor(index / (gridSize * gridSize)) * spacing - offset;
		
		this.position.set(x, y + offsetY, z + offsetZ);
	}
	
	setHovered(hovered) {
		if (this.isHovered === hovered) return;
		
		this.isHovered = hovered;
		
		if (hovered && !this.isSelected) {
			this.material.color.setHex(VISUAL_CONFIG.node.hoveredColor);
			this.material.emissive.setHex(VISUAL_CONFIG.node.emissiveHovered);
		} else if (!this.isSelected) {
			this.material.color.copy(this.originalColor);
			this.material.emissive.setHex(VISUAL_CONFIG.node.emissiveDefault);
		}
	}
	
	setSelected(selected) {
		this.isSelected = selected;
		
		if (selected) {
			this.material.color.setHex(VISUAL_CONFIG.node.selectedColor);
			this.material.emissive.setHex(VISUAL_CONFIG.node.emissiveSelected);
		} else {
			this.material.color.copy(this.originalColor);
			this.material.emissive.setHex(VISUAL_CONFIG.node.emissiveDefault);
		}
	}
	
	dispose() {
		this.sphere.geometry.dispose();
		this.material.dispose();
		if (this.textSprite) {
			this.textSprite.material.map.dispose();
			this.textSprite.material.dispose();
		}
	}
}