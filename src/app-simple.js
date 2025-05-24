import * as THREE from 'three';
import { DebugPanel } from './components/DebugPanel.js';
import { UI_CONFIG } from './constants/index.js';
import { init } from './init.js';
import { NodeManager } from './managers/NodeManager.js';
import { SceneManager } from './managers/SceneManager.js';
import { UIManagerBasic } from './managers/UIManagerBasic.js';
import { DataService } from './services/DataService.js';
import { debugManager } from './utils/DebugManager.js';
import { logger } from './utils/Logger.js';

class KuzuVRApp {
	constructor() {
		this.dataService = new DataService();
		this.nodeManager = null;
		this.sceneManager = null;
		this.uiManager = null;
		this.handTracking = null;
		
		logger.info('Initializing Kùzu VR App (Simple)');
	}
	
	async setupScene({ scene, camera, renderer, handTracking }) {
		logger.info('Setting up scene');
		
		// Initialize managers
		this.sceneManager = new SceneManager(scene, renderer);
		this.nodeManager = new NodeManager(scene);
		this.handTracking = handTracking;
		
		// Initialize basic UI Manager
		this.uiManager = new UIManagerBasic(scene, camera, renderer, handTracking);
		
		// Add gesture visualizer to scene
		this.handTracking.addVisualizerToScene(scene);
		
		// Add debug panel
		this.debugPanel = new DebugPanel();
		this.debugPanel.addToScene(scene);
		
		// Setup gesture callbacks
		this.setupGestureControls();
		
		// Set up UI
		this.setupUI();
		
		// Set up XR session handling
		renderer.xr.addEventListener('sessionstart', () => {
			const session = renderer.xr.getSession();
			this.sceneManager.onXRSessionStart(session);
			
			// Hide UI when entering XR
			const uiContainer = document.getElementById('ui-container');
			if (uiContainer) {
				uiContainer.classList.add('hidden');
			}
			
			logger.info('XR session started');
		});
		
		renderer.xr.addEventListener('sessionend', () => {
			// Show UI when exiting XR
			const uiContainer = document.getElementById('ui-container');
			if (uiContainer) {
				uiContainer.classList.remove('hidden');
			}
			
			logger.info('XR session ended');
		});
	}
	
	onFrame(delta, _time, { scene, handTracking }) {
		// Update node animations
		if (this.nodeManager) {
			this.nodeManager.update(delta);
		}
		
		// Update UI Manager
		if (this.uiManager) {
			this.uiManager.update(delta, this.nodeManager);
		}
		
		// Update debug panel
		if (this.debugPanel && debugManager.isDebugMode()) {
			this.debugPanel.update({
				fps: 1 / delta,
				nodeCount: this.nodeManager ? this.nodeManager.nodes.length : 0,
				leftGesture: this.handTracking.getCurrentGesture('left'),
				rightGesture: this.handTracking.getCurrentGesture('right')
			});
		}
	}
	
	setupUI() {
		const loadButton = document.getElementById('load-db');
		const dbSelect = document.getElementById('db-select');
		const statusDiv = document.getElementById('status');
		const uiContainer = document.getElementById('ui-container');
		
		// Database loading
		loadButton.addEventListener('click', async () => {
			await this.loadDatabase(dbSelect.value, statusDiv, uiContainer);
		});
		
		// Scene manager will handle passthrough based on XR mode
	}
	
