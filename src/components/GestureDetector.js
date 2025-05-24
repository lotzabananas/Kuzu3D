import * as THREE from 'three';

/**
 * Comprehensive gesture detection for WebXR hand tracking
 * Detects: Pinch, Fist, Point, Peace, ThumbsUp
 */
export class GestureDetector {
	constructor() {
		this.gestures = {
			left: null,
			right: null
		};
		
		this.previousGestures = {
			left: null,
			right: null
		};
		
		// Gesture thresholds
		this.PINCH_THRESHOLD = 0.03; // 3cm
		this.FIST_THRESHOLD = 0.05; // 5cm from fingertip to palm
		this.FINGER_CURL_THRESHOLD = 0.7; // Ratio for considering finger curled
		this.FINGER_EXTEND_THRESHOLD = 0.85; // Ratio for considering finger extended
	}
	
	detectGestures(hand, handedness) {
		if (!hand || !hand.joints) return null;
		
		const joints = hand.joints;
		const gesture = this.identifyGesture(joints);
		
		// Store previous gesture for change detection
		this.previousGestures[handedness] = this.gestures[handedness];
		this.gestures[handedness] = gesture;
		
		// Return gesture with change info
		return {
			current: gesture,
			previous: this.previousGestures[handedness],
			changed: gesture !== this.previousGestures[handedness]
		};
	}
	
	identifyGesture(joints) {
		// Check gestures in priority order
		if (this.isPinching(joints)) return 'pinch';
		if (this.isFist(joints)) return 'fist';
		if (this.isPointing(joints)) return 'point';
		if (this.isPeaceSign(joints)) return 'peace';
		if (this.isThumbsUp(joints)) return 'thumbsup';
		if (this.isThumbPointing(joints)) return 'thumbpoint';
		if (this.isOpenPalm(joints)) return 'open';
		
		return 'idle';
	}
	
	isPinching(joints) {
		const thumbTip = joints['thumb-tip'];
		const indexTip = joints['index-finger-tip'];
		
		if (!thumbTip || !indexTip) return false;
		
		const thumbPos = new THREE.Vector3();
		const indexPos = new THREE.Vector3();
		thumbTip.getWorldPosition(thumbPos);
		indexTip.getWorldPosition(indexPos);
		
		return thumbPos.distanceTo(indexPos) < this.PINCH_THRESHOLD;
	}
	
	isFist(joints) {
		// Check if all fingertips are close to their metacarpals (palm)
		const fingers = ['index', 'middle', 'ring', 'pinky'];
		let curledCount = 0;
		
		for (const finger of fingers) {
			const tip = joints[`${finger}-finger-tip`];
			const metacarpal = joints[`${finger}-finger-metacarpal`];
			
			if (!tip || !metacarpal) continue;
			
			const tipPos = new THREE.Vector3();
			const metacarpalPos = new THREE.Vector3();
			tip.getWorldPosition(tipPos);
			metacarpal.getWorldPosition(metacarpalPos);
			
			if (tipPos.distanceTo(metacarpalPos) < this.FIST_THRESHOLD) {
				curledCount++;
			}
		}
		
		// Also check thumb is curled
		const thumbTip = joints['thumb-tip'];
		const thumbMetacarpal = joints['thumb-metacarpal'];
		let thumbCurled = false;
		
		if (thumbTip && thumbMetacarpal) {
			const thumbTipPos = new THREE.Vector3();
			const thumbMetacarpalPos = new THREE.Vector3();
			thumbTip.getWorldPosition(thumbTipPos);
			thumbMetacarpal.getWorldPosition(thumbMetacarpalPos);
			
			thumbCurled = thumbTipPos.distanceTo(thumbMetacarpalPos) < this.FIST_THRESHOLD * 1.2;
		}
		
		return curledCount >= 4 && thumbCurled;
	}
	
	isPointing(joints) {
		// Index extended, other fingers curled
		const indexExtended = this.isFingerExtended(joints, 'index');
		const middleCurled = this.isFingerCurled(joints, 'middle');
		const ringCurled = this.isFingerCurled(joints, 'ring');
		const pinkyCurled = this.isFingerCurled(joints, 'pinky');
		
		return indexExtended && middleCurled && ringCurled && pinkyCurled;
	}
	
	isPeaceSign(joints) {
		// Index and middle extended, others curled
		const indexExtended = this.isFingerExtended(joints, 'index');
		const middleExtended = this.isFingerExtended(joints, 'middle');
		const ringCurled = this.isFingerCurled(joints, 'ring');
		const pinkyCurled = this.isFingerCurled(joints, 'pinky');
		
		return indexExtended && middleExtended && ringCurled && pinkyCurled;
	}
	
