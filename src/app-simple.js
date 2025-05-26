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
					case 3: {
						console.log('🔄 REFRESH GRAPH WITH ALL NODES');
						
						// Query for ALL nodes from all tables
						// Try querying all nodes first, handle Project table error gracefully
						fetch('/api/cypher/execute', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ 
								query: 'MATCH (n) RETURN n LIMIT 150',
								parameters: {},
								options: {}
							})
						})
						.then(r => r.json())
						.then(result => {
							console.log('🔄 All nodes query result:', result);
							
							if (result.success && result.data && result.data.nodes) {
								const nodes = result.data.nodes;
								console.log('🔄 Found', nodes.length, 'total nodes');
								
								// Transform nodes
								const transformedNodes = nodes.map((node, index) => ({
									id: node.id || `node_${index}`,
									data: node.properties || {},
									label: node.properties?.name || node.label || `Node ${index}`,
									type: node.type || node.label
								}));
								
								// Update visualization
								this.nodeManager.clearNodes();
								this.nodeManager.createNodes(transformedNodes);
								
								// Update legend
								if (this.uiManager && this.uiManager.legend) {
									this.uiManager.legend.updateNodeTypes(transformedNodes);
								}
								
								// Now query for all relationships
								fetch('/api/edges', {
									method: 'GET'
								})
								.then(r => r.json())
								.then(edgeResult => {
									console.log('🔄 Edge query result:', edgeResult);
									if (edgeResult.success && edgeResult.edges) {
										console.log('🔄 Found', edgeResult.edges.length, 'edges');
										this.edgeManager.createEdges(edgeResult.edges, this.nodeManager);
									}
								});
								
								// Show success
								if (this.voiceInput) {
									this.voiceInput.showTranscriptText(`Loaded ${nodes.length} nodes!`);
								}
							} else if (result.error) {
								// Fallback to individual table queries if MATCH (n) fails
								console.log('🔄 Falling back to individual table queries...');
								this.loadNodesByTable();
							}
						})
						.catch(error => {
							console.error('🔄 ERROR:', error);
							this.loadNodesByTable(); // Fallback
						});
						
						break;
					}
					
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
	
	async executeCypherQuery(query) {
		try {
			console.log('🔍 === CYPHER PIPELINE DEBUG START ===');
			console.log('🔍 Step 1: VR App executeCypherQuery called with:', query);
			console.log('🔍 Step 2: DataService connected:', this.dataService.connected);
			console.log('🔍 Step 2: DataService object:', this.dataService);
			console.log('🔍 Step 2: DataService apiUrl:', this.dataService.apiUrl);
			
			// Check if connected to database
			if (!this.dataService.connected) {
				console.log('❌ DataService says not connected. Attempting to reconnect...');
				
				// Try to reconnect using the current database path
				const dbPathInput = document.getElementById('db-path');
				if (dbPathInput && dbPathInput.value) {
					console.log('🔄 Reconnecting to:', dbPathInput.value);
					const connectResult = await this.dataService.connect(dbPathInput.value);
					console.log('🔄 Reconnect result:', connectResult);
					
					if (!connectResult.success) {
						if (this.voiceInput) {
							this.voiceInput.showTranscriptText(`Connection failed: ${connectResult.message}`);
						}
						return;
					}
				} else {
					if (this.voiceInput) {
						this.voiceInput.showTranscriptText('Not connected to database');
					}
					return;
				}
			}
			
			// Use DataService to execute the query
			console.log('🔍 Step 7: Calling DataService.executeCypherQuery...');
			const result = await this.dataService.executeCypherQuery(query);
			
			console.log('🔍 Step 8: DataService returned result');
			console.log('🔍 Step 8: result.success:', result.success);
			console.log('🔍 Step 8: result.data:', result.data);
			console.log('🔍 Step 8: result.data type:', typeof result.data);
			if (result.data) {
				console.log('🔍 Step 8: result.data.nodes:', result.data.nodes);
				console.log('🔍 Step 8: result.data.nodes length:', result.data.nodes?.length);
			}
			
			if (result.success) {
				console.log('✅ Step 9: Cypher query successful');
				console.log('✅ Step 9: Full result object:', JSON.stringify(result, null, 2));
				
				// Check different possible data structures
				let nodeCount = 0;
				if (result.data?.nodes) {
					nodeCount = result.data.nodes.length;
					console.log('🔍 Step 9: Found nodes array with', nodeCount, 'items');
				} else if (Array.isArray(result.data)) {
					nodeCount = result.data.length;
					console.log('🔍 Step 9: result.data is direct array with', nodeCount, 'items');
				}
				
				logger.info(`Query returned ${nodeCount} results`);
				
				// For now, just log the results
				// TODO: Display results in VR space
				if (nodeCount > 0) {
					const dataToShow = result.data?.nodes || result.data;
					console.log('Query results:', dataToShow.slice(0, 3)); // Show first 3 results
					
					// Show a simple count in VR (reuse voice text display)
					if (this.voiceInput) {
						console.log('🎯 Showing result text in VR...');
						this.voiceInput.showTranscriptText(`Query returned ${nodeCount} results`);
					} else {
						console.log('❌ VoiceInput not available for result display');
					}
				} else {
					console.log('⚠️ No data in result or data is empty');
					if (this.voiceInput) {
						this.voiceInput.showTranscriptText('Query returned no results');
					}
				}
			} else {
				console.error('❌ Cypher query failed:', result);
				console.error('❌ Full error object:', JSON.stringify(result, null, 2));
				logger.error('Cypher query failed:', result.error);
				
				// Show error in VR with proper error message
				const errorMsg = result.error?.message || result.error || 'Unknown error';
				if (this.voiceInput) {
					this.voiceInput.showTranscriptText(`Query failed: ${errorMsg}`);
				}
			}
		} catch (error) {
			console.error('❌ Error executing Cypher query:', error);
			logger.error('Error executing Cypher query:', error);
			
			// Show error in VR
			if (this.voiceInput) {
				this.voiceInput.showTranscriptText(`Error: ${error.message}`);
			}
		}
	}
	
	loadNodesByTable() {
		const queries = [
			'MATCH (p:Person) RETURN p',
			'MATCH (c:Company) RETURN c'
			// Skip Project if it doesn't exist
		];
		
		// Show loading message
		if (this.voiceInput) {
			this.voiceInput.showTranscriptText('Loading all nodes...');
		}
		
		// Execute all queries and combine results
		Promise.all(queries.map(query => 
			fetch('/api/cypher/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query, parameters: {}, options: {} })
			}).then(r => r.json())
		))
		.then(results => {
			console.log('🔄 Query results:', results);
			
			// Combine all nodes from all queries
			let allNodes = [];
			results.forEach(result => {
				if (result.success && result.data && result.data.nodes) {
					allNodes = allNodes.concat(result.data.nodes);
				}
			});
			
			console.log('🔄 Total nodes found:', allNodes.length);
			
			if (allNodes.length > 0) {
				// Transform nodes to match expected format
				const transformedNodes = allNodes.map((node, index) => ({
					id: node.id || `node_${index}`,
					data: node.properties || {},
					label: node.properties?.name || node.label || `Node ${index}`,
					type: node.type || node.label
				}));
				
				console.log('🔄 Updating visualization with', transformedNodes.length, 'nodes');
				
				// Clear existing nodes and create new ones
				this.nodeManager.clearNodes();
				this.nodeManager.createNodes(transformedNodes);
				
				// Update legend
				if (this.uiManager && this.uiManager.legend) {
					this.uiManager.legend.updateNodeTypes(transformedNodes);
				}
				
				// Load edges from server
				fetch('/api/edges', {
					method: 'GET'
				})
				.then(r => r.json())
				.then(edgeResult => {
					console.log('🔄 Edge result:', edgeResult);
					if (edgeResult.success && edgeResult.edges) {
						console.log('🔄 Found', edgeResult.edges.length, 'edges');
						this.edgeManager.createEdges(edgeResult.edges, this.nodeManager);
					}
				});
				
				// Show success message
				if (this.voiceInput) {
					this.voiceInput.showTranscriptText(`Loaded ${allNodes.length} nodes!`);
				}
			} else {
				console.log('🔄 No nodes found');
				if (this.voiceInput) {
					this.voiceInput.showTranscriptText('No nodes found');
				}
			}
		})
		.catch(error => {
			console.error('🔄 ERROR:', error);
			if (this.voiceInput) {
				this.voiceInput.showTranscriptText('Error: ' + error.message);
			}
		});
	}
}

// Start the application
const app = new KuzuVRApp();
app.start();