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
import { ErrorHandler } from './utils/ErrorHandler.js';

class KuzuVRApp {
	constructor() {
		try {
			// Set up global error handlers first
			ErrorHandler.setupGlobalHandlers();
			
			this.dataService = new DataService();
			this.nodeManager = null;
			this.edgeManager = null;
			this.sceneManager = null;
			this.uiManager = null;
			this.handTracking = null;
			this.voiceInput = null;
			this.databaseData = null; // Store loaded data until scene is ready
			this.isInitialized = false;
			
			logger.info('Initializing Kùzu VR App (Simple)');
			remoteLogger.info('🚀 App constructor started');
			
			// Set up UI immediately (for database loading)
			this.setupDatabaseUI();
			
			this.isInitialized = true;
		} catch (error) {
			ErrorHandler.handle(error, { component: 'KuzuVRApp', method: 'constructor' });
		}
	}
	
	async setupScene({ scene, camera, renderer, handTracking, isDesktopMode }) {
		try {
			logger.info('Setting up scene' + (isDesktopMode ? ' (Desktop Mode)' : ''));
			remoteLogger.info('📦 setupScene called' + (isDesktopMode ? ' for desktop' : ''));
		
		// Make scene globally available for VoiceInput
		window.scene = scene;
		
		// Initialize managers
		this.sceneManager = new SceneManager(scene, renderer);
		this.nodeManager = new NodeManager(scene);
		this.edgeManager = new EdgeManager(scene);
		this.handTracking = handTracking;
		this.isDesktopMode = isDesktopMode;
		
		// Initialize UI Manager only for VR/AR mode
		if (!isDesktopMode) {
			this.uiManager = new UIManagerBasic(scene, camera, renderer, handTracking);
		} else {
			// Create a minimal UI manager for desktop mode
			this.uiManager = {
				update: () => {},
				legend: null,
				thumbMenu: null
			};
			
			// Don't create 3D legend for desktop mode - it will be HTML-based
		}
		
		// Set up drift state callback for menu visual updates
		this.sceneManager.onDriftStateChange((enabled) => {
			if (this.uiManager && this.uiManager.thumbMenu) {
				this.uiManager.thumbMenu.setDriftState(enabled);
			}
		});
		
		// Load stored database data if available
		if (this.databaseData) {
			logger.info('Loading stored database data into scene');
			
			// Pre-generate edge colors from schema
			if (this.databaseData.relationshipTypes && this.edgeManager) {
				this.edgeManager.generateColorsFromSchema(this.databaseData.relationshipTypes);
			}
			
			// Create nodes
			this.nodeManager.createNodes(this.databaseData.nodes);
			
			// Update legend (desktop mode will handle this in HTML)
			if (this.uiManager && this.uiManager.legend && !isDesktopMode) {
				this.uiManager.legend.updateNodeTypes(this.databaseData.nodes);
			} else if (isDesktopMode && window.updateDesktopLegend) {
				window.updateDesktopLegend(this.databaseData.nodes);
			}
			
			// Create edges
			if (this.databaseData.edges && this.databaseData.edges.length > 0) {
				this.edgeManager.createEdges(this.databaseData.edges, this.nodeManager);
				logger.info(`Created ${this.databaseData.edges.length} edges`);
			}
			
			// Clear stored data
			this.databaseData = null;
		}
		
		// Initialize Voice Input (only in VR/AR mode for now)
		if (!isDesktopMode) {
			this.voiceInput = new VoiceInput();
			scene.add(this.voiceInput.container);
			
			// Handle voice transcripts
			this.voiceInput.onTranscriptReceived = async (transcript) => {
				await this.processVoiceCommand(transcript);
			};
			
			// Add gesture visualizer to scene
			this.handTracking.addVisualizerToScene(scene);
			
			// Setup gesture callbacks
			this.setupGestureControls();
		}
		
		// Add debug panel
		this.debugPanel = new DebugPanel();
		this.debugPanel.addToScene(scene);
		
		// Set up UI
		this.setupUI();
		
		// Set up XR session handling (only for VR/AR mode)
		if (!isDesktopMode && renderer.xr) {
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
		} catch (error) {
			ErrorHandler.handle(error, { component: 'KuzuVRApp', method: 'setupScene' });
			throw error; // Re-throw to prevent app from continuing in broken state
		}
	}
	
	onFrame(delta, _time, { scene: _scene, handTracking: _handTracking }) {
		try {
			// Safely update node animations
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
		
		// Update gentle drift (super lightweight)
		if (this.sceneManager) {
			this.sceneManager.updateDrift();
		}
		
		// Update voice input (only in VR/AR mode)
		if (this.voiceInput && !this.isDesktopMode) {
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
				leftGesture: this.isDesktopMode ? 'N/A' : this.handTracking.getCurrentGesture('left'),
				rightGesture: this.isDesktopMode ? 'N/A' : this.handTracking.getCurrentGesture('right')
			});
		}
		} catch (error) {
			// Don't show UI errors in onFrame as they happen frequently
			// Just log them and continue
			logger.error('onFrame error:', error);
		}
	}
	
	setupDatabaseUI() {
		const loadButton = document.getElementById('load-db');
		const dbPath = document.getElementById('db-path');
		const statusDiv = document.getElementById('status');
		const uiContainer = document.getElementById('ui-container');
		const sampleButton = document.getElementById('load-sample');
		
		// Database loading
		loadButton.addEventListener('click', async () => {
			const databasePath = dbPath.value.trim();
			if (!databasePath) {
				statusDiv.textContent = 'Please enter a database path';
				return;
			}
			await this.loadDatabase(databasePath, statusDiv, uiContainer);
		});
		
		// Sample database button
		if (sampleButton) {
			sampleButton.addEventListener('click', async () => {
				dbPath.value = 'sample';
				statusDiv.textContent = 'Loading sample database...';
				statusDiv.style.color = '#22d3ee';
				await this.loadDatabase('sample', statusDiv, uiContainer);
			});
		}
	}
	
	setupUI() {
		
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
						// Toggle gentle drift on/off
						console.log('🌊 TOGGLE GENTLE DRIFT');
						
						if (this.sceneManager && this.sceneManager.gentleDrift) {
							const stats = this.sceneManager.gentleDrift.getStats();
							const currentlyEnabled = stats.isEnabled;
							
							if (currentlyEnabled) {
								// Turn OFF drift
								this.sceneManager.setGentleDrift(false);
								console.log('🌊 Gentle drift DISABLED');
								
								// Update menu visual
								if (this.uiManager && this.uiManager.thumbMenu) {
									this.uiManager.thumbMenu.setDriftState(false);
								}
								
								if (this.voiceInput) {
									this.voiceInput.showTranscriptText('Gentle drift OFF');
								}
							} else {
								// Turn ON drift and give it current nodes
								if (this.nodeManager && this.nodeManager.getNodes().length > 1) {
									this.sceneManager.updateGentleDrift(this.nodeManager.getNodes());
									this.sceneManager.nudgeNodesApart();
									console.log('🌊 Gentle drift ENABLED');
									
									// Update menu visual
									if (this.uiManager && this.uiManager.thumbMenu) {
										this.uiManager.thumbMenu.setDriftState(true);
									}
									
									if (this.voiceInput) {
										this.voiceInput.showTranscriptText('Gentle drift ON - nodes will spread apart');
									}
								} else {
									console.log('🌊 Need 2+ nodes for drift to work');
									
									if (this.voiceInput) {
										this.voiceInput.showTranscriptText('Need 2+ nodes for drift');
									}
								}
							}
						} else {
							console.error('🌊 SceneManager or GentleDrift not available');
							
							if (this.voiceInput) {
								this.voiceInput.showTranscriptText('Drift system unavailable');
							}
						}
						
						break;
					}
					
					case 4: {
						// Instant spread - snap nodes to final positions
						console.log('⚡ INSTANT SPREAD NODES');
						
						if (this.sceneManager && this.nodeManager && this.nodeManager.getNodes().length > 1) {
							// Give the drift system current nodes for instant calculation
							this.sceneManager.updateGentleDrift(this.nodeManager.getNodes());
							
							// Perform instant spread
							this.sceneManager.instantSpreadNodes();
							
							console.log('⚡ Nodes spread instantly');
							
							if (this.voiceInput) {
								this.voiceInput.showTranscriptText('Nodes spread instantly!');
							}
						} else {
							console.log('⚡ Need 2+ nodes for instant spread');
							
							if (this.voiceInput) {
								this.voiceInput.showTranscriptText('Need 2+ nodes to spread');
							}
						}
						
						break;
					}
				}
			});
		}
		
		// Listen for voice transcripts
		window.addEventListener('voiceTranscript', async (event) => {
			const transcript = event.detail.transcript;
			logger.info('Voice transcript received:', transcript);
			
			// Import and use NaturalLanguageService
			const { NaturalLanguageService } = await import('./services/NaturalLanguageService.js');
			
			if (!this.dataService.connected) {
				logger.warn('No database connected for voice query');
				if (this.voiceInput) {
					this.voiceInput.showTranscriptText('Please connect to a database first');
				}
				return;
			}
			
			try {
				// Get schema for better query generation
				const schemaResult = await this.dataService.getSchema();
				const schema = schemaResult.success ? {
					nodeTypes: schemaResult.schema.nodeTypes?.map(nt => nt.name) || [],
					relationshipTypes: schemaResult.schema.relationshipTypes?.map(rt => rt.name) || []
				} : null;
				
				// Use OpenAI API key from voice backend if available
				const nlService = new NaturalLanguageService(null); // API key handled by backend
				
				// Check if this is a layout command vs query command
				if (nlService.isLayoutCommand(transcript)) {
					// Handle layout commands
					await this.handleLayoutCommand(transcript);
					return;
				}
				
				// Convert to Cypher query
				const cypherQuery = await nlService.convertToCypher(transcript, schema);
				logger.info('Generated Cypher query:', cypherQuery);
				
				// Execute the query
				const queryResult = await this.dataService.executeCypherQuery(cypherQuery);
				
				if (queryResult.success) {
					// Update visualization with query results
					await this.updateVisualizationFromQuery(queryResult, transcript);
				} else {
					logger.error('Query execution failed:', queryResult.error);
					if (this.voiceInput) {
						this.voiceInput.showTranscriptText(`Query failed: ${queryResult.error.message}`);
					}
				}
				
			} catch (error) {
				logger.error('Voice query processing failed:', error);
				if (this.voiceInput) {
					this.voiceInput.showTranscriptText(`Error: ${error.message}`);
				}
			}
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
		// Handle sample database case
		if (dbPath === 'sample') {
			try {
				// Load sample database first if not already loaded
				if (!this.dataService.usingSampleData) {
					const loadResult = await this.dataService.loadSampleDatabase();
					if (!loadResult.success) {
						statusDiv.textContent = `❌ ${loadResult.message}`;
						statusDiv.style.color = '#ef4444';
						return;
					}
				}
				
				// Now get the data
				const nodesResult = await this.dataService.getNodes();
				const edgesResult = await this.dataService.getEdges();
					
					if (nodesResult.success) {
						// DEBUG: Log node types being loaded
						const nodeTypeCount = {};
						nodesResult.nodes.forEach(node => {
							nodeTypeCount[node.type] = (nodeTypeCount[node.type] || 0) + 1;
						});
						console.log('🔍 DEBUG: Nodes being loaded:', nodeTypeCount);
						console.log('🔍 DEBUG: Total nodes loaded:', nodesResult.nodes.length);
						
						// Transform nodes to expected format
						const nodes = nodesResult.nodes.map((node, index) => ({
							id: node.id || index,
							data: node.data,
							label: node.label,
							type: node.type
						}));
						
						// Create visualization immediately if managers are available
						if (this.nodeManager && this.edgeManager) {
							// Pre-generate edge colors from schema
							const schemaResult = await this.dataService.getSchema();
							if (schemaResult.success && schemaResult.schema) {
								const { relationshipTypes } = schemaResult.schema;
								if (relationshipTypes && this.edgeManager) {
									this.edgeManager.generateColorsFromSchema(relationshipTypes);
								}
							}
							
							this.nodeManager.createNodes(nodes);
							
							// Update legend
							if (this.uiManager && this.uiManager.legend && !this.isDesktopMode) {
								this.uiManager.legend.updateNodeTypes(nodes);
							} else if (this.isDesktopMode && window.updateDesktopLegend) {
								window.updateDesktopLegend(nodes);
							}
							
							// Create edges
							if (edgesResult.success && edgesResult.edges) {
								console.log('🔍 DEBUG: Total edges to create:', edgesResult.edges.length);
								
								// DEBUG: Count edge types
								const edgeTypeCount = {};
								edgesResult.edges.forEach(edge => {
									edgeTypeCount[edge.type] = (edgeTypeCount[edge.type] || 0) + 1;
								});
								console.log('🔍 DEBUG: Edge types being created:', edgeTypeCount);
								
								this.edgeManager.createEdges(edgesResult.edges, this.nodeManager);
								console.log('🔍 DEBUG: Edges created by EdgeManager:', this.edgeManager.edges.length);
							}
							
							statusDiv.innerHTML = `✅ Sample database loaded!<br><small>${nodes.length} nodes and ${edgesResult.edges?.length || 0} relationships ready to explore</small>`;
							statusDiv.style.color = '#10b981';
						} else {
							// Store data for later if scene isn't ready
							this.databaseData = {
								nodes: nodes,
								edges: edgesResult.success ? edgesResult.edges : [],
								relationshipTypes: []
							};
							statusDiv.innerHTML = `✅ Sample database ready!<br><small>Select a view mode to start exploring</small>`;
							statusDiv.style.color = '#10b981';
						}
					}
				return;
			} catch (error) {
				statusDiv.textContent = `❌ Error loading sample database: ${error.message}`;
				statusDiv.style.color = '#ef4444';
				return;
			}
		}
		
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
			
			// Get schema and pre-generate edge colors
			let schemaResult = null;
			try {
				schemaResult = await this.dataService.getSchema();
				if (schemaResult.success && schemaResult.schema) {
					const { relationshipTypes } = schemaResult.schema;
					if (relationshipTypes && this.edgeManager) {
						this.edgeManager.generateColorsFromSchema(relationshipTypes);
						logger.info('Pre-generated colors for relationship types:', relationshipTypes);
					}
				}
			} catch (schemaError) {
				logger.warn('Could not fetch schema for color generation:', schemaError);
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
			
			// Load edges
			const edgesResult = await this.dataService.getEdges();
			
			// Store data for later if scene isn't ready
			if (!this.nodeManager || !this.edgeManager) {
				logger.info('Scene not ready - storing database data for later');
				this.databaseData = {
					nodes: nodes,
					edges: edgesResult.success ? edgesResult.edges : [],
					relationshipTypes: schemaResult?.schema?.relationshipTypes || []
				};
				statusDiv.textContent = `✅ Database connected. ${nodes.length} nodes loaded. Select a view mode to visualize.`;
				return;
			}
			
			// Otherwise create visualization immediately
			this.nodeManager.createNodes(nodes);
			
			// Update legend with current node types
			if (this.uiManager && this.uiManager.legend && !this.isDesktopMode) {
				this.uiManager.legend.updateNodeTypes(nodes);
			} else if (this.isDesktopMode && window.updateDesktopLegend) {
				window.updateDesktopLegend(nodes);
			}
			
			// Create edges
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
	
	async processVoiceCommand(transcript) {
		logger.info('Processing voice command:', transcript);
		
		try {
			// First, convert natural language to Cypher
			const response = await fetch('/api/cypher/fromText', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: transcript })
			});
			
			if (!response.ok) {
				throw new Error('Failed to convert to Cypher');
			}
			
			const result = await response.json();
			
			// Check if it's a layout command
			if (result.isLayoutCommand) {
				logger.info('Layout command detected:', transcript);
				remoteLogger.info('🎨 Layout command: ' + transcript);
				
				// Handle layout command
				if (this.voiceInput) {
					this.voiceInput.showTranscriptText('Layout: ' + transcript);
				}
				
				// Process the layout command
				await this.processLayoutCommand(transcript);
				return;
			}
			
			// Otherwise it's a Cypher query
			const { cypher } = result;
			logger.info('Converted to Cypher:', cypher);
			
			// Execute the Cypher query
			await this.executeCypherQuery(cypher);
			
		} catch (error) {
			logger.error('Failed to process voice command:', error);
			// Show error message in VR
			if (this.voiceInput) {
				this.voiceInput.showTranscriptText(`Error: ${error.message}`);
			}
		}
	}
	
	async processLayoutCommand(transcript) {
		logger.info('Processing layout command:', transcript);
		remoteLogger.info('🎨 processLayoutCommand: ' + transcript);
		
		try {
			// Get current nodes and edges
			const nodes = this.nodeManager ? this.nodeManager.getNodes() : [];
			const edges = this.edgeManager ? this.edgeManager.getEdges() : [];
			
			if (nodes.length === 0) {
				if (this.voiceInput) {
					this.voiceInput.showTranscriptText('No nodes to arrange');
				}
				return;
			}
			
			// Simple layout implementation for now
			// TODO: Integrate with RelationshipLayoutProcessor
			const lowerTranscript = transcript.toLowerCase();
			
			if (lowerTranscript.includes('group') && 
				(lowerTranscript.includes('employee') || lowerTranscript.includes('people') || lowerTranscript.includes('person')) && 
				(lowerTranscript.includes('compan') || lowerTranscript.includes('organization'))) {
				// Group employees around companies
				await this.arrangeEmployeesAroundCompanies(nodes, edges);
			} else if (lowerTranscript.includes('spread') || lowerTranscript.includes('apart') || 
					   lowerTranscript.includes('space') || lowerTranscript.includes('separate')) {
				// Spread nodes apart
				await this.spreadNodesApart(nodes);
			} else if (lowerTranscript.includes('circle') || lowerTranscript.includes('ring')) {
				// Arrange in circle
				await this.arrangeInCircle(nodes);
			} else if (lowerTranscript.includes('hierarch') || lowerTranscript.includes('tree')) {
				// Arrange hierarchically
				await this.arrangeHierarchically(nodes, edges);
			} else if (lowerTranscript.includes('cluster') && lowerTranscript.includes('type')) {
				// Cluster by type
				await this.clusterByType(nodes);
			} else if (lowerTranscript.includes('force') || lowerTranscript.includes('spring')) {
				// Force-directed layout
				await this.forceDirectedLayout(nodes, edges);
			} else {
				if (this.voiceInput) {
					this.voiceInput.showTranscriptText('Layout not recognized: ' + transcript);
				}
			}
		} catch (error) {
			logger.error('Layout command failed:', error);
			remoteLogger.error('❌ Layout failed: ' + error.message);
			if (this.voiceInput) {
				this.voiceInput.showTranscriptText('Layout error: ' + error.message);
			}
		}
	}
	
	async arrangeEmployeesAroundCompanies(nodes, edges) {
		logger.info('Arranging employees around companies');
		remoteLogger.info('📊 Arranging employees around companies');
		
		// Find company nodes
		const companies = nodes.filter(node => 
			node.userData?.label?.toLowerCase() === 'company' || 
			node.userData?.type?.toLowerCase() === 'company'
		);
		
		// Find person nodes
		const people = nodes.filter(node => 
			node.userData?.label?.toLowerCase() === 'person' || 
			node.userData?.type?.toLowerCase() === 'person'
		);
		
		if (companies.length === 0) {
			if (this.voiceInput) {
				this.voiceInput.showTranscriptText('No companies found');
			}
			return;
		}
		
		// Position companies in a line
		companies.forEach((company, index) => {
			const x = (index - (companies.length - 1) / 2) * 3;
			company.position.set(x, 0, 0);
		});
		
		// Group people by their company (based on WorksAt edges)
		const companyEmployees = new Map();
		companies.forEach(company => companyEmployees.set(company.userData.id, []));
		
		// Find WorksAt relationships
		edges.forEach(edge => {
			if (edge.userData?.type === 'WorksAt' || edge.userData?.type === 'WORKS_AT') {
				const person = nodes.find(n => n.userData.id === edge.userData.src);
				const company = nodes.find(n => n.userData.id === edge.userData.dst);
				
				if (person && company && companyEmployees.has(company.userData.id)) {
					companyEmployees.get(company.userData.id).push(person);
				}
			}
		});
		
		// Position employees around their companies
		companyEmployees.forEach((employees, companyId) => {
			const company = companies.find(c => c.userData.id === companyId);
			if (!company || employees.length === 0) return;
			
			const radius = 1.5;
			employees.forEach((employee, index) => {
				const angle = (index / employees.length) * Math.PI * 2;
				const x = company.position.x + Math.cos(angle) * radius;
				const z = company.position.z + Math.sin(angle) * radius;
				employee.position.set(x, 0, z);
			});
		});
		
		// Position unassigned people to the side
		const unassigned = people.filter(person => 
			!Array.from(companyEmployees.values()).flat().includes(person)
		);
		
		unassigned.forEach((person, index) => {
			const x = companies.length * 2;
			const z = (index - (unassigned.length - 1) / 2) * 0.5;
			person.position.set(x, 0, z);
		});
		
		// Update edges
		this.edgeManager.update();
		
		if (this.voiceInput) {
			this.voiceInput.showTranscriptText('Grouped employees around companies');
		}
	}
	
	async spreadNodesApart(nodes) {
		const spread = 2;
		nodes.forEach((node, index) => {
			const angle = (index / nodes.length) * Math.PI * 2;
			const radius = Math.sqrt(nodes.length) * spread / 2;
			node.position.set(
				Math.cos(angle) * radius,
				0,
				Math.sin(angle) * radius
			);
		});
		
		this.edgeManager.update();
		
		if (this.voiceInput) {
			this.voiceInput.showTranscriptText('Spread nodes apart');
		}
	}
	
	async arrangeInCircle(nodes) {
		const radius = Math.max(2, nodes.length * 0.3);
		nodes.forEach((node, index) => {
			const angle = (index / nodes.length) * Math.PI * 2;
			node.position.set(
				Math.cos(angle) * radius,
				0,
				Math.sin(angle) * radius
			);
		});
		
		this.edgeManager.update();
		
		if (this.voiceInput) {
			this.voiceInput.showTranscriptText('Arranged in circle');
		}
	}
	
	async arrangeHierarchically(nodes, edges) {
		logger.info('Arranging nodes hierarchically');
		remoteLogger.info('🌳 Arranging hierarchically');
		
		// Find root nodes (no incoming edges)
		const hasIncoming = new Set();
		edges.forEach(edge => hasIncoming.add(edge.userData.dst));
		
		const roots = nodes.filter(node => !hasIncoming.has(node.userData.id));
		const levels = new Map();
		
		// BFS to assign levels
		const queue = roots.map(r => ({ node: r, level: 0 }));
		const visited = new Set();
		
		while (queue.length > 0) {
			const { node, level } = queue.shift();
			if (visited.has(node.userData.id)) continue;
			
			visited.add(node.userData.id);
			if (!levels.has(level)) levels.set(level, []);
			levels.get(level).push(node);
			
			// Find children
			edges.forEach(edge => {
				if (edge.userData.src === node.userData.id) {
					const child = nodes.find(n => n.userData.id === edge.userData.dst);
					if (child && !visited.has(child.userData.id)) {
						queue.push({ node: child, level: level + 1 });
					}
				}
			});
		}
		
		// Position nodes by level
		const levelHeight = 2;
		levels.forEach((nodesInLevel, level) => {
			const y = -level * levelHeight;
			nodesInLevel.forEach((node, index) => {
				const x = (index - (nodesInLevel.length - 1) / 2) * 2;
				node.position.set(x, y, 0);
			});
		});
		
		this.edgeManager.update();
		
		if (this.voiceInput) {
			this.voiceInput.showTranscriptText('Arranged hierarchically');
		}
	}
	
	async clusterByType(nodes) {
		logger.info('Clustering nodes by type');
		remoteLogger.info('🔷 Clustering by type');
		
		// Group nodes by type
		const typeGroups = new Map();
		nodes.forEach(node => {
			const type = node.userData.type || node.userData.label || 'unknown';
			if (!typeGroups.has(type)) typeGroups.set(type, []);
			typeGroups.get(type).push(node);
		});
		
		// Position each type group in a cluster
		const clusterRadius = 3;
		let clusterIndex = 0;
		
		typeGroups.forEach((nodesOfType, type) => {
			const clusterAngle = (clusterIndex / typeGroups.size) * Math.PI * 2;
			const clusterX = Math.cos(clusterAngle) * clusterRadius * 2;
			const clusterZ = Math.sin(clusterAngle) * clusterRadius * 2;
			
			// Arrange nodes within cluster
			nodesOfType.forEach((node, index) => {
				const angle = (index / nodesOfType.length) * Math.PI * 2;
				const x = clusterX + Math.cos(angle) * clusterRadius / 2;
				const z = clusterZ + Math.sin(angle) * clusterRadius / 2;
				node.position.set(x, 0, z);
			});
			
			clusterIndex++;
		});
		
		this.edgeManager.update();
		
		if (this.voiceInput) {
			this.voiceInput.showTranscriptText('Clustered by type');
		}
	}
	
	async forceDirectedLayout(nodes, edges) {
		logger.info('Applying force-directed layout');
		remoteLogger.info('⚡ Force-directed layout');
		
		// Simple force-directed layout simulation
		const iterations = 50;
		const repulsion = 5;
		const attraction = 0.1;
		
		for (let iter = 0; iter < iterations; iter++) {
			// Apply repulsion between all nodes
			for (let i = 0; i < nodes.length; i++) {
				for (let j = i + 1; j < nodes.length; j++) {
					const dx = nodes[j].position.x - nodes[i].position.x;
					const dz = nodes[j].position.z - nodes[i].position.z;
					const dist = Math.sqrt(dx * dx + dz * dz) || 0.1;
					
					const force = repulsion / (dist * dist);
					const fx = (dx / dist) * force;
					const fz = (dz / dist) * force;
					
					nodes[i].position.x -= fx;
					nodes[i].position.z -= fz;
					nodes[j].position.x += fx;
					nodes[j].position.z += fz;
				}
			}
			
			// Apply attraction along edges
			edges.forEach(edge => {
				const src = nodes.find(n => n.userData.id === edge.userData.src);
				const dst = nodes.find(n => n.userData.id === edge.userData.dst);
				
				if (src && dst) {
					const dx = dst.position.x - src.position.x;
					const dz = dst.position.z - src.position.z;
					const dist = Math.sqrt(dx * dx + dz * dz);
					
					if (dist > 0) {
						const force = dist * attraction;
						const fx = (dx / dist) * force;
						const fz = (dz / dist) * force;
						
						src.position.x += fx;
						src.position.z += fz;
						dst.position.x -= fx;
						dst.position.z -= fz;
					}
				}
			});
		}
		
		this.edgeManager.update();
		
		if (this.voiceInput) {
			this.voiceInput.showTranscriptText('Applied force-directed layout');
		}
	}
	
	/**
	 * Update the 3D visualization with results from a Cypher query
	 */
	async updateVisualizationFromQuery(queryResult, originalTranscript) {
		logger.info('Updating visualization from query result');
		
		if (!queryResult.nodes || queryResult.nodes.length === 0) {
			logger.warn('No nodes in query result');
			if (this.voiceInput) {
				this.voiceInput.showTranscriptText('No results found');
			}
			return;
		}
		
		try {
			// Clear existing visualization
			if (this.nodeManager) {
				this.nodeManager.clearNodes();
			}
			if (this.edgeManager) {
				this.edgeManager.clearEdges();
			}
			
			// Transform query result nodes to visualization format
			const nodes = queryResult.nodes.map((node, index) => ({
				id: node.id || node.properties?.id || index,
				data: node.properties || {},
				label: node.properties?.name || node.properties?.label || node.label || `Node ${index}`,
				type: node.type || 'Unknown'
			}));
			
			logger.info(`Creating visualization with ${nodes.length} nodes`);
			
			// Create nodes in 3D space
			if (this.nodeManager) {
				this.nodeManager.createNodes(nodes);
			}
			
			// Update legend
			if (this.uiManager && this.uiManager.legend && !this.isDesktopMode) {
				this.uiManager.legend.updateNodeTypes(nodes);
			} else if (this.isDesktopMode && window.updateDesktopLegend) {
				window.updateDesktopLegend(nodes);
			}
			
			// Create edges if available in query result
			if (queryResult.relationships && queryResult.relationships.length > 0 && this.edgeManager) {
				// Transform relationships to edge format
				const edges = queryResult.relationships.map(rel => ({
					from: rel.startNode || rel.src,
					to: rel.endNode || rel.dst,
					type: rel.type,
					properties: rel.properties || {}
				}));
				
				logger.info(`Creating ${edges.length} edges`);
				this.edgeManager.createEdges(edges, this.nodeManager);
			}
			
			// Show success message
			if (this.voiceInput) {
				this.voiceInput.showTranscriptText(`Found ${nodes.length} results for: "${originalTranscript}"`);
			}
			
			logger.info('Query visualization update complete');
			
		} catch (error) {
			logger.error('Failed to update visualization from query:', error);
			if (this.voiceInput) {
				this.voiceInput.showTranscriptText(`Error updating visualization: ${error.message}`);
			}
		}
	}
	
	async start() {
		remoteLogger.info('🎯 App.start() called');
		try {
			await init(
				(globals) => {
					remoteLogger.info('🔧 Init callback: setupScene');
					return this.setupScene(globals);
				},
				(delta, time, globals) => this.onFrame(delta, time, globals)
			);
			remoteLogger.info('✅ Init completed successfully');
		} catch (error) {
			logger.error('Failed to start application:', error);
			remoteLogger.error('❌ App start failed: ' + error.message);
		}
	}
	
	async executeCypherQuery(query) {
		try {
			// Check if connected to database
			if (!this.dataService.connected) {
				// Try to reconnect using the current database path
				const dbPathInput = document.getElementById('db-path');
				if (dbPathInput && dbPathInput.value) {
					const connectResult = await this.dataService.connect(dbPathInput.value);
					
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
			
			const result = await this.dataService.executeCypherQuery(query);
			
			if (result.success) {
				// Check different possible data structures
				let nodeCount = 0;
				if (result.data?.nodes) {
					nodeCount = result.data.nodes.length;
				} else if (Array.isArray(result.data)) {
					nodeCount = result.data.length;
				}
				
				logger.info(`Query returned ${nodeCount} results`);
				
				// Update the visualization with query results
				if (nodeCount > 0) {
					const nodes = result.data?.nodes || result.data;
					
					// Transform nodes to ensure proper structure
					const transformedNodes = nodes.map(node => {
						// Handle different data structures
						if (node.n) {
							// For Cypher query results, node.n contains the actual node
							const nodeData = node.n;
							return {
								id: nodeData._id || `node_${Math.random()}`,
								label: nodeData.name || nodeData._label || 'Node',
								type: nodeData._label,
								properties: nodeData
							};
						}
						// Fallback for other formats
						return {
							id: node._id || node.id || `node_${Math.random()}`,
							label: node.properties?.name || node.name || node._label || node.label || 'Node',
							type: node._label || node.label,
							properties: node.properties || node
						};
					});
					
					// Update visualization
					this.nodeManager.clearNodes();
					this.nodeManager.createNodes(transformedNodes);
					
					// Update legend
					if (this.uiManager && this.uiManager.legend && !this.isDesktopMode) {
						this.uiManager.legend.updateNodeTypes(transformedNodes);
					} else if (this.isDesktopMode && window.updateDesktopLegend) {
						window.updateDesktopLegend(transformedNodes);
					}
					
					// Query for relationships
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
					
					// Show success message
					if (this.voiceInput) {
						console.log('🎯 Showing success in VR...');
						this.voiceInput.showTranscriptText(`Loaded ${nodeCount} nodes!`);
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
				if (this.uiManager && this.uiManager.legend && !this.isDesktopMode) {
					this.uiManager.legend.updateNodeTypes(transformedNodes);
				} else if (this.isDesktopMode && window.updateDesktopLegend) {
					window.updateDesktopLegend(transformedNodes);
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

// Create the application but don't start it yet
window.kuzuApp = new KuzuVRApp();

// Check if desktop mode is already requested (e.g., from URL parameter)
if (window.isDesktopMode) {
	// Import and use desktop initialization
	import('./init-desktop.js').then(({ initDesktop }) => {
		initDesktop(
			(globals) => window.kuzuApp.setupScene(globals),
			(delta, time, globals) => window.kuzuApp.onFrame(delta, time, globals)
		);
	});
} else {
	// Don't auto-start VR mode - wait for user choice
	console.log('Waiting for user to select VR/AR/Desktop mode...');
}

// Listen for desktop mode event from home screen
window.addEventListener('startDesktopMode', () => {
	console.log('Desktop mode requested');
	window.isDesktopMode = true;
	
	// Only initialize if not already started
	if (!window.desktopModeStarted) {
		window.desktopModeStarted = true;
		import('./init-desktop.js').then(({ initDesktop }) => {
			console.log('Initializing desktop mode...');
			initDesktop(
				(globals) => window.kuzuApp.setupScene(globals),
				(delta, time, globals) => window.kuzuApp.onFrame(delta, time, globals)
			);
		}).catch(error => {
			console.error('Failed to initialize desktop mode:', error);
		});
	}
});

// Start VR/AR when XR button is clicked (handled by XRButton.js)