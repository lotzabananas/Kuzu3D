/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
// import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'; // Disabled for passthrough
import { HandTracking } from './hand-tracking.js';
import { XRButton } from './XRButton.js';
import { setupQuestPassthrough } from './simple-passthrough.js';

export async function init(setupScene = () => {}, onFrame = () => {}) {
	// Import remote logger for debugging
	const { remoteLogger } = await import('./utils/RemoteLogger.js');
	remoteLogger.info('🏁 init() function started');
	
	const container = document.createElement('div');
	document.body.appendChild(container);

	const scene = new THREE.Scene();
	// Set background to null for passthrough (AR mode)
	scene.background = null; 

	const camera = new THREE.PerspectiveCamera(
		50, // Field of View
		window.innerWidth / window.innerHeight, // Aspect Ratio
		0.1, // Near clipping plane
		100, // Far clipping plane (adjust as needed for Kùzu graph scale)
	);
	// Default camera position, user will move in VR
	camera.position.set(0, 1.6, 0.5); // Slightly in front of origin, at typical eye height

	const renderer = new THREE.WebGLRenderer({ 
		antialias: true,
		alpha: true // Enable alpha for passthrough
	});
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0x000000, 0); // Clear to transparent
	renderer.xr.enabled = true;
	container.appendChild(renderer.domElement);

	// Basic environment lighting (disabled for passthrough)
	// const environment = new RoomEnvironment(renderer);
	// const pmremGenerator = new THREE.PMREMGenerator(renderer);
	// scene.environment = pmremGenerator.fromScene(environment).texture;
	// pmremGenerator.dispose();
	// environment.dispose();


	// Player group to move camera and controllers together
	const player = new THREE.Group();
	scene.add(player);
	player.add(camera); // Attach camera to player group

	// Basic controller setup
	const controllerModelFactory = new XRControllerModelFactory();
	const controllers = {
		left: null,
		right: null,
	};

	// Setup for controller 0 (typically left)
	const controllerGrip0 = renderer.xr.getControllerGrip(0);
	controllerGrip0.add(controllerModelFactory.createControllerModel(controllerGrip0));
	player.add(controllerGrip0);
	renderer.xr.getController(0).addEventListener('connected', (event) => {
		controllers.left = { grip: controllerGrip0, gamepad: event.data.gamepad }; 
		// We can add more specific controller setup here if needed later
	});
	renderer.xr.getController(0).addEventListener('disconnected', () => {
		controllers.left = null;
	});

	// Setup for controller 1 (typically right)
	const controllerGrip1 = renderer.xr.getControllerGrip(1);
	controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
	player.add(controllerGrip1);
	renderer.xr.getController(1).addEventListener('connected', (event) => {
		controllers.right = { grip: controllerGrip1, gamepad: event.data.gamepad };
		// We can add more specific controller setup here if needed later
	});
	renderer.xr.getController(1).addEventListener('disconnected', () => {
		controllers.right = null;
	});
	
	// Initialize hand tracking
	const handTracking = new HandTracking(renderer, player);
	
	// Set up Quest passthrough
	setupQuestPassthrough(renderer, scene);
	
	// Configure XR reference space
	renderer.xr.setReferenceSpaceType('local-floor');

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	window.addEventListener('resize', onWindowResize);

	const globals = {
		scene,
		camera,
		renderer,
		player,
		controllers,
		handTracking,
	};

	// Call the user-provided setup function
	setupScene(globals);

	const clock = new THREE.Clock();
	function animate() {
		const delta = clock.getDelta();
		const time = clock.getElapsedTime();
		
		// Call user-provided frame update function
		onFrame(delta, time, globals);

		// Render the scene
		renderer.render(scene, camera);
	}

	// Start the animation loop
	renderer.setAnimationLoop(animate);

	// Add separate VR and AR buttons
	remoteLogger.info('🔘 Creating XR buttons...');
	const sessionInit = {
		domOverlay: { root: document.body }
	};
	
	// Create VR button
	const vrButton = XRButton.createButton(renderer, sessionInit, 'immersive-vr');
	vrButton.style.left = 'calc(50% - 110px)';
	document.body.appendChild(vrButton);
	remoteLogger.info('🥽 VR button created with text: ' + vrButton.textContent);
	
	// Create AR button
	const arButton = XRButton.createButton(renderer, sessionInit, 'immersive-ar');
	arButton.style.left = 'calc(50% + 10px)';
	document.body.appendChild(arButton);
	remoteLogger.info('📱 AR button created with text: ' + arButton.textContent);
}
