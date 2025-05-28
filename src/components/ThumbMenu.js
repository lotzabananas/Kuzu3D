import * as THREE from 'three';
import { debugManager } from '../utils/DebugManager.js';
import { logger } from '../utils/Logger.js';
import { remoteLogger } from '../utils/RemoteLogger.js';

/**
 * Experimental thumb-controlled radial menu
 * Thumb direction selects options, right pinch confirms
 */
export class ThumbMenu {
	constructor() {
		this.isActive = false;
		this.selectedOption = -1;
		this.hasPinchedForSelection = false; // Track if pinch already processed
		this.menuGroup = new THREE.Group();
		this.driftEnabled = false; // Track drift state for visual feedback
		
		// Listen for debug mode changes
		this.debugModeUnsubscribe = debugManager.onDebugModeChange((enabled) => {
			this.updateDebugVisibility(enabled);
		});
		
		// Menu configuration
		this.config = {
			radius: 0.15,          // 15cm radius
			optionCount: 4,
			startAngle: -60,       // -60° to +60° (120° total arc)
			angleRange: 120,       // Total arc in degrees
			optionSize: 0.04,      // Size of each option sphere
			colors: {
				inactive: 0xaaaaaa,   // Brighter for visibility
				active: 0x00ff00,
				selected: 0xffff00,
				confirmed: 0xff0000
			}
		};
		
		// Create menu options
		this.options = [];
		this.createMenuOptions();
		
		// Hide menu initially
		this.menuGroup.visible = false;
		
		// Callback for option selection
		this.onSelectCallback = null;
	}
	
