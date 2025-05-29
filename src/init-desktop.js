/**
 * Desktop mode initialization for Kuzu Explore 3D
 * Uses OrbitControls for mouse navigation and raycasting for node interaction
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Detect Safari globally for event handlers
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export async function initDesktop(setupScene = () => {}, onFrame = () => {}) {
	console.log('Browser detection - Safari:', isSafari, 'UserAgent:', navigator.userAgent);
	
	// Import remote logger for debugging with Safari fallback
	let remoteLogger = { info: console.log, error: console.error };
	try {
		const module = await import('./utils/RemoteLogger.js');
		remoteLogger = module.remoteLogger;
	} catch (e) {
		console.warn('Dynamic import failed (Safari issue), using console fallback:', e);
	}
	remoteLogger.info(`🖥️ initDesktop() function started (Safari: ${isSafari})`);
	
	const container = document.createElement('div');
	container.style.position = 'fixed';
	container.style.top = '0';
	container.style.left = '0';
	container.style.width = '100%';
	container.style.height = '100%';
	document.body.appendChild(container);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0a0a0a); // Dark background for desktop mode

	const camera = new THREE.PerspectiveCamera(
		60, // Wider FOV for desktop
		window.innerWidth / window.innerHeight,
		0.1,
		1000 // Larger far plane for desktop navigation
	);
	camera.position.set(0, 10, 20); // Start further back to see the graph

	const renderer = new THREE.WebGLRenderer({ 
		antialias: true,
		alpha: false
	});
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	container.appendChild(renderer.domElement);
	
	// Safari fix: Ensure canvas is properly recognized
	renderer.domElement.style.display = 'block';
	renderer.domElement.style.width = '100%';
	renderer.domElement.style.height = '100%';
	
	// Additional Safari fixes
	if (isSafari) {
		renderer.domElement.style.position = 'absolute';
		renderer.domElement.style.top = '0';
		renderer.domElement.style.left = '0';
		renderer.domElement.tabIndex = 1; // Make focusable
		console.log('Applied Safari-specific canvas fixes');
	}

	// Add ambient and directional lighting for desktop mode
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
	directionalLight.position.set(10, 20, 10);
	directionalLight.castShadow = true;
	directionalLight.shadow.camera.near = 1;
	directionalLight.shadow.camera.far = 100;
	directionalLight.shadow.camera.left = -30;
	directionalLight.shadow.camera.right = 30;
	directionalLight.shadow.camera.top = 30;
	directionalLight.shadow.camera.bottom = -30;
	scene.add(directionalLight);

	// Add OrbitControls for mouse navigation
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.minDistance = 5;
	controls.maxDistance = 100;
	controls.target.set(0, 0, 0);
	
	// Safari fix: Ensure controls are properly initialized
	controls.update();
	
	// Make controls globally accessible for debugging
	window.orbitControls = controls;

	// Raycaster for mouse interaction
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();
	let selectedNode = null;
	let isDragging = false;
	let dragPlane = new THREE.Plane();
	let dragPoint = new THREE.Vector3();
	let dragOffset = new THREE.Vector3();

	// Debug flag for Safari issues
	let debugMouse = true;
	
	// Mouse event handlers
	function onMouseMove(event) {
		event.preventDefault();
		
		// Safari debugging
		if (isSafari && debugMouse && Math.random() < 0.05) { // Log 5% for Safari
			console.log('Safari mouse move:', {
				clientX: event.clientX,
				clientY: event.clientY,
				target: event.target.tagName,
				currentTarget: event.currentTarget.tagName
			});
		}
		
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
		
		if (debugMouse && Math.random() < 0.01) { // Log 1% of moves
			console.log('Mouse move:', { x: mouse.x, y: mouse.y, isDragging });
		}

		if (isDragging && selectedNode) {
			// Update drag plane based on camera orientation
			dragPlane.setFromNormalAndCoplanarPoint(
				camera.getWorldDirection(new THREE.Vector3()),
				selectedNode.position
			);
			
			raycaster.setFromCamera(mouse, camera);
			if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
				selectedNode.position.copy(dragPoint).add(dragOffset);
				
				// The node position is already updated, edges will update automatically
				// in the next animation frame through EdgeManager.update()
			}
		}
	}

	function onMouseDown(event) {
		event.preventDefault();
		// Safari compatibility: check both button and which
		if (event.button !== 0 && event.which !== 1) return; // Only left click

		raycaster.setFromCamera(mouse, camera);
		
		// Get all node meshes - look for sphere meshes marked as nodes
		const nodeMeshes = [];
		scene.traverse((child) => {
			if (child.userData && child.userData.isNode && child.isMesh) {
				nodeMeshes.push(child);
			}
		});
		
		const intersects = raycaster.intersectObjects(nodeMeshes);
		
		if (intersects.length > 0) {
			controls.enabled = false; // Disable orbit controls while dragging
			
			// Get the parent GraphNode group
			const mesh = intersects[0].object;
			selectedNode = mesh.parent; // This should be the GraphNode group
			isDragging = true;
			
			// Calculate drag offset
			dragPlane.setFromNormalAndCoplanarPoint(
				camera.getWorldDirection(new THREE.Vector3()),
				selectedNode.position
			);
			
			if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
				dragOffset.copy(selectedNode.position).sub(dragPoint);
			}
			
			// Visual feedback on the mesh
			mesh.material.emissive = new THREE.Color(0x444444);
		}
	}

	function onMouseUp(event) {
		event.preventDefault();
		if (event.button !== 0 && event.which !== 1) return;
		
		controls.enabled = true;
		isDragging = false;
		
		if (selectedNode) {
			// Reset visual feedback on the sphere mesh
			const mesh = selectedNode.children.find(child => child.isMesh);
			if (mesh) {
				mesh.material.emissive = new THREE.Color(0x000000);
			}
			selectedNode = null;
		}
	}

	// Keyboard shortcuts
	function onKeyDown(event) {
		// Prevent default for space bar to avoid page scroll
		if (event.key === ' ') {
			event.preventDefault();
		}
		
		switch(event.key.toLowerCase()) {
			case 'f':
				// Focus/fit all nodes in view
				if (window.kuzuApp && window.kuzuApp.nodeManager) {
					const nodes = window.kuzuApp.nodeManager.getNodes();
					if (nodes.length > 0) {
						const box = new THREE.Box3();
						nodes.forEach(node => {
							if (node.sphere) {
								box.expandByObject(node.sphere);
							}
						});
						
						const center = box.getCenter(new THREE.Vector3());
						const size = box.getSize(new THREE.Vector3());
						const maxDim = Math.max(size.x, size.y, size.z);
						const distance = maxDim * 2;
						
						camera.position.set(center.x, center.y + distance/2, center.z + distance);
						controls.target.copy(center);
						controls.update();
					} else {
						console.log('No nodes loaded yet');
					}
				}
				break;
			case 'r':
				// Reset camera view
				camera.position.set(0, 10, 20);
				controls.target.set(0, 0, 0);
				controls.update();
				console.log('Camera reset');
				break;
			case 'l':
				// Toggle legend (desktop version)
				if (window.toggleDesktopLegend) {
					window.toggleDesktopLegend();
					console.log('Desktop legend toggled');
				}
				break;
			case ' ':
				// Space bar - toggle gentle drift
				if (window.kuzuApp && window.kuzuApp.sceneManager) {
					try {
						window.kuzuApp.sceneManager.toggleDrift();
						console.log('Drift toggled');
					} catch (error) {
						console.error('Error toggling drift:', error);
					}
				}
				break;
			case 's':
				// Instant spread
				if (window.kuzuApp && window.kuzuApp.sceneManager) {
					try {
						window.kuzuApp.sceneManager.instantSpreadNodes();
						console.log('Nodes spread');
					} catch (error) {
						console.error('Error spreading nodes:', error);
					}
				}
				break;
			case 'v':
				// Voice command
				if (window.desktopVoiceInput) {
					window.desktopVoiceInput.toggle();
				}
				break;
		}
	}

	// Add event listeners with Safari compatibility
	renderer.domElement.addEventListener('mousemove', onMouseMove, { passive: false });
	renderer.domElement.addEventListener('mousedown', onMouseDown, { passive: false });
	renderer.domElement.addEventListener('mouseup', onMouseUp, { passive: false });
	window.addEventListener('keydown', onKeyDown, { passive: false });
	
	// Handle WebGL context loss (Safari issue)
	renderer.domElement.addEventListener('webglcontextlost', (event) => {
		event.preventDefault();
		console.error('WebGL context lost - Safari issue');
		remoteLogger.error('WebGL context lost in desktop mode');
	}, false);

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	window.addEventListener('resize', onWindowResize);

	// Mock hand tracking object (not used in desktop mode but expected by app)
	const handTracking = {
		addVisualizerToScene: () => {},
		update: () => {},
		getHandState: () => ({ left: null, right: null }),
		onGestureDetected: () => {},
		getPalmTransform: () => null
	};

	const globals = {
		scene,
		camera,
		renderer,
		player: new THREE.Group(), // Empty player group for compatibility
		controllers: { left: null, right: null },
		handTracking,
		controls, // OrbitControls for desktop
		raycaster,
		mouse,
		isDesktopMode: true
	};
	
	// Make controls globally accessible for Safari debugging
	window.controls = controls;

	// Call the user-provided setup function
	setupScene(globals);

	// Add UI overlay for desktop controls
	createDesktopUI();
	
	// Set up voice input for desktop mode
	setupDesktopVoiceInput(scene);
	
	// Debug: Log initialization
	console.log('Desktop mode initialized:', {
		canvas: !!renderer.domElement,
		canvasParent: renderer.domElement.parentElement,
		controls: !!controls,
		scene: !!scene,
		camera: !!camera
	});

	const clock = new THREE.Clock();
	function animate() {
		const delta = clock.getDelta();
		const time = clock.getElapsedTime();
		
		// Update controls
		controls.update();
		
		// Update voice input if active
		if (window.desktopVoiceInput && window.desktopVoiceInput.update) {
			window.desktopVoiceInput.update(delta);
		}
		
		// Call user-provided frame update function
		onFrame(delta, time, globals);

		// Render the scene
		renderer.render(scene, camera);
		requestAnimationFrame(animate);
	}

	// Start the animation loop
	animate();

	remoteLogger.info('🖥️ Desktop mode initialized successfully');
}

function createDesktopUI() {
	// Create legend container first (above controls)
	const legendContainer = document.createElement('div');
	legendContainer.id = 'desktop-legend';
	legendContainer.style.cssText = `
		position: fixed;
		bottom: 320px;
		left: 20px;
		background: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 15px;
		border-radius: 8px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-size: 14px;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		z-index: 1000;
		display: none;
		max-height: 300px;
		overflow-y: auto;
		min-width: 200px;
	`;
	legendContainer.innerHTML = `
		<div style="margin-bottom: 10px; font-weight: bold; color: #22d3ee;">📊 Node Types</div>
		<div id="legend-content"></div>
	`;
	document.body.appendChild(legendContainer);

	// Create main UI container
	const uiContainer = document.createElement('div');
	uiContainer.style.cssText = `
		position: fixed;
		bottom: 20px;
		left: 20px;
		background: rgba(0, 0, 0, 0.8);
		color: white;
		border-radius: 8px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-size: 14px;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		z-index: 1000;
		transition: all 0.3s ease;
	`;

	uiContainer.innerHTML = `
		<div style="
			padding: 15px;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: space-between;
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		" id="ui-header">
			<div style="font-weight: bold; color: #22d3ee;">🖥️ Desktop Controls</div>
			<div id="collapse-arrow" style="transition: transform 0.3s;">▼</div>
		</div>
		<div id="ui-content" style="padding: 15px;">
			<div style="line-height: 1.6;">
				<div><kbd>Mouse</kbd> - Orbit camera</div>
				<div><kbd>Click + Drag</kbd> - Move nodes</div>
				<div><kbd>Scroll</kbd> - Zoom in/out</div>
				<div><kbd>F</kbd> - Fit all nodes in view</div>
				<div><kbd>R</kbd> - Reset camera</div>
				<div><kbd>L</kbd> - Toggle legend</div>
				<div><kbd>Space</kbd> - Toggle drift</div>
				<div><kbd>S</kbd> - Spread nodes</div>
				<div><kbd>V</kbd> - Voice command</div>
			</div>
			<button id="voice-button" style="
				margin-top: 15px;
				width: 100%;
				padding: 10px;
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				border: none;
				border-radius: 6px;
				color: white;
				font-size: 16px;
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 8px;
			">
				<span>🎤</span>
				<span>Voice Command</span>
			</button>
		</div>
	`;

	document.body.appendChild(uiContainer);
	
	// Set up collapsible functionality
	const header = document.getElementById('ui-header');
	const content = document.getElementById('ui-content');
	const arrow = document.getElementById('collapse-arrow');
	let isCollapsed = false;
	
	header.addEventListener('click', () => {
		isCollapsed = !isCollapsed;
		if (isCollapsed) {
			content.style.display = 'none';
			arrow.style.transform = 'rotate(-90deg)';
			uiContainer.style.borderRadius = '8px';
		} else {
			content.style.display = 'block';
			arrow.style.transform = 'rotate(0deg)';
		}
		
		// Update legend position
		const legendBottom = isCollapsed ? 80 : 320;
		legendContainer.style.bottom = `${legendBottom}px`;
	});
	
	// Set up voice button
	setupVoiceButton();
	
	// Set up desktop legend functionality
	window.desktopLegendVisible = false;
	window.toggleDesktopLegend = function() {
		window.desktopLegendVisible = !window.desktopLegendVisible;
		legendContainer.style.display = window.desktopLegendVisible ? 'block' : 'none';
	};
	
	// Update legend with node data
	window.updateDesktopLegend = function(nodes) {
		const nodeTypes = new Map();
		
		// Get colors using the same system as the 3D nodes
		const getNodeColor = (nodeType) => {
			// Use the same color system as GraphNode.js
			const typeColors = {
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
			};
			
			const colorHex = typeColors[nodeType] || typeColors.default;
			// Convert from hex number to hex string
			return `#${colorHex.toString(16).padStart(6, '0')}`;
		};
		
		// Collect unique node types
		nodes.forEach(node => {
			const nodeType = node.data?.type || node.type || 'Unknown';
			if (!nodeTypes.has(nodeType)) {
				const color = getNodeColor(nodeType);
				nodeTypes.set(nodeType, color);
			}
		});
		
		// Generate legend HTML
		const legendContent = document.getElementById('legend-content');
		let html = '<table style="width: 100%; border-collapse: collapse;">';
		
		nodeTypes.forEach((color, type) => {
			// Convert hex to RGB for better visibility
			const r = parseInt(color.substr(1,2), 16);
			const g = parseInt(color.substr(3,2), 16);
			const b = parseInt(color.substr(5,2), 16);
			
			html += `
				<tr style="line-height: 2;">
					<td style="width: 30px;">
						<div style="
							width: 20px;
							height: 20px;
							background-color: rgb(${r}, ${g}, ${b});
							border-radius: 50%;
							box-shadow: 0 0 10px rgba(${r}, ${g}, ${b}, 0.5);
						"></div>
					</td>
					<td style="padding-left: 10px; color: #fff;">
						${type}
					</td>
				</tr>
			`;
		});
		
		html += '</table>';
		legendContent.innerHTML = html;
	};
}

// Voice input functionality for desktop mode
function setupDesktopVoiceInput(scene) {
	// Import VoiceInput if available
	import('./components/VoiceInput.js').then(({ VoiceInput }) => {
		const voiceInput = new VoiceInput();
		scene.add(voiceInput.container);
		
		// Position it in top-right corner for desktop
		voiceInput.container.position.set(2, 2, -4);
		voiceInput.container.visible = false; // Start hidden
		
		// Create desktop voice controller
		window.desktopVoiceInput = {
			isRecording: false,
			
			toggle() {
				if (this.isRecording) {
					this.stop();
				} else {
					this.start();
				}
			},
			
			start() {
				console.log('Starting voice recording...');
				voiceInput.startRecording();
				voiceInput.container.visible = true;
				this.isRecording = true;
				
				// Update button
				const button = document.getElementById('voice-button');
				if (button) {
					button.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
					button.innerHTML = '<span>🔴</span><span>Recording...</span>';
				}
			},
			
			stop() {
				console.log('Stopping voice recording...');
				voiceInput.stopRecording();
				this.isRecording = false;
				
				// Update button
				const button = document.getElementById('voice-button');
				if (button) {
					button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
					button.innerHTML = '<span>🎤</span><span>Voice Command</span>';
				}
				
				// Hide after a delay
				setTimeout(() => {
					voiceInput.container.visible = false;
				}, 3000);
			}
		};
		
		// Handle voice transcripts
		voiceInput.onTranscriptReceived = async (transcript) => {
			if (window.kuzuApp && window.kuzuApp.processVoiceCommand) {
				await window.kuzuApp.processVoiceCommand(transcript);
			}
		};
		
		// Update voice input position each frame
		window.desktopVoiceInput.update = (delta) => {
			voiceInput.update(delta);
		};
		
		console.log('Desktop voice input initialized');
	}).catch(error => {
		console.error('Failed to load VoiceInput:', error);
	});
}

function setupVoiceButton() {
	const button = document.getElementById('voice-button');
	if (!button) return;
	
	button.addEventListener('click', () => {
		if (window.desktopVoiceInput) {
			window.desktopVoiceInput.toggle();
		} else {
			console.warn('Voice input not initialized yet');
		}
	});
	
	// Add hover effect
	button.addEventListener('mouseenter', () => {
		if (!window.desktopVoiceInput?.isRecording) {
			button.style.transform = 'translateY(-2px)';
			button.style.boxShadow = '0 5px 15px rgba(102, 126, 234, 0.4)';
		}
	});
	
	button.addEventListener('mouseleave', () => {
		button.style.transform = 'translateY(0)';
		button.style.boxShadow = 'none';
	});
}