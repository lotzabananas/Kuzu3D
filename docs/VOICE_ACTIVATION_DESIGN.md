# Voice Activation Design

## Activation Gesture: Double Tap

### Gesture Detection
```javascript
// Add to GestureDetector.js
detectDoubleTap(hand) {
  const currentTime = Date.now();
  const tapGesture = this.detectTap(hand); // Index + thumb close
  
  if (tapGesture) {
    if (currentTime - this.lastTapTime < 500) { // 500ms window
      return true;
    }
    this.lastTapTime = currentTime;
  }
  return false;
}
```

### Visual Indicators

#### 1. Recording Indicator
- **Position**: Float 20cm above right hand
- **Visual**: Pulsing red sphere with "Listening..." text
- **Animation**: Scale pulses with audio level
- **Color states**:
  - Red = Recording
  - Yellow = Processing
  - Green = Success
  - Red flash = Error

#### 2. Transcript Display
- **Position**: Below recording indicator
- **Visual**: Dark panel with white text
- **Shows**: Real-time transcript (if using streaming)
- **Persists**: 5 seconds after completion

#### 3. Audio Waveform (Optional)
- **Visual**: Simple line that reacts to voice
- **Purpose**: Feedback that mic is working

## Implementation Plan

### Phase 1: Basic Voice Input
1. Double-tap gesture detection
2. Web Audio API recording
3. Visual feedback sphere
4. Send audio to backend

### Phase 2: Whisper Integration
1. Backend endpoint for audio upload
2. Whisper API integration
3. Return transcript to frontend
4. Display transcript in VR

### Phase 3: Cypher Generation
1. Send transcript to GPT
2. Generate Cypher query
3. Execute and visualize results

## Component Structure

```javascript
// New file: src/components/VoiceInput.js
export class VoiceInput {
  constructor() {
    this.isRecording = false;
    this.audioContext = null;
    this.mediaRecorder = null;
    this.indicator = this.createIndicator();
  }
  
  startRecording() {
    // Begin audio capture
    // Show visual indicator
    // Start timeout (max 10 seconds)
  }
  
  stopRecording() {
    // Stop capture
    // Show processing state
    // Send to backend
  }
}
```

## Audio Recording Settings
- **Format**: webm/opus (browser default)
- **Sample rate**: 16kHz (Whisper optimal)
- **Channels**: Mono
- **Max duration**: 10 seconds
- **Silence detection**: Stop after 2s silence

## Backend Endpoints

```javascript
// POST /api/voice/transcribe
// Body: FormData with audio file
// Returns: { transcript, confidence }

// POST /api/cypher/fromText  
// Body: { text, context }
// Returns: { cypher, explanation }
```

## Error Handling
- No microphone access → Show permission prompt
- Network failure → Retry with exponential backoff
- Whisper error → Fall back to browser speech API
- Invalid Cypher → Show error with suggestion

## Privacy & Security
- Audio never stored on server
- Processed audio immediately deleted
- All API calls through backend
- No client-side API keys
- Optional: Local-only mode with Web Speech API