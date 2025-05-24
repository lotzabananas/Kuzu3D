# Kùzu Explore 3D VR - Project Context for Claude

## Project Overview
Kùzu Explore 3D VR is a VR/AR application for visualizing and exploring graph databases in 3D space using Meta Quest 3. The project focuses on natural hand-tracking interactions for manipulating graph nodes and exploring relationships in an immersive environment.

## Current Status
- Basic node visualization working with sample data
- Two-hand manipulation implemented (scale and rotate)
- AR passthrough mode functional
- Comprehensive gesture system implemented (pinch, fist, point, peace, thumbs up)
- Experimental thumb menu UI for left hand control
- Working on: Edge visualization and Cypher query interface

## Design Philosophy
- **Natural Interactions**: Gestures should feel intuitive and map to real-world actions
- **Minimal UI**: Prefer gesture-based controls over traditional menus
- **Visual Clarity**: UI elements must contrast with both AR and VR backgrounds
- **Ergonomic Design**: Controls positioned for comfort during extended use

## Architecture
- **Framework**: Three.js with WebXR
- **Database**: Kùzu graph database (embedded via WebAssembly)
- **Platform**: Meta Quest 3 with hand tracking
- **Key Managers**:
  - `NodeManager`: Handles graph node creation and updates
  - `SceneManager`: Manages 3D scene and AR passthrough
  - `UIManagerBasic`: Handles hand tracking and manipulation
  - `DataService`: Interfaces with Kùzu database

## Key Features to Implement
1. **Node Movement System** (In Progress)
   - Natural finger-based grabbing and movement
   - Individual node manipulation
   - Scalable for large graph visualizations

2. **Graph Relationships**
   - Visualize edges between nodes
   - Show relationship types and properties
   - Interactive edge exploration

3. **Cypher Query Integration**
   - Full Cypher query system in VR
   - Real-time query execution
   - Visual query results

4. **UI Improvements**
   - Better hand tracking feedback
   - Improved manipulation controls
   - Query interface in VR

## Development Commands
```bash
# Start development server
npm run dev

# The app runs on local network for Quest 3 testing
# Access via: https://[local-ip]:8080
```

## Testing
- Direct testing on Quest 3 headset via local network
- Ensure HTTPS is enabled (required for WebXR)
- Hand tracking must be enabled in Quest settings

## Sample Databases
Three comprehensive sample databases are included:
1. **Social Network** (100+ nodes): People, companies, interests, and their relationships
2. **Knowledge Graph** (100+ nodes): Computer science concepts, languages, and technologies
3. **Movie Database** (100+ nodes): Films, actors, directors, and awards
4. **Demo** (20 nodes): Simple demo for quick testing

## Current Challenges
1. Node movement needs to feel more natural and responsive
2. UI system needs refinement for better usability
3. Scaling visualization for large graphs
4. Implementing edge visualization between nodes

## Important Notes
- Always test on actual Quest 3 hardware (WebXR simulators don't fully replicate hand tracking)
- Passthrough mode is enabled by default for AR experience
- The app uses a simplified architecture (app-simple.js) for the proof of concept

## Recent Work
- Implemented comprehensive gesture detection system
- Created experimental thumb menu UI (radial menu activated by thumbs up)
- Fixed node position reset issue in double-pinch manipulation
- Added separate VR/AR mode buttons with improved home screen UI

## Current Gesture Controls
- **Left Pinch**: Grab individual nodes
- **Right Pinch**: Grab individual nodes / Confirm thumb menu selection
- **Double Pinch**: Scale and translate entire graph
- **Point (Index Extended)**: Ray-cast selection
- **Peace Sign**: Toggle AR/VR modes
- **Left Thumbs Up**: Activate thumb menu
- **Right Thumbs Up**: Reset graph position
- **Fist**: Reserved for future use

## Thumb Menu Design Intent
- Menu appears 5cm in front of wrist, perpendicular to forearm
- Thumb rotation around forearm axis selects options (like turning a dial)
- Direct mapping: clockwise thumb = clockwise selection
- Right pinch confirms selection
- Menu locks in world space when activated for stability

## Next Steps
1. Add edge visualization between related nodes
2. Implement menu options (labels, filters, viz modes)
3. Create Cypher query interface
4. Add voice commands
5. Optimize for larger graph datasets