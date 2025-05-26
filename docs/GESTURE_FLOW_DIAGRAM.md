# Gesture Control Flow Diagram

## Hand Tracking Flow
```
Quest 3 Hand Tracking
    ↓
hand-tracking.js (HandTracking class)
    ├── Updates hand models
    ├── Calls GestureDetector.detectGestures()
    └── Triggers gesture callbacks
         ↓
GestureDetector.js
    ├── identifyGesture() - Checks in order:
    │   1. isPinching() → 'pinch'
    │   2. isFist() → 'fist'
    │   3. isPointing() → 'point'
    │   4. isThumbsUp() → 'thumbsup' (LEFT HAND FOR MENU)
    │   5. isThumbPointing() → 'thumbpoint'
    │   6. isOpenPalm() → 'open'
    │   └── default → 'idle'
    └── Returns gesture state
         ↓
UIManagerBasic.js
    ├── Checks leftGesture === 'thumbsup'
    ├── Activates ThumbMenu
    └── Updates menu with thumb rotation
         ↓
ThumbMenu.js
    ├── Shows 4 options in radial layout
    ├── Option 1: Legend toggle
    ├── Option 2: Voice recording ← NEW!
    ├── Option 3: Filter (TODO)
    └── Option 4: Settings (TODO)
```

## Voice Recording Flow
```
Thumb Menu Option 2 Selected
    ↓
app-simple.js (setupGestureControls)
    ├── Toggles VoiceInput recording
    └── Red sphere appears in right hand
         ↓
VoiceInput.js
    ├── startRecording()
    │   ├── Gets microphone permission
    │   ├── Creates MediaRecorder
    │   └── Shows red sphere indicator
    ├── Audio chunks collected every 100ms
    └── stopRecording() (manual via menu)
         ↓
    processRecording()
    ├── Creates audio blob
    ├── Sends to backend via FormData
    └── POST to /api/voice/transcribe
         ↓
server.js
    ├── Receives audio file
    ├── Sends to OpenAI Whisper API
    └── Returns transcript
         ↓
VoiceInput.js
    ├── Shows transcript in VR
    └── Emits 'voiceTranscript' event
```

## Key Files to Check
1. **GestureDetector.js** - Is thumbsUp() being detected?
2. **UIManagerBasic.js** - Is it checking for gesture?
3. **ThumbMenu.js** - Is it being activated?
4. **app-simple.js** - Is thumb menu setup called?