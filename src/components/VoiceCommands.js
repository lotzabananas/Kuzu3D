export class VoiceCommands {
	constructor() {
		this.recognition = null;
		this.isListening = false;
		this.callbacks = new Map();
		
		this.initializeSpeechRecognition();
	}
	
	initializeSpeechRecognition() {
		// Check for browser support
		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		
		if (!SpeechRecognition) {
			console.warn('Speech recognition not supported in this browser');
			return;
		}
		
		this.recognition = new SpeechRecognition();
		this.recognition.continuous = true;
		this.recognition.interimResults = true;
		this.recognition.lang = 'en-US';
		
		// Define commands
		this.commands = [
			{
				patterns: ['show connections', 'show edges', 'show links'],
				action: 'show_connections'
			},
			{
				patterns: ['hide connections', 'hide edges', 'hide links'],
				action: 'hide_connections'
			},
			{
				patterns: ['select all', 'select everything'],
				action: 'select_all'
			},
			{
				patterns: ['clear selection', 'deselect all', 'unselect all'],
				action: 'clear_selection'
			},
			{
				patterns: ['reset view', 'reset position', 'center view'],
				action: 'reset_view'
			},
			{
				patterns: ['search for', 'find node', 'locate'],
				action: 'search',
				extractParam: true
			},
			{
				patterns: ['filter by', 'show only', 'hide all except'],
				action: 'filter',
				extractParam: true
			},
			{
				patterns: ['zoom in', 'closer', 'enlarge'],
				action: 'zoom_in'
			},
			{
				patterns: ['zoom out', 'further', 'smaller'],
				action: 'zoom_out'
			},
			{
				patterns: ['help', 'what can you do', 'commands'],
				action: 'show_help'
			}
		];
		
		// Set up event handlers
		this.setupEventHandlers();
	}
	
	setupEventHandlers() {
		if (!this.recognition) return;
		
		this.recognition.onstart = () => {
			console.log('Voice recognition started');
			this.isListening = true;
		};
		
		this.recognition.onresult = (event) => {
			const last = event.results.length - 1;
			const transcript = event.results[last][0].transcript.toLowerCase().trim();
			const isFinal = event.results[last].isFinal;
			
			if (isFinal) {
				console.log('Voice command:', transcript);
				this.processCommand(transcript);
			}
		};
		
		this.recognition.onerror = (event) => {
			console.error('Voice recognition error:', event.error);
			if (event.error === 'no-speech') {
				// Restart recognition
				this.stop();
				setTimeout(() => this.start(), 100);
			}
		};
		
		this.recognition.onend = () => {
			console.log('Voice recognition ended');
			this.isListening = false;
			
			// Auto-restart if it stopped unexpectedly
			if (this.shouldBeListening) {
				setTimeout(() => this.start(), 100);
			}
		};
	}
	
	processCommand(transcript) {
		// Check each command pattern
		for (const command of this.commands) {
			for (const pattern of command.patterns) {
				if (transcript.includes(pattern)) {
					let param = null;
					
					// Extract parameter if needed
					if (command.extractParam) {
						const index = transcript.indexOf(pattern);
						param = transcript.substring(index + pattern.length).trim();
					}
					
					// Execute callback
					this.executeCommand(command.action, param);
					return;
				}
			}
		}
		
		// No command matched
		console.log('Unknown voice command:', transcript);
	}
	
	executeCommand(action, param = null) {
		const callbacks = this.callbacks.get(action) || [];
		callbacks.forEach(callback => {
			callback({ action, param });
		});
		
		// Visual/audio feedback
		this.provideFeedback(action, param);
	}
	
	provideFeedback(action, param) {
		// Simple audio feedback (beep)
		const audioContext = new (window.AudioContext || window.webkitAudioContext)();
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		
		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);
		
		oscillator.frequency.value = 880; // A5 note
		gainNode.gain.value = 0.1;
		
		oscillator.start(audioContext.currentTime);
		oscillator.stop(audioContext.currentTime + 0.1);
		
		// Log feedback
		if (param) {
			console.log(`Voice command executed: ${action} with param: ${param}`);
		} else {
			console.log(`Voice command executed: ${action}`);
		}
	}
	
	start() {
		if (!this.recognition) {
			console.warn('Speech recognition not available');
			return;
		}
		
		this.shouldBeListening = true;
		
		try {
			this.recognition.start();
		} catch (error) {
			if (error.name === 'InvalidStateError') {
				// Already started
				console.log('Voice recognition already active');
			} else {
				console.error('Failed to start voice recognition:', error);
			}
		}
	}
	
	stop() {
		if (!this.recognition) return;
		
		this.shouldBeListening = false;
		
		try {
			this.recognition.stop();
		} catch (error) {
			console.error('Failed to stop voice recognition:', error);
		}
	}
	
	onCommand(action, callback) {
		if (!this.callbacks.has(action)) {
			this.callbacks.set(action, []);
		}
		this.callbacks.get(action).push(callback);
	}
	
	getAvailableCommands() {
		return this.commands.map(cmd => ({
			action: cmd.action,
			examples: cmd.patterns
		}));
	}
	
	isAvailable() {
		return this.recognition !== null;
	}
}