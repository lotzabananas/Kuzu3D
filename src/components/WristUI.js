import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';

export class WristUI {
	constructor(handTracking) {
		this.handTracking = handTracking;
		this.container = null;
		this.statusText = null;
		this.nodeCountText = null;
		this.buttons = [];
		this.isVisible = false;
		this.lastVisibilityCheck = 0;
		this.debugMode = true; // Always show for testing
		
		this.createUI();
	}
	
	createUI() {
		// Create main container
		this.container = new ThreeMeshUI.Block({
			width: 0.35,
			height: 0.25,
			padding: 0.02,
			borderRadius: 0.015,
			backgroundColor: new THREE.Color(0x1a1a1a),
			backgroundOpacity: 0.9,
			justifyContent: 'start',
			alignItems: 'center',
			flexDirection: 'column'
		});
		
		// Header with title
		const header = new ThreeMeshUI.Block({
			width: 0.31,
			height: 0.05,
			backgroundColor: new THREE.Color(0x00ff88),
			backgroundOpacity: 0.2,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 0.01
		});
		
		const title = new ThreeMeshUI.Text({
			content: 'KÙZU VR CONTROL',
			fontSize: 0.022,
			fontColor: new THREE.Color(0x00ff88)
		});
		
		header.add(title);
		
		// Status section
		const statusBlock = new ThreeMeshUI.Block({
			width: 0.31,
			height: 0.04,
			backgroundColor: new THREE.Color(0x333333),
			backgroundOpacity: 0.5,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 0.015,
			borderRadius: 0.005
		});
		
		this.statusText = new ThreeMeshUI.Text({
			content: '● Disconnected',
			fontSize: 0.018,
			fontColor: new THREE.Color(0xff4444)
		});
		
		statusBlock.add(this.statusText);
		
		// Node count
		const nodeBlock = new ThreeMeshUI.Block({
			width: 0.31,
			height: 0.04,
			backgroundColor: new THREE.Color(0x333333),
			backgroundOpacity: 0.5,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 0.02,
			borderRadius: 0.005
		});
		
		this.nodeCountText = new ThreeMeshUI.Text({
			content: 'Nodes: 0',
			fontSize: 0.018,
			fontColor: new THREE.Color(0xcccccc)
		});
		
		nodeBlock.add(this.nodeCountText);
		
		// Button row 1
		const buttonRow1 = new ThreeMeshUI.Block({
			width: 0.31,
			height: 0.045,
			justifyContent: 'space-between',
			alignItems: 'center',
			flexDirection: 'row',
			marginBottom: 0.01
		});
		
		const resetButton = this.createButton('RESET', 0x2196F3, 'reset_view');
		const layoutButton = this.createButton('LAYOUT', 0xFF9800, 'change_layout');
		const edgesButton = this.createButton('EDGES', 0x4CAF50, 'toggle_edges');
		
		buttonRow1.add(resetButton, layoutButton, edgesButton);
		
		// Button row 2
		const buttonRow2 = new ThreeMeshUI.Block({
			width: 0.31,
			height: 0.045,
			justifyContent: 'space-between',
			alignItems: 'center',
			flexDirection: 'row'
		});
		
		const searchButton = this.createButton('SEARCH', 0xE91E63, 'search');
		const filterButton = this.createButton('FILTER', 0x9C27B0, 'filter');
		const helpButton = this.createButton('HELP', 0x607D8B, 'help');
		
		buttonRow2.add(searchButton, filterButton, helpButton);
		
		// Add all elements to container
		this.container.add(header, statusBlock, nodeBlock, buttonRow1, buttonRow2);
		
		// Initially visible in debug mode
		this.container.visible = this.debugMode;
	}
	
	createButton(label, color, action) {
		const button = new ThreeMeshUI.Block({
			width: 0.095,
			height: 0.04,
			backgroundColor: new THREE.Color(color),
			backgroundOpacity: 0.7,
			justifyContent: 'center',
			alignItems: 'center',
			borderRadius: 0.005
		});
		
		const text = new ThreeMeshUI.Text({
			content: label,
			fontSize: 0.014,
			fontColor: new THREE.Color(0xffffff)
		});
		
		button.add(text);
		button.userData = { action, originalColor: color };
		this.buttons.push(button);
		
		return button;
	}
	
