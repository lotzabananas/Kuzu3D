# Kùzu Explore 3D VR - Design Requirements Document

## Overview
This document tracks design decisions, requirements, and implementation details for the Kùzu Explore 3D VR project.

## UI/UX Requirements

### Hand Gestures
1. **Pinch (Left/Right)** - Node selection and manipulation
2. **Fist** - Reserved for future graph grabbing
3. **Point** - Ray-casting for node selection
4. **Peace Sign** - Toggle AR/VR modes
5. **Thumbs Up**:
   - Left hand: Opens radial thumb menu
   - Right hand: Resets graph position
6. **Open Palm** - Currently unassigned

### Thumb Menu System
- **Activation**: Left hand thumbs up gesture
- **Position**: Fixed 5cm in front of wrist when activated (toward palm/fingers)
- **Orientation**: Menu plane perpendicular to forearm axis (like a watch face)
- **Selection**: Thumb rotation around forearm axis controls selection
  - Clockwise thumb movement = clockwise selection movement
  - Direct 1:1 mapping for intuitive control
- **Confirmation**: Right hand pinch to select
- **Visual Design**:
  - 4 options in 120° arc (-60° to +60°)
  - Inactive color: Light blue-gray (0x666688) for VR background contrast
  - Active color: Green (0x00ff00)
  - Selection movement must match thumb movement exactly
- **Menu Options** (Planned):
  1. Toggle node labels
  2. Change visualization mode
  3. Filter nodes
  4. Settings

### Node Manipulation
- **Single Node**: Single hand pinch near node (12cm range)
- **Graph Manipulation**: Double pinch for scale/translate
- **Visual Feedback**: Colored indicators for different manipulation modes

### Visual Design
- **Background Colors**:
  - VR Mode: Dark background (need to ensure UI elements contrast)
  - AR Mode: Transparent for passthrough
- **Gesture Indicators**: Colored spheres above wrist showing current gesture
- **Node Colors**: Based on node type/properties (TBD)

### Home Screen
- Modern gradient design with glassmorphism
- Separate VR and AR buttons
- Smooth fade-out animation after loading

## Technical Requirements

### Performance
- 60fps target on Quest 3
- Throttled updates for gesture detection (16ms)
- Efficient node rendering for large graphs

### Coordinate Systems
- Use `local-floor` reference space
- Menu positioning in world space
- Gesture detection in local hand space

## Debug/Developer Mode
- **Activation Methods**:
  - URL parameter: `?debug=true`
  - Keyboard: Ctrl+Shift+D (desktop only)
  - VR Gesture: Double peace sign (both hands) held for 0.5s
- **Debug Features**:
  - Gesture indicator spheres above hands
  - Thumb menu direction line showing selection angle
  - Debug panel showing FPS, node count, active gestures
- **Purpose**: Hide development features from normal users while keeping them accessible

## Known Issues to Address
1. ~~Thumb menu colors same as VR background~~ (Fixed)
2. ~~Menu orientation not aligned with forearm~~ (Fixed)
3. ~~Debug features always visible~~ (Fixed - now hidden by default)
4. Edge visualization not implemented
5. Cypher query interface not implemented

## Next Priority Features

### 1. Edge/Relationship Visualization
- Display edges between related nodes
- Show relationship types and properties
- Interactive edge selection
- Edge routing algorithms for clarity

### 2. Node Visualization Improvements
- Text labels on nodes (node properties)
- Different colors for different node types
- Node icons/symbols based on type
- Scalable text rendering for readability

### 3. Database Integration
- **Network Storage** (Priority): Connect to Kùzu database on local network
  - WebSocket/HTTP connection to desktop server
  - Real-time query execution
  - Database browser/selector
- **Local Quest Storage** (Research needed): Store databases directly on device
- **Cloud Storage** (Future): Cloud-hosted databases with account management

### 4. Enhanced Node Manipulation
- Improved grab/release mechanics
- Node physics (optional spring forces)
- Multi-select capabilities
- Batch operations on node groups

## Future Enhancements

### Voice Integration
- Voice commands via API (paid feature)
- Natural language to Cypher query conversion
- Voice-activated node selection
- Dictation for node creation/editing

### AI-Powered Features
- AI Cypher query assistant
- Intelligent graph layout suggestions
- Pattern recognition and insights
- Natural language graph exploration

### Database Management
- Create databases from scratch in VR
- Schema visualization and editing
- Import/export capabilities
- Database migration tools

### Advanced Visualization
- 3D force-directed layouts
- Hierarchical layouts
- Community detection visualization
- Time-based animations
- Heat maps and data overlays

### Collaboration Features
- Multi-user sessions
- Shared graph exploration
- Annotation system
- Change tracking

### Account & Payment System
- User accounts for cloud features
- Payment integration for premium features
- Usage analytics
- Saved sessions and bookmarks

### Performance Optimizations
- Level-of-detail (LOD) for large graphs
- Spatial indexing for node selection
- GPU-accelerated layouts
- Streaming for massive databases

---
*Last updated: 2024-01-23*