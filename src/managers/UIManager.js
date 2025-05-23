import * as THREE from 'three';
import { WristUISimple } from '../components/WristUISimple.js';
import { TwoHandManipulation } from '../components/TwoHandManipulation.js';
import { NodeInfoPanel } from '../components/NodeInfoPanel.js';
import { GestureRecognizer } from '../components/GestureRecognizer.js';
import { RadialMenu } from '../components/RadialMenu.js';
import { VoiceCommands } from '../components/VoiceCommands.js';
import { logger } from '../utils/Logger.js';

export class UIManager {
	constructor(scene, camera, renderer, handTracking) {
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
		this.handTracking = handTracking;
		
		// Initialize components
		this.wristUI = new WristUISimple(handTracking);
		this.twoHandManip = new TwoHandManipulation();
		this.nodePanel = new NodeInfoPanel();
		this.gestureRecognizer = new GestureRecognizer();
		this.radialMenu = new RadialMenu();
		this.voiceCommands = new VoiceCommands();
		
		// Add UI elements to scene
		this.scene.add(this.wristUI.getContainer());
		this.scene.add(this.nodePanel.getHoverPanel());
		this.scene.add(this.nodePanel.getDetailPanel());
		this.scene.add(this.radialMenu.getContainer());
		
		// Setup gesture handlers
		this.setupGestureHandlers();
		
		// Setup voice command handlers
		this.setupVoiceHandlers();
		
		logger.info('UI Manager initialized');
	}
	
	setupGestureHandlers() {
		// L-shape gesture opens radial menu
		this.gestureRecognizer.onGesture('L_SHAPE', (event) => {
			if (event.handedness === 'right') {
				const hand = this.handTracking.hands.right;
				if (hand) {
					const pos = new THREE.Vector3();
					hand.getWorldPosition(pos);
					this.radialMenu.show(pos);
				}
			}
		});
		
		// Swipe gestures
		this.gestureRecognizer.onGesture('SWIPE_LEFT', () => {
			if (this.nodePanel.isDetailVisible()) {
				this.nodePanel.hideDetail();
			}
		});
		
		this.gestureRecognizer.onGesture('SWIPE_RIGHT', () => {
			if (this.nodePanel.isDetailVisible()) {
				this.nodePanel.hideDetail();
			}
		});
		
		// Fist closes radial menu
		this.gestureRecognizer.onGesture('FIST', () => {
			if (this.radialMenu.isVisible) {
				this.radialMenu.hide();
			}
		});
	}
	
	setupVoiceHandlers() {
		// Reset view command
		this.voiceCommands.onCommand('reset_view', () => {
			if (this.nodeManager) {
				this.nodeManager.nodeGroup.position.set(0, 0, 0);
				this.nodeManager.nodeGroup.rotation.set(0, 0, 0);
				this.nodeManager.nodeGroup.scale.setScalar(1);
			}
		});
		
		// Show help command
		this.voiceCommands.onCommand('show_help', () => {
			const commands = this.voiceCommands.getAvailableCommands();
			logger.info('Available voice commands:', commands);
		});
		
		// Start voice recognition when entering VR
		this.renderer.xr.addEventListener('sessionstart', () => {
			if (this.voiceCommands.isAvailable()) {
				this.voiceCommands.start();
			}
		});
		
		// Stop voice recognition when exiting VR
		this.renderer.xr.addEventListener('sessionend', () => {
			this.voiceCommands.stop();
		});
	}
	
	update(deltaTime, nodeManager) {
		// Store reference to node manager
		this.nodeManager = nodeManager;
		
		// Update wrist UI
		this.wristUI.update();
		
		// Check for wrist UI button interactions
		this.checkWristUIInteraction();
		
		// Update two-hand manipulation
		if (this.handTracking) {
			const leftHand = this.handTracking.hands.left;
			const rightHand = this.handTracking.hands.right;
			
			// Only manipulate if radial menu is not visible
			if (!this.radialMenu.isVisible && nodeManager) {
				this.twoHandManip.update(leftHand, rightHand, nodeManager.nodeGroup);
			}
			
			// Update gesture recognition
			this.gestureRecognizer.update(leftHand, rightHand);
			
			// Update radial menu selection
			if (this.radialMenu.isVisible && rightHand) {
				const indexTip = rightHand.joints['index-finger-tip'];
				if (indexTip) {
					const tipPos = new THREE.Vector3();
					indexTip.getWorldPosition(tipPos);
					
					const action = this.radialMenu.updateSelection(tipPos);
					
					// Check for pinch to select
					if (action && this.isPinching(rightHand)) {
						this.executeRadialAction(action);
						this.radialMenu.hide();
					}
				}
			}
		}
		
		// Update radial menu orientation
		this.radialMenu.lookAtCamera(this.camera);
		this.radialMenu.update();
		
		// Update node info panels
		this.nodePanel.update();
	}
	
