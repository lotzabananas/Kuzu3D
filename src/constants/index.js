// App configuration constants
export const APP_CONFIG = {
	name: 'Kùzu Explore 3D VR',
	version: '1.0.0',
	description: 'Graph database visualization in WebXR'
};

// Server configuration
export const SERVER_CONFIG = {
	apiUrl: '/api',
	port: 3000,
	timeout: 30000
};

// WebXR configuration
export const XR_CONFIG = {
	referenceSpace: 'local-floor',
	sessionInit: {
		domOverlay: { root: document.body }
	}
};

// Visual configuration
export const VISUAL_CONFIG = {
	node: {
		defaultColor: 0x00ff88,
		hoveredColor: 0x00ffff,
		selectedColor: 0xff00ff,
		emissiveDefault: 0x002211,
		emissiveHovered: 0x004444,
		emissiveSelected: 0x440044,
		radius: 0.1,
		segments: 16,
		typeColors: {
			// Social/General types
			Person: 0x4a90e2,      // Blue
			Company: 0x7ed321,     // Green
			Project: 0xf5a623,     // Orange
			Technology: 0xbd10e0,  // Purple
			Location: 0x50e3c2,    // Teal
			Event: 0xf8e71c,       // Yellow
			// Movie database types
			Actor: 0xff6b6b,       // Red
			Movie: 0x4ecdc4,       // Mint
			Director: 0x45b7d1,    // Sky Blue
			Genre: 0xf7b731,       // Gold
			Studio: 0x5f27cd,      // Deep Purple
			// Default fallback color
			default: 0x9013fe      // Violet
		}
	},
	grid: {
		spacing: 0.5,
		offsetY: 1.6,
		offsetZ: -2
	},
	hand: {
		pointerColor: 0x00ff00,
		pointerColorHover: 0xff0000,
		pointerLength: 2,
		pointerOpacity: 0.5,
		pinchThreshold: 0.03 // 3cm
	},
	scene: {
		backgroundColor: 0x444444,
		ambientLightIntensity: 0.6,
		directionalLightIntensity: 0.4
	},
	animation: {
		rotationSpeed: 0.1
	}
};

// UI configuration
export const UI_CONFIG = {
	hideDelay: 3000, // ms to hide UI after loading
	statusMessages: {
		connecting: 'Connecting to database...',
		loading: 'Loading nodes...',
		error: 'Failed to load nodes',
		success: (count, table) => `Loaded ${count} nodes from table "${table}"`
	}
};