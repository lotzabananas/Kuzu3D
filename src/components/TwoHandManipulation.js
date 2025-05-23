import * as THREE from 'three';

export class TwoHandManipulation {
	constructor() {
		this.isGrabbing = false;
		this.startDistance = null;
		this.startScale = null;
		this.startRotation = null;
		this.startPosition = null;
		
		// Hand states
		this.leftPinching = false;
		this.rightPinching = false;
		this.lastLeftPos = new THREE.Vector3();
		this.lastRightPos = new THREE.Vector3();
		
		// Transform accumulation
		this.currentScale = 1;
		this.minScale = 0.1;
		this.maxScale = 5;
	}
	
	update(leftHand, rightHand, targetObject) {
		if (!leftHand || !rightHand || !targetObject) return;
		
		// Check if both hands are pinching
		const leftPinchNow = this.isPinching(leftHand);
		const rightPinchNow = this.isPinching(rightHand);
		
		// Detect grab start
		if (!this.isGrabbing && leftPinchNow && rightPinchNow) {
			this.startGrab(leftHand, rightHand, targetObject);
		}
		// Detect grab end
		else if (this.isGrabbing && (!leftPinchNow || !rightPinchNow)) {
			this.endGrab();
		}
		// Update manipulation
		else if (this.isGrabbing) {
			this.updateManipulation(leftHand, rightHand, targetObject);
		}
		
		// Update states
		this.leftPinching = leftPinchNow;
		this.rightPinching = rightPinchNow;
	}
	
	isPinching(hand) {
		const thumbTip = hand.joints['thumb-tip'];
		const indexTip = hand.joints['index-finger-tip'];
		
		if (!thumbTip || !indexTip) return false;
		
		const thumbPos = new THREE.Vector3();
		const indexPos = new THREE.Vector3();
		thumbTip.getWorldPosition(thumbPos);
		indexTip.getWorldPosition(indexPos);
		
		return thumbPos.distanceTo(indexPos) < 0.03; // 3cm threshold
	}
	
	getHandPosition(hand) {
		const wrist = hand.joints['wrist'];
		if (!wrist) return null;
		
		const pos = new THREE.Vector3();
		wrist.getWorldPosition(pos);
		return pos;
	}
	
	startGrab(leftHand, rightHand, targetObject) {
		const leftPos = this.getHandPosition(leftHand);
		const rightPos = this.getHandPosition(rightHand);
		
		if (!leftPos || !rightPos) return;
		
		this.isGrabbing = true;
		this.startDistance = leftPos.distanceTo(rightPos);
		this.startScale = targetObject.scale.x;
		this.startRotation = targetObject.rotation.y;
		this.startPosition = targetObject.position.clone();
		
		// Store initial hand positions
		this.lastLeftPos.copy(leftPos);
		this.lastRightPos.copy(rightPos);
		
		console.log('Started two-hand grab');
	}
	
	endGrab() {
		this.isGrabbing = false;
		console.log('Ended two-hand grab');
	}
	
	updateManipulation(leftHand, rightHand, targetObject) {
		const leftPos = this.getHandPosition(leftHand);
		const rightPos = this.getHandPosition(rightHand);
		
		if (!leftPos || !rightPos) return;
		
		// Calculate scale based on hand distance
		const currentDistance = leftPos.distanceTo(rightPos);
		const scaleRatio = currentDistance / this.startDistance;
		const newScale = this.startScale * scaleRatio;
		
		// Clamp scale
		const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
		targetObject.scale.setScalar(clampedScale);
		this.currentScale = clampedScale;
		
		// Calculate rotation
		const oldVector = new THREE.Vector3().subVectors(this.lastRightPos, this.lastLeftPos);
		const newVector = new THREE.Vector3().subVectors(rightPos, leftPos);
		
		// Project vectors onto XZ plane for Y-axis rotation
		oldVector.y = 0;
		newVector.y = 0;
		oldVector.normalize();
		newVector.normalize();
		
		// Calculate rotation angle
		const angle = Math.atan2(newVector.x, newVector.z) - Math.atan2(oldVector.x, oldVector.z);
		targetObject.rotation.y += angle;
		
		// Calculate translation (movement of center point)
		const oldCenter = new THREE.Vector3().addVectors(this.lastLeftPos, this.lastRightPos).multiplyScalar(0.5);
		const newCenter = new THREE.Vector3().addVectors(leftPos, rightPos).multiplyScalar(0.5);
		const delta = new THREE.Vector3().subVectors(newCenter, oldCenter);
		
		targetObject.position.add(delta);
		
		// Update last positions
		this.lastLeftPos.copy(leftPos);
		this.lastRightPos.copy(rightPos);
	}
	
	isActive() {
		return this.isGrabbing;
	}
	
	reset() {
		this.isGrabbing = false;
		this.currentScale = 1;
	}
}