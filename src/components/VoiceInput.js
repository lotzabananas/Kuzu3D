import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';
import { UI_CONFIG } from '../constants/index.js';
import { logger } from '../utils/Logger.js';
import { remoteLogger } from '../utils/RemoteLogger.js';

export class VoiceInput {
	constructor() {
		this.isRecording = false;
		this.audioContext = null;
		this.mediaRecorder = null;
		this.audioChunks = [];
		
		// Visual elements
		this.container = new THREE.Group();
		this.indicator = this.createIndicator();
		// Removed transcript display as requested
		
		// Add to container
		this.container.add(this.indicator);
		
		// Hide by default
		this.container.visible = false;
		
		// Settings
		this.MAX_RECORDING_TIME = 60000; // 60 seconds (effectively no auto-stop)
		this.recordingTimeout = null;
	}
	
	createIndicator() {
		// Create a pulsing sphere
		const geometry = new THREE.SphereGeometry(0.05, 32, 16);
		const material = new THREE.MeshBasicMaterial({
			color: 0xff0000,
			transparent: true,
			opacity: 0.8
		});
		
		const sphere = new THREE.Mesh(geometry, material);
		sphere.position.set(0, 0.05, -0.05); // In palm of hand
		
		// Add "Listening..." text
		const listeningText = new ThreeMeshUI.Block({
			width: 0.3,
			height: 0.08,
			padding: 0.02,
			fontSize: 0.03,
			fontFamily: UI_CONFIG.fontUrl,
			fontColor: new THREE.Color(1, 1, 1),
			backgroundColor: new THREE.Color(0, 0, 0),
			backgroundOpacity: 0.7,
			borderRadius: 0.02
		});
		
		listeningText.add(
			new ThreeMeshUI.Text({
				content: 'Listening...',
				fontSize: 0.03
			})
		);
		
		listeningText.position.set(0, 0.05, 0);
		sphere.add(listeningText);
		
		this.sphereMesh = sphere;
		this.statusText = listeningText.children[0];
		
		return sphere;
	}
	
	// Transcript display method removed - no longer needed
	
	async startRecording() {
		if (this.isRecording) return;
		
		try {
			// Get microphone access
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			
			// Create audio context for visualization (optional)
			this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
			
			// Create media recorder
			this.mediaRecorder = new MediaRecorder(stream, {
				mimeType: 'audio/webm;codecs=opus'
			});
			
			this.audioChunks = [];
			
			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.audioChunks.push(event.data);
					logger.info(`Audio chunk received: ${event.data.size} bytes`);
				}
			};
			
			this.mediaRecorder.onstop = () => {
				remoteLogger.info('🛑 MediaRecorder.onstop triggered', { totalChunks: this.audioChunks.length });
				logger.info(`Recording stopped. Total chunks: ${this.audioChunks.length}`);
				
				// Add a small delay to ensure all chunks are collected
				setTimeout(() => {
					remoteLogger.info('⏰ Starting processRecording after delay...');
					this.processRecording();
				}, 100);
			};
			
			// Start recording with timeslice to ensure we get data
			this.mediaRecorder.start(100); // Get data every 100ms
			this.isRecording = true;
			
			// Update visuals
			this.show();
			this.setStatus('Listening...', 0xff0000);
			
			// Auto-stop after max time
			this.recordingTimeout = setTimeout(() => {
				this.stopRecording();
			}, this.MAX_RECORDING_TIME);
			
