import * as THREE from 'three';
import { GestureDetector } from './components/GestureDetector.js';
import { GestureVisualizer } from './components/GestureVisualizer.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export class HandTracking {
	constructor(renderer, player) {
		this.renderer = renderer;
		this.player = player;
		this.hands = { left: null, right: null };
		this.handModels = { left: null, right: null };
		this.handModelFactory = new XRHandModelFactory();
		this.raycasters = { left: new THREE.Raycaster(), right: new THREE.Raycaster() };
		this.pointerLines = { left: null, right: null };
		this.hoveredObject = null;
		
		// Gesture detection
		this.gestureDetector = new GestureDetector();
		this.gestureVisualizer = new GestureVisualizer();
		this.gestureCallbacks = new Map();
		
		this.setupHands();
		this.createPointerLines();
	}

	setupHands() {
		// Left hand
		const hand0 = this.renderer.xr.getHand(0);
		this.hands.left = hand0;
		this.player.add(hand0);
		
		// Use boxes instead of mesh for more reliable hand tracking
		const handModel0 = this.handModelFactory.createHandModel(hand0, 'boxes');
		hand0.add(handModel0);
		this.handModels.left = handModel0;
		
		// Right hand
		const hand1 = this.renderer.xr.getHand(1);
		this.hands.right = hand1;
		this.player.add(hand1);
		
		// Use boxes instead of mesh for more reliable hand tracking
		const handModel1 = this.handModelFactory.createHandModel(hand1, 'boxes');
		hand1.add(handModel1);
		this.handModels.right = handModel1;
		
		// Add hand tracking events
		hand0.addEventListener('connected', (_event) => {
			console.log('Left hand connected - hand tracking active');
			this.hands.left.isConnected = true;
		});
		
		hand1.addEventListener('connected', (_event) => {
			console.log('Right hand connected - hand tracking active');
			this.hands.right.isConnected = true;
		});
		
		hand0.addEventListener('disconnected', () => {
			this.hands.left.isConnected = false;
		});
		
		hand1.addEventListener('disconnected', () => {
			this.hands.right.isConnected = false;
		});
	}
	
	createPointerLines() {
		const lineGeometry = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(0, 0, -1)
		]);
		
		const lineMaterial = new THREE.LineBasicMaterial({
			color: 0x00ff00,
			linewidth: 2,
			transparent: true,
			opacity: 0.5
		});
		
		// Create pointer lines for both hands
		this.pointerLines.left = new THREE.Line(lineGeometry.clone(), lineMaterial.clone());
		this.pointerLines.left.visible = false;
		this.hands.left.add(this.pointerLines.left);
		
		this.pointerLines.right = new THREE.Line(lineGeometry.clone(), lineMaterial.clone());
		this.pointerLines.right.visible = false;
		this.hands.right.add(this.pointerLines.right);
	}
	
	getIndexFingerPosition(hand) {
		// Get the index finger tip joint
		const indexTip = hand.joints['index-finger-tip'];
		if (indexTip) {
			const position = new THREE.Vector3();
			indexTip.getWorldPosition(position);
			return position;
		}
		return null;
	}
	
	getIndexFingerDirection(hand) {
		// Get pointing direction from index finger
		const indexTip = hand.joints['index-finger-tip'];
		const indexDIP = hand.joints['index-finger-phalanx-distal'];
		
		if (indexTip && indexDIP) {
			const tipPos = new THREE.Vector3();
			const dipPos = new THREE.Vector3();
			indexTip.getWorldPosition(tipPos);
			indexDIP.getWorldPosition(dipPos);
			
			const direction = new THREE.Vector3();
			direction.subVectors(tipPos, dipPos).normalize();
			return direction;
		}
		return null;
	}
	
	isPinching(hand) {
		// Check if thumb and index finger are close (pinch gesture)
		const thumbTip = hand.joints['thumb-tip'];
		const indexTip = hand.joints['index-finger-tip'];
		
		if (thumbTip && indexTip) {
			const thumbPos = new THREE.Vector3();
			const indexPos = new THREE.Vector3();
			thumbTip.getWorldPosition(thumbPos);
			indexTip.getWorldPosition(indexPos);
			
			const distance = thumbPos.distanceTo(indexPos);
			return distance < 0.03; // 3cm threshold
		}
		return false;
	}
	
	isPointing(hand) {
		// Check if index finger is extended (pointing gesture)
		const joints = hand.joints;
		if (!joints['index-finger-tip']) return false;
		
		// Simple heuristic: check if index finger is more extended than others
		const indexTip = joints['index-finger-tip'];
		const middleTip = joints['middle-finger-tip'];
		
		if (indexTip && middleTip) {
			const handRoot = new THREE.Vector3();
			hand.getWorldPosition(handRoot);
			
			const indexPos = new THREE.Vector3();
			const middlePos = new THREE.Vector3();
			indexTip.getWorldPosition(indexPos);
			middleTip.getWorldPosition(middlePos);
			
			const indexDist = indexPos.distanceTo(handRoot);
			const middleDist = middlePos.distanceTo(handRoot);
			
			return indexDist > middleDist * 1.1; // Index finger is more extended
		}
		return false;
	}
	
	update(scene, onHover, onSelect) {
		['left', 'right'].forEach(handedness => {
			const hand = this.hands[handedness];
			const pointerLine = this.pointerLines[handedness];
			
			if (!hand.joints['index-finger-tip']) {
				pointerLine.visible = false;
				this.gestureVisualizer.updateGesture(handedness, 'idle', null);
				return;
			}
			
			// Detect current gesture
			const gestureResult = this.gestureDetector.detectGestures(hand, handedness);
			if (gestureResult) {
				// Update visualizer
				this.gestureVisualizer.updateGesture(handedness, gestureResult.current, hand);
				
				// Trigger callbacks for gesture changes
				if (gestureResult.changed) {
					this.triggerGestureCallbacks(handedness, gestureResult.current, gestureResult.previous);
				}
			}
			
			const isPointingNow = this.isPointing(hand);
			const isPinchingNow = this.isPinching(hand);
			
			if (isPointingNow) {
				pointerLine.visible = true;
				
				const position = this.getIndexFingerPosition(hand);
				const direction = this.getIndexFingerDirection(hand);
				
				if (position && direction) {
					// Update raycaster
					this.raycasters[handedness].ray.origin.copy(position);
					this.raycasters[handedness].ray.direction.copy(direction);
					
					// Update pointer line
					const linePositions = pointerLine.geometry.attributes.position.array;
					linePositions[3] = 0;
					linePositions[4] = 0;
					linePositions[5] = -2; // 2 meter line
					pointerLine.geometry.attributes.position.needsUpdate = true;
					
					// Check for intersections
					const intersects = this.raycasters[handedness].intersectObjects(scene.children, true);
					
					if (intersects.length > 0) {
						const firstHit = intersects[0];
						if (firstHit.object.userData && firstHit.object.userData.id !== undefined) {
							// Hovering over a node
							pointerLine.material.color.setHex(0xff0000);
							
							if (this.hoveredObject !== firstHit.object) {
								this.hoveredObject = firstHit.object;
								if (onHover) onHover(firstHit.object);
							}
							
							// Check for pinch to select
							if (isPinchingNow && !hand.wasPinching) {
								if (onSelect) onSelect(firstHit.object);
							}
						}
					} else {
						pointerLine.material.color.setHex(0x00ff00);
						if (this.hoveredObject) {
							if (onHover) onHover(null);
							this.hoveredObject = null;
						}
					}
				}
			} else {
				pointerLine.visible = false;
			}
			
			// Store pinch state for next frame
			hand.wasPinching = isPinchingNow;
		});
	}
	
	// Register a callback for gesture events
	onGesture(gesture, handedness, callback) {
		const key = `${gesture}-${handedness}`;
		if (!this.gestureCallbacks.has(key)) {
			this.gestureCallbacks.set(key, []);
		}
		this.gestureCallbacks.get(key).push(callback);
	}
	
	// Trigger callbacks for gesture changes
	triggerGestureCallbacks(handedness, currentGesture, previousGesture) {
		// Trigger "end" callbacks for previous gesture
		if (previousGesture && previousGesture !== 'idle') {
			const endKey = `${previousGesture}-end-${handedness}`;
			const endCallbacks = this.gestureCallbacks.get(endKey) || [];
			endCallbacks.forEach(cb => cb(handedness, previousGesture));
		}
		
		// Trigger "start" callbacks for current gesture
		if (currentGesture && currentGesture !== 'idle') {
			const startKey = `${currentGesture}-${handedness}`;
			const startCallbacks = this.gestureCallbacks.get(startKey) || [];
			startCallbacks.forEach(cb => cb(handedness, currentGesture));
			
			// Log gesture for debugging
			console.log(`${handedness} hand: ${currentGesture} gesture detected`);
		}
	}
	
	// Get current gesture for a hand
	getCurrentGesture(handedness) {
		return this.gestureDetector.gestures[handedness];
	}
	
	// Add visualizer to scene
	addVisualizerToScene(scene) {
		this.gestureVisualizer.addToScene(scene);
	}
}