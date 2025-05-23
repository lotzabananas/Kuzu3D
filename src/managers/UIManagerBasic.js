import * as THREE from 'three';
import { SimpleWristUI } from '../components/SimpleWristUI.js';
import { SimpleTwoHandManipulation } from '../components/SimpleTwoHandManipulation.js';
import { logger } from '../utils/Logger.js';

export class UIManagerBasic {
	constructor(scene, camera, renderer, handTracking) {
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
		this.handTracking = handTracking;
		
		// Simple components
		this.wristUI = new SimpleWristUI();
		this.twoHandManip = new SimpleTwoHandManipulation();
		
		// Add wrist UI to scene
		this.scene.add(this.wristUI.getContainer());
		
		// Simple state
		this.hoveredNode = null;
		this.selectedNode = null;
		
		logger.info('Basic UI Manager initialized');
	}
	
	update(deltaTime, nodeManager) {
		if (!this.handTracking) return;
		
		const leftHand = this.handTracking.hands.left;
		const rightHand = this.handTracking.hands.right;
		const camera = this.renderer.xr.getCamera();
		
		// Debug log hand tracking once
		if (!this.debugLogged && (leftHand || rightHand)) {
			logger.info('Hand tracking detected:', {
				leftHand: !!leftHand,
				rightHand: !!rightHand,
				leftJoints: leftHand ? Object.keys(leftHand.joints || {}).length : 0,
				rightJoints: rightHand ? Object.keys(rightHand.joints || {}).length : 0
			});
			this.debugLogged = true;
		}
		
		// Update wrist UI
		this.wristUI.update(leftHand, camera);
		
		// Update two-hand manipulation
		if (nodeManager && nodeManager.nodeGroup) {
			this.twoHandManip.update(leftHand, rightHand, nodeManager.nodeGroup);
		}
		
		// Check wrist UI button clicks
		this.checkWristUIClicks(rightHand, nodeManager);
		
		// Simple hand tracking update for node selection
		if (this.handTracking && nodeManager) {
			this.handTracking.update(
				this.scene,
				(object) => this.onNodeHover(object, nodeManager),
				(object) => this.onNodeSelect(object, nodeManager)
			);
		}
	}
	
	checkWristUIClicks(rightHand, nodeManager) {
		if (!rightHand || !this.wristUI.container.visible) return;
		
		// Simple ray from index finger
		const indexTip = rightHand.joints?.['index-finger-tip'];
		if (!indexTip) return;
		
		try {
			const tipPos = new THREE.Vector3();
			indexTip.getWorldPosition(tipPos);
			
			// Check if pointing at any button
			const buttons = this.wristUI.getButtons();
			if (!buttons || buttons.length === 0) return;
			
			// Filter out buttons that don't have proper matrixWorld
			const validButtons = buttons.filter(button => 
				button && button.matrixWorld && button.parent
			);
			
			if (validButtons.length === 0) return;
			
			const raycaster = new THREE.Raycaster();
			
			// Simple forward direction from finger
			const direction = new THREE.Vector3(0, 0, -1);
			direction.applyQuaternion(indexTip.quaternion);
			
			raycaster.set(tipPos, direction);
			const intersects = raycaster.intersectObjects(validButtons, false);
			
			if (intersects.length > 0 && this.isPinching(rightHand)) {
				const button = intersects[0].object;
				if (button.userData.action === 'reset' && nodeManager) {
					// Reset graph position
					nodeManager.nodeGroup.position.set(0, 0, 0);
					nodeManager.nodeGroup.rotation.set(0, 0, 0);
					nodeManager.nodeGroup.scale.set(1, 1, 1);
					logger.info('Reset graph position');
				} else if (button.userData.action === 'help') {
					logger.info('Help: Point at nodes to select, pinch both hands to scale/rotate');
				}
			}
		} catch (error) {
			// Silently handle raycasting errors to prevent crashes
			console.warn('Raycasting error in wrist UI:', error.message);
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
	
	onNodeHover(object, nodeManager) {
		const node = nodeManager.handleHover(object);
		if (node !== this.hoveredNode) {
			this.hoveredNode = node;
			if (node) {
				logger.debug('Hovering node:', node.userData.label);
			}
		}
		return node;
	}
	
	onNodeSelect(object, nodeManager) {
		const node = nodeManager.handleSelect(object);
		if (node) {
			this.selectedNode = node;
			logger.info('Selected node:', node.userData);
		}
		return node;
	}
	
	updateDatabaseStatus(connected, nodeCount) {
		logger.info(`Database status - Connected: ${connected}, Nodes: ${nodeCount}`);
	}
	
	dispose() {
		// Clean up
	}
}