	setupGestureControls() {
		// Peace sign (✌️) - Toggle between AR and VR mode
		this.handTracking.onGesture('peace', 'left', () => {
			const isPassthrough = this.sceneManager.isPassthroughEnabled;
			this.sceneManager.setPassthrough(!isPassthrough);
			logger.info(`Toggled passthrough mode: ${!isPassthrough ? 'ON' : 'OFF'}`);
		});
		
		this.handTracking.onGesture('peace', 'right', () => {
			const isPassthrough = this.sceneManager.isPassthroughEnabled;
			this.sceneManager.setPassthrough(!isPassthrough);
			logger.info(`Toggled passthrough mode: ${!isPassthrough ? 'ON' : 'OFF'}`);
		});
		
		// Thumbs up (👍) - Now used for menu on left hand
		// Right thumbs up can still reset graph
		this.handTracking.onGesture('thumbsup', 'right', () => {
			if (this.nodeManager && this.nodeManager.nodeGroup) {
				this.nodeManager.nodeGroup.position.set(0, 0, 0);
				this.nodeManager.nodeGroup.rotation.set(0, 0, 0);
				this.nodeManager.nodeGroup.scale.set(1, 1, 1);
				logger.info('Reset graph position with right thumbs up!');
			}
		});
		
		// Fist (✊) - Grab entire graph (alternative to double pinch)
		this.handTracking.onGesture('fist', 'left', () => {
			logger.info('Left fist detected - could be used for graph grab');
		});
		
		this.handTracking.onGesture('fist', 'right', () => {
			logger.info('Right fist detected - could be used for graph grab');
		});
		
		// Double peace sign - Toggle debug mode
		let doublePeaceTimeout = null;
		this.handTracking.onGesture('peace', 'left', () => {
			const rightGesture = this.handTracking.getCurrentGesture('right');
			if (rightGesture === 'peace') {
				// Both hands showing peace sign
				if (!doublePeaceTimeout) {
					doublePeaceTimeout = setTimeout(() => {
						debugManager.toggleDebugMode();
						logger.info('Debug mode toggled via double peace sign');
						doublePeaceTimeout = null;
					}, 500); // Half second delay to prevent accidental triggers
				}
			}
		});
		
		this.handTracking.onGesture('peace', 'right', () => {
			const leftGesture = this.handTracking.getCurrentGesture('left');
			if (leftGesture === 'peace') {
				// Both hands showing peace sign
				if (!doublePeaceTimeout) {
					doublePeaceTimeout = setTimeout(() => {
						debugManager.toggleDebugMode();
						logger.info('Debug mode toggled via double peace sign');
						doublePeaceTimeout = null;
					}, 500); // Half second delay to prevent accidental triggers
				}
			}
		});
		
		// Thumb menu setup
		let legendToggleCooldown = false;
		if (this.uiManager && this.uiManager.thumbMenu) {
			this.uiManager.thumbMenu.onSelect((option) => {
				logger.info(`Thumb menu option ${option} selected!`);
				
				// Example actions for each option
				switch(option) {
					case 1:
						// Prevent rapid toggling with cooldown
						if (!legendToggleCooldown) {
							const legendVisible = this.uiManager.legend.toggle();
							logger.info(`Legend ${legendVisible ? 'shown' : 'hidden'}`);
							legendToggleCooldown = true;
							setTimeout(() => {
								legendToggleCooldown = false;
							}, 500); // 500ms cooldown
						}
						break;
					case 2:
						logger.info('Option 2: Change visualization mode');
						// TODO: Implement viz mode change
						break;
					case 3:
						logger.info('Option 3: Filter nodes');
						// TODO: Implement node filtering
						break;
					case 4:
						logger.info('Option 4: Settings');
						// TODO: Implement settings menu
						break;
				}
			});
		}
		
		// Log all gesture changes for debugging
		['pinch', 'fist', 'point', 'peace', 'thumbsup', 'thumbpoint', 'open'].forEach(gesture => {
			['left', 'right'].forEach(hand => {
				this.handTracking.onGesture(gesture, hand, (handedness, gestureType) => {
					const info = this.handTracking.gestureDetector.getGestureInfo(gestureType);
					console.log(`${info.emoji} ${handedness} ${info.name}: ${info.description}`);
				});
			});
		});
	}
	
	async loadDatabase(dbPath, statusDiv, uiContainer) {
		if (!dbPath) {
			statusDiv.textContent = 'Please enter a database path';
			return;
		}
		
		try {
			// Connect to database
			statusDiv.textContent = UI_CONFIG.statusMessages.connecting;
			const connectResult = await this.dataService.connect(dbPath);
			
			if (!connectResult.success) {
				throw new Error(connectResult.message);
			}
			
			// Load nodes
			statusDiv.textContent = UI_CONFIG.statusMessages.loading;
			const nodesResult = await this.dataService.getNodes();
			
			if (!nodesResult.success) {
				throw new Error(nodesResult.message);
			}
			
			// Create visualization
			const nodes = nodesResult.nodes.map((node, index) => ({
				id: node.id || index,
				data: node.data,
				label: node.label
			}));
			
			this.nodeManager.createNodes(nodes);
			
			// Update legend with current node types
			if (this.uiManager && this.uiManager.legend) {
				this.uiManager.legend.updateNodeTypes(nodes);
			}
			
			// Update status
			statusDiv.textContent = UI_CONFIG.statusMessages.success(
				nodesResult.nodes.length,
				nodesResult.tableName
			);
			
			// Update UI Manager status
			if (this.uiManager) {
				this.uiManager.updateDatabaseStatus(true, nodes.length);
			}
			
			// Don't auto-hide UI - wait for XR session to start
			// UI will be hidden when entering VR/AR mode
			
			logger.info(`Loaded ${nodes.length} nodes successfully`);
			
		} catch (error) {
			logger.error('Failed to load database:', error);
			statusDiv.textContent = `${UI_CONFIG.statusMessages.error}: ${error.message}`;
		}
	}
	
	async start() {
		try {
			await init(
				(globals) => this.setupScene(globals),
				(delta, time, globals) => this.onFrame(delta, time, globals)
			);
		} catch (error) {
			logger.error('Failed to start application:', error);
		}
	}
}

// Start the application
const app = new KuzuVRApp();
app.start();