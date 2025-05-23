import * as THREE from 'three';
import { GraphNode } from '../components/GraphNode.js';
import { VISUAL_CONFIG } from '../constants/index.js';

export class NodeManager {
	constructor(scene) {
		this.scene = scene;
		this.nodeGroup = new THREE.Group();
		this.nodes = [];
		this.selectedNode = null;
		
		this.scene.add(this.nodeGroup);
	}
	
	createNodes(nodeDataArray) {
		// Clear existing nodes
		this.clearNodes();
		
		// Create new nodes
		nodeDataArray.forEach((nodeData, index) => {
			const node = new GraphNode(nodeData, index, nodeDataArray.length);
			this.nodes.push(node);
			this.nodeGroup.add(node);
		});
		
		console.log(`Created ${this.nodes.length} nodes`);
	}
	
	clearNodes() {
		this.nodes.forEach(node => {
			this.nodeGroup.remove(node);
			node.dispose();
		});
		this.nodes = [];
		this.selectedNode = null;
	}
	
	update(deltaTime) {
		// Node updates without rotation - spinning animation removed
		// Individual nodes can still have their own animations if needed
	}
	
	handleHover(object) {
		// Reset all non-selected nodes
		this.nodes.forEach(node => {
			if (node !== this.selectedNode) {
				node.setHovered(false);
			}
		});
		
		// Set hovered state if object is a node
		if (object && this.nodes.includes(object)) {
			object.setHovered(true);
			return object;
		}
		
		return null;
	}
	
	handleSelect(object) {
		if (!object || !this.nodes.includes(object)) return null;
		
		// Toggle selection
		if (this.selectedNode === object) {
			// Deselect
			object.setSelected(false);
			this.selectedNode = null;
			console.log('Deselected node:', object.userData);
		} else {
			// Deselect previous
			if (this.selectedNode) {
				this.selectedNode.setSelected(false);
			}
			
			// Select new
			object.setSelected(true);
			this.selectedNode = object;
			console.log('Selected node:', object.userData);
		}
		
		return object;
	}
	
	getNodes() {
		return this.nodes;
	}
	
	getSelectedNode() {
		return this.selectedNode;
	}
	
	dispose() {
		this.clearNodes();
		this.scene.remove(this.nodeGroup);
	}
}