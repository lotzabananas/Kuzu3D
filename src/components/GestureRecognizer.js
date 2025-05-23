import * as THREE from 'three';

export class GestureRecognizer {
	constructor() {
		this.gestures = {
			L_SHAPE: false,
			PALM_UP: false,
			SWIPE: false,
			FIST: false
		};
		
		this.swipeStartPos = null;
		this.swipeThreshold = 0.2; // 20cm
		this.lastGestureTime = {};
		
		// Callbacks
		this.onGestureCallbacks = new Map();
	}
	
	update(leftHand, rightHand) {
		// Check each hand
		if (leftHand && leftHand.joints) {
			this.checkLShape(leftHand, 'left');
			this.checkPalmUp(leftHand, 'left');
			this.checkFist(leftHand, 'left');
			this.checkSwipe(leftHand, 'left');
		}
		
		if (rightHand && rightHand.joints) {
			this.checkLShape(rightHand, 'right');
			this.checkPalmUp(rightHand, 'right');
			this.checkFist(rightHand, 'right');
			this.checkSwipe(rightHand, 'right');
		}
	}
	
	checkLShape(hand, handedness) {
		const thumb = hand.joints['thumb-tip'];
		const index = hand.joints['index-finger-tip'];
		const middle = hand.joints['middle-finger-tip'];
		
		if (!thumb || !index || !middle) return;
		
		// Get positions
		const thumbPos = new THREE.Vector3();
		const indexPos = new THREE.Vector3();
		const middlePos = new THREE.Vector3();
		
		thumb.getWorldPosition(thumbPos);
		index.getWorldPosition(indexPos);
		middle.getWorldPosition(middlePos);
		
		// Check if index is extended and thumb is perpendicular
		const indexExtended = this.isFingerExtended(hand, 'index-finger');
		const middleBent = !this.isFingerExtended(hand, 'middle-finger');
		
		// Calculate angle between thumb and index
		const thumbDir = new THREE.Vector3().subVectors(thumbPos, this.getJointPosition(hand, 'thumb-metacarpal'));
		const indexDir = new THREE.Vector3().subVectors(indexPos, this.getJointPosition(hand, 'index-finger-metacarpal'));
		
		thumbDir.normalize();
		indexDir.normalize();
		
		const angle = thumbDir.angleTo(indexDir);
		const isLShape = indexExtended && middleBent && angle > 1.2 && angle < 1.9; // ~70-110 degrees
		
		if (isLShape && !this.gestures.L_SHAPE) {
			this.triggerGesture('L_SHAPE', handedness);
		}
		
		this.gestures.L_SHAPE = isLShape;
	}
	
	checkPalmUp(hand, handedness) {
		const wrist = hand.joints['wrist'];
		const indexMCP = hand.joints['index-finger-metacarpal'];
		const pinkyMCP = hand.joints['pinky-finger-metacarpal'];
		
		if (!wrist || !indexMCP || !pinkyMCP) return;
		
		// Calculate palm normal
		const wristPos = this.getJointPosition(hand, 'wrist');
		const indexPos = this.getJointPosition(hand, 'index-finger-metacarpal');
		const pinkyPos = this.getJointPosition(hand, 'pinky-finger-metacarpal');
		
		const toIndex = new THREE.Vector3().subVectors(indexPos, wristPos);
		const toPinky = new THREE.Vector3().subVectors(pinkyPos, wristPos);
		
		const normal = new THREE.Vector3();
		normal.crossVectors(toIndex, toPinky);
		normal.normalize();
		
		// For left hand, flip the normal
		if (handedness === 'left') {
			normal.multiplyScalar(-1);
		}
		
		const isPalmUp = normal.y > 0.7;
		
		if (isPalmUp && !this.gestures.PALM_UP) {
			this.triggerGesture('PALM_UP', handedness);
		}
		
		this.gestures.PALM_UP = isPalmUp;
	}
	
