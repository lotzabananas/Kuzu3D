import * as THREE from 'three';

export class NodeGrabbing {
	constructor() {
		this.grabbedNode = null;
		this.grabHand = null; // 'left' or 'right'
		this.grabOffset = new THREE.Vector3();
		this.hoveredNode = null;
		
		// Visual feedback
		this.hoverIndicator = this.createHoverIndicator();
		this.grabIndicator = this.createGrabIndicator();
	}
	
	createHoverIndicator() {
		// Create a glowing ring around hovered nodes
		const geometry = new THREE.RingGeometry(0.05, 0.07, 16);
		const material = new THREE.MeshBasicMaterial({
			color: 0x00ff88,
			transparent: true,
			opacity: 0.6,
			side: THREE.DoubleSide
		});
		const indicator = new THREE.Mesh(geometry, material);
		indicator.visible = false;
		return indicator;
	}
	
	createGrabIndicator() {
		// Create a pulsing sphere for grabbed nodes
		const geometry = new THREE.SphereGeometry(0.08, 16, 12);
		const material = new THREE.MeshBasicMaterial({
			color: 0xff4444,
			transparent: true,
			opacity: 0.3,
			wireframe: true
		});
		const indicator = new THREE.Mesh(geometry, material);
		indicator.visible = false;
		return indicator;
	}
	
	update(leftHand, rightHand, nodeManager, scene) {
		if (!nodeManager || nodeManager.nodes.length === 0) return;
		
		// Check for hand-node intersections
		this.checkNodeHover(leftHand, rightHand, nodeManager.nodes);
		
		// Handle grabbing
		this.handleGrabbing(leftHand, rightHand, nodeManager.nodes);
		
		// Update visual indicators
		this.updateVisuals();
	}
	
	checkNodeHover(leftHand, rightHand, nodes) {
		let closestNode = null;
		let closestDistance = Infinity;
		const hoverThreshold = 0.08; // 8cm
		
		// Check both hands
		const hands = [];
		if (leftHand) hands.push({ hand: leftHand, name: 'left' });
		if (rightHand) hands.push({ hand: rightHand, name: 'right' });
		
		for (const { hand } of hands) {
			const indexTip = hand.joints?.['index-finger-tip'];
			if (!indexTip) continue;
			
			const fingerPos = new THREE.Vector3();
			indexTip.getWorldPosition(fingerPos);
			
			// Check distance to each node
			for (const node of nodes) {
				const nodePos = new THREE.Vector3();
				node.getWorldPosition(nodePos);
				
				const distance = fingerPos.distanceTo(nodePos);
				if (distance < hoverThreshold && distance < closestDistance) {
					closestDistance = distance;
					closestNode = node;
				}
			}
		}
		
		// Update hover state
		if (closestNode !== this.hoveredNode) {
			// Reset previous hover
			if (this.hoveredNode) {
				this.hoveredNode.setHovered(false);
			}
			
			// Set new hover
			this.hoveredNode = closestNode;
			if (this.hoveredNode) {
				this.hoveredNode.setHovered(true);
			}
		}
	}
	
	handleGrabbing(leftHand, rightHand, nodes) {
		const hands = [];
		if (leftHand) hands.push({ hand: leftHand, name: 'left' });
		if (rightHand) hands.push({ hand: rightHand, name: 'right' });
		
		// If currently grabbing, update position
		if (this.grabbedNode && this.grabHand) {
			const hand = this.grabHand === 'left' ? leftHand : rightHand;
			const isPinching = this.isPinching(hand);
			
			if (isPinching && hand) {
				// Update node position
				const wrist = hand.joints?.['wrist'];
				if (wrist) {
					const handPos = new THREE.Vector3();
					wrist.getWorldPosition(handPos);
					
					// Calculate new world position
					const newWorldPos = handPos.clone().add(this.grabOffset);
					
					// Convert world position to local position relative to parent (nodeGroup)
					const parent = this.grabbedNode.parent;
					if (parent) {
						const localPos = parent.worldToLocal(newWorldPos.clone());
						this.grabbedNode.position.copy(localPos);
					} else {
						this.grabbedNode.position.copy(newWorldPos);
					}
				}
			} else {
				// Release grab
				this.releaseGrab();
			}
			return;
		}
		
		// Check for new grabs
		for (const { hand, name } of hands) {
			if (!this.isPinching(hand)) continue;
			
			const indexTip = hand.joints?.['index-finger-tip'];
			if (!indexTip) continue;
			
			const fingerPos = new THREE.Vector3();
			indexTip.getWorldPosition(fingerPos);
			
			// Find closest node within grab range
			let closestNode = null;
			let closestDistance = Infinity;
			const grabThreshold = 0.1; // 10cm
			
			for (const node of nodes) {
				const nodePos = new THREE.Vector3();
				node.getWorldPosition(nodePos);
				
				const distance = fingerPos.distanceTo(nodePos);
				if (distance < grabThreshold && distance < closestDistance) {
					closestDistance = distance;
					closestNode = node;
				}
			}
			
			if (closestNode) {
				this.startGrab(closestNode, hand, name);
				break;
			}
		}
	}
	
	startGrab(node, hand, handName) {
		this.grabbedNode = node;
		this.grabHand = handName;
		
		// Calculate offset from hand to node in world space
		const wrist = hand.joints?.['wrist'];
		if (wrist) {
			const handPos = new THREE.Vector3();
			const nodePos = new THREE.Vector3();
			wrist.getWorldPosition(handPos);
			node.getWorldPosition(nodePos);
			
			// Store the offset so the node doesn't jump to hand position
			this.grabOffset.copy(nodePos).sub(handPos);
		}
		
		console.log(`Grabbed node with ${handName} hand - offset:`, this.grabOffset);
	}
	
	releaseGrab() {
		if (this.grabbedNode) {
			console.log(`Released node from ${this.grabHand} hand`);
		}
		this.grabbedNode = null;
		this.grabHand = null;
		this.grabOffset.set(0, 0, 0);
	}
	
	updateVisuals() {
		// Update hover indicator
		if (this.hoveredNode && !this.grabbedNode) {
			const nodePos = new THREE.Vector3();
			this.hoveredNode.getWorldPosition(nodePos);
			this.hoverIndicator.position.copy(nodePos);
			this.hoverIndicator.visible = true;
			
			// Make it face the camera
			this.hoverIndicator.lookAt(nodePos.clone().add(new THREE.Vector3(0, 0, 1)));
		} else {
			this.hoverIndicator.visible = false;
		}
		
		// Update grab indicator
		if (this.grabbedNode) {
			const nodePos = new THREE.Vector3();
			this.grabbedNode.getWorldPosition(nodePos);
			this.grabIndicator.position.copy(nodePos);
			this.grabIndicator.visible = true;
			
			// Pulse effect
			const time = Date.now() * 0.005;
			this.grabIndicator.scale.setScalar(1 + Math.sin(time) * 0.2);
		} else {
			this.grabIndicator.visible = false;
		}
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
		
		return thumbPos.distanceTo(indexPos) < 0.03;
	}
	
	addToScene(scene) {
		scene.add(this.hoverIndicator);
		scene.add(this.grabIndicator);
	}
	
	removeFromScene(scene) {
		scene.remove(this.hoverIndicator);
		scene.remove(this.grabIndicator);
	}
	
	dispose() {
		this.releaseGrab();
		this.hoveredNode = null;
	}
}