/**
 * Centralized error handling and logging
 */

import { logger } from './Logger.js';

export class ErrorHandler {
	static ERROR_TYPES = {
		NETWORK: 'network',
		VALIDATION: 'validation',
		AUTHENTICATION: 'auth',
		WEBXR: 'webxr',
		THREEJS: 'threejs',
		DATABASE: 'database',
		VOICE: 'voice',
		UNKNOWN: 'unknown'
	};
	
	static SEVERITY = {
		LOW: 'low',
		MEDIUM: 'medium',
		HIGH: 'high',
		CRITICAL: 'critical'
	};
	
	static errorQueue = [];
	static maxQueueSize = 100;
	
	/**
	 * Handle and categorize errors
	 */
	static handle(error, context = {}) {
		const errorInfo = this.categorizeError(error, context);
		
		// Log error based on severity
		switch (errorInfo.severity) {
			case this.SEVERITY.CRITICAL:
				logger.error('CRITICAL ERROR:', errorInfo);
				this.notifyUser(errorInfo, true);
				break;
			case this.SEVERITY.HIGH:
				logger.error('High priority error:', errorInfo);
				this.notifyUser(errorInfo);
				break;
			case this.SEVERITY.MEDIUM:
				logger.warn('Medium priority error:', errorInfo);
				break;
			case this.SEVERITY.LOW:
				logger.info('Low priority error:', errorInfo);
				break;
		}
		
		// Add to error queue for analysis
		this.addToQueue(errorInfo);
		
		return errorInfo;
	}
	
	/**
	 * Categorize error by type and severity
	 */
	static categorizeError(error, context = {}) {
		const errorInfo = {
			message: error.message || 'Unknown error',
			stack: error.stack,
			timestamp: new Date().toISOString(),
			context,
			type: this.ERROR_TYPES.UNKNOWN,
			severity: this.SEVERITY.MEDIUM,
			userMessage: 'An unexpected error occurred',
			recoverable: true
		};
		
		// Categorize by error message/type
		if (error.name === 'TypeError' && error.message.includes('fetch')) {
			errorInfo.type = this.ERROR_TYPES.NETWORK;
			errorInfo.severity = this.SEVERITY.HIGH;
			errorInfo.userMessage = 'Network connection failed. Please check your connection.';
		} else if (error.message.includes('XR') || error.message.includes('WebXR')) {
			errorInfo.type = this.ERROR_TYPES.WEBXR;
			errorInfo.severity = this.SEVERITY.MEDIUM;
			errorInfo.userMessage = 'VR/AR features are not available on this device.';
		} else if (error.message.includes('THREE') || error.message.includes('WebGL')) {
			errorInfo.type = this.ERROR_TYPES.THREEJS;
			errorInfo.severity = this.SEVERITY.HIGH;
			errorInfo.userMessage = 'Graphics rendering error. Try refreshing the page.';
		} else if (error.message.includes('database') || error.message.includes('Kuzu')) {
			errorInfo.type = this.ERROR_TYPES.DATABASE;
			errorInfo.severity = this.SEVERITY.HIGH;
			errorInfo.userMessage = 'Database connection error. Please check your database path.';
		} else if (error.message.includes('microphone') || error.message.includes('voice')) {
			errorInfo.type = this.ERROR_TYPES.VOICE;
			errorInfo.severity = this.SEVERITY.LOW;
			errorInfo.userMessage = 'Voice features are not available. Please enable microphone access.';
		} else if (error.message.includes('validation') || error.message.includes('invalid')) {
			errorInfo.type = this.ERROR_TYPES.VALIDATION;
			errorInfo.severity = this.SEVERITY.MEDIUM;
			errorInfo.userMessage = 'Invalid input. Please check your data and try again.';
		} else if (error.name === 'SecurityError' || error.message.includes('authentication')) {
			errorInfo.type = this.ERROR_TYPES.AUTHENTICATION;
			errorInfo.severity = this.SEVERITY.HIGH;
			errorInfo.userMessage = 'Security error. Please refresh the page and try again.';
			errorInfo.recoverable = false;
		}
		
		// Detect memory issues
		if (error.message.includes('memory') || error.name === 'RangeError') {
			errorInfo.severity = this.SEVERITY.CRITICAL;
			errorInfo.userMessage = 'Memory error. Please reduce the number of nodes or refresh the page.';
		}
		
		return errorInfo;
	}
	
	/**
	 * Add error to queue for analysis
	 */
	static addToQueue(errorInfo) {
		this.errorQueue.push(errorInfo);
		
		// Keep queue size manageable
		if (this.errorQueue.length > this.maxQueueSize) {
			this.errorQueue.shift();
		}
	}
	
