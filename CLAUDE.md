# Kùzu Explore 3D VR - Project Context for Claude

## Project Overview
Kùzu Explore 3D VR is a VR/AR application for visualizing and exploring graph databases in 3D space using Meta Quest 3. The project focuses on natural hand-tracking interactions for manipulating graph nodes and exploring relationships in an immersive environment.

## Current Status
- ✅ Basic node visualization with 100+ nodes from sample databases
- ✅ Two-hand manipulation (scale and rotate) with position persistence
- ✅ AR passthrough mode functional with separate VR/AR buttons
- ✅ Node labels displayed on nodes (up to 60 characters)
- ✅ Node colors by type with dynamic legend
- ✅ Edge visualization with relationship labels
- ✅ Thumb menu integration with Legend toggle
- ✅ Direct Kùzu database integration with custom database support
- ✅ Debug mode for hiding development features
- Working on: Cypher query interface and performance optimization

## Design Philosophy
- **Natural Interactions**: Gestures should feel intuitive and map to real-world actions
- **Minimal UI**: Prefer gesture-based controls over traditional menus
- **Visual Clarity**: UI elements must contrast with both AR and VR backgrounds
- **Ergonomic Design**: Controls positioned for comfort during extended use

## Architecture
- **Framework**: Three.js with WebXR
- **Database**: Kùzu graph database (native Node.js integration)
- **Platform**: Meta Quest 3 with hand tracking
- **Backend**: Express.js server with Kùzu API
- **Key Managers**:
  - `NodeManager`: Handles graph node creation and updates
  - `SceneManager`: Manages 3D scene and AR passthrough
  - `UIManagerBasic`: Handles hand tracking and manipulation
  - `DataService`: Interfaces with backend server
  - `EdgeManager`: Manages edge visualization and labels
  - `DebugManager`: Controls development feature visibility
  - `ManipulationController`: Handles node grabbing and graph manipulation

## Completed Features
1. **Node Movement System** ✅
   - Natural pinch-based grabbing and movement
   - Individual node manipulation with both hands
   - Graph-level manipulation with double pinch
   - Position persistence during mode changes

2. **Graph Relationships** ✅
   - Edge visualization with straight lines
   - Relationship type labels on edges
   - Dynamic edge updates when nodes move
   - Color-coded edges by relationship type

3. **Database Integration** ✅
   - Direct Kùzu database connection
   - Custom database path support with auto-fill
   - Sample databases (Social Network, Knowledge Graph, Movie Database)
   - Mock data fallback when Kùzu unavailable

4. **UI Improvements** ✅
   - Node labels with 60 character limit
   - Dynamic legend showing node types and colors
   - Thumb menu with Legend toggle
   - Debug mode for hiding development features
   - Improved home screen with database selection

## Features to Implement

### Near-term Features
1. **Cypher Query Integration** ✅ Backend Complete
   - ✅ Backend API with full Cypher support
   - ✅ Query execution, validation, and history endpoints
   - ✅ VR-optimized result formatting
   - ✅ Query template system
   - 🔲 VR UI for query input (keyboard/voice)
   - 🔲 Visual query result integration
   - 🔲 Query history browser in VR

2. **Node Creation & Editing** 🚧 In Progress
   - ✅ Edit mode toggle on home screen with confirmation
   - ✅ NodeCreationService with full CRUD operations
   - ✅ PropertyPanel component for viewing node data
   - 🔲 VR keyboard for text input
   - 🔲 Voice commands for node creation
   - 🔲 Property editing interface
   - 🔲 Relationship creation UI

2. **Voice Integration**
   - Voice-to-text API integration (priority for natural VR interaction)
   - Voice commands for queries and navigation
   - Real-time transcription display

3. **Performance Optimization**
   - Level-of-detail for large graphs
   - Spatial indexing for efficient interaction
   - Progressive loading for huge datasets

4. **Advanced Visualization**
   - Force-directed graph layout
   - Clustering and grouping
   - Heat maps and analytics
   - Time-based animations

### Long-term Features
1. **Advanced Voice Visualization (Track 2)**
   - Voice-controlled node layouts and positioning
   - Natural language visualization commands
   - "Arrange by hierarchy", "Group by department", etc.
   - Custom visualization DSL

