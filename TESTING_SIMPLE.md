# Testing the Simplified Kùzu VR Implementation

## Quick Start

1. Run both servers:
   ```bash
   ./start-dev.sh
   ```

2. Open in your browser:
   ```
   https://localhost:8081
   ```

3. Put on your Quest 3 and click "Enter VR"

## What to Test

### 1. Hand Tracking Detection
- Once in VR, look at the browser console
- You should see "Hand tracking detected" with joint counts
- Debug markers should appear on your hands

### 2. Wrist UI (Palm-Up Gesture)
- Hold your **left hand** palm-up (like checking your watch)
- A dark panel with two buttons should appear above your wrist
- Buttons: RESET (blue) and HELP (green) with white text labels
- Console will log "Palm status changed: UP/DOWN"

### 3. Database Loading
- Before entering VR, enter "mock" in the database path field
- Click "Load Nodes"
- You should see a 3D graph visualization appear

### 4. RESET Button
- With the wrist UI visible (left palm up)
- Point at the RESET button with your **right index finger**
- Pinch to click (thumb + index finger together)
- The graph should reset to center position

### 5. Two-Hand Manipulation
- Pinch with **both hands** simultaneously
- Move hands apart/together to scale the graph
- Rotate hands to rotate the graph
- Console will log "Started/Ended two-hand grab"

## Troubleshooting

If hand tracking isn't working:
1. Ensure Quest 3 hand tracking is enabled in settings
2. Make sure hands are in view of the cameras
3. Check browser console for errors

If wrist UI doesn't appear:
1. Try a more exaggerated palm-up gesture
2. Hold the gesture for a few seconds
3. Check console for "Palm status changed" logs

If buttons don't respond:
1. Ensure you're pinching with the right hand
2. Try pointing more directly at the button
3. Check console for "Reset graph position" log

## Console Logs to Watch For

- "Hand tracking detected" - Confirms hands are tracked
- "Palm status changed: UP/DOWN" - Tracks wrist UI visibility
- "Started/Ended two-hand grab" - Confirms manipulation is working
- "Reset graph position" - Confirms RESET button works