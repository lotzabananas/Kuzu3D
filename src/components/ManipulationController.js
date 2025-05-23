import * as THREE from 'three';

/**
 * Robust manipulation controller for VR node interaction
 * Handles individual node grabbing and graph-wide manipulation
 */
export class ManipulationController {
	constructor() {
		// Manipulation modes
		this.mode = 'idle'; // 'idle', 'node_grab', 'graph_manipulate'
		
		// Node grabbing state
		this.grabbedNode = null;
		this.grabHand = null;
		this.initialNodePosition = new THREE.Vector3();
		this.initialHandPosition = new THREE.Vector3();
		
		// Graph manipulation state
		this.isManipulating = false;
		this.manipulationCenter = new THREE.Vector3();
		this.initialDistance = 0;
		this.initialScale = 1;
		this.initialGraphScale = new THREE.Vector3(1, 1, 1);
		this.initialGraphPosition = new THREE.Vector3();
		this.leftHandStart = new THREE.Vector3();
		this.rightHandStart = new THREE.Vector3();
		
		// Visual feedback
		this.visualFeedback = this.createVisualFeedback();
		
		// Performance settings
		this.updateThrottle = 0;
		this.THROTTLE_MS = 16; // ~60fps max
	}
	
	createVisualFeedback() {
		const feedback = {
			// Node hover indicator
			nodeHover: new THREE.Mesh(
				new THREE.RingGeometry(0.06, 0.08, 16),
				new THREE.MeshBasicMaterial({ 
					color: 0x00ff88, 
					transparent: true, 
					opacity: 0.7,
					side: THREE.DoubleSide 
				})
			),
			
			// Node grab indicator
			nodeGrab: new THREE.Mesh(
				new THREE.SphereGeometry(0.09, 12, 8),
				new THREE.MeshBasicMaterial({ 
					color: 0xff4444, 
					transparent: true, 
					opacity: 0.4,
					wireframe: true 
				})
			),
			
			// Graph manipulation indicators
			leftHand: new THREE.Mesh(
				new THREE.SphereGeometry(0.02, 8, 6),
				new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8 })
			),
			
			rightHand: new THREE.Mesh(
				new THREE.SphereGeometry(0.02, 8, 6),
				new THREE.MeshBasicMaterial({ color: 0x4444ff, transparent: true, opacity: 0.8 })
			),
			
			// Connection line between hands
			connectionLine: new THREE.Line(
				new THREE.BufferGeometry(),
				new THREE.LineBasicMaterial({ color: 0x00ff88, linewidth: 3 })
			),
			