	checkFist(hand, handedness) {
		// Check if all fingers are bent
		const fingers = ['index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
		const allBent = fingers.every(finger => !this.isFingerExtended(hand, finger));
		
		if (allBent && !this.gestures.FIST) {
			this.triggerGesture('FIST', handedness);
		}
		
		this.gestures.FIST = allBent;
	}
	
	checkSwipe(hand, handedness) {
		const indexTip = hand.joints['index-finger-tip'];
		if (!indexTip) return;
		
		const currentPos = new THREE.Vector3();
		indexTip.getWorldPosition(currentPos);
		
		// Start tracking swipe
		if (this.isFingerExtended(hand, 'index-finger') && !this.swipeStartPos) {
			this.swipeStartPos = currentPos.clone();
		}
		// End swipe tracking
		else if (!this.isFingerExtended(hand, 'index-finger') && this.swipeStartPos) {
			this.swipeStartPos = null;
		}
		// Check for swipe
		else if (this.swipeStartPos) {
			const distance = currentPos.distanceTo(this.swipeStartPos);
			if (distance > this.swipeThreshold) {
				const direction = new THREE.Vector3().subVectors(currentPos, this.swipeStartPos);
				direction.normalize();
				
				// Determine swipe direction
				let swipeType = '';
				if (Math.abs(direction.x) > Math.abs(direction.y) && Math.abs(direction.x) > Math.abs(direction.z)) {
					swipeType = direction.x > 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT';
				} else if (Math.abs(direction.y) > Math.abs(direction.z)) {
					swipeType = direction.y > 0 ? 'SWIPE_UP' : 'SWIPE_DOWN';
				}
				
				if (swipeType) {
					this.triggerGesture(swipeType, handedness, direction);
					this.swipeStartPos = currentPos.clone(); // Reset for continuous swipes
				}
			}
		}
	}
	
	isFingerExtended(hand, fingerName) {
		const tip = hand.joints[`${fingerName}-tip`];
		const dip = hand.joints[`${fingerName}-phalanx-distal`];
		const pip = hand.joints[`${fingerName}-phalanx-intermediate`];
		const mcp = hand.joints[`${fingerName}-metacarpal`];
		
		if (!tip || !dip || !pip || !mcp) return false;
		
		// Check if finger is relatively straight
		const tipPos = this.getJointPosition(hand, `${fingerName}-tip`);
		const mcpPos = this.getJointPosition(hand, `${fingerName}-metacarpal`);
		
		const fingerLength = tipPos.distanceTo(mcpPos);
		const expectedLength = 0.08; // Approximate extended finger length
		
		return fingerLength > expectedLength * 0.8;
	}
	
	getJointPosition(hand, jointName) {
		const joint = hand.joints[jointName];
		if (!joint) return new THREE.Vector3();
		
		const pos = new THREE.Vector3();
		joint.getWorldPosition(pos);
		return pos;
	}
	
	triggerGesture(gesture, handedness, data = null) {
		const now = Date.now();
		const key = `${gesture}_${handedness}`;
		
		// Debounce gestures
		if (this.lastGestureTime[key] && now - this.lastGestureTime[key] < 500) {
			return;
		}
		
		this.lastGestureTime[key] = now;
		
		// Call registered callbacks
		const callbacks = this.onGestureCallbacks.get(gesture) || [];
		callbacks.forEach(callback => {
			callback({ gesture, handedness, data });
		});
		
		console.log(`Gesture detected: ${gesture} (${handedness} hand)`);
	}
	
	onGesture(gesture, callback) {
		if (!this.onGestureCallbacks.has(gesture)) {
			this.onGestureCallbacks.set(gesture, []);
		}
		this.onGestureCallbacks.get(gesture).push(callback);
	}
	
	reset() {
		this.swipeStartPos = null;
		Object.keys(this.gestures).forEach(key => {
			this.gestures[key] = false;
		});
	}
}