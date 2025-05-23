import * as THREE from 'three';

export class WristUISimple {
	constructor(handTracking) {
		this.handTracking = handTracking;
		this.container = new THREE.Group();
		this.buttons = [];
		this.isVisible = false;
		this.lastVisibilityCheck = 0;
		this.debugMode = false; // Turn off debug mode
		
		// UI state
		this.connected = false;
		this.nodeCount = 0;
		
		this.createUI();
	}
	
	createUI() {
		// Create background panel
		const panelGeometry = new THREE.PlaneGeometry(0.35, 0.25);
		const panelMaterial = new THREE.MeshBasicMaterial({
			color: 0x1a1a1a,
			transparent: true,
			opacity: 0.9,
			side: THREE.DoubleSide
		});
		this.panel = new THREE.Mesh(panelGeometry, panelMaterial);
		this.container.add(this.panel);
		
		// Add border
		const borderGeometry = new THREE.EdgesGeometry(panelGeometry);
		const borderMaterial = new THREE.LineBasicMaterial({ color: 0x00ff88, linewidth: 2 });
		const border = new THREE.LineSegments(borderGeometry, borderMaterial);
		this.panel.add(border);
		
		// Create title using canvas texture
		this.titleSprite = this.createTextSprite('KÙZU VR CONTROL', {
			fontSize: 24,
			color: '#00ff88',
			backgroundColor: 'rgba(0, 255, 136, 0.1)'
		});
		this.titleSprite.position.set(0, 0.09, 0.001);
		this.titleSprite.scale.set(0.2, 0.04, 1);
		this.container.add(this.titleSprite);
		
		// Status indicator
		this.statusSprite = this.createTextSprite('● Disconnected', {
			fontSize: 20,
			color: '#ff4444'
		});
		this.statusSprite.position.set(0, 0.05, 0.001);
		this.statusSprite.scale.set(0.15, 0.03, 1);
		this.container.add(this.statusSprite);
		
		// Node count
		this.nodeCountSprite = this.createTextSprite('Nodes: 0', {
			fontSize: 20,
			color: '#cccccc'
		});
		this.nodeCountSprite.position.set(0, 0.015, 0.001);
		this.nodeCountSprite.scale.set(0.12, 0.03, 1);
		this.container.add(this.nodeCountSprite);
		
		// Create buttons
		const buttonData = [
			{ label: 'RESET', color: '#2196F3', action: 'reset_view', x: -0.11, y: -0.04 },
			{ label: 'LAYOUT', color: '#FF9800', action: 'change_layout', x: 0, y: -0.04 },
			{ label: 'EDGES', color: '#4CAF50', action: 'toggle_edges', x: 0.11, y: -0.04 },
			{ label: 'SEARCH', color: '#E91E63', action: 'search', x: -0.11, y: -0.09 },
			{ label: 'FILTER', color: '#9C27B0', action: 'filter', x: 0, y: -0.09 },
			{ label: 'HELP', color: '#607D8B', action: 'help', x: 0.11, y: -0.09 }
		];
		
		buttonData.forEach(data => {
			const button = this.createButton(data.label, data.color, data.action);
			button.position.set(data.x, data.y, 0.001);
			this.container.add(button);
			this.buttons.push(button);
		});
		
		// Initially hidden
		this.container.visible = false;
	}
	
	createTextSprite(text, options = {}) {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		
		// Set canvas size
		canvas.width = 512;
		canvas.height = 128;
		
		// Configure text
		const fontSize = options.fontSize || 32;
		const fontFamily = options.fontFamily || 'Arial';
		const color = options.color || '#ffffff';
		const backgroundColor = options.backgroundColor || 'transparent';
		
		// Clear canvas
		context.fillStyle = backgroundColor;
		context.fillRect(0, 0, canvas.width, canvas.height);
		
		// Draw text
		context.font = `bold ${fontSize}px ${fontFamily}`;
		context.fillStyle = color;
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(text, canvas.width / 2, canvas.height / 2);
		
		// Create texture
		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		
		// Create sprite material
		const material = new THREE.SpriteMaterial({
			map: texture,
			transparent: true
		});
		
		// Create and return sprite
		const sprite = new THREE.Sprite(material);
		sprite.userData = { text, options };
		return sprite;
	}
	
	createButton(label, color, action) {
		const group = new THREE.Group();
		
		// Button background
		const geometry = new THREE.PlaneGeometry(0.095, 0.04);
		const material = new THREE.MeshBasicMaterial({
			color: new THREE.Color(color),
			transparent: true,
			opacity: 0.7,
			side: THREE.DoubleSide
		});
		const button = new THREE.Mesh(geometry, material);
		group.add(button);
		
		// Button border
		const borderGeometry = new THREE.EdgesGeometry(geometry);
		const borderMaterial = new THREE.LineBasicMaterial({ 
			color: new THREE.Color(color).multiplyScalar(1.5),
			linewidth: 2 
		});
		const border = new THREE.LineSegments(borderGeometry, borderMaterial);
		button.add(border);
		
		// Button text
		const textSprite = this.createTextSprite(label, {
			fontSize: 18,
			color: '#ffffff'
		});
		textSprite.scale.set(0.08, 0.025, 1);
		textSprite.position.z = 0.001;
		group.add(textSprite);
		
		// Store button data
		group.userData = {
			action,
			button,
			originalOpacity: 0.7,
			originalColor: new THREE.Color(color)
		};
		
		return group;
	}
	
