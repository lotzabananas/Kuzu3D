import * as THREE from 'three';

export class HandDebugHelper {
	constructor(scene) {
		this.scene = scene;
		this.markers = {
			left: null,
			right: null
		};
		
		this.createMarkers();
	}
	
	createMarkers() {
		// Create spheres to show hand positions
		const geometry = new THREE.SphereGeometry(0.03, 16, 16);
		
		// Left hand marker (green)
		const leftMaterial = new THREE.MeshBasicMaterial({ 
			color: 0x00ff00,
			transparent: true,
			opacity: 0.7
		});
		this.markers.left = new THREE.Mesh(geometry, leftMaterial);
		this.markers.left.visible = false;
		this.scene.add(this.markers.left);
		
		// Right hand marker (blue)
		const rightMaterial = new THREE.MeshBasicMaterial({ 
			color: 0x0088ff,
			transparent: true,
			opacity: 0.7
		});
		this.markers.right = new THREE.Mesh(geometry, rightMaterial);
		this.markers.right.visible = false;
		this.scene.add(this.markers.right);
		
		// Add text labels
		this.createLabel('LEFT', this.markers.left, 0x00ff00);
		this.createLabel('RIGHT', this.markers.right, 0x0088ff);
	}
	
	createLabel(text, parent, color) {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.width = 256;
		canvas.height = 64;
		
		context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
		context.font = 'bold 48px Arial';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(text, 128, 32);
		
		const texture = new THREE.CanvasTexture(canvas);
		const spriteMaterial = new THREE.SpriteMaterial({ 
			map: texture,
			transparent: true
		});
		
		const sprite = new THREE.Sprite(spriteMaterial);
		sprite.scale.set(0.1, 0.025, 1);
		sprite.position.y = 0.05;
		parent.add(sprite);
	}
	
	update(handTracking) {
		if (!handTracking) return;
		
		// Update left hand
		const leftHand = handTracking.hands.left;
		if (leftHand && leftHand.joints && leftHand.joints['wrist']) {
			const wrist = leftHand.joints['wrist'];
			const pos = new THREE.Vector3();
			wrist.getWorldPosition(pos);
			this.markers.left.position.copy(pos);
			this.markers.left.visible = true;
		} else {
			this.markers.left.visible = false;
		}
		
		// Update right hand
		const rightHand = handTracking.hands.right;
		if (rightHand && rightHand.joints && rightHand.joints['wrist']) {
			const wrist = rightHand.joints['wrist'];
			const pos = new THREE.Vector3();
			wrist.getWorldPosition(pos);
			this.markers.right.position.copy(pos);
			this.markers.right.visible = true;
		} else {
			this.markers.right.visible = false;
		}
	}
	
	dispose() {
		this.scene.remove(this.markers.left);
		this.scene.remove(this.markers.right);
	}
}