	isThumbsUp(joints) {
		// Thumb extended upward, other fingers curled
		const thumbTip = joints['thumb-tip'];
		const thumbMetacarpal = joints['thumb-metacarpal'];
		const wrist = joints['wrist'];
		
		if (!thumbTip || !thumbMetacarpal || !wrist) return false;
		
		// Check thumb is extended
		const thumbTipPos = new THREE.Vector3();
		const thumbMetacarpalPos = new THREE.Vector3();
		const wristPos = new THREE.Vector3();
		
		thumbTip.getWorldPosition(thumbTipPos);
		thumbMetacarpal.getWorldPosition(thumbMetacarpalPos);
		wrist.getWorldPosition(wristPos);
		
		// Thumb should be extended (far from metacarpal)
		const thumbExtended = thumbTipPos.distanceTo(thumbMetacarpalPos) > 0.04;
		
		// Thumb should be pointing upward (higher than wrist)
		const thumbUp = thumbTipPos.y > wristPos.y + 0.05;
		
		// Other fingers should be curled
		const fingersCurled = this.isFingerCurled(joints, 'index') &&
		                     this.isFingerCurled(joints, 'middle') &&
		                     this.isFingerCurled(joints, 'ring') &&
		                     this.isFingerCurled(joints, 'pinky');
		
		return thumbExtended && thumbUp && fingersCurled;
	}
	
	isThumbPointing(joints) {
		// Thumb extended in any direction (not just up), other fingers curled
		const thumbTip = joints['thumb-tip'];
		const thumbMetacarpal = joints['thumb-metacarpal'];
		
		if (!thumbTip || !thumbMetacarpal) return false;
		
		// Check thumb is extended
		const thumbTipPos = new THREE.Vector3();
		const thumbMetacarpalPos = new THREE.Vector3();
		
		thumbTip.getWorldPosition(thumbTipPos);
		thumbMetacarpal.getWorldPosition(thumbMetacarpalPos);
		
		// Thumb should be extended (far from metacarpal)
		const thumbExtended = thumbTipPos.distanceTo(thumbMetacarpalPos) > 0.04;
		
		// Other fingers should be curled
		const fingersCurled = this.isFingerCurled(joints, 'index') &&
		                     this.isFingerCurled(joints, 'middle') &&
		                     this.isFingerCurled(joints, 'ring') &&
		                     this.isFingerCurled(joints, 'pinky');
		
		// Don't trigger if it's already a thumbs up (pointing upward)
		const wrist = joints['wrist'];
		if (wrist) {
			const wristPos = new THREE.Vector3();
			wrist.getWorldPosition(wristPos);
			const isPointingUp = thumbTipPos.y > wristPos.y + 0.05;
			if (isPointingUp) return false; // This is thumbs up, not thumb point
		}
		
		return thumbExtended && fingersCurled;
	}
	
	isOpenPalm(joints) {
		// All fingers extended
		const allExtended = this.isFingerExtended(joints, 'index') &&
		                   this.isFingerExtended(joints, 'middle') &&
		                   this.isFingerExtended(joints, 'ring') &&
		                   this.isFingerExtended(joints, 'pinky');
		
		return allExtended;
	}
	
	isFingerExtended(joints, fingerName) {
		const tip = joints[`${fingerName}-finger-tip`];
		const proximal = joints[`${fingerName}-finger-phalanx-proximal`];
		const metacarpal = joints[`${fingerName}-finger-metacarpal`];
		
		if (!tip || !proximal || !metacarpal) return false;
		
		const tipPos = new THREE.Vector3();
		const proximalPos = new THREE.Vector3();
		const metacarpalPos = new THREE.Vector3();
		
		tip.getWorldPosition(tipPos);
		proximal.getWorldPosition(proximalPos);
		metacarpal.getWorldPosition(metacarpalPos);
		
		// Calculate extension ratio
		const fullLength = metacarpalPos.distanceTo(tipPos);
		const expectedLength = metacarpalPos.distanceTo(proximalPos) * 2.5; // Approximate full extension
		
		return fullLength / expectedLength > this.FINGER_EXTEND_THRESHOLD;
	}
	
	isFingerCurled(joints, fingerName) {
		const tip = joints[`${fingerName}-finger-tip`];
		const metacarpal = joints[`${fingerName}-finger-metacarpal`];
		
		if (!tip || !metacarpal) return false;
		
		const tipPos = new THREE.Vector3();
		const metacarpalPos = new THREE.Vector3();
		
		tip.getWorldPosition(tipPos);
		metacarpal.getWorldPosition(metacarpalPos);
		
		// Finger is curled if tip is close to metacarpal
		return tipPos.distanceTo(metacarpalPos) < this.FIST_THRESHOLD * 1.5;
	}
	
	getGestureInfo(gesture) {
		const gestureInfo = {
			pinch: { name: 'Pinch', emoji: '🤏', description: 'Thumb and index finger together' },
			fist: { name: 'Fist', emoji: '✊', description: 'All fingers curled into palm' },
			point: { name: 'Point', emoji: '👉', description: 'Index finger extended' },
			peace: { name: 'Peace', emoji: '✌️', description: 'Index and middle fingers extended' },
			thumbsup: { name: 'Thumbs Up', emoji: '👍', description: 'Thumb extended upward' },
			thumbpoint: { name: 'Thumb Point', emoji: '👈', description: 'Thumb extended, other fingers curled' },
			open: { name: 'Open Palm', emoji: '🖐️', description: 'All fingers extended' },
			idle: { name: 'Idle', emoji: '✋', description: 'No specific gesture' }
		};
		
		return gestureInfo[gesture] || gestureInfo.idle;
	}
}