	update() {
		// Update UI position to follow left wrist
		const leftHand = this.handTracking.hands.left;
		if (!leftHand || !leftHand.joints) {
			this.container.visible = false;
			return;
		}
		
		const wrist = leftHand.joints['wrist'];
		if (!wrist) {
			this.container.visible = false;
			return;
		}
		
		// Get wrist position
		const wristPos = new THREE.Vector3();
		wrist.getWorldPosition(wristPos);
		
		// Position UI above wrist with forward offset
		this.container.position.copy(wristPos);
		this.container.position.y += 0.1; // 10cm above wrist
		
		// Get hand forward direction (from wrist to middle finger)
		const middleMCP = leftHand.joints['middle-finger-metacarpal'];
		if (middleMCP) {
			const middlePos = new THREE.Vector3();
			middleMCP.getWorldPosition(middlePos);
			
			// Calculate forward direction
			const forward = new THREE.Vector3();
			forward.subVectors(middlePos, wristPos);
			forward.y = 0; // Keep it horizontal
			forward.normalize();
			
			// Offset UI forward from wrist
			this.container.position.addScaledVector(forward, 0.05);
		}
		
		// Make UI face the camera with tilt
		const camera = this.handTracking.renderer.xr.getCamera();
		if (camera) {
			const cameraPos = new THREE.Vector3();
			camera.getWorldPosition(cameraPos);
			
			// Look at camera
			this.container.lookAt(cameraPos);
			
			// Tilt back 30 degrees for better viewing
			this.container.rotateX(-Math.PI / 6);
		}
		
		// Check visibility based on palm orientation
		this.checkVisibility(leftHand);
	}
	
	checkVisibility(hand) {
		// Throttle visibility checks
		const now = Date.now();
		if (now - this.lastVisibilityCheck < 100) return;
		this.lastVisibilityCheck = now;
		
		// Get palm normal direction
		const palmNormal = this.getPalmNormal(hand);
		if (!palmNormal) return;
		
		// Check if palm is facing up (Y component > 0.6 for easier activation)
		const shouldShow = palmNormal.y > 0.6;
		
		// Also check angle - palm should be relatively flat
		const isFlat = Math.abs(palmNormal.x) < 0.5 && Math.abs(palmNormal.z) < 0.5;
		const shouldActivate = shouldShow && isFlat;
		
		if (shouldActivate !== this.isVisible) {
			this.isVisible = shouldActivate;
			this.container.visible = shouldActivate;
			
			if (shouldActivate) {
				console.log('Wrist UI activated - palm facing up (Y:', palmNormal.y.toFixed(2), ')');
			} else if (this.isVisible) {
				console.log('Wrist UI hidden - palm rotated');
			}
		}
	}
	
	getPalmNormal(hand) {
		// Get joints for palm calculation
		const wrist = hand.joints['wrist'];
		const indexMCP = hand.joints['index-finger-metacarpal'];
		const pinkyMCP = hand.joints['pinky-finger-metacarpal'];
		
		if (!wrist || !indexMCP || !pinkyMCP) return null;
		
		// Get world positions
		const wristPos = new THREE.Vector3();
		const indexPos = new THREE.Vector3();
		const pinkyPos = new THREE.Vector3();
		
		wrist.getWorldPosition(wristPos);
		indexMCP.getWorldPosition(indexPos);
		pinkyMCP.getWorldPosition(pinkyPos);
		
		// Calculate vectors
		const toIndex = new THREE.Vector3().subVectors(indexPos, wristPos);
		const toPinky = new THREE.Vector3().subVectors(pinkyPos, wristPos);
		
		// Calculate normal (cross product)
		const normal = new THREE.Vector3();
		normal.crossVectors(toIndex, toPinky);
		normal.normalize();
		
		// For left hand, the normal points down when palm faces up, so flip it
		normal.multiplyScalar(-1);
		
		return normal;
	}
	
	updateStatus(connected, nodeCount = 0) {
		this.connected = connected;
		this.nodeCount = nodeCount;
		
		// Update status text
		if (this.statusSprite) {
			const statusText = connected ? '● Connected' : '● Disconnected';
			const statusColor = connected ? '#44ff44' : '#ff4444';
			this.updateTextSprite(this.statusSprite, statusText, { color: statusColor });
		}
		
		// Update node count
		if (this.nodeCountSprite) {
			this.updateTextSprite(this.nodeCountSprite, `Nodes: ${nodeCount}`);
		}
	}
	
	updateTextSprite(sprite, newText, newOptions = {}) {
		const options = { ...sprite.userData.options, ...newOptions };
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		
		canvas.width = 512;
		canvas.height = 128;
		
		// Clear canvas
		context.fillStyle = options.backgroundColor || 'transparent';
		context.fillRect(0, 0, canvas.width, canvas.height);
		
		// Draw new text
		context.font = `bold ${options.fontSize}px ${options.fontFamily || 'Arial'}`;
		context.fillStyle = options.color;
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(newText, canvas.width / 2, canvas.height / 2);
		
		// Update texture
		sprite.material.map.image = canvas;
		sprite.material.map.needsUpdate = true;
		sprite.userData.text = newText;
		sprite.userData.options = options;
	}
	
	highlightButton(action) {
		this.buttons.forEach(group => {
			const button = group.userData.button;
			if (group.userData.action === action) {
				button.material.opacity = 1.0;
				button.scale.setScalar(1.1);
			} else {
				button.material.opacity = group.userData.originalOpacity;
				button.scale.setScalar(1.0);
			}
		});
	}
	
	getButtons() {
		return this.buttons;
	}
	
	getContainer() {
		return this.container;
	}
}