import * as THREE from 'three';
import { VISUAL_CONFIG } from '../constants/index.js';

export class Legend extends THREE.Group {
	constructor() {
		super();
		
		this.visible = false; // Start hidden
		this.entries = [];
		this.background = null;
		this.nodeTypes = new Map(); // Store discovered node types
	}
	
	updateNodeTypes(nodes) {
		// Clear existing types
		this.nodeTypes.clear();
		
		// Collect unique node types from the nodes
		nodes.forEach(node => {
			const nodeType = node.data?.type || node.type || 'Unknown';
			if (!this.nodeTypes.has(nodeType)) {
				const color = VISUAL_CONFIG.node.typeColors[nodeType] || VISUAL_CONFIG.node.typeColors.default;
				this.nodeTypes.set(nodeType, color);
			}
		});
		
		// Recreate the legend with current node types
		this.createLegend();
	}
	
	createLegend() {
		// Clear existing legend elements
		while (this.children.length > 0) {
			const child = this.children[0];
			if (child.geometry) child.geometry.dispose();
			if (child.material) {
				if (child.material.map) child.material.map.dispose();
				child.material.dispose();
			}
			this.remove(child);
		}
		
		// Calculate dimensions
		const rowHeight = 0.06;
		const totalHeight = this.nodeTypes.size * rowHeight + 0.04;
		const width = 0.3;
		
		// Create transparent background with thin border
		const bgGroup = new THREE.Group();
		
		// Create border lines (thin black outline)
		const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
		
		// Top line
		const topPoints = [
			new THREE.Vector3(-width/2, totalHeight/2, 0),
			new THREE.Vector3(width/2, totalHeight/2, 0)
		];
		const topGeometry = new THREE.BufferGeometry().setFromPoints(topPoints);
		const topLine = new THREE.Line(topGeometry, lineMaterial);
		bgGroup.add(topLine);
		
		// Bottom line
		const bottomPoints = [
			new THREE.Vector3(-width/2, -totalHeight/2, 0),
			new THREE.Vector3(width/2, -totalHeight/2, 0)
		];
		const bottomGeometry = new THREE.BufferGeometry().setFromPoints(bottomPoints);
		const bottomLine = new THREE.Line(bottomGeometry, lineMaterial);
		bgGroup.add(bottomLine);
		
		// Left line
		const leftPoints = [
			new THREE.Vector3(-width/2, totalHeight/2, 0),
			new THREE.Vector3(-width/2, -totalHeight/2, 0)
		];
		const leftGeometry = new THREE.BufferGeometry().setFromPoints(leftPoints);
		const leftLine = new THREE.Line(leftGeometry, lineMaterial);
		bgGroup.add(leftLine);
		
		// Right line
		const rightPoints = [
			new THREE.Vector3(width/2, totalHeight/2, 0),
			new THREE.Vector3(width/2, -totalHeight/2, 0)
		];
		const rightGeometry = new THREE.BufferGeometry().setFromPoints(rightPoints);
		const rightLine = new THREE.Line(rightGeometry, lineMaterial);
		bgGroup.add(rightLine);
		
		this.add(bgGroup);
		
		// Create entries for each discovered node type
		let yOffset = (totalHeight / 2) - rowHeight/2 - 0.02;
		
		this.nodeTypes.forEach((color, typeName) => {
			// Create 3D node sphere (like in the graph)
			const sphereGeometry = new THREE.SphereGeometry(0.025, 16, 16);
			const sphereMaterial = new THREE.MeshPhongMaterial({
				color: color,
				emissive: color,
				emissiveIntensity: 0.2,
				shininess: 100
			});
			const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
			sphere.position.set(-width/2 + 0.04, yOffset, 0.01);
			this.add(sphere);
			
			// Create horizontal separator line (except for last item)
			if (yOffset > -totalHeight/2 + rowHeight) {
				const separatorPoints = [
					new THREE.Vector3(-width/2, yOffset - rowHeight/2, 0),
					new THREE.Vector3(width/2, yOffset - rowHeight/2, 0)
				];
				const separatorGeometry = new THREE.BufferGeometry().setFromPoints(separatorPoints);
				const separatorLine = new THREE.Line(separatorGeometry, lineMaterial);
				this.add(separatorLine);
			}
			
			// Create text label with better positioning
			this.createTextLabel(typeName, 0.02, yOffset);
			
			yOffset -= rowHeight;
		});
		
		// Rotate entire legend 45 degrees for better viewing angle
		this.rotation.x = -Math.PI / 4; // 45 degrees tilted back
	}
	
	createTextLabel(text, x, y) {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.width = 512;
		canvas.height = 64;
		
		// Configure text
		context.font = '32px Arial';
		context.fillStyle = 'black';
		context.textAlign = 'left';
		context.textBaseline = 'middle';
		context.fillText(text, 20, canvas.height / 2);
		
		// Create sprite
		const texture = new THREE.CanvasTexture(canvas);
		const spriteMaterial = new THREE.SpriteMaterial({
			map: texture,
			transparent: true
		});
		
		const sprite = new THREE.Sprite(spriteMaterial);
		sprite.scale.set(0.2, 0.025, 1);
		sprite.position.set(x, y, 0.01);
		this.add(sprite);
		
		return sprite;
	}
	
	
	toggle() {
		this.visible = !this.visible;
		return this.visible;
	}
	
	show() {
		this.visible = true;
	}
	
	hide() {
		this.visible = false;
	}
	
	updatePosition(handPosition, handQuaternion) {
		// Position legend above the left hand
		if (handPosition && this.visible) {
			this.position.copy(handPosition);
			this.position.y += 0.2; // Above hand
			this.position.z -= 0.15; // Slightly towards user
			
			// Reset rotation to maintain 45-degree tilt
			this.rotation.set(-Math.PI / 4, 0, 0);
		}
	}
	
	dispose() {
		this.traverse((child) => {
			if (child.geometry) child.geometry.dispose();
			if (child.material) {
				if (child.material.map) child.material.map.dispose();
				child.material.dispose();
			}
		});
	}
}