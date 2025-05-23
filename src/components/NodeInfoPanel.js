import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';

export class NodeInfoPanel {
	constructor() {
		this.hoverPanel = null;
		this.detailPanel = null;
		this.currentNode = null;
		this.camera = null;
		
		this.createPanels();
	}
	
	createPanels() {
		// Hover panel (small, follows node)
		this.hoverPanel = new ThreeMeshUI.Block({
			width: 0.2,
			height: 0.08,
			padding: 0.01,
			borderRadius: 0.01,
			backgroundColor: new THREE.Color(0x000000),
			backgroundOpacity: 0.7
			// fontFamily: '/assets/Roboto-msdf.json',
			// fontTexture: '/assets/Roboto-msdf.png'
		});
		
		this.hoverText = new ThreeMeshUI.Text({
			content: '',
			fontSize: 0.015,
			fontColor: new THREE.Color(0xffffff)
		});
		
		this.hoverPanel.add(this.hoverText);
		this.hoverPanel.visible = false;
		
		// Detail panel (larger, fixed position)
		this.detailPanel = new ThreeMeshUI.Block({
			width: 0.4,
			height: 0.3,
			padding: 0.02,
			borderRadius: 0.02,
			backgroundColor: new THREE.Color(0x111111),
			backgroundOpacity: 0.9,
			// fontFamily: '/assets/Roboto-msdf.json',
			// fontTexture: '/assets/Roboto-msdf.png',
			justifyContent: 'start',
			alignItems: 'start',
			flexDirection: 'column'
		});
		
		// Title block
		this.titleBlock = new ThreeMeshUI.Block({
			width: 0.36,
			height: 0.04,
			backgroundColor: new THREE.Color(0x00ff88),
			backgroundOpacity: 0.2,
			marginBottom: 0.01
		});
		
		this.titleText = new ThreeMeshUI.Text({
			content: 'Node Details',
			fontSize: 0.022,
			fontColor: new THREE.Color(0x00ff88)
		});
		
		// Content text
		this.contentText = new ThreeMeshUI.Text({
			content: '',
			fontSize: 0.018,
			fontColor: new THREE.Color(0xffffff),
			textAlign: 'left'
		});
		
		this.titleBlock.add(this.titleText);
		this.detailPanel.add(this.titleBlock, this.contentText);
		this.detailPanel.visible = false;
	}
	
	showHover(node, worldPosition) {
		if (!node || !node.userData) return;
		
		this.currentNode = node;
		const data = node.userData.data || {};
		const label = node.userData.label || 'Node';
		
		// Update content
		this.hoverText.set({
			content: label
		});
		
		// Position above node
		this.hoverPanel.position.copy(worldPosition);
		this.hoverPanel.position.y += 0.15;
		
		// Face camera
		if (this.camera) {
			this.hoverPanel.lookAt(this.camera.position);
		}
		
		this.hoverPanel.visible = true;
	}
	
	hideHover() {
		this.hoverPanel.visible = false;
	}
	
	showDetail(node, camera) {
		if (!node || !node.userData) return;
		
		this.camera = camera;
		const data = node.userData.data || {};
		const label = node.userData.label || 'Node';
		
		// Update title
		this.titleText.set({
			content: label
		});
		
		// Format node data
		let content = '';
		Object.entries(data).forEach(([key, value]) => {
			content += `${key}: ${value}\n`;
		});
		
		if (!content) {
			content = 'No additional data';
		}
		
		this.contentText.set({
			content: content
		});
		
		// Position in front of camera
		const cameraPos = new THREE.Vector3();
		const cameraDir = new THREE.Vector3();
		camera.getWorldPosition(cameraPos);
		camera.getWorldDirection(cameraDir);
		
		// Place 1 meter in front of camera
		this.detailPanel.position.copy(cameraPos);
		this.detailPanel.position.addScaledVector(cameraDir, 1);
		
		// Face camera
		this.detailPanel.lookAt(cameraPos);
		
		this.detailPanel.visible = true;
	}
	
	hideDetail() {
		this.detailPanel.visible = false;
	}
	
	isDetailVisible() {
		return this.detailPanel.visible;
	}
	
	update() {
		ThreeMeshUI.update();
	}
	
	getHoverPanel() {
		return this.hoverPanel;
	}
	
	getDetailPanel() {
		return this.detailPanel;
	}
}