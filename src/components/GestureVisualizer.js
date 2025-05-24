import * as THREE from 'three';
import { logger } from '../utils/Logger.js';
import { debugManager } from '../utils/DebugManager.js';

/**
 * Visual feedback for gesture detection
 * Shows current gesture state near the hand (only in debug mode)
 */
export class GestureVisualizer {
	constructor() {
		this.visualizers = {
			left: this.createHandVisualizer('left'),
			right: this.createHandVisualizer('right')
		};
		
		// Listen for debug mode changes
		this.debugModeUnsubscribe = debugManager.onDebugModeChange((enabled) => {
			this.setDebugVisibility(enabled);
		});
		
		// Set initial visibility based on debug mode
		this.setDebugVisibility(debugManager.isDebugMode());
		
		this.gestureColors = {
			pinch: 0xff4444,      // Red
			fist: 0xff8800,       // Orange
			point: 0x44ff44,      // Green
			peace: 0x4444ff,      // Blue
			thumbsup: 0xffff44,   // Yellow
			thumbpoint: 0xff44ff,  // Magenta
			open: 0x44ffff,       // Cyan
			idle: 0x888888        // Gray
		};
	}
	
	createHandVisualizer(handedness) {
		const group = new THREE.Group();
		
		// Gesture indicator sphere
		const sphereGeometry = new THREE.SphereGeometry(0.03, 16, 16);
		const sphereMaterial = new THREE.MeshBasicMaterial({
			color: 0x888888,
			transparent: true,
			opacity: 0.8
		});
		const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
		group.add(sphere);
		
		// Gesture label (using a simple plane for now)
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 128;
		const context = canvas.getContext('2d');
		
		const texture = new THREE.CanvasTexture(canvas);
		const labelGeometry = new THREE.PlaneGeometry(0.1, 0.05);
		const labelMaterial = new THREE.MeshBasicMaterial({
			map: texture,
			transparent: true,
			side: THREE.DoubleSide
		});
		const label = new THREE.Mesh(labelGeometry, labelMaterial);
		label.position.y = 0.05;
		group.add(label);
		
		// Store references
		group.userData = {
			sphere,
			label,
			canvas,
			context,
			texture,
			handedness
		};
		
		group.visible = false;
		return group;
	}
	
	updateGesture(handedness, gesture, hand) {
		const visualizer = this.visualizers[handedness];
		if (!visualizer || !hand || !hand.joints) {
			visualizer.visible = false;
			return;
		}
		
		// Position visualizer above the hand
		const wrist = hand.joints['wrist'];
		if (!wrist) {
			visualizer.visible = false;
			return;
		}
		
		const wristPos = new THREE.Vector3();
		wrist.getWorldPosition(wristPos);
		visualizer.position.copy(wristPos);
		visualizer.position.y += 0.1; // 10cm above wrist
		
		// Update color based on gesture
		const color = this.gestureColors[gesture] || this.gestureColors.idle;
		visualizer.userData.sphere.material.color.setHex(color);
		
		// Update label
		this.updateLabel(visualizer, gesture);
		
		// Show/hide based on gesture AND debug mode
		visualizer.visible = debugManager.isDebugMode() && gesture !== 'idle';
		
		// Add pulsing effect for active gestures
		if (gesture !== 'idle' && visualizer.visible) {
			const scale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
			visualizer.userData.sphere.scale.setScalar(scale);
		}
	}
	
	setDebugVisibility(enabled) {
		// Hide all visualizers when debug mode is off
		if (!enabled) {
			this.visualizers.left.visible = false;
			this.visualizers.right.visible = false;
		}
	}
	
	updateLabel(visualizer, gesture) {
		const { canvas, context, texture } = visualizer.userData;
		
		// Clear canvas
		context.clearRect(0, 0, canvas.width, canvas.height);
		
		// Set text properties
		context.fillStyle = 'white';
		context.font = 'bold 32px Arial';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		
		// Draw gesture name
		const gestureNames = {
			pinch: 'PINCH',
			fist: 'FIST',
			point: 'POINT',
			peace: 'PEACE',
			thumbsup: 'THUMBS UP',
			thumbpoint: 'THUMB MENU',
			open: 'OPEN',
			idle: 'IDLE'
		};
		
		context.fillText(gestureNames[gesture] || 'IDLE', canvas.width / 2, canvas.height / 2);
		
		// Update texture
		texture.needsUpdate = true;
	}
	
	addToScene(scene) {
		scene.add(this.visualizers.left);
		scene.add(this.visualizers.right);
	}
	
	removeFromScene(scene) {
		scene.remove(this.visualizers.left);
		scene.remove(this.visualizers.right);
	}
	
	dispose() {
		// Unsubscribe from debug mode changes
		if (this.debugModeUnsubscribe) {
			this.debugModeUnsubscribe();
		}
		
		['left', 'right'].forEach(handedness => {
			const visualizer = this.visualizers[handedness];
			if (visualizer) {
				visualizer.userData.sphere.geometry.dispose();
				visualizer.userData.sphere.material.dispose();
				visualizer.userData.label.geometry.dispose();
				visualizer.userData.label.material.dispose();
				visualizer.userData.texture.dispose();
			}
		});
	}
}