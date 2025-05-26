// THREE is used implicitly by Three.js components
// eslint-disable-next-line no-unused-vars
import * as THREE from 'three';
import { DataService } from './services/DataService.js';
import { DebugPanel } from './components/DebugPanel.js';
import { EdgeManager } from './managers/EdgeManager.js';
import { NodeManager } from './managers/NodeManager.js';
import { SceneManager } from './managers/SceneManager.js';
import { UIManagerBasic } from './managers/UIManagerBasic.js';
import { UI_CONFIG } from './constants/index.js';
import { VoiceInput } from './components/VoiceInput.js';
import { debugManager } from './utils/DebugManager.js';
import { init } from './init.js';
import { logger } from './utils/Logger.js';
import { remoteLogger } from './utils/RemoteLogger.js';

class KuzuVRApp {
	constructor() {
		this.dataService = new DataService();
		this.nodeManager = null;
		this.edgeManager = null;
		this.sceneManager = null;
		this.uiManager = null;
		this.handTracking = null;
		this.voiceInput = null;
		
		logger.info('Initializing Kùzu VR App (Simple)');
		
		// Test remote logging immediately
		setTimeout(() => {
			remoteLogger.info('🧪 Remote logging test from VR app startup');
		}, 2000);
	}
	
	async setupScene({ scene, camera, renderer, handTracking }) {
		logger.info('Setting up scene');
		
		// Make scene globally available for VoiceInput
		window.scene = scene;
		
		// Initialize managers
		this.sceneManager = new SceneManager(scene, renderer);
		this.nodeManager = new NodeManager(scene);
		this.edgeManager = new EdgeManager(scene);
		this.handTracking = handTracking;
		
		// Initialize basic UI Manager
		this.uiManager = new UIManagerBasic(scene, camera, renderer, handTracking);
		
		// Initialize Voice Input
		this.voiceInput = new VoiceInput();
		scene.add(this.voiceInput.container);
		
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
	
	onFrame(delta, _time, { scene: _scene, handTracking: _handTracking }) {
		// Update node animations
		if (this.nodeManager) {
			this.nodeManager.update(delta);
		}
		
		// Update edge positions
		if (this.edgeManager) {
			this.edgeManager.update();
		}
		
		// Update UI Manager
		if (this.uiManager) {
			this.uiManager.update(delta, this.nodeManager);
		}
		
		// Update voice input
		if (this.voiceInput) {
			this.voiceInput.update(delta);
			
			// Always update position to follow LEFT hand (not right)
			const leftHand = this.handTracking?.hands?.left;
			if (leftHand && leftHand.joints && this.voiceInput.container.visible) {
				// Update voice input position
				const wristJoint = leftHand.joints['wrist'];
				if (wristJoint) {
					const wristPos = new THREE.Vector3();
					wristJoint.getWorldPosition(wristPos);
					this.voiceInput.updatePosition(wristPos);
				}
			}
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
		const dbPath = document.getElementById('db-path');
		const statusDiv = document.getElementById('status');
		const uiContainer = document.getElementById('ui-container');
		
		// Database loading
		loadButton.addEventListener('click', async () => {
			const databasePath = dbPath.value.trim();
			if (!databasePath) {
				statusDiv.textContent = 'Please enter a database path';
				return;
			}
			await this.loadDatabase(databasePath, statusDiv, uiContainer);
		});
		
		// Scene manager will handle passthrough based on XR mode
		
		// Add keyboard shortcuts for testing
		document.addEventListener('keydown', (e) => {
			if (e.key === 't' || e.key === 'T') {
				logger.info('Manual thumb menu toggle (T key pressed)');
				if (this.uiManager && this.uiManager.thumbMenu && this.handTracking) {
					const leftHand = this.handTracking.hands.left;
					if (leftHand) {
						if (this.uiManager.thumbMenuActive) {
							logger.info('Deactivating thumb menu manually');
							this.uiManager.thumbMenu.deactivate();
							this.uiManager.thumbMenuActive = false;
						} else {
							logger.info('Activating thumb menu manually');
							this.uiManager.thumbMenu.activate(leftHand);
							this.uiManager.thumbMenuActive = true;
						}
					} else {
						logger.warn('No left hand detected for thumb menu');
					}
				}
			}
			
			// NEW: Direct voice testing shortcut
			if (e.key === 'v' || e.key === 'V') {
				console.log('🎤 DIRECT VOICE TEST (V key pressed)');
				logger.info('Direct voice test triggered');
				
				if (this.voiceInput) {
					if (this.voiceInput.isRecording) {
						console.log('🛑 Stopping voice recording (direct test)');
						this.voiceInput.stopRecording();
					} else {
						console.log('🎤 Starting voice recording (direct test)');
						this.voiceInput.startRecording();
					}
				} else {
					console.log('❌ VoiceInput not available for direct test');
				}
			}
		});
	}
	
	setupGestureControls() {
		// Removed: Peace sign gesture for AR/VR toggle
		// Removed: Right thumbs up for graph reset
		
		// Removed: Double-tap detection for voice input
		// Voice is now activated through thumb menu option 2
		
		// Fist (✊) - Grab entire graph (alternative to double pinch)
		this.handTracking.onGesture('fist', 'left', () => {
			logger.info('Left fist detected - could be used for graph grab');
		});
		
		this.handTracking.onGesture('fist', 'right', () => {
			logger.info('Right fist detected - could be used for graph grab');
		});
		
		// Removed: Double peace sign for debug mode toggle
		// Now debug mode is only toggled via keyboard (D) or button
		
		// Thumb menu setup
		console.log('🔧 Setting up thumb menu...');
		console.log('UIManager exists:', !!this.uiManager);
		console.log('ThumbMenu exists:', !!(this.uiManager && this.uiManager.thumbMenu));
		
		if (this.uiManager && this.uiManager.thumbMenu) {
			console.log('✅ Thumb menu found, setting up onSelect callback');
			this.uiManager.thumbMenu.onSelect((option) => {
				console.log('🎯 THUMB MENU SELECTION TRIGGERED:', option);
				logger.info(`Thumb menu option ${option} selected!`);
				
				// Example actions for each option
				switch(option) {
					case 1: {
						const legendVisible = this.uiManager.legend.toggle();
						logger.info(`Legend ${legendVisible ? 'shown' : 'hidden'}`);
						break;
					}
					case 2: {
						// Voice input toggle
						console.log('🎤 THUMB MENU OPTION 2 SELECTED!');
						logger.info('🎤 THUMB MENU OPTION 2 SELECTED!');
						
						if (this.voiceInput) {
							console.log('✅ VoiceInput exists, current recording state:', this.voiceInput.isRecording);
							if (this.voiceInput.isRecording) {
								console.log('🛑 Stopping voice recording...');
								logger.info('Stopping voice recording');
								this.voiceInput.stopRecording();
							} else {
								console.log('🎤 Starting voice recording...');
								logger.info('Starting voice recording');
								this.voiceInput.startRecording();
							}
						} else {
							console.log('❌ VoiceInput is null/undefined!');
							logger.error('VoiceInput is null/undefined!');
						}
						break;
					}
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
		
		// Listen for voice transcripts
		window.addEventListener('voiceTranscript', (event) => {
			const transcript = event.detail.transcript;
			logger.info('Voice transcript received:', transcript);
			
			// For now, just log it
			// TODO: Send to GPT for Cypher generation
			// TODO: Execute Cypher query
			// TODO: Update graph visualization
		});
		
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
	
	async loadDatabase(dbPath, statusDiv, _uiContainer) {
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
			
			// Load and create edges
			const edgesResult = await this.dataService.getEdges();
			if (edgesResult.success && edgesResult.edges) {
				this.edgeManager.createEdges(edgesResult.edges, this.nodeManager);
				logger.info(`Loaded ${edgesResult.edges.length} edges`);
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