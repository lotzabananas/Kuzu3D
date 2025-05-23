import * as THREE from 'three';

// Simple passthrough setup for Quest 3
export function setupQuestPassthrough(renderer, scene) {
	// For Quest 3, we need to ensure proper alpha blending
	renderer.setClearColor(0x000000, 0);
	renderer.sortObjects = true;
	renderer.xr.enabled = true;
	
	// Remove any backgrounds
	scene.background = null;
	scene.fog = null;
	
	// Ensure we're requesting AR mode
	renderer.xr.addEventListener('sessionstart', function() {
		const session = renderer.xr.getSession();
		
		// Check session mode and environment blend mode
		if (session.mode === 'immersive-ar' || (session.environmentBlendMode && session.environmentBlendMode !== 'opaque')) {
			console.log('AR/Passthrough mode detected:', session.mode, session.environmentBlendMode);
			
			// Ensure transparent rendering for AR
			const gl = renderer.getContext();
			gl.clearColor(0, 0, 0, 0);
			
			// Update render state for AR
			if (session.renderState && session.renderState.baseLayer) {
				// The base layer should already have alpha enabled from WebGLRenderer
				console.log('Base layer alpha:', session.renderState.baseLayer.alpha);
			}
			
			// Enable passthrough
			scene.background = null;
			renderer.setClearColor(0x000000, 0);
		} else {
			console.log('VR mode detected - using opaque background');
			// In VR mode, use solid background
			scene.background = new THREE.Color(0x444444);
			renderer.setClearColor(0x444444, 1);
		}
	});
}

export function togglePassthrough(enabled, renderer, scene) {
	if (enabled) {
		scene.background = null;
		renderer.setClearColor(0x000000, 0);
	} else {
		scene.background = new THREE.Color(0x444444);
		renderer.setClearColor(0x444444, 1);
	}
}