import * as THREE from 'three';

export class SimpleTwoHandManipulation {
	constructor() {
		this.isGrabbing = false;
		this.startDistance = null;
		this.startScale = null;
		this.lastLeftPos = new THREE.Vector3();
		this.lastRightPos = new THREE.Vector3();
	}
	
	update(leftHand, rightHand, target) {
		if (!leftHand || !rightHand || !target) return;
		
		// Check if both hands are pinching
		const leftPinching = this.isPinching(leftHand);
		const rightPinching = this.isPinching(rightHand);
		
		if (leftPinching && rightPinching) {
			const leftPos = this.getHandPosition(leftHand);
			const rightPos = this.getHandPosition(rightHand);
			
			if (!leftPos || !rightPos) return;
			
			if (!this.isGrabbing) {
				// Start grab
				this.isGrabbing = true;
				this.startDistance = leftPos.distanceTo(rightPos);
				this.startScale = target.scale.x;
				this.lastLeftPos.copy(leftPos);
				this.lastRightPos.copy(rightPos);
				console.log('Started two-hand grab');
			} else {
				// Update manipulation
				const currentDistance = leftPos.distanceTo(rightPos);
				const scale = (currentDistance / this.startDistance) * this.startScale;
				
				// Clamp scale
				const clampedScale = Math.max(0.1, Math.min(5, scale));
				target.scale.setScalar(clampedScale);
				
				// Calculate rotation (Y axis only)
				const oldVector = new THREE.Vector3().subVectors(this.lastRightPos, this.lastLeftPos);
				const newVector = new THREE.Vector3().subVectors(rightPos, leftPos);
				
				oldVector.y = 0;
				newVector.y = 0;
				oldVector.normalize();
				newVector.normalize();
				
				const angle = Math.atan2(newVector.x, newVector.z) - Math.atan2(oldVector.x, oldVector.z);
				target.rotation.y += angle;
				
				// Update positions for next frame
				this.lastLeftPos.copy(leftPos);
				this.lastRightPos.copy(rightPos);
			}
		} else if (this.isGrabbing) {
			// End grab
			this.isGrabbing = false;
			console.log('Ended two-hand grab');
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
}