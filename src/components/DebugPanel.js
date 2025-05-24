import * as THREE from 'three';
import { debugManager } from '../utils/DebugManager.js';

/**
 * Debug panel that shows system information and controls
 * Only visible in debug mode
 */
export class DebugPanel {
	constructor() {
		this.panel = this.createPanel();
		this.visible = false;
		
		// Listen for debug mode changes
		this.debugModeUnsubscribe = debugManager.onDebugModeChange((enabled) => {
			this.setVisible(enabled);
		});
		
		// Set initial visibility
		this.setVisible(debugManager.isDebugMode());
	}
	
	createPanel() {
		const group = new THREE.Group();
		
		// Create background plane
		const bgGeometry = new THREE.PlaneGeometry(0.3, 0.2);
		const bgMaterial = new THREE.MeshBasicMaterial({
			color: 0x000000,
			transparent: true,
			opacity: 0.8,
			side: THREE.DoubleSide
		});
		const background = new THREE.Mesh(bgGeometry, bgMaterial);
		group.add(background);
		
		// Create text canvas
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 256;
		this.context = canvas.getContext('2d');
		
		const texture = new THREE.CanvasTexture(canvas);
		const textGeometry = new THREE.PlaneGeometry(0.28, 0.18);
		const textMaterial = new THREE.MeshBasicMaterial({
			map: texture,
			transparent: true,
			side: THREE.DoubleSide
		});
		const textMesh = new THREE.Mesh(textGeometry, textMaterial);
		textMesh.position.z = 0.001;
		group.add(textMesh);
		
		this.canvas = canvas;
		this.texture = texture;
		
		// Position panel in view
		group.position.set(0.3, 1.5, -0.5);
		
		return group;
	}
	
	update(info = {}) {
		if (!this.visible) return;
		
		const ctx = this.context;
		
		// Clear canvas
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		// Set text properties
		ctx.fillStyle = 'white';
		ctx.font = '24px monospace';
		ctx.textAlign = 'left';
		
		// Draw debug info
		let y = 40;
		ctx.fillText('DEBUG MODE', 20, y);
		y += 30;
		
		ctx.font = '18px monospace';
		ctx.fillStyle = '#88ff88';
		
		// FPS
		if (info.fps !== undefined) {
			ctx.fillText(`FPS: ${info.fps.toFixed(1)}`, 20, y);
			y += 25;
		}
		
		// Node count
		if (info.nodeCount !== undefined) {
			ctx.fillText(`Nodes: ${info.nodeCount}`, 20, y);
			y += 25;
		}
		
		// Active gestures
		if (info.leftGesture || info.rightGesture) {
			ctx.fillText(`L: ${info.leftGesture || 'idle'}`, 20, y);
			y += 25;
			ctx.fillText(`R: ${info.rightGesture || 'idle'}`, 20, y);
			y += 25;
		}
		
		// Instructions
		ctx.fillStyle = '#ffff88';
		ctx.font = '14px monospace';
		y = 220;
		ctx.fillText('Ctrl+Shift+D to toggle', 20, y);
		
		// Update texture
		this.texture.needsUpdate = true;
	}
	
	setVisible(visible) {
		this.visible = visible;
		this.panel.visible = visible;
	}
	
	addToScene(scene) {
		scene.add(this.panel);
	}
	
	removeFromScene(scene) {
		scene.remove(this.panel);
	}
	
	dispose() {
		if (this.debugModeUnsubscribe) {
			this.debugModeUnsubscribe();
		}
		
		this.texture.dispose();
		// Dispose geometries and materials
		this.panel.traverse((child) => {
			if (child.geometry) child.geometry.dispose();
			if (child.material) {
				if (child.material.map) child.material.map.dispose();
				child.material.dispose();
			}
		});
	}
}