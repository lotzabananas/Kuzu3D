/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as THREE from 'three';
import { init } from './init.js';
import { KuzuLoader } from './kuzu-loader.js';
import { togglePassthrough } from './simple-passthrough.js';

// Store references to our node meshes
let nodeMeshes = [];
let nodeGroup = null;
const kuzuLoader = new KuzuLoader();

// This function will be called once the basic scene is set up.
function setupScene({ scene, camera: _camera, renderer, player: _player, controllers: _controllers, handTracking: _handTracking }) {
	console.log('Setting up Kùzu 3D VR scene');
	
	// Create a group to hold all nodes
	nodeGroup = new THREE.Group();
	scene.add(nodeGroup);
	
	// Add some ambient light for better visibility
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambientLight);
	
	// Add a directional light
	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
	directionalLight.position.set(1, 1, 1);
	scene.add(directionalLight);
	
	// Set up database loading UI
	setupDatabaseUI(scene);
	
	// Set up passthrough toggle
	setupPassthroughToggle(scene, renderer);
}

// This function is called every frame
function onFrame(delta, _time, { scene, camera: _camera, renderer: _renderer, player: _player, controllers: _controllers, handTracking }) {
	// Slowly rotate the node group for visual interest
	if (nodeGroup && nodeMeshes.length > 0) {
		nodeGroup.rotation.y += delta * 0.1;
	}
	
	// Update hand tracking
	if (handTracking) {
		handTracking.update(
			scene,
			(object) => onNodeHover(object),
			(object) => onNodeSelect(object)
		);
	}
}

function setupDatabaseUI(_scene) {
	const loadButton = document.getElementById('load-db');
	const dbPathInput = document.getElementById('db-path');
	const statusDiv = document.getElementById('status');
	const uiContainer = document.getElementById('ui-container');
	
	// Set default to mock data for easy testing
	dbPathInput.value = 'mock';
	
	loadButton.addEventListener('click', async () => {
		const dbPath = dbPathInput.value;
		if (!dbPath) {
			statusDiv.textContent = 'Please enter a database path';
			return;
		}
		
		statusDiv.textContent = 'Connecting to database...';
		
		const connectResult = await kuzuLoader.connect(dbPath);
		if (!connectResult.success) {
			statusDiv.textContent = connectResult.message;
			return;
		}
		
		statusDiv.textContent = 'Loading nodes...';
		const nodesResult = await kuzuLoader.getNodes();
		
		if (!nodesResult.success) {
			statusDiv.textContent = nodesResult.message;
			return;
		}
		
		statusDiv.textContent = `Loaded ${nodesResult.nodes.length} nodes from table "${nodesResult.tableName}"`;
		
		// Create 3D visualization
		createNodeVisualization(nodesResult.nodes);
		
		// Hide UI after successful load
		setTimeout(() => {
			uiContainer.style.display = 'none';
		}, 3000);
	});
}

function createNodeVisualization(nodes) {
	// Clear existing nodes
	nodeMeshes.forEach(mesh => {
		nodeGroup.remove(mesh);
		mesh.geometry.dispose();
		mesh.material.dispose();
	});
	nodeMeshes = [];
	
	// Create sphere geometry and material (reuse for performance)
	const geometry = new THREE.SphereGeometry(0.1, 16, 16);
	const material = new THREE.MeshPhongMaterial({
		color: 0x00ff88,
		emissive: 0x002211,
		shininess: 100
	});
	
	// Create nodes in a 3D grid pattern
	const gridSize = Math.ceil(Math.cbrt(nodes.length));
	const spacing = 0.5;
	const offset = (gridSize - 1) * spacing / 2;
	
	nodes.forEach((node, index) => {
		const mesh = new THREE.Mesh(geometry.clone(), material.clone());
		
		// Position in 3D grid
		const x = (index % gridSize) * spacing - offset;
		const y = (Math.floor(index / gridSize) % gridSize) * spacing - offset;
		const z = Math.floor(index / (gridSize * gridSize)) * spacing - offset;
		
		mesh.position.set(x, y + 1.6, z - 2); // Offset to be in front of player
		
		// Store node data for later interaction
		mesh.userData = node;
		
		nodeGroup.add(mesh);
		nodeMeshes.push(mesh);
	});
}

function setupPassthroughToggle(scene, renderer) {
	const toggle = document.getElementById('passthrough-toggle');
	toggle.addEventListener('change', (e) => {
		const enabled = e.target.checked;
		// Only toggle if we're in an active session
		if (renderer.xr.isPresenting) {
			const session = renderer.xr.getSession();
			if (session && session.mode === 'immersive-ar') {
				// Can't change passthrough in AR mode - it's always on
				toggle.checked = true;
				alert('Passthrough is always enabled in AR mode');
			} else {
				// In VR mode, we can toggle background
				togglePassthrough(enabled, renderer, scene);
			}
		} else {
			// Not in XR, just update the setting
			togglePassthrough(enabled, renderer, scene);
		}
	});
	
	// Start with passthrough enabled
	togglePassthrough(true, renderer, scene);
}

let selectedNode = null;
const originalColors = new Map();

function onNodeHover(object) {
	// Reset previous hover
	nodeMeshes.forEach(mesh => {
		if (mesh !== selectedNode && originalColors.has(mesh)) {
			mesh.material.color.copy(originalColors.get(mesh));
			mesh.material.emissive.setHex(0x002211);
		}
	});
	
	if (object && object.userData) {
		// Highlight hovered node
		if (!originalColors.has(object)) {
			originalColors.set(object, object.material.color.clone());
		}
		object.material.color.setHex(0x00ffff);
		object.material.emissive.setHex(0x004444);
	}
}

function onNodeSelect(object) {
	if (object && object.userData) {
		// Toggle selection
		if (selectedNode === object) {
			selectedNode = null;
			object.material.color.copy(originalColors.get(object));
			object.material.emissive.setHex(0x002211);
			console.log('Deselected node:', object.userData);
		} else {
			// Deselect previous
			if (selectedNode) {
				selectedNode.material.color.copy(originalColors.get(selectedNode));
				selectedNode.material.emissive.setHex(0x002211);
			}
			
			selectedNode = object;
			object.material.color.setHex(0xff00ff);
			object.material.emissive.setHex(0x440044);
			console.log('Selected node:', object.userData);
			
			// You could display node info in VR here
			// For now, just log to console
		}
	}
}

// Initialize the WebXR environment and start the loop
init(setupScene, onFrame);
