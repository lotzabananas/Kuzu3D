import * as THREE from 'three';

export class SimpleTwoHandManipulation {
	constructor() {
		this.isGrabbing = false;
		this.startDistance = null;
		this.startScale = null;
		this.lastLeftPos = new THREE.Vector3();
		this.lastRightPos = new THREE.Vector3();
		
		// Visual feedback
		this.feedbackLines = [];
		this.createFeedbackVisuals();
	}
	
	createFeedbackVisuals() {
		// Create connection line between hands when grabbing
		const lineGeometry = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(1, 0, 0)
		]);
		
		const lineMaterial = new THREE.LineBasicMaterial({
			color: 0x00ff88,
			linewidth: 3,
			transparent: true,
			opacity: 0.8
		});
		
		this.connectionLine = new THREE.Line(lineGeometry, lineMaterial);
		this.connectionLine.visible = false;
		
		// Create pinch indicators for both hands
		const sphereGeometry = new THREE.SphereGeometry(0.01, 8, 6);
		const leftMaterial = new THREE.MeshBasicMaterial({ 
			color: 0xff4444, 
			transparent: true, 
			opacity: 0.7 
		});
		const rightMaterial = new THREE.MeshBasicMaterial({ 
			color: 0x4444ff, 
			transparent: true, 
			opacity: 0.7 
		});
		
		this.leftPinchIndicator = new THREE.Mesh(sphereGeometry, leftMaterial);
		this.rightPinchIndicator = new THREE.Mesh(sphereGeometry, rightMaterial);
		this.leftPinchIndicator.visible = false;
		this.rightPinchIndicator.visible = false;
	}
	
	update(leftHand, rightHand, target) {
		if (!leftHand || !rightHand || !target) return;
		
		// Check if both hands are pinching
		const leftPinching = this.isPinching(leftHand);
		const rightPinching = this.isPinching(rightHand);
		
		// Get pinch positions (midpoint between thumb and index)
		const leftPinchPos = this.getPinchPosition(leftHand);
		const rightPinchPos = this.getPinchPosition(rightHand);
		
		// Show pinch indicators
		if (leftPinching && leftPinchPos) {
			this.leftPinchIndicator.position.copy(leftPinchPos);
			this.leftPinchIndicator.visible = true;
		} else {
			this.leftPinchIndicator.visible = false;
		}
		
		if (rightPinching && rightPinchPos) {
			this.rightPinchIndicator.position.copy(rightPinchPos);
			this.rightPinchIndicator.visible = true;
		} else {
			this.rightPinchIndicator.visible = false;
		}
		
		if (leftPinching && rightPinching && leftPinchPos && rightPinchPos) {
			// Show connection line between pinch points
			const points = [leftPinchPos, rightPinchPos];
			this.connectionLine.geometry.setFromPoints(points);
			this.connectionLine.visible = true;
			
			if (!this.isGrabbing) {
				// Start grab
				this.isGrabbing = true;
				this.startDistance = leftPinchPos.distanceTo(rightPinchPos);
				this.startScale = target.scale.x;
				this.lastLeftPos.copy(leftPinchPos);
				this.lastRightPos.copy(rightPinchPos);
			} else {
				// Update manipulation
				const currentDistance = leftPinchPos.distanceTo(rightPinchPos);
				const scale = (currentDistance / this.startDistance) * this.startScale;
				
				// Clamp scale
				const clampedScale = Math.max(0.1, Math.min(5, scale));
				target.scale.setScalar(clampedScale);
				
				// Calculate rotation (Y axis only)
				const oldVector = new THREE.Vector3().subVectors(this.lastRightPos, this.lastLeftPos);
				const newVector = new THREE.Vector3().subVectors(rightPinchPos, leftPinchPos);
				
				oldVector.y = 0;
				newVector.y = 0;
				oldVector.normalize();
				newVector.normalize();
				
				const angle = Math.atan2(newVector.x, newVector.z) - Math.atan2(oldVector.x, oldVector.z);
				target.rotation.y += angle;
				
				// Update positions for next frame
				this.lastLeftPos.copy(leftPinchPos);
				this.lastRightPos.copy(rightPinchPos);
			}
		} else {
			// Hide connection line
			this.connectionLine.visible = false;
			
			if (this.isGrabbing) {
				// End grab
				this.isGrabbing = false;
			}
		}
	}
	
	isPinching(hand) {
		const thumb = hand.joints?.['thumb-tip'];
		const index = hand.joints?.['index-finger-tip'];
		
		if (!thumb || !index) return false;
		
		const thumbPos = new THREE.Vector3();
		const indexPos = new THREE.Vector3();
		thumb.getWorldPosition(thumbPos);
		index.getWorldPosition(indexPos);
		
		return thumbPos.distanceTo(indexPos) < 0.03;
	}
	
	getHandPosition(hand) {
		const wrist = hand.joints?.['wrist'];
		if (!wrist) return null;
		
		const pos = new THREE.Vector3();
		wrist.getWorldPosition(pos);
		return pos;
	}
	
	getPinchPosition(hand) {
		const thumb = hand.joints?.['thumb-tip'];
		const index = hand.joints?.['index-finger-tip'];
		
		if (!thumb || !index) return null;
		
		// Calculate midpoint between thumb and index finger
		const thumbPos = new THREE.Vector3();
		const indexPos = new THREE.Vector3();
		thumb.getWorldPosition(thumbPos);
		index.getWorldPosition(indexPos);
		
		// Return midpoint
		return thumbPos.add(indexPos).multiplyScalar(0.5);
	}
	
	addToScene(scene) {
		// Add visual feedback elements to scene
		scene.add(this.connectionLine);
		scene.add(this.leftPinchIndicator);
		scene.add(this.rightPinchIndicator);
	}
	
	removeFromScene(scene) {
		// Remove visual feedback elements from scene
		scene.remove(this.connectionLine);
		scene.remove(this.leftPinchIndicator);
		scene.remove(this.rightPinchIndicator);
	}
}