	update() {
		// Update UI position to follow left wrist
		const leftHand = this.handTracking.hands.left;
		if (!leftHand || !leftHand.joints) return;
		
		const wrist = leftHand.joints['wrist'];
		if (!wrist) return;
		
		// Get wrist position and orientation
		const wristPos = new THREE.Vector3();
		const wristQuat = new THREE.Quaternion();
		wrist.getWorldPosition(wristPos);
		wrist.getWorldQuaternion(wristQuat);
		
		// Position UI above and forward from wrist
		this.container.position.copy(wristPos);
		this.container.position.y += 0.12; // Higher offset
		
		// Get camera for proper angling
		const camera = this.handTracking.renderer.xr.getCamera();
		if (camera) {
			const cameraPos = new THREE.Vector3();
			camera.getWorldPosition(cameraPos);
			
			// Calculate midpoint between wrist and camera for better viewing angle
			const midPoint = new THREE.Vector3();
			midPoint.lerpVectors(wristPos, cameraPos, 0.3); // 30% towards camera
			
			// Make UI face this midpoint
			const lookTarget = new THREE.Vector3(midPoint.x, this.container.position.y, midPoint.z);
			this.container.lookAt(lookTarget);
			
			// Tilt forward slightly (45 degrees)
			this.container.rotateX(-Math.PI / 8);
		}
		
		// Check if palm is facing up (show UI)
		this.checkVisibility(leftHand);
		
		// Update Three Mesh UI
		ThreeMeshUI.update();
	}
	
	checkVisibility(hand) {
		// Throttle visibility checks
		const now = Date.now();
		if (now - this.lastVisibilityCheck < 100) return;
		this.lastVisibilityCheck = now;
		
		// Get palm normal direction
		const palmNormal = this.getPalmNormal(hand);
		if (!palmNormal) return;
		
		// Check if palm is facing up (Y component > 0.5 for easier activation)
		const shouldShow = palmNormal.y > 0.5;
		
		if (this.debugMode) {
			// Always show in debug mode
			this.isVisible = true;
			this.container.visible = true;
		} else if (shouldShow !== this.isVisible) {
			this.isVisible = shouldShow;
			this.container.visible = shouldShow;
			
			// Log for debugging
			if (shouldShow) {
				console.log('Wrist UI shown - palm normal Y:', palmNormal.y);
			}
		}
	}
	
	getPalmNormal(hand) {
		// Get three joints to calculate palm plane
		const wrist = hand.joints['wrist'];
		const indexMCP = hand.joints['index-finger-metacarpal'];
		const pinkyMCP = hand.joints['pinky-finger-metacarpal'];
		
		if (!wrist || !indexMCP || !pinkyMCP) return null;
		
		// Get positions
		const wristPos = new THREE.Vector3();
		const indexPos = new THREE.Vector3();
		const pinkyPos = new THREE.Vector3();
		
		wrist.getWorldPosition(wristPos);
		indexMCP.getWorldPosition(indexPos);
		pinkyMCP.getWorldPosition(pinkyPos);
		
		// Calculate palm normal
		const toIndex = new THREE.Vector3().subVectors(indexPos, wristPos);
		const toPinky = new THREE.Vector3().subVectors(pinkyPos, wristPos);
		
		const normal = new THREE.Vector3();
		normal.crossVectors(toIndex, toPinky);
		normal.normalize();
		
		// For left hand, flip the normal
		normal.multiplyScalar(-1);
		
		return normal;
	}
	
	updateStatus(connected, nodeCount = 0) {
		if (this.statusText) {
			if (connected) {
				this.statusText.set({
					content: '● Connected',
					fontColor: new THREE.Color(0x44ff44)
				});
			} else {
				this.statusText.set({
					content: '● Disconnected',
					fontColor: new THREE.Color(0xff4444)
				});
			}
		}
		
		if (this.nodeCountText) {
			this.nodeCountText.set({
				content: `Nodes: ${nodeCount}`
			});
		}
	}
	
	highlightButton(action) {
		this.buttons.forEach(button => {
			if (button.userData.action === action) {
				button.set({ backgroundOpacity: 1.0 });
			} else {
				button.set({ backgroundOpacity: 0.7 });
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