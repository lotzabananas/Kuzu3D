import * as THREE from 'three';
import { init } from './init.js';
import { DataService } from './services/DataService.js';
import { NodeManager } from './managers/NodeManager.js';
import { SceneManager } from './managers/SceneManager.js';
import { UIManagerBasic } from './managers/UIManagerBasic.js';
import { logger } from './utils/Logger.js';
import { UI_CONFIG } from './constants/index.js';

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
		
		// Set up UI
		this.setupUI();
		
		// Set up XR session handling
		renderer.xr.addEventListener('sessionstart', () => {
			const session = renderer.xr.getSession();
			this.sceneManager.onXRSessionStart(session);
			logger.info('XR session started');
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
	}
	
	setupUI() {
		const loadButton = document.getElementById('load-db');
		const dbPathInput = document.getElementById('db-path');
		const statusDiv = document.getElementById('status');
		const uiContainer = document.getElementById('ui-container');
		const passthroughToggle = document.getElementById('passthrough-toggle');
		
		// Database loading
		loadButton.addEventListener('click', async () => {
			await this.loadDatabase(dbPathInput.value, statusDiv, uiContainer);
		});
		
		// Passthrough toggle
		passthroughToggle.addEventListener('change', (e) => {
			if (this.sceneManager) {
				this.sceneManager.setPassthrough(e.target.checked);
			}
		});
		
		// Start with passthrough enabled
		this.sceneManager?.setPassthrough(true);
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
			
			// Update status
			statusDiv.textContent = UI_CONFIG.statusMessages.success(
				nodesResult.nodes.length,
				nodesResult.tableName
			);
			
			// Update UI Manager status
			if (this.uiManager) {
				this.uiManager.updateDatabaseStatus(true, nodes.length);
			}
			
			// Hide UI after delay
			setTimeout(() => {
				uiContainer.style.display = 'none';
			}, UI_CONFIG.hideDelay);
			
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