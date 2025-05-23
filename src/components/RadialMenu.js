import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';

export class RadialMenu {
	constructor() {
		this.container = new THREE.Group();
		this.menuItems = [];
		this.selectedItem = null;
		this.isVisible = false;
		this.radius = 0.15;
		
		this.createMenu();
	}
	
	createMenu() {
		// Menu items configuration
		const items = [
			{ icon: '🔍', label: 'Search', action: 'search', color: 0x4CAF50 },
			{ icon: '🔗', label: 'Edges', action: 'toggle_edges', color: 0x2196F3 },
			{ icon: '📊', label: 'Layout', action: 'change_layout', color: 0xFF9800 },
			{ icon: '🎨', label: 'Style', action: 'change_style', color: 0xE91E63 },
			{ icon: '💾', label: 'Export', action: 'export', color: 0x9C27B0 },
			{ icon: '⚙️', label: 'Settings', action: 'settings', color: 0x607D8B }
		];
		
		const angleStep = (Math.PI * 2) / items.length;
		
		items.forEach((item, index) => {
			const angle = index * angleStep - Math.PI / 2; // Start from top
			
			// Create menu item block
			const itemBlock = new ThreeMeshUI.Block({
				width: 0.08,
				height: 0.08,
				padding: 0.01,
				borderRadius: 0.04,
				backgroundColor: new THREE.Color(item.color),
				backgroundOpacity: 0.8,
				// fontFamily: '/assets/Roboto-msdf.json',
				// fontTexture: '/assets/Roboto-msdf.png',
				justifyContent: 'center',
				alignItems: 'center'
			});
			
			// Icon
			const iconText = new ThreeMeshUI.Text({
				content: item.icon,
				fontSize: 0.03
			});
			
			// Label (initially hidden)
			const labelBlock = new ThreeMeshUI.Block({
				width: 0.12,
				height: 0.03,
				padding: 0.005,
				borderRadius: 0.015,
				backgroundColor: new THREE.Color(0x000000),
				backgroundOpacity: 0.8,
				position: new THREE.Vector3(0, -0.06, 0)
			});
			
			const labelText = new ThreeMeshUI.Text({
				content: item.label,
				fontSize: 0.015,
				fontColor: new THREE.Color(0xffffff)
			});
			
			labelBlock.add(labelText);
			labelBlock.visible = false;
			
			// Position item
			const x = Math.cos(angle) * this.radius;
			const y = Math.sin(angle) * this.radius;
			itemBlock.position.set(x, y, 0);
			
			// Store reference
			itemBlock.userData = {
				action: item.action,
				label: item.label,
				labelBlock: labelBlock,
				defaultColor: item.color,
				index: index
			};
			
			itemBlock.add(iconText);
			this.container.add(itemBlock);
			this.container.add(labelBlock);
			this.menuItems.push(itemBlock);
		});
		
		// Center indicator
		const centerDot = new ThreeMeshUI.Block({
			width: 0.02,
			height: 0.02,
			borderRadius: 0.01,
			backgroundColor: new THREE.Color(0xffffff),
			backgroundOpacity: 0.5
		});
		this.container.add(centerDot);
		
		// Initially hidden
		this.container.visible = false;
	}
	
	show(position) {
		this.container.position.copy(position);
		this.container.visible = true;
		this.isVisible = true;
		
		// Animate in
		this.menuItems.forEach((item, index) => {
			const delay = index * 50;
			setTimeout(() => {
				item.visible = true;
			}, delay);
		});
	}
	
	hide() {
		this.container.visible = false;
		this.isVisible = false;
		this.selectedItem = null;
		
		// Hide all labels
		this.menuItems.forEach(item => {
			item.userData.labelBlock.visible = false;
			item.set({
				backgroundOpacity: 0.8
			});
		});
	}
	
	updateSelection(handPosition) {
		if (!this.isVisible) return null;
		
		// Calculate angle from center to hand
		const relative = new THREE.Vector3().subVectors(handPosition, this.container.position);
		relative.z = 0; // Project to menu plane
		
		const angle = Math.atan2(relative.y, relative.x);
		const distance = relative.length();
		
		// Check if hand is in selection range
		if (distance < 0.05 || distance > 0.25) {
			this.clearSelection();
			return null;
		}
		
		// Find closest menu item
		let closestItem = null;
		let closestAngle = Infinity;
		
		this.menuItems.forEach(item => {
			const itemAngle = Math.atan2(item.position.y, item.position.x);
			let angleDiff = Math.abs(angle - itemAngle);
			
			// Handle wrap-around
			if (angleDiff > Math.PI) {
				angleDiff = 2 * Math.PI - angleDiff;
			}
			
			if (angleDiff < closestAngle) {
				closestAngle = angleDiff;
				closestItem = item;
			}
		});
		
		// Update selection
		if (closestItem && closestAngle < Math.PI / 6) { // 30 degree tolerance
			this.setSelection(closestItem);
			return closestItem.userData.action;
		} else {
			this.clearSelection();
			return null;
		}
	}
	
	setSelection(item) {
		if (this.selectedItem === item) return;
		
		this.clearSelection();
		this.selectedItem = item;
		
		// Highlight selected item
		item.set({
			backgroundOpacity: 1.0,
			scale: 1.2
		});
		
		// Show label
		item.userData.labelBlock.visible = true;
		item.userData.labelBlock.position.copy(item.position);
		item.userData.labelBlock.position.y -= 0.06;
	}
	
	clearSelection() {
		if (this.selectedItem) {
			this.selectedItem.set({
				backgroundOpacity: 0.8,
				scale: 1.0
			});
			this.selectedItem.userData.labelBlock.visible = false;
			this.selectedItem = null;
		}
	}
	
	lookAtCamera(camera) {
		if (this.isVisible) {
			this.container.lookAt(camera.position);
		}
	}
	
	update() {
		if (this.isVisible) {
			ThreeMeshUI.update();
		}
	}
	
	getContainer() {
		return this.container;
	}
}