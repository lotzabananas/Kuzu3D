/**
 * Environment configuration
 * Override these values with environment variables in production
 */

// Check if we're in development or production
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('192.168.');

export const ENV_CONFIG = {
	// Environment
	isDevelopment,
	isProduction: !isDevelopment,
	
	// API Configuration
	api: {
		baseUrl: isDevelopment ? 'http://localhost:3000/api' : '/api',
		timeout: 30000,
		retryAttempts: 3,
		retryDelay: 1000
	},
	
	// Security Configuration
	security: {
		maxQueryLength: 10000,
		maxPathLength: 1000,
		rateLimitRequests: isDevelopment ? 1000 : 100,
		rateLimitWindow: 60000, // 1 minute
		enableCSP: !isDevelopment,
		allowUnsafeEval: isDevelopment // For Three.js development
	},
	
	// Feature Flags
	features: {
		voiceCommands: true,
		nodeEditing: false, // Disabled by default for security
		debugMode: isDevelopment,
		remoteLogging: true,
		analytics: !isDevelopment
	},
	
	// UI Configuration
	ui: {
		hideDelay: 3000,
		maxNodes: 10000,
		defaultLimit: 500,
		autoSave: true
	},
	
	// WebXR Configuration
	webxr: {
		referenceSpace: 'local-floor',
		enablePassthrough: true,
		handTracking: true
	},
	
	// Default Database Paths (for development only)
	development: {
		defaultDbPath: isDevelopment ? './test-kuzu-db' : null,
		sampleDatabases: isDevelopment ? [
			'./test-kuzu-db',
			'./sample-data/social-network',
			'./sample-data/movie-database'
		] : []
	}
};

/**
 * Get environment variable value with fallback
 */
export function getEnvVar(key, fallback = null) {
	// In browser environment, we can't access process.env directly
	// These would need to be injected at build time
	return fallback;
}

/**
 * Validate environment configuration
 */
export function validateConfig() {
	const errors = [];
	
	if (!ENV_CONFIG.api.baseUrl) {
		errors.push('API base URL is not configured');
	}
	
	if (ENV_CONFIG.api.timeout < 1000 || ENV_CONFIG.api.timeout > 300000) {
		errors.push('API timeout must be between 1-300 seconds');
	}
	
	if (ENV_CONFIG.security.maxQueryLength < 100) {
		errors.push('Max query length is too restrictive');
	}
	
	return {
		valid: errors.length === 0,
		errors
	};
}