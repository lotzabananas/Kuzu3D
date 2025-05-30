import * as THREE from 'three';
import { GraphNode } from '../components/GraphNode.js';
import { MemoryManager } from '../utils/MemoryManager.js';
import { logger } from '../utils/Logger.js';

export class NodeManager {
	constructor(scene) {
		this.scene = scene;
		this.nodeGroup = new THREE.Group();
		this.nodes = [];
		this.selectedNode = null;
		this.maxNodes = 10000; // Performance limit
		
		this.scene.add(this.nodeGroup);
		MemoryManager.register(this.nodeGroup, 'nodeGroup');
	}
	
	createNodes(nodeDataArray) {
		// Clear existing nodes
		this.clearNodes();
		
		// Check performance limits
		if (nodeDataArray.length > this.maxNodes) {
			logger.warn(`Too many nodes (${nodeDataArray.length}), limiting to ${this.maxNodes} for performance`);
			nodeDataArray = nodeDataArray.slice(0, this.maxNodes);
		}
		
		// Create new nodes with batching for performance
		const batchSize = 100;
		let processed = 0;
		
		const processBatch = () => {
			const endIndex = Math.min(processed + batchSize, nodeDataArray.length);
			
			for (let i = processed; i < endIndex; i++) {
				const nodeData = nodeDataArray[i];
				const node = new GraphNode(nodeData, i, nodeDataArray.length);
				
				// Register for memory management
				MemoryManager.register(node, 'graphNode');
				MemoryManager.optimize(node);
				
				this.nodes.push(node);
				this.nodeGroup.add(node);
			}
			
			processed = endIndex;
			
			// Continue processing in next frame if not done
			if (processed < nodeDataArray.length) {
				requestAnimationFrame(processBatch);
			} else {
				logger.info(`Created ${this.nodes.length} nodes`);
				
				// Check memory after creation
				MemoryManager.checkMemoryPressure();
			}
		};
		
		// Start batch processing
		processBatch();
	}
	
	clearNodes() {
		this.nodes.forEach(node => {
			this.nodeGroup.remove(node);
			// Use memory manager for proper disposal
			MemoryManager.dispose(node);
		});
		this.nodes = [];
		this.selectedNode = null;
		
		// Force memory cleanup after clearing large number of nodes
		if (this.nodes.length > 1000) {
			setTimeout(() => MemoryManager.checkMemoryPressure(), 100);
		}
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