	isPinching(hand) {
		const thumbTip = hand.joints['thumb-tip'];
		const indexTip = hand.joints['index-finger-tip'];
		
		if (!thumbTip || !indexTip) return false;
		
		const thumbPos = new THREE.Vector3();
		const indexPos = new THREE.Vector3();
		thumbTip.getWorldPosition(thumbPos);
		indexTip.getWorldPosition(indexPos);
		
		return thumbPos.distanceTo(indexPos) < 0.03;
	}
	
	checkWristUIInteraction() {
		if (!this.wristUI.isVisible || !this.handTracking) return;
		
		const rightHand = this.handTracking.hands.right;
		if (!rightHand || !rightHand.joints) return;
		
		const indexTip = rightHand.joints['index-finger-tip'];
		if (!indexTip) return;
		
		// Get index finger position
		const tipPos = new THREE.Vector3();
		indexTip.getWorldPosition(tipPos);
		
		// Create raycaster from index finger
		const direction = this.handTracking.getIndexFingerDirection(rightHand);
		if (!direction) return;
		
		const raycaster = new THREE.Raycaster();
		raycaster.ray.origin.copy(tipPos);
		raycaster.ray.direction.copy(direction);
		
		// Check intersection with wrist UI buttons
		const buttons = this.wristUI.getButtons();
		const intersects = raycaster.intersectObjects(buttons, true);
		
		if (intersects.length > 0) {
			// Find the button that was hit
			let hitButton = null;
			for (const intersect of intersects) {
				if (buttons.includes(intersect.object)) {
					hitButton = intersect.object;
					break;
				}
				// Check parent objects
				let parent = intersect.object.parent;
				while (parent) {
					if (buttons.includes(parent)) {
						hitButton = parent;
						break;
					}
					parent = parent.parent;
				}
				if (hitButton) break;
			}
			
			if (hitButton && hitButton.userData.action) {
				// Highlight on hover
				this.wristUI.highlightButton(hitButton.userData.action);
				
				// Check for pinch to select
				if (this.isPinching(rightHand)) {
					if (!this.lastPinchState) {
						this.executeWristUIAction(hitButton.userData.action);
						this.lastPinchState = true;
					}
				} else {
					this.lastPinchState = false;
				}
			}
		} else {
			// No button hovered
			this.wristUI.highlightButton(null);
			this.lastPinchState = false;
		}
	}
	
	executeWristUIAction(action) {
		logger.info(`Executing wrist UI action: ${action}`);
		
		switch (action) {
			case 'reset_view':
				if (this.nodeManager) {
					this.nodeManager.nodeGroup.position.set(0, 0, 0);
					this.nodeManager.nodeGroup.rotation.set(0, 0, 0);
					this.nodeManager.nodeGroup.scale.setScalar(1);
				}
				break;
			case 'toggle_edges':
				logger.info('Edge toggle coming soon');
				break;
			case 'change_layout':
				logger.info('Layout change coming soon');
				break;
			case 'search':
				logger.info('Search coming soon');
				break;
			case 'filter':
				logger.info('Filter coming soon');
				break;
			case 'help':
				const commands = this.voiceCommands.getAvailableCommands();
				logger.info('Voice commands:', commands);
				break;
		}
	}
	
	executeRadialAction(action) {
		logger.info(`Executing radial menu action: ${action}`);
		
		switch (action) {
			case 'search':
				// TODO: Implement search UI
				logger.info('Search functionality coming soon');
				break;
			case 'toggle_edges':
				// TODO: Toggle edge visibility
				logger.info('Edge toggle coming soon');
				break;
			case 'change_layout':
				// TODO: Cycle through layout algorithms
				logger.info('Layout change coming soon');
				break;
			case 'change_style':
				// TODO: Change visual style
				logger.info('Style change coming soon');
				break;
			case 'export':
				// TODO: Export current view
				logger.info('Export coming soon');
				break;
			case 'settings':
				// TODO: Show settings panel
				logger.info('Settings coming soon');
				break;
		}
	}
	
	showNodeHover(node) {
		if (!node) {
			this.nodePanel.hideHover();
			return;
		}
		
		const worldPos = new THREE.Vector3();
		node.getWorldPosition(worldPos);
		this.nodePanel.showHover(node, worldPos);
	}
	
	showNodeDetail(node) {
		if (!node) return;
		
		const camera = this.renderer.xr.getCamera();
		this.nodePanel.showDetail(node, camera);
	}
	
	updateDatabaseStatus(connected, nodeCount) {
		this.wristUI.updateStatus(connected, nodeCount);
	}
	
	dispose() {
		this.voiceCommands.stop();
		// Remove UI elements from scene
		this.scene.remove(this.wristUI.getContainer());
		this.scene.remove(this.nodePanel.getHoverPanel());
		this.scene.remove(this.nodePanel.getDetailPanel());
		this.scene.remove(this.radialMenu.getContainer());
	}
}