			// Manipulation center indicator
			center: new THREE.Mesh(
				new THREE.SphereGeometry(0.015, 8, 6),
				new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.9 })
			)
		};
		
		// Initially hide all feedback
		Object.values(feedback).forEach(mesh => {
			mesh.visible = false;
		});
		
		return feedback;
	}
	
	update(leftHand, rightHand, nodeManager, deltaTime) {
		// Throttle updates for performance
		this.updateThrottle += deltaTime * 1000;
		if (this.updateThrottle < this.THROTTLE_MS) return;
		this.updateThrottle = 0;
		
		if (!nodeManager || !nodeManager.nodes.length) {
			this.resetMode();
			return;
		}
		
		const leftPinching = this.isPinching(leftHand);
		const rightPinching = this.isPinching(rightHand);
		
		// Determine manipulation mode
		this.updateMode(leftHand, rightHand, leftPinching, rightPinching, nodeManager.nodes);
		
		// Execute current mode
		switch (this.mode) {
			case 'node_grab':
				this.updateNodeGrab(this.grabHand === 'left' ? leftHand : rightHand);
				break;
				
			case 'graph_manipulate':
				this.updateGraphManipulation(leftHand, rightHand, nodeManager.nodeGroup);
				break;
				
			case 'idle':
				this.updateHover(leftHand, rightHand, nodeManager.nodes);
				break;
		}
		
		// Update visual feedback
		this.updateVisualFeedback();
	}
	
	updateMode(leftHand, rightHand, leftPinching, rightPinching, nodes) {
		// Priority 1: Continue existing node grab
		if (this.mode === 'node_grab' && this.grabbedNode) {
			const hand = this.grabHand === 'left' ? leftHand : rightHand;
			const stillPinching = this.isPinching(hand);
			
			if (!stillPinching) {
				this.releaseNode();
			}
			return;
		}
		
		// Priority 2: Continue existing graph manipulation
		if (this.mode === 'graph_manipulate' && this.isManipulating) {
			if (!leftPinching || !rightPinching) {
				this.stopGraphManipulation();
			}
			return;
		}
		
		// Priority 3: Start new node grab (single hand pinching near node)
		if ((leftPinching && !rightPinching) || (!leftPinching && rightPinching)) {
			const hand = leftPinching ? leftHand : rightHand;
			const handName = leftPinching ? 'left' : 'right';
			const nearestNode = this.findNearestNode(hand, nodes, 0.12); // 12cm grab range
			
			if (nearestNode) {
				this.startNodeGrab(nearestNode, hand, handName);
				return;
			}
		}
		
		// Priority 4: Start graph manipulation (both hands pinching)
		if (leftPinching && rightPinching) {
			const nodeGroup = nodes[0]?.parent; // Get the node group from first node's parent
			this.startGraphManipulation(leftHand, rightHand, nodeGroup);
			return;
		}
		
		// Default: Idle mode
		this.mode = 'idle';
	}
	
	findNearestNode(hand, nodes, maxDistance) {
		if (!hand || !hand.joints) return null;
		
		const fingerTip = hand.joints['index-finger-tip'];
		if (!fingerTip) return null;
		
		const fingerPos = new THREE.Vector3();
		fingerTip.getWorldPosition(fingerPos);
		
		let nearestNode = null;
		let nearestDistance = maxDistance;
		
		for (const node of nodes) {
			const nodePos = new THREE.Vector3();
			node.getWorldPosition(nodePos);
			
			const distance = fingerPos.distanceTo(nodePos);
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestNode = node;
			}
		}
		
		return nearestNode;
	}
	
	startNodeGrab(node, hand, handName) {
		this.mode = 'node_grab';
		this.grabbedNode = node;
		this.grabHand = handName;
		
		// Store initial positions for precise tracking
		const fingerTip = hand.joints['index-finger-tip'];
		if (fingerTip) {
			fingerTip.getWorldPosition(this.initialHandPosition);
			node.getWorldPosition(this.initialNodePosition);
		}
		
		console.log(`Started grabbing node with ${handName} hand`);
	}
	
	updateNodeGrab(hand) {
		if (!this.grabbedNode || !hand || !hand.joints) return;
		
		const fingerTip = hand.joints['index-finger-tip'];
		if (!fingerTip) return;
		
		// Get current hand position
		const currentHandPos = new THREE.Vector3();
		fingerTip.getWorldPosition(currentHandPos);
		
		// Calculate movement delta in world space
		const handDelta = currentHandPos.clone().sub(this.initialHandPosition);
		
		// Apply delta to initial node position
		const newWorldPos = this.initialNodePosition.clone().add(handDelta);
		
		// Convert to local space relative to parent
		const parent = this.grabbedNode.parent;
		if (parent) {
			// Transform world position to local position
			const parentInverseMatrix = new THREE.Matrix4().copy(parent.matrixWorld).invert();
			const localPos = newWorldPos.clone().applyMatrix4(parentInverseMatrix);
			this.grabbedNode.position.copy(localPos);
		} else {
			this.grabbedNode.position.copy(newWorldPos);
		}
	}
	
	releaseNode() {
		console.log(`Released node from ${this.grabHand} hand`);
		this.grabbedNode = null;
		this.grabHand = null;
		this.mode = 'idle';
	}
	
	startGraphManipulation(leftHand, rightHand, nodeGroup) {
		this.mode = 'graph_manipulate';
		this.isManipulating = true;
		
		// Get initial hand positions
		const leftPos = this.getHandPosition(leftHand);
		const rightPos = this.getHandPosition(rightHand);
		
		if (!leftPos || !rightPos) return;
		
		// Store initial state
		this.leftHandStart.copy(leftPos);
		this.rightHandStart.copy(rightPos);
		this.initialDistance = leftPos.distanceTo(rightPos);
		
		// Store initial graph state
		if (nodeGroup) {
			this.initialGraphScale.copy(nodeGroup.scale);
			this.initialGraphPosition.copy(nodeGroup.position);
		}
		
		// Calculate manipulation center (midpoint between hands)
		this.manipulationCenter.copy(leftPos).add(rightPos).multiplyScalar(0.5);
		
		console.log('Started graph manipulation around center:', this.manipulationCenter);
	}
	
	updateGraphManipulation(leftHand, rightHand, nodeGroup) {
		if (!this.isManipulating || !nodeGroup) return;
		
		const leftPos = this.getHandPosition(leftHand);
		const rightPos = this.getHandPosition(rightHand);
		
		if (!leftPos || !rightPos) return;
		
		// Calculate current distance and center
		const currentDistance = leftPos.distanceTo(rightPos);
		const currentCenter = leftPos.clone().add(rightPos).multiplyScalar(0.5);
		
		// Calculate scale factor relative to initial distance
		const scaleFactor = currentDistance / this.initialDistance;
		
		// Apply scale relative to initial graph scale
		const newScale = this.initialGraphScale.x * scaleFactor;
		nodeGroup.scale.setScalar(newScale);
		
		// Calculate translation
		const centerDelta = currentCenter.clone().sub(this.manipulationCenter);
		const newPosition = this.initialGraphPosition.clone().add(centerDelta);
		nodeGroup.position.copy(newPosition);
	}
	
	scaleAroundPoint(object, point, scaleFactor) {
		// Clamp scale factor for usability
		const clampedScale = Math.max(0.1, Math.min(10, scaleFactor));
		
		// Store current position relative to scale point
		const currentPos = object.position.clone();
		const relativePos = currentPos.sub(point);
		
		// Apply scale
		object.scale.setScalar(clampedScale);
		
		// Adjust position to maintain scaling around the point
		const newPos = point.clone().add(relativePos.multiplyScalar(clampedScale));
		object.position.copy(newPos);
	}
	
	stopGraphManipulation() {
		console.log('Stopped graph manipulation');
		this.isManipulating = false;
		this.mode = 'idle';
	}
	
	updateHover(leftHand, rightHand, nodes) {
		// Find closest node to either hand
		const hands = [];
		if (leftHand) hands.push(leftHand);
		if (rightHand) hands.push(rightHand);
		
		let hoveredNode = null;
		let minDistance = 0.15; // 15cm hover range
		
		for (const hand of hands) {
			const node = this.findNearestNode(hand, nodes, minDistance);
			if (node) {
				hoveredNode = node;
				break;
			}
		}
		
		// Update hover state
		this.hoveredNode = hoveredNode;
	}
	
	updateVisualFeedback() {
		const { nodeHover, nodeGrab, leftHand, rightHand, connectionLine, center } = this.visualFeedback;
		
		// Node hover feedback
		if (this.mode === 'idle' && this.hoveredNode) {
			const nodePos = new THREE.Vector3();
			this.hoveredNode.getWorldPosition(nodePos);
			nodeHover.position.copy(nodePos);
			nodeHover.visible = true;
		} else {
			nodeHover.visible = false;
		}
		
		// Node grab feedback
		if (this.mode === 'node_grab' && this.grabbedNode) {
			const nodePos = new THREE.Vector3();
			this.grabbedNode.getWorldPosition(nodePos);
			nodeGrab.position.copy(nodePos);
			nodeGrab.visible = true;
			
			// Pulse effect
			const time = Date.now() * 0.003;
			nodeGrab.scale.setScalar(1 + Math.sin(time) * 0.3);
		} else {
			nodeGrab.visible = false;
		}
		
		// Graph manipulation feedback
		if (this.mode === 'graph_manipulate') {
			// Show hand indicators
			leftHand.position.copy(this.leftHandStart);
			rightHand.position.copy(this.rightHandStart);
			leftHand.visible = true;
			rightHand.visible = true;
			
			// Show connection line
			const points = [this.leftHandStart, this.rightHandStart];
			connectionLine.geometry.setFromPoints(points);
			connectionLine.visible = true;
			
			// Show manipulation center
			center.position.copy(this.manipulationCenter);
			center.visible = true;
		} else {
			leftHand.visible = false;
			rightHand.visible = false;
			connectionLine.visible = false;
			center.visible = false;
		}
	}
	
	getHandPosition(hand) {
		if (!hand || !hand.joints) return null;
		
		const fingerTip = hand.joints['index-finger-tip'];
		if (!fingerTip) return null;
		
		const pos = new THREE.Vector3();
		fingerTip.getWorldPosition(pos);
		return pos;
	}
	
	isPinching(hand) {
		if (!hand || !hand.joints) return false;
		
		const thumb = hand.joints['thumb-tip'];
		const index = hand.joints['index-finger-tip'];
		
		if (!thumb || !index) return false;
		
		const thumbPos = new THREE.Vector3();
		const indexPos = new THREE.Vector3();
		thumb.getWorldPosition(thumbPos);
		index.getWorldPosition(indexPos);
		
		return thumbPos.distanceTo(indexPos) < 0.025; // 2.5cm pinch threshold
	}
	
	resetMode() {
		this.mode = 'idle';
		this.grabbedNode = null;
		this.grabHand = null;
		this.isManipulating = false;
		this.hoveredNode = null;
		
		// Hide all visual feedback
		Object.values(this.visualFeedback).forEach(mesh => {
			mesh.visible = false;
		});
	}
	
	addToScene(scene) {
		Object.values(this.visualFeedback).forEach(mesh => {
			scene.add(mesh);
		});
	}
	
	removeFromScene(scene) {
		Object.values(this.visualFeedback).forEach(mesh => {
			scene.remove(mesh);
		});
	}
	
	dispose() {
		this.resetMode();
		Object.values(this.visualFeedback).forEach(mesh => {
			if (mesh.geometry) mesh.geometry.dispose();
			if (mesh.material) mesh.material.dispose();
		});
	}
}