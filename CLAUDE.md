# Kùzu Explore 3D VR - Project Context for Claude

## Project Overview
Kùzu Explore 3D VR is a VR/AR application for visualizing and exploring graph databases in 3D space using Meta Quest 3. The project focuses on natural hand-tracking interactions for manipulating graph nodes and exploring relationships in an immersive environment.

## Current Status
- Basic node visualization working with sample data
- Two-hand manipulation implemented (scale and rotate)
- AR passthrough mode functional
- Working on: Natural node movement system with finger-based interaction

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
- Removed node spinning animation for cleaner visualization
- Working on natural node grabbing with pinch gestures
- Implementing individual node movement system

## Next Steps
1. Complete natural node movement with finger tracking
2. Add edge visualization between related nodes
3. Implement basic Cypher query interface
4. Optimize for larger graph datasets