2. **Authentication & User Management**
   - OAuth integration (Google, GitHub)
   - Optional custom email authentication
   - User profiles and preferences
   - Session management

3. **Monetization**
   - Stripe integration for payments
   - Subscription tiers
   - Usage-based pricing
   - Premium features

4. **AI Integration**
   - API integration with major AI labs (OpenAI, Anthropic, etc.)
   - Natural language to Cypher query conversion
   - AI-assisted graph analysis
   - Intelligent layout suggestions

5. **Developer Tools**
   - MCP server consideration for development acceleration
   - API for third-party integrations
   - Plugin system for custom visualizations

## Development Commands
```bash
# Start both frontend and backend servers
npm run dev

# Start only frontend (webpack dev server)
npm run dev:frontend

# Start only backend (Kùzu API server)
npm run server

# If npm run dev fails, run servers in separate terminals:
# Terminal 1: npm run server
# Terminal 2: npm run dev:frontend

# The app runs on local network for Quest 3 testing
# Frontend: https://[local-ip]:8081
# Backend API: http://localhost:3000
```

## Testing
- Direct testing on Quest 3 headset via local network
- Ensure HTTPS is enabled (required for WebXR)
- Hand tracking must be enabled in Quest settings

## Debugging on Quest
Since browser console is not accessible on Quest headset:
- Use remote logging via `/api/logs` endpoint
- View logs with: `curl http://localhost:3000/api/logs | jq`
- App sends debug info to server automatically
- Check logs for initialization errors and XR button creation

## Database Requirements
The application now requires a real Kùzu database:
- Must provide a valid path to an existing Kùzu database directory
- No mock or sample databases - real Kùzu integration only
- Test database available at: `/Users/timmac/Desktop/Kuzu3D/test-kuzu-db`

## Current Challenges
1. Node movement needs to feel more natural and responsive
2. UI system needs refinement for better usability
3. Scaling visualization for large graphs
4. Implementing edge visualization between nodes

