# Kùzu Explore 3D VR - Architecture

## Project Structure

```
src/
├── app.js                 # Main application entry point
├── init.js                # WebXR initialization
├── index.html             # HTML template
├── components/            # Reusable UI components
│   └── GraphNode.js       # 3D node visualization class
├── managers/              # Application state management
│   ├── NodeManager.js     # Manages graph nodes
│   └── SceneManager.js    # Manages 3D scene setup
├── services/              # External service integrations
│   └── DataService.js     # API communication layer
├── utils/                 # Utility functions
│   └── Logger.js          # Logging utility
├── constants/             # Configuration constants
│   └── index.js           # Central configuration
└── assets/                # Static assets
    ├── models/            # 3D models
    ├── textures/          # Texture files
    └── sounds/            # Audio files
```

## Key Design Patterns

### 1. **Manager Pattern**
- `NodeManager`: Handles all node-related operations (creation, selection, animation)
- `SceneManager`: Manages scene setup, lighting, and passthrough mode

### 2. **Service Layer**
- `DataService`: Abstracts API communication, making it easy to swap backends

### 3. **Component-Based Architecture**
- `GraphNode`: Encapsulates node behavior and rendering

### 4. **Configuration Management**
- All constants centralized in `constants/index.js`
- Easy to modify visual settings, server config, etc.

## Data Flow

1. **Initialization**
   - `app.js` creates the main application instance
   - `init.js` sets up WebXR environment
   - Managers are instantiated

2. **Data Loading**
   - User triggers database connection via UI
   - `DataService` fetches node data from API
   - `NodeManager` creates `GraphNode` instances

3. **Interaction**
   - Hand tracking detects gestures
   - `NodeManager` handles hover/selection logic
   - Visual feedback provided through `GraphNode` methods

4. **Rendering**
   - Frame updates trigger animation in `NodeManager`
   - Scene renders automatically via Three.js

## Future Enhancements

### Short Term
- Edge visualization between nodes
- Node information panels in VR
- Graph layout algorithms

### Long Term
- Real-time collaborative viewing
- Advanced querying in VR
- Performance optimization for large graphs
- PWA support for offline usage