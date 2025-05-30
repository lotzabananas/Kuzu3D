/**
 * Loading state management and user feedback
 */

export class LoadingManager {
	static activeLoaders = new Map();
	static loadingOverlay = null;
	
	/**
	 * Show loading state
	 */
	static show(id, message = 'Loading...', options = {}) {
		const loader = {
			id,
			message,
			startTime: Date.now(),
			timeout: options.timeout || 30000,
			showSpinner: options.showSpinner !== false,
			showProgress: options.showProgress || false,
			progress: 0
		};
		
		this.activeLoaders.set(id, loader);
		this.updateUI();
		
		// Auto-hide after timeout
		if (loader.timeout > 0) {
			setTimeout(() => {
				if (this.activeLoaders.has(id)) {
					this.hide(id);
				}
			}, loader.timeout);
		}
		
		return loader;
	}
	
	/**
	 * Update loading progress
	 */
	static updateProgress(id, progress, message) {
		const loader = this.activeLoaders.get(id);
		if (loader) {
			loader.progress = Math.max(0, Math.min(100, progress));
			if (message) {
				loader.message = message;
			}
			this.updateUI();
		}
	}
	
	/**
	 * Hide loading state
	 */
	static hide(id) {
		if (this.activeLoaders.has(id)) {
			const loader = this.activeLoaders.get(id);
			const duration = Date.now() - loader.startTime;
			
			// Log loading time for performance analysis
			console.debug(`Loading "${id}" completed in ${duration}ms`);
			
			this.activeLoaders.delete(id);
			this.updateUI();
		}
	}
	
	/**
	 * Hide all loading states
	 */
	static hideAll() {
		this.activeLoaders.clear();
		this.updateUI();
	}
	
	/**
	 * Check if anything is loading
	 */
	static isLoading(id = null) {
		if (id) {
			return this.activeLoaders.has(id);
		}
		return this.activeLoaders.size > 0;
	}
	
	/**
	 * Update loading UI
	 */
	static updateUI() {
		if (this.activeLoaders.size === 0) {
			this.hideOverlay();
			return;
		}
		
		// Get the most recent loader
		const loaders = Array.from(this.activeLoaders.values());
		const currentLoader = loaders[loaders.length - 1];
		
		this.showOverlay(currentLoader);
		
		// Update VR/AR mode display
		this.updateVRDisplay(currentLoader);
	}
	
	/**
	 * Show loading overlay for desktop mode
	 */
	static showOverlay(loader) {
		if (!this.loadingOverlay) {
			this.createOverlay();
		}
		
		const messageEl = this.loadingOverlay.querySelector('.loading-message');
		const progressEl = this.loadingOverlay.querySelector('.loading-progress');
		const progressBarEl = this.loadingOverlay.querySelector('.loading-progress-bar');
		
		messageEl.textContent = loader.message;
		
		if (loader.showProgress) {
			progressEl.style.display = 'block';
			progressBarEl.style.width = `${loader.progress}%`;
		} else {
			progressEl.style.display = 'none';
		}
		
		this.loadingOverlay.style.display = 'flex';
	}
	
	/**
	 * Hide loading overlay
	 */
	static hideOverlay() {
		if (this.loadingOverlay) {
			this.loadingOverlay.style.display = 'none';
		}
	}
	
	/**
	 * Create loading overlay element
	 */
	static createOverlay() {
		this.loadingOverlay = document.createElement('div');
		this.loadingOverlay.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.8);
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			z-index: 9999;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			color: white;
		`;
		
		this.loadingOverlay.innerHTML = `
			<div class="loading-spinner" style="
				width: 40px;
				height: 40px;
				border: 4px solid rgba(255, 255, 255, 0.3);
				border-top: 4px solid #667eea;
				border-radius: 50%;
				animation: spin 1s linear infinite;
				margin-bottom: 20px;
			"></div>
			<div class="loading-message" style="
				font-size: 18px;
				font-weight: 500;
				margin-bottom: 20px;
				text-align: center;
				max-width: 400px;
			">Loading...</div>
			<div class="loading-progress" style="
				width: 300px;
				height: 4px;
				background: rgba(255, 255, 255, 0.2);
				border-radius: 2px;
				overflow: hidden;
				display: none;
			">
				<div class="loading-progress-bar" style="
					height: 100%;
					background: linear-gradient(90deg, #667eea, #764ba2);
					width: 0%;
					transition: width 0.3s ease;
				"></div>
			</div>
		`;
		
		// Add spinner animation
		if (!document.getElementById('loading-styles')) {
			const style = document.createElement('style');
			style.id = 'loading-styles';
			style.textContent = `
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			`;
			document.head.appendChild(style);
		}
		
		document.body.appendChild(this.loadingOverlay);
	}
	
	/**
	 * Update loading display in VR/AR mode
	 */
	static updateVRDisplay(loader) {
		// Use voice input to show loading message in VR
		if (window.kuzuApp && window.kuzuApp.voiceInput) {
			window.kuzuApp.voiceInput.showTranscriptText(loader.message);
		}
	}
	
	/**
	 * Wrap async function with loading state
	 */
	static async withLoading(id, asyncFn, options = {}) {
		const loader = this.show(id, options.message || 'Loading...', options);
		
		try {
			const result = await asyncFn((progress, message) => {
				this.updateProgress(id, progress, message);
			});
			
			this.hide(id);
			return result;
		} catch (error) {
			this.hide(id);
			throw error;
		}
	}
	
	/**
	 * Create loading state for specific operations
	 */
	static database = {
		connect: (dbPath) => LoadingManager.show('db-connect', `Connecting to database...`, { timeout: 15000 }),
		loadNodes: (count) => LoadingManager.show('db-nodes', `Loading ${count || ''} nodes...`, { showProgress: true }),
		loadEdges: () => LoadingManager.show('db-edges', 'Loading relationships...', { showProgress: true }),
		query: (query) => LoadingManager.show('db-query', 'Executing query...', { timeout: 30000 })
	};
	
	static scene = {
		setup: () => LoadingManager.show('scene-setup', 'Setting up 3D scene...'),
		nodes: (count) => LoadingManager.show('scene-nodes', `Creating ${count} nodes...`, { showProgress: true }),
		edges: (count) => LoadingManager.show('scene-edges', `Creating ${count} edges...`, { showProgress: true })
	};
	
	static voice = {
		initialize: () => LoadingManager.show('voice-init', 'Initializing voice recognition...'),
		processing: () => LoadingManager.show('voice-process', 'Processing voice command...', { timeout: 10000 })
	};
	
	static webxr = {
		initialize: () => LoadingManager.show('webxr-init', 'Initializing VR/AR...'),
		session: () => LoadingManager.show('webxr-session', 'Starting VR/AR session...')
	};
	
	/**
	 * Get loading statistics
	 */
	static getStats() {
		const stats = {
			activeCount: this.activeLoaders.size,
			activeLoaders: Array.from(this.activeLoaders.keys()),
			longestRunning: null,
			totalDuration: 0
		};
		
		const now = Date.now();
		let longestDuration = 0;
		
		this.activeLoaders.forEach((loader, id) => {
			const duration = now - loader.startTime;
			stats.totalDuration += duration;
			
			if (duration > longestDuration) {
				longestDuration = duration;
				stats.longestRunning = { id, duration };
			}
		});
		
		return stats;
	}
}