	/**
	 * Notify user of error
	 */
	static notifyUser(errorInfo, isBlocking = false) {
		// For VR/AR mode, use voice input to show message
		if (window.kuzuApp && window.kuzuApp.voiceInput) {
			window.kuzuApp.voiceInput.showTranscriptText(errorInfo.userMessage);
		}
		
		// For desktop mode or fallback, show browser notification
		if (isBlocking) {
			alert(`Critical Error: ${errorInfo.userMessage}`);
		} else {
			// Use a non-blocking notification if available
			this.showToast(errorInfo.userMessage, errorInfo.severity);
		}
	}
	
	/**
	 * Show toast notification
	 */
	static showToast(message, severity = this.SEVERITY.MEDIUM) {
		// Create toast element
		const toast = document.createElement('div');
		toast.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: ${severity === this.SEVERITY.CRITICAL ? '#ef4444' : 
			             severity === this.SEVERITY.HIGH ? '#f59e0b' : 
			             severity === this.SEVERITY.MEDIUM ? '#3b82f6' : '#10b981'};
			color: white;
			padding: 12px 16px;
			border-radius: 8px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.3);
			z-index: 10000;
			max-width: 300px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			font-size: 14px;
			animation: slideInRight 0.3s ease-out;
		`;
		
		toast.textContent = message;
		document.body.appendChild(toast);
		
		// Auto-remove after delay
		setTimeout(() => {
			toast.style.animation = 'slideOutRight 0.3s ease-in';
			setTimeout(() => {
				if (toast.parentNode) {
					toast.parentNode.removeChild(toast);
				}
			}, 300);
		}, 5000);
		
		// Add CSS animations if not already present
		if (!document.getElementById('toast-animations')) {
			const style = document.createElement('style');
			style.id = 'toast-animations';
			style.textContent = `
				@keyframes slideInRight {
					from { transform: translateX(100%); opacity: 0; }
					to { transform: translateX(0); opacity: 1; }
				}
				@keyframes slideOutRight {
					from { transform: translateX(0); opacity: 1; }
					to { transform: translateX(100%); opacity: 0; }
				}
			`;
			document.head.appendChild(style);
		}
	}
	
	/**
	 * Get error statistics
	 */
	static getErrorStats() {
		const stats = {
			total: this.errorQueue.length,
			byType: {},
			bySeverity: {},
			recent: this.errorQueue.slice(-10)
		};
		
		this.errorQueue.forEach(error => {
			stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
			stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
		});
		
		return stats;
	}
	
	/**
	 * Set up global error handlers
	 */
	static setupGlobalHandlers() {
		// Unhandled JavaScript errors
		window.addEventListener('error', (event) => {
			this.handle(event.error || new Error(event.message), {
				filename: event.filename,
				lineno: event.lineno,
				colno: event.colno,
				source: 'global'
			});
		});
		
		// Unhandled promise rejections
		window.addEventListener('unhandledrejection', (event) => {
			this.handle(event.reason || new Error('Unhandled promise rejection'), {
				source: 'promise'
			});
		});
		
		// WebGL context loss
		window.addEventListener('webglcontextlost', (event) => {
			event.preventDefault();
			this.handle(new Error('WebGL context lost'), {
				source: 'webgl',
				recoverable: true
			});
		});
	}
	
	/**
	 * Recovery strategies
	 */
	static attemptRecovery(errorInfo) {
		switch (errorInfo.type) {
			case this.ERROR_TYPES.NETWORK:
				// Retry network requests
				return this.retryLastRequest();
			
			case this.ERROR_TYPES.WEBXR:
				// Fall back to desktop mode
				if (window.isDesktopMode !== true) {
					window.location.reload();
				}
				break;
			
			case this.ERROR_TYPES.THREEJS:
				// Try to recreate renderer
				return this.recreateRenderer();
			
			case this.ERROR_TYPES.DATABASE:
				// Disconnect and prompt for reconnection
				if (window.kuzuApp && window.kuzuApp.dataService) {
					window.kuzuApp.dataService.connected = false;
				}
				break;
		}
		
		return false;
	}
	
	/**
	 * Create safe wrapper for async functions
	 */
	static wrapAsync(fn, context = {}) {
		return async (...args) => {
			try {
				return await fn(...args);
			} catch (error) {
				return this.handle(error, { ...context, function: fn.name });
			}
		};
	}
	
	/**
	 * Create safe wrapper for regular functions
	 */
	static wrapSync(fn, context = {}) {
		return (...args) => {
			try {
				return fn(...args);
			} catch (error) {
				return this.handle(error, { ...context, function: fn.name });
			}
		};
	}
}