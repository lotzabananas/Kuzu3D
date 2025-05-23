import * as THREE from 'three';

export class SimpleWristUI {
	constructor() {
		this.container = new THREE.Group();
		this.isVisible = false;
		this.buttons = [];
		
		this.createUI();
	}
	
	createUI() {
		// Simple background panel
		const panelGeometry = new THREE.PlaneGeometry(0.3, 0.2);
		const panelMaterial = new THREE.MeshBasicMaterial({
			color: 0x222222,
			transparent: true,
			opacity: 0.9
		});
		const panel = new THREE.Mesh(panelGeometry, panelMaterial);
		this.container.add(panel);
		
		// Add a simple border
		const edges = new THREE.EdgesGeometry(panelGeometry);
		const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff88 });
		const border = new THREE.LineSegments(edges, lineMaterial);
		panel.add(border);
		
		// Create simple buttons as colored planes
		const buttonData = [
			{ label: 'RESET', color: 0x2196F3, position: new THREE.Vector3(-0.08, 0.05, 0.01) },
			{ label: 'HELP', color: 0x4CAF50, position: new THREE.Vector3(0.08, 0.05, 0.01) }
		];
		
		buttonData.forEach(data => {
			const buttonGeometry = new THREE.PlaneGeometry(0.12, 0.04);
			const buttonMaterial = new THREE.MeshBasicMaterial({
				color: data.color,
				transparent: true,
				opacity: 0.8
			});
			const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
			button.position.copy(data.position);
			button.userData = { action: data.label.toLowerCase() };
			
			// Add button border
			const buttonEdges = new THREE.EdgesGeometry(buttonGeometry);
			const buttonBorder = new THREE.LineSegments(buttonEdges, lineMaterial.clone());
			button.add(buttonBorder);
			
			// Add text label using canvas
			const textTexture = this.createTextTexture(data.label);
			const textMaterial = new THREE.MeshBasicMaterial({
				map: textTexture,
				transparent: true,
				depthTest: false
			});
			const textMesh = new THREE.Mesh(
				new THREE.PlaneGeometry(0.08, 0.02),
				textMaterial
			);
			textMesh.position.z = 0.002; // Slightly in front of button
			button.add(textMesh);
			
			this.container.add(button);
			this.buttons.push(button);
		});
		
		// Initially hidden
		this.container.visible = false;
		
		// Ensure container is added to scene and matrices are updated
		this.container.updateMatrixWorld(true);
	}
	
	createTextTexture(text) {
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 64;
		const context = canvas.getContext('2d');
		
		// Clear canvas
		context.clearRect(0, 0, canvas.width, canvas.height);
		
		// Draw text
		context.font = 'bold 48px Arial';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillStyle = 'white';
		context.fillText(text, canvas.width / 2, canvas.height / 2);
		
		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}
	
	update(leftHand, camera) {
		if (!leftHand || !leftHand.joints || !leftHand.joints['wrist']) {
			this.container.visible = false;
			return;
		}
		
		const wrist = leftHand.joints['wrist'];
		const wristPos = new THREE.Vector3();
		wrist.getWorldPosition(wristPos);
		
		// Position above wrist
		this.container.position.copy(wristPos);
		this.container.position.y += 0.15;
		
		// Face camera
		if (camera) {
			const cameraPos = new THREE.Vector3();
			camera.getWorldPosition(cameraPos);
			this.container.lookAt(cameraPos);
		}
		
		// Check palm orientation
		const palmUp = this.isPalmUp(leftHand);
		
		// Debug log palm status changes
		if (palmUp !== this.lastPalmUp) {
			console.log('Palm status changed:', palmUp ? 'UP' : 'DOWN');
			this.lastPalmUp = palmUp;
		}
		
		this.container.visible = palmUp;
		
		// Update matrices when visible to ensure raycasting works
		if (palmUp) {
			this.container.updateMatrixWorld(true);
		}
	}
	
	isPalmUp(hand) {
		const wrist = hand.joints['wrist'];
		const middleMCP = hand.joints['middle-finger-metacarpal'];
		
		if (!wrist || !middleMCP) return false;
		
		// Simple check: if middle finger MCP is higher than wrist, palm is likely up
		const wristPos = new THREE.Vector3();
		const middlePos = new THREE.Vector3();
		
		wrist.getWorldPosition(wristPos);
		middleMCP.getWorldPosition(middlePos);
		
		// Check if hand is relatively horizontal and palm facing up
		return middlePos.y > wristPos.y - 0.02; // Small threshold
	}
	
	getContainer() {
		return this.container;
	}
	
	getButtons() {
		return this.buttons;
	}
}