	createMenuOptions() {
		const anglePerOption = this.config.angleRange / this.config.optionCount;
		
		// Option labels
		const optionLabels = ['Legend', 'Voice', 'Drift', 'Spread'];
		// const optionIcons = ['📊', '👁️', '🔍', '⚙️']; // Reserved for future icon implementation
		
		for (let i = 0; i < this.config.optionCount; i++) {
			// Calculate angle for this option
			const angle = this.config.startAngle + (i + 0.5) * anglePerOption;
			const angleRad = THREE.MathUtils.degToRad(angle);
			
			// Create option sphere
			const geometry = new THREE.SphereGeometry(this.config.optionSize, 16, 16);
			const material = new THREE.MeshBasicMaterial({
				color: this.config.colors.inactive,
				transparent: true,
				opacity: 0.8
			});
			const sphere = new THREE.Mesh(geometry, material);
			
			// Position on arc
			sphere.position.x = Math.sin(angleRad) * this.config.radius;
			sphere.position.y = Math.cos(angleRad) * this.config.radius;
			sphere.position.z = 0;
			
			// Create label with number (working version)
			const canvas = document.createElement('canvas');
			canvas.width = 128;
			canvas.height = 128;
			const ctx = canvas.getContext('2d');
			
			// Draw number
			ctx.fillStyle = 'white';
			ctx.font = 'bold 64px Arial';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText((i + 1).toString(), 64, 64);
			
			// Add small text label below
			ctx.font = '20px Arial';
			ctx.fillText(optionLabels[i], 64, 100);
			
			const texture = new THREE.CanvasTexture(canvas);
			const labelGeometry = new THREE.PlaneGeometry(0.03, 0.03);
			const labelMaterial = new THREE.MeshBasicMaterial({
				map: texture,
				transparent: true,
				side: THREE.DoubleSide
			});
			const label = new THREE.Mesh(labelGeometry, labelMaterial);
			label.position.copy(sphere.position);
			label.position.z = 0.01;
			
			// Store option data
			this.options.push({
				sphere,
				label,
				material,
				index: i,
				angle: angle,
				angleMin: this.config.startAngle + i * anglePerOption,
				angleMax: this.config.startAngle + (i + 1) * anglePerOption
			});
			
			this.menuGroup.add(sphere);
			this.menuGroup.add(label);
		}
		
		// Add center indicator
		const centerGeometry = new THREE.RingGeometry(0.01, 0.02, 16);
		const centerMaterial = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			side: THREE.DoubleSide
		});
		const center = new THREE.Mesh(centerGeometry, centerMaterial);
		this.menuGroup.add(center);
		
		// Add direction indicator line
		const lineGeometry = new THREE.BufferGeometry();
		const lineMaterial = new THREE.LineBasicMaterial({
			color: 0xffff00,
			linewidth: 3
		});
		this.directionLine = new THREE.Line(lineGeometry, lineMaterial);
		this.menuGroup.add(this.directionLine);
		
		// Initially hide direction line if not in debug mode
		this.directionLine.visible = debugManager.isDebugMode();
	}
	
	activate(hand) {
		if (!hand || !hand.joints) return;
		
		const wrist = hand.joints['wrist'];
		if (!wrist) return;
		
		// Debug: Check which hand this is
		const handedness = hand.inputSource?.handedness || 'unknown';
		logger.warn(`🖐️ ThumbMenu.activate called with ${handedness} hand`);
		remoteLogger.warn(`🖐️ ThumbMenu.activate called with ${handedness} hand`);
		
		// Safety check - only activate on left hand
		if (handedness === 'right') {
			logger.error('❌ ThumbMenu should NEVER be activated on right hand!');
			remoteLogger.error('❌ ThumbMenu should NEVER be activated on right hand!');
			return;
		}
		
		this.isActive = true;
		this.menuGroup.visible = true;
		
		// Get wrist position and forearm direction
		const wristPos = new THREE.Vector3();
		wrist.getWorldPosition(wristPos);
		
		logger.info('Thumb menu activating at position:', wristPos);
		logger.info('Menu group visible:', this.menuGroup.visible);
		logger.info('Menu group children:', this.menuGroup.children.length);
		
		// Calculate forearm direction
		const forearmDir = this.getForearmDirection(hand);
		
		// Position menu in front of wrist (negative forearm direction)
		this.menuGroup.position.copy(wristPos);
		this.menuGroup.position.add(forearmDir.clone().multiplyScalar(-0.05)); // 5cm in front of wrist
		
		// Orient menu perpendicular to forearm
		// Create rotation that aligns Z axis with forearm direction
		const up = new THREE.Vector3(0, 1, 0);
		const quaternion = new THREE.Quaternion();
		
		// If forearm is nearly vertical, use a different up vector
		if (Math.abs(forearmDir.dot(up)) > 0.9) {
			up.set(1, 0, 0);
		}
		
		// Calculate right and actual up vectors
		const right = new THREE.Vector3().crossVectors(up, forearmDir).normalize();
		const actualUp = new THREE.Vector3().crossVectors(forearmDir, right).normalize();
		
		// Create rotation matrix
		const matrix = new THREE.Matrix4();
		matrix.makeBasis(right, actualUp, forearmDir);
		quaternion.setFromRotationMatrix(matrix);
		
		this.menuGroup.quaternion.copy(quaternion);
		
		// Store initial state
		this.initialWristPos = wristPos.clone();
		this.initialForearmDir = forearmDir.clone();
		
		logger.info('Thumb menu activated');
	}
	
	deactivate() {
		this.isActive = false;
		this.menuGroup.visible = false;
		this.selectedOption = -1;
		this.hasPinchedForSelection = false; // Reset pinch state
		
		// Reset all option colors
		this.options.forEach(option => {
			option.material.color.setHex(this.config.colors.inactive);
		});
		
		logger.info('Thumb menu deactivated');
	}
	
	update(leftHand, _rightHand, isPinching) {
		if (!this.isActive || !leftHand || !leftHand.joints) return;
		
		// Menu stays locked in position - no following wrist
		// Only update thumb angle for selection
		
		// Get thumb angle around forearm axis
		const thumbAngle = this.getThumbAngleAroundArm(leftHand);
		if (thumbAngle !== null) {
			// Update direction line
			this.updateDirectionLine(thumbAngle);
			
			// Find selected option based on angle
			let newSelection = -1;
			for (let i = 0; i < this.options.length; i++) {
				const option = this.options[i];
				if (thumbAngle >= option.angleMin && thumbAngle <= option.angleMax) {
					newSelection = i;
					break;
				}
			}
			
			// Update selection visuals
			if (newSelection !== this.selectedOption) {
				// Reset previous selection
				if (this.selectedOption >= 0) {
					this.options[this.selectedOption].material.color.setHex(this.config.colors.inactive);
				}
				
				// Highlight new selection
				if (newSelection >= 0) {
					this.options[newSelection].material.color.setHex(this.config.colors.active);
					logger.info(`Thumb menu: Option ${newSelection + 1} highlighted`);
				}
				
				this.selectedOption = newSelection;
			}
		}
		
		// Check for right hand pinch to confirm selection
		if (isPinching && this.selectedOption >= 0 && !this.hasPinchedForSelection) {
			this.confirmSelection();
			this.hasPinchedForSelection = true;
		} else if (!isPinching) {
			// Reset pinch state when not pinching
			this.hasPinchedForSelection = false;
		}
	}
	
	getThumbAngle(hand) {
		const thumbTip = hand.joints['thumb-tip'];
		const thumbMetacarpal = hand.joints['thumb-metacarpal'];
		const wrist = hand.joints['wrist'];
		
		if (!thumbTip || !thumbMetacarpal || !wrist) return null;
		
		// Get positions in world space
		const tipPos = new THREE.Vector3();
		const metacarpalPos = new THREE.Vector3();
		const wristPos = new THREE.Vector3();
		
		thumbTip.getWorldPosition(tipPos);
		thumbMetacarpal.getWorldPosition(metacarpalPos);
		wrist.getWorldPosition(wristPos);
		
		// Calculate thumb direction in hand's local space
		const handMatrix = new THREE.Matrix4();
		wrist.updateWorldMatrix(true, false);
		handMatrix.copy(wrist.matrixWorld).invert();
		
		// Transform to local space
		tipPos.applyMatrix4(handMatrix);
		metacarpalPos.applyMatrix4(handMatrix);
		
		// Calculate angle in XY plane (relative to hand)
		const direction = tipPos.clone().sub(metacarpalPos).normalize();
		let angle = Math.atan2(direction.x, direction.y);
		angle = THREE.MathUtils.radToDeg(angle);
		
		// Clamp to menu range
		if (angle < this.config.startAngle) angle = this.config.startAngle;
		if (angle > this.config.startAngle + this.config.angleRange) {
			angle = this.config.startAngle + this.config.angleRange;
		}
		
		return angle;
	}
	
	getForearmDirection(hand) {
		const wrist = hand.joints['wrist'];
		const middleMetacarpal = hand.joints['middle-finger-metacarpal'];
		
		if (!wrist || !middleMetacarpal) {
			// Fallback to hand forward direction
			const handRotation = new THREE.Quaternion();
			wrist.getWorldQuaternion(handRotation);
			const forward = new THREE.Vector3(0, 0, -1);
			forward.applyQuaternion(handRotation);
			return forward;
		}
		
		// Get positions
		const wristPos = new THREE.Vector3();
		const metacarpalPos = new THREE.Vector3();
		wrist.getWorldPosition(wristPos);
		middleMetacarpal.getWorldPosition(metacarpalPos);
		
		// Forearm points from metacarpal toward elbow (opposite of hand direction)
		const forearmDir = wristPos.clone().sub(metacarpalPos).normalize();
		
		return forearmDir;
	}
	
	getThumbAngleAroundArm(hand) {
		const thumbTip = hand.joints['thumb-tip'];
		const wrist = hand.joints['wrist'];
		
		if (!thumbTip || !wrist) return null;
		
		// Get world positions
		const thumbPos = new THREE.Vector3();
		const wristPos = new THREE.Vector3();
		
		thumbTip.getWorldPosition(thumbPos);
		wrist.getWorldPosition(wristPos);
		
		// Calculate thumb position relative to wrist
		const thumbRelative = thumbPos.clone().sub(wristPos);
		
		// Get consistent forearm direction
		const forearmDir = this.getForearmDirection(hand);
		
		// Project thumb position onto plane perpendicular to forearm
		const projectedThumb = thumbRelative.clone();
		const dot = projectedThumb.dot(forearmDir);
		projectedThumb.sub(forearmDir.clone().multiplyScalar(dot));
		
		// Calculate angle in the perpendicular plane
		// Use the same basis as the menu orientation
		const worldUp = new THREE.Vector3(0, 1, 0);
		if (Math.abs(forearmDir.dot(worldUp)) > 0.9) {
			worldUp.set(1, 0, 0);
		}
		
		const right = worldUp.clone().cross(forearmDir).normalize();
		const up = forearmDir.clone().cross(right).normalize();
		
		// Get angle using atan2 for full 360 degree range
		const x = projectedThumb.dot(right);
		const y = projectedThumb.dot(up);
		let angle = Math.atan2(x, y);
		angle = THREE.MathUtils.radToDeg(angle);
		
		// Map to our menu range (-60 to +60)
		// Adjust based on typical thumb range of motion
		angle = THREE.MathUtils.clamp(angle, -90, 90);
		// Direct mapping so thumb movement matches selection movement
		angle = THREE.MathUtils.mapLinear(angle, -90, 90, -60, 60);
		
		return angle;
	}
	
	updateDirectionLine(angle) {
		const angleRad = THREE.MathUtils.degToRad(angle);
		const length = this.config.radius * 0.8;
		
		const points = [
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(
				Math.sin(angleRad) * length,
				Math.cos(angleRad) * length,
				0
			)
		];
		
		this.directionLine.geometry.setFromPoints(points);
	}
	
	confirmSelection() {
		if (this.selectedOption >= 0) {
			const option = this.options[this.selectedOption];
			option.material.color.setHex(this.config.colors.confirmed);
			
			logger.info(`Thumb menu: Option ${this.selectedOption + 1} selected!`);
			
			// Trigger callback
			if (this.onSelectCallback) {
				this.onSelectCallback(this.selectedOption + 1);
			}
			
			// Brief flash then deactivate
			setTimeout(() => {
				this.deactivate();
			}, 500);
		}
	}
	
	onSelect(callback) {
		this.onSelectCallback = callback;
	}
	
	setDriftState(enabled) {
		this.driftEnabled = enabled;
		this.updateDriftVisual();
	}
	
	updateDriftVisual() {
		// Update the drift option (option 2, index 2) visual to show state
		if (this.options && this.options[2]) {
			const driftOption = this.options[2];
			const baseColor = this.driftEnabled ? 0x00aa00 : this.config.colors.inactive; // Green when enabled
			
			// Only update if not currently selected
			if (this.selectedOption !== 2) {
				driftOption.material.color.setHex(baseColor);
			}
		}
	}
	
	addToScene(scene) {
		scene.add(this.menuGroup);
	}
	
	removeFromScene(scene) {
		scene.remove(this.menuGroup);
	}
	
	updateDebugVisibility(enabled) {
		// Show/hide direction line based on debug mode
		if (this.directionLine) {
			this.directionLine.visible = enabled;
		}
	}
	
	dispose() {
		// Unsubscribe from debug mode changes
		if (this.debugModeUnsubscribe) {
			this.debugModeUnsubscribe();
		}
		
		this.options.forEach(option => {
			option.sphere.geometry.dispose();
			option.sphere.material.dispose();
			option.label.geometry.dispose();
			option.label.material.map.dispose();
			option.label.material.dispose();
		});
		
		this.directionLine.geometry.dispose();
		this.directionLine.material.dispose();
	}
}