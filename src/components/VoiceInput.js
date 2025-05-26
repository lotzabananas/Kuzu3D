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
		
		// Create text sprite inside sphere (like node labels)
		this.createStatusText('Recording');
		sphere.add(this.statusSprite);
		
		this.sphereMesh = sphere;
		
		return sphere;
	}
	
	createStatusText(text) {
		// Create canvas for text
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		
		canvas.width = 256;
		canvas.height = 64;
		
		// Style the text
		context.font = 'Bold 16px Arial';
		context.fillStyle = 'white';
		context.strokeStyle = 'black';
		context.lineWidth = 2;
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		
		// Clear and draw text
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.strokeText(text, canvas.width / 2, canvas.height / 2);
		context.fillText(text, canvas.width / 2, canvas.height / 2);
		
		// Create or update texture
		if (!this.statusTexture) {
			this.statusTexture = new THREE.CanvasTexture(canvas);
			const material = new THREE.SpriteMaterial({ 
				map: this.statusTexture,
				transparent: true,
				alphaTest: 0.01
			});
			this.statusSprite = new THREE.Sprite(material);
			this.statusSprite.scale.set(0.2, 0.05, 1); // Small text inside sphere
		} else {
			this.statusTexture.image = canvas;
			this.statusTexture.needsUpdate = true;
		}
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
				logger.info(`Recording stopped. Total chunks: ${this.audioChunks.length}`);
				
				// Add a small delay to ensure all chunks are collected
				setTimeout(() => {
					this.processRecording();
				}, 100);
			};
			
			// Start recording with timeslice to ensure we get data
			this.mediaRecorder.start(100); // Get data every 100ms
			this.isRecording = true;
			
			// Update visuals
			this.show();
			this.setStatus('Recording', 0xff0000);
			
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
		if (!this.isRecording) return;
		
		this.isRecording = false;
		
		if (this.recordingTimeout) {
			clearTimeout(this.recordingTimeout);
			this.recordingTimeout = null;
		}
		
		if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
			this.mediaRecorder.stop();
			
			// Stop all tracks
			const tracks = this.mediaRecorder.stream.getTracks();
			tracks.forEach(track => track.stop());
		}
		
		this.setStatus('Processing...', 0xffff00);
		logger.info('Voice recording stopped');
	}
	
	async processRecording() {
		logger.info('Processing recording...');
		
		// Create blob from chunks
		const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
		logger.info(`Created audio blob: ${audioBlob.size} bytes`);
		
		if (audioBlob.size === 0) {
			logger.error('Audio blob is empty!');
			this.setStatus('No audio recorded', 0xff0000);
			return;
		}
		
		// Send to backend
		const formData = new FormData();
		formData.append('audio', audioBlob, 'recording.webm');
		
		try {
			logger.info('Sending audio to backend...');
			
			const response = await fetch('/api/voice/transcribe', {
				method: 'POST',
				body: formData
			});
			
			logger.info(`Response status: ${response.status}`);
			const result = await response.json();
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
			logger.error('Failed to send audio:', error);
			this.setStatus('Network error', 0xff0000);
		}
		
		// Hide indicator after delay
		setTimeout(() => {
			this.hide();
		}, 3000);
	}
	
	displayTranscript(transcript) {
		logger.info('Voice transcript:', transcript);
		
		// Create floating transcript text in front of user
		this.showTranscriptText(transcript);
	}
	
	showTranscriptText(transcript) {
		// Remove any existing transcript
		if (this.transcriptDisplay) {
			if (window.scene && this.transcriptDisplay.parent) {
				window.scene.remove(this.transcriptDisplay);
			}
		}
		
		// Create simple text sprite like node labels
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		
		// Set canvas size
		canvas.width = 1024;
		canvas.height = 256;
		
		// Style the text (much smaller)
		context.font = 'Bold 24px Arial';
		context.fillStyle = 'white';
		context.strokeStyle = 'black';
		context.lineWidth = 2;
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		
		// Add quotes and wrap text if needed
		const displayText = `"${transcript}"`;
		const maxWidth = canvas.width - 40;
		
		// Simple text wrapping
		const words = displayText.split(' ');
		let lines = [];
		let currentLine = '';
		
		for (let word of words) {
			const testLine = currentLine + (currentLine ? ' ' : '') + word;
			const metrics = context.measureText(testLine);
			
			if (metrics.width > maxWidth && currentLine) {
				lines.push(currentLine);
				currentLine = word;
			} else {
				currentLine = testLine;
			}
		}
		if (currentLine) lines.push(currentLine);
		
		// Draw the text lines (smaller line height)
		const lineHeight = 30;
		const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
		
		lines.forEach((line, i) => {
			const y = startY + i * lineHeight;
			context.strokeText(line, canvas.width / 2, y);
			context.fillText(line, canvas.width / 2, y);
		});
		
		// Create texture and sprite
		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		
		const material = new THREE.SpriteMaterial({ 
			map: texture,
			transparent: true,
			alphaTest: 0.01
		});
		
		const sprite = new THREE.Sprite(material);
		
		// Scale the sprite smaller
		const aspect = canvas.width / canvas.height;
		sprite.scale.set(1.0 * aspect, 1.0, 1); // Smaller, readable size
		
		// Position in front of user
		sprite.position.set(0, 1.6, -1.5); // Eye level, 1.5m in front
		
		this.transcriptDisplay = sprite;
		
		// Add to scene
		if (window.scene) {
			window.scene.add(sprite);
			
			// Auto-hide after 8 seconds
			setTimeout(() => {
				if (window.scene && sprite.parent) {
					window.scene.remove(sprite);
				}
			}, 8000);
		}
	}
	
	setStatus(text, color) {
		// Update text inside sphere
		this.createStatusText(text);
		
		// Update sphere color
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