			logger.info('Voice recording started');
			
		} catch (error) {
			logger.error('Failed to start recording:', error);
			this.setStatus('Mic access denied', 0xff0000);
			setTimeout(() => this.hide(), 2000);
		}
	}
	
	stopRecording() {
		remoteLogger.info('🛑 stopRecording() called', { isRecording: this.isRecording });
		
		if (!this.isRecording) {
			remoteLogger.warn('❌ Not recording, early return');
			return;
		}
		
		this.isRecording = false;
		remoteLogger.info('✅ Set isRecording to false');
		
		if (this.recordingTimeout) {
			clearTimeout(this.recordingTimeout);
			this.recordingTimeout = null;
			remoteLogger.info('✅ Cleared recording timeout');
		}
		
		if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
			remoteLogger.info('🛑 Stopping MediaRecorder', { state: this.mediaRecorder.state });
			this.mediaRecorder.stop();
			
			// Stop all tracks
			const tracks = this.mediaRecorder.stream.getTracks();
			remoteLogger.info(`🔇 Stopping ${tracks.length} audio tracks`);
			tracks.forEach(track => track.stop());
		}
		
		this.setStatus('Processing...', 0xffff00);
		remoteLogger.info('✅ Set status to Processing...');
		logger.info('Voice recording stopped');
	}
	
	async processRecording() {
		remoteLogger.info('🎤 === FRONTEND: Starting processRecording ===');
		logger.info('Processing recording...');
		
		// Debug: Log audio chunks info
		const chunkSizes = this.audioChunks.map(chunk => chunk.size);
		remoteLogger.info('Audio chunks collected', { 
			count: this.audioChunks.length, 
			sizes: chunkSizes 
		});
		
		// Create blob from chunks
		const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
		remoteLogger.info('Created audio blob', {
			size: audioBlob.size,
			type: audioBlob.type
		});
		logger.info(`Created audio blob: ${audioBlob.size} bytes`);
		
		if (audioBlob.size === 0) {
			remoteLogger.error('❌ Audio blob is empty!');
			logger.error('Audio blob is empty!');
			this.setStatus('No audio recorded', 0xff0000);
			return;
		}
		
		// Send to backend
		const formData = new FormData();
		formData.append('audio', audioBlob, 'recording.webm');
		remoteLogger.info('✅ FormData created with audio blob');
		
		try {
			remoteLogger.info('🚀 Attempting to send audio to backend...');
			logger.info('Sending audio to backend...');
			
			// Use the same host as the page is loaded from
			const apiUrl = window.location.protocol + '//' + window.location.hostname + ':3000/api/voice/transcribe';
			remoteLogger.info('🌐 API URL constructed', {
				url: apiUrl,
				location: {
					protocol: window.location.protocol,
					hostname: window.location.hostname,
					port: window.location.port,
					href: window.location.href
				}
			});
			logger.info('API URL:', apiUrl);
			
			remoteLogger.info('📡 Making fetch request...');
			const response = await fetch(apiUrl, {
				method: 'POST',
				body: formData
			});
			
			remoteLogger.info('✅ Fetch response received', {
				status: response.status,
				statusText: response.statusText,
				ok: response.ok
			});
			logger.info(`Response status: ${response.status}`);
			
			const result = await response.json();
			remoteLogger.info('📄 Response JSON', result);
			logger.info('Response:', result);
			
			if (result.success) {
				this.displayTranscript(result.transcript);
				this.setStatus('Success!', 0x00ff00);
				
				// Emit custom event with transcript
				window.dispatchEvent(new CustomEvent('voiceTranscript', {
					detail: { transcript: result.transcript }
				}));
				
			} else {
				this.setStatus('Error: ' + result.error.message, 0xff0000);
				logger.error('Transcription failed:', result.error);
			}
			
		} catch (error) {
			remoteLogger.error('❌ Failed to send audio', { 
				message: error.message, 
				stack: error.stack 
			});
			logger.error('Failed to send audio:', error);
			this.setStatus('Network error', 0xff0000);
		}
		
		// Hide indicator after a longer delay for better feedback
		setTimeout(() => {
			this.sphereMesh.visible = false;
		}, 5000); // Increased from 2 seconds to 5 seconds
	}
	
	displayTranscript(transcript) {
		// Transcript display removed - just log it
		logger.info('Voice transcript:', transcript);
	}
	
	setStatus(text, color) {
		if (this.statusText) {
			this.statusText.content = text;
		}
		if (this.sphereMesh && this.sphereMesh.material) {
			this.sphereMesh.material.color.setHex(color);
		}
	}
	
	show() {
		this.container.visible = true;
	}
	
	hide() {
		this.container.visible = false;
	}
	
	updatePosition(handPosition) {
		if (handPosition && this.container.visible) {
			// Position in the hand
			this.container.position.copy(handPosition);
			// No offset needed - sphere is already positioned relative to container
		}
	}
	
	update(_deltaTime) {
		// Pulse animation when recording
		if (this.isRecording && this.sphereMesh) {
			const scale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
			this.sphereMesh.scale.set(scale, scale, scale);
		}
		
		// Update Three Mesh UI
		ThreeMeshUI.update();
	}
	
	dispose() {
		if (this.isRecording) {
			this.stopRecording();
		}
		
		if (this.audioContext) {
			this.audioContext.close();
		}
	}
}