## Important Notes
- Always test on actual Quest 3 hardware (WebXR simulators don't fully replicate hand tracking)
- Passthrough mode is enabled by default for AR experience
- The app uses a simplified architecture (app-simple.js) for the proof of concept
- **Camera clipping behavior**:
  - VR mode: 100 unit far plane (nodes disappear beyond this for performance)
  - AR mode: 1000 unit far plane (10x larger to allow free exploration in physical space)

## Recent Work
- Fixed node position reset issue during double-pinch manipulation
- Added separate VR/AR mode buttons preventing mode switching conflicts
- Implemented debug mode with multiple activation methods (keyboard, button, gesture)
- Created three sample databases with 100+ nodes each
- Fixed node labels using correct 'label' property from data
- Implemented node colors by type with dynamic legend
- Added Legend toggle to thumb menu with proper debouncing
- Implemented edge visualization with relationship labels
- Integrated direct Kùzu database support with custom path option
- Combined frontend and backend servers into single npm command
- Fixed server connection issues and added better error handling
- **Implemented complete Cypher query backend**:
  - CypherQueryService with caching, validation, and VR formatting
  - REST API endpoints for execute, validate, templates, and history
  - Frontend DataService integration with all Cypher methods
  - Comprehensive test suite for API verification
- **Added Voice Command System** ✅:
  - Natural language to Cypher query conversion via OpenAI API
  - Voice-activated recording (Thumb Menu Option 2)
  - Automatic schema detection for accurate queries
  - Real-time transcription display in VR
- **Implemented Layout Command System** ✅:
  - Voice commands for node arrangement ("group nodes", "spread apart", "organize graph")
  - Gentle drift system with configurable physics (Button 3 toggle)
  - Instant spread for immediate arrangement (Button 4)
  - Dynamic edge colors by relationship type
  - AI Layout Engine architecture ready for advanced layouts

## Current Gesture Controls
- **Left Pinch**: Grab individual nodes
- **Right Pinch**: Grab individual nodes / Confirm thumb menu selection
- **Double Pinch**: Scale and translate entire graph
- **Point (Index Extended)**: Ray-cast selection
- **Left Thumbs Up**: Activate thumb menu
- **Thumb Menu Option 2**: Activate/stop voice recording ✅
- **Thumb Menu Option 3**: Toggle gentle drift (node separation) ✅
- **Thumb Menu Option 4**: Instant spread (immediate node arrangement) ✅
- **Fist**: Reserved for future use

## Thumb Menu Design Intent
- Menu appears 5cm in front of wrist, perpendicular to forearm
- Thumb rotation around forearm axis selects options (like turning a dial)
- Direct mapping: clockwise thumb = clockwise selection
- Right pinch confirms selection
- Menu locks in world space when activated for stability

## Voice Command System
The application supports natural language voice commands that fall into two categories:

### Query Commands (Database Queries)
These commands search and retrieve data from the Kùzu database:
- **Keywords**: find, show, search, where, which, who, what
- **Examples**:
  - "Show me all people"
  - "Find who works at TechCorp"
  - "Show all relationships to Python"
  - "Which projects use Java?"
- **Processing**: Natural language → OpenAI API → Cypher query → Database results → 3D visualization

### Layout Commands (3D Arrangement)
These commands modify how nodes are displayed in 3D space:
- **Keywords**: arrange, group, cluster, organize, layout, position, spread, place
- **Examples**:
  - "Group the nodes together" - Reduces spacing between nodes
  - "Spread the nodes apart" - Increases spacing between nodes
  - "Organize the graph" - Applies instant spread algorithm
  - "Group employees around their companies" - Groups nodes by relationships
  - "Cluster people by the companies they work for" - Semantic grouping
  - "Arrange nodes in a circle" - Circular layout
  - "Show hierarchy" - Tree/hierarchical layout
- **Processing**: Natural language → Layout interpretation → Relationship analysis → Animated positioning

#### Advanced Layout Features
- **Relationship-based grouping**: Automatically detects node types and relationships from your command
- **Schema-agnostic**: Works with any database schema by dynamically fetching node and relationship types
- **Multiple layout algorithms**:
  - Force-directed (default)
  - Grouping by relationships
  - Grouping by node type
  - Circular layouts
  - Hierarchical/tree layouts
- **Smooth animations**: 1-second eased transitions between layouts

### Voice Activation
- Press **Thumb Menu Option 2** to start/stop voice recording
- Real-time transcription appears in VR
- Commands are automatically processed when recording stops
- System automatically detects command type and routes appropriately

## Next Steps
1. Create Cypher query interface with VR keyboard
2. Add remaining thumb menu options (View modes, Filters, Settings)
3. Implement force-directed graph layout
4. Add voice commands for queries and navigation
5. Optimize rendering for graphs with 1000+ nodes
6. Add node search and filtering capabilities
7. Implement graph analytics (centrality, clustering, etc.)

## TODO
- Fix thumb menu labels to show text clearly (Legend, View, Filter, Settings) - currently only numbers are visible
- The legend table UI looks good but text needs to be properly aligned in the plane
- Fix edge label alignment:
  - Text should read ALONG the line (like text on a road)
  - Line should pass through left and right sides of text (----WORKS_AT----)
  - Text should flip/mirror when viewed from behind for readability
  - Should look similar to Kuzu Explorer's edge labels
  - Current issue: Text orientation is not aligning properly with line direction

## Known Issues
### Edge Label Alignment
- Text orientation not properly aligned with edge direction
- Labels should read along the line like road text
- Need to implement text flipping when viewed from behind

## Debug Mode
Debug mode hides development features like gesture indicators and thumb menu direction lines.

**Activation Methods:**
1. **Keyboard**: Press 'D' key (desktop only)
2. **Button**: Click "Toggle Debug Mode" button on home screen
3. **Gesture**: Double fist gesture (both hands make fists simultaneously)

**Hidden Features in Debug Mode:**
- Hand joint spheres and bones visualization
- Gesture state text displays
- Thumb menu direction indicator line
- Any other development/testing UI elements

## Database Connection
- **Path Required**: Enter full path to your Kùzu database directory
- **Default**: `/Users/timmac/Desktop/Kuzu3D/test-kuzu-db` (auto-filled)
- **No Fallback**: Application requires real Kùzu database - no mock data

## Test Database
A test Kùzu database is created with `create-test-db.js`:
- 4 People: Alice (30), Bob (25), Charlie (35), Diana (28)
- 2 Companies: TechCorp (2010), DataSolutions (2015)
- WorksAt relationships with "since" properties