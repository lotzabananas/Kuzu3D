import * as THREE from 'three';
import { VISUAL_CONFIG } from '../constants/index.js';

export class GraphNode extends THREE.Mesh {
	constructor(nodeData, index, totalNodes) {
		// Create geometry and material
		const geometry = new THREE.SphereGeometry(
			VISUAL_CONFIG.node.radius,
			VISUAL_CONFIG.node.segments,
			VISUAL_CONFIG.node.segments
		);
		
		const material = new THREE.MeshPhongMaterial({
			color: VISUAL_CONFIG.node.defaultColor,
			emissive: VISUAL_CONFIG.node.emissiveDefault,
			shininess: 100
		});
		
		super(geometry, material);
		
		// Store node data
		this.userData = nodeData;
		this.nodeIndex = index;
		this.originalColor = material.color.clone();
		
		// Set initial position
		this.setPosition(index, totalNodes);
		
		// State
		this.isHovered = false;
		this.isSelected = false;
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
		this.geometry.dispose();
		this.material.dispose();
	}
}