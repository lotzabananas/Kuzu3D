import * as THREE from 'three';
import { VISUAL_CONFIG } from '../constants/index.js';
import { GentleDriftManager, DriftModes } from './GentleDriftManager.js';

export class SceneManager {
	constructor(scene, renderer) {
		this.scene = scene;
		this.renderer = renderer;
		this.isPassthroughEnabled = true;
		
		// Gentle drift system (standalone)
		this.gentleDrift = DriftModes.gentle();
		this.onDriftStateChangeCallback = null;
		
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
			console.log('AR mode detected - enabling passthrough');
			this.setPassthrough(true);
		} else {
			console.log('VR mode detected - disabling passthrough');
			// In VR mode, disable passthrough for proper VR background
			this.setPassthrough(false);
		}
	}
	
	// Gentle drift methods (completely standalone)
	setGentleDrift(enabled) {
		if (enabled) {
			this.gentleDrift.enable();
		} else {
			this.gentleDrift.disable();
		}
	}
	
	// Set callback for drift state changes
	onDriftStateChange(callback) {
		this.onDriftStateChangeCallback = callback;
		
		// Set up auto-disable callback
		this.gentleDrift.onAutoDisable(() => {
			if (this.onDriftStateChangeCallback) {
				this.onDriftStateChangeCallback(false);
			}
		});
	}
	
	updateGentleDrift(nodes) {
		// Give the drift system the current nodes
		this.gentleDrift.setNodes(nodes);
		this.gentleDrift.enable();
	}
	
	// Call this every frame (super lightweight)
	updateDrift() {
		this.gentleDrift.update();
	}
	
	// Call this when new query results arrive
	nudgeNodesApart() {
		this.gentleDrift.nudgeNodes();
	}
	
	// Instant spread - snap nodes to final positions immediately
	instantSpreadNodes() {
		this.gentleDrift.instantSpread();
	}
	
	dispose() {
		this.gentleDrift.dispose();
		this.scene.remove(this.ambientLight);
		this.scene.remove(this.directionalLight);
	}
}