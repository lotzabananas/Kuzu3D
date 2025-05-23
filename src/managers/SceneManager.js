import * as THREE from 'three';
import { VISUAL_CONFIG } from '../constants/index.js';

export class SceneManager {
	constructor(scene, renderer) {
		this.scene = scene;
		this.renderer = renderer;
		this.isPassthroughEnabled = true;
		
		this.setupLighting();
		this.setupPassthrough();
	}
	
	setupLighting() {
		// Ambient light for overall illumination
		this.ambientLight = new THREE.AmbientLight(
			0xffffff,
			VISUAL_CONFIG.scene.ambientLightIntensity
		);
		this.scene.add(this.ambientLight);
		
		// Directional light for shadows and depth
		this.directionalLight = new THREE.DirectionalLight(
			0xffffff,
			VISUAL_CONFIG.scene.directionalLightIntensity
		);
		this.directionalLight.position.set(1, 1, 1);
		this.scene.add(this.directionalLight);
	}
	
	setupPassthrough() {
		// Configure for AR/passthrough mode
		this.setPassthrough(this.isPassthroughEnabled);
	}
	
	setPassthrough(enabled) {
		this.isPassthroughEnabled = enabled;
		
		if (enabled) {
			this.scene.background = null;
			this.renderer.setClearColor(0x000000, 0);
		} else {
			this.scene.background = new THREE.Color(VISUAL_CONFIG.scene.backgroundColor);
			this.renderer.setClearColor(VISUAL_CONFIG.scene.backgroundColor, 1);
		}
	}
	
	onXRSessionStart(session) {
		// Check if we're in AR mode
		const isAR = session.mode === 'immersive-ar' || 
		            (session.environmentBlendMode && session.environmentBlendMode !== 'opaque');
		
		if (isAR) {
			console.log('AR mode detected - forcing passthrough');
			this.setPassthrough(true);
		} else {
			console.log('VR mode detected');
			// Respect user's passthrough preference in VR mode
			this.setPassthrough(this.isPassthroughEnabled);
		}
	}
	
	dispose() {
		this.scene.remove(this.ambientLight);
		this.scene.remove(this.directionalLight);
	}
}