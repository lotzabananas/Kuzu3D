import * as THREE from 'three';
import { GraphNode } from '../components/GraphNode.js';
// VISUAL_CONFIG is imported but not used
// import { VISUAL_CONFIG } from '../constants/index.js';

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
	
	update(_deltaTime) {
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
		
		// Check if object is a node or part of a node group
		let targetNode = null;
		if (object) {
			// If object is a GraphNode directly
			if (this.nodes.includes(object)) {
				targetNode = object;
			} 
			// If object is a child of a GraphNode (like the sphere mesh)
			else if (object.parent && this.nodes.includes(object.parent)) {
				targetNode = object.parent;
			}
		}
		
		if (targetNode) {
			targetNode.setHovered(true);
			return targetNode;
		}
		
		return null;
	}
	
	handleSelect(object) {
		// Check if object is a node or part of a node group
		let targetNode = null;
		if (object) {
			// If object is a GraphNode directly
			if (this.nodes.includes(object)) {
				targetNode = object;
			} 
			// If object is a child of a GraphNode (like the sphere mesh)
			else if (object.parent && this.nodes.includes(object.parent)) {
				targetNode = object.parent;
			}
		}
		
		if (!targetNode) return null;
		
		// Toggle selection
		if (this.selectedNode === targetNode) {
			// Deselect
			targetNode.setSelected(false);
			this.selectedNode = null;
			console.log('Deselected node:', targetNode.userData);
		} else {
			// Deselect previous
			if (this.selectedNode) {
				this.selectedNode.setSelected(false);
			}
			
			// Select new
			targetNode.setSelected(true);
			this.selectedNode = targetNode;
			console.log('Selected node:', targetNode.userData);
		}
		
		return targetNode;
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