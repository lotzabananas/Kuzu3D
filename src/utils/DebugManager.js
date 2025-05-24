import { logger } from './Logger.js';

/**
 * Debug/Developer mode manager
 * Controls visibility of debug features throughout the app
 */
class DebugManager {
	constructor() {
		this.debugMode = false;
		this.callbacks = new Set();
		
		// Check for debug mode in URL parameters
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('debug') === 'true') {
			this.enableDebugMode();
		}
		
		// Listen for keyboard shortcut (Ctrl+Shift+D)
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', (e) => {
				if (e.ctrlKey && e.shiftKey && e.key === 'D') {
					this.toggleDebugMode();
				}
			});
		}
	}
	
	enableDebugMode() {
		this.debugMode = true;
		logger.info('Debug mode ENABLED');
		this.notifyCallbacks();
	}
	
	disableDebugMode() {
		this.debugMode = false;
		logger.info('Debug mode DISABLED');
		this.notifyCallbacks();
	}
	
	toggleDebugMode() {
		if (this.debugMode) {
			this.disableDebugMode();
		} else {
			this.enableDebugMode();
		}
	}
	
	isDebugMode() {
		return this.debugMode;
	}
	
	// Register a callback to be notified when debug mode changes
	onDebugModeChange(callback) {
		this.callbacks.add(callback);
		// Return unsubscribe function
		return () => {
			this.callbacks.delete(callback);
		};
	}
	
	notifyCallbacks() {
		this.callbacks.forEach(callback => {
			callback(this.debugMode);
		});
	}
	
	// Convenience method for conditional debug logging
	debugLog(...args) {
		if (this.debugMode) {
			console.log('[DEBUG]', ...args);
		}
	}
}

// Singleton instance
export const debugManager = new DebugManager();