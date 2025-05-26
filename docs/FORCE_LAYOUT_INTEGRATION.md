# Force Layout Integration Schema

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   SceneManager  │────│ ForceLayoutMgr   │────│   NodeManager   │
│                 │    │                  │    │                 │
│ - Manages loop  │    │ - Physics sim    │    │ - Node objects  │
│ - Calls update  │    │ - Spring forces  │    │ - Visual update │
└─────────────────┘    │ - Boundaries     │    └─────────────────┘
                       └──────────────────┘
                                │
                      ┌──────────────────┐
                      │   EdgeManager    │
                      │                  │
                      │ - Edge lines     │
                      │ - Dynamic update │
                      └──────────────────┘
```

## Integration Steps

### 1. **SceneManager Integration**
```javascript
// In SceneManager.js
import { ForceLayoutManager, ForceLayoutPresets } from '../managers/ForceLayoutManager.js';

export class SceneManager {
    constructor() {
        // ... existing code ...
        this.forceLayout = ForceLayoutPresets.spread();
        this.layoutMode = 'force'; // 'grid' | 'force' | 'manual'
    }
    
    setLayoutMode(mode) {
        this.layoutMode = mode;
        if (mode === 'force') {
            this.startForceLayout();
        } else {
            this.forceLayout.stop();
        }
    }
    
    startForceLayout() {
        const nodes = this.nodeManager.getNodes();
        const edges = this.edgeManager.getEdges();
        this.forceLayout.setGraph(nodes, edges);
        this.forceLayout.start();
    }
    
    update(deltaTime) {
        // ... existing code ...
        
        if (this.layoutMode === 'force') {
            this.forceLayout.update(deltaTime);
            this.updateVisualElements();
        }
    }
    
    updateVisualElements() {
        // Edges need to update when nodes move
        this.edgeManager.updateEdgePositions();
    }
}
```

### 2. **NodeManager Integration**
```javascript
// In NodeManager.js - Add force layout compatibility
export class NodeManager {
    setForceLayoutMode(enabled) {
        this.isForceLayoutMode = enabled;
        
        if (enabled) {
            // Convert nodes to force layout format
            this.nodes.forEach(node => {
                if (!node.position || typeof node.position.set !== 'function') {
                    node.position = new THREE.Vector3().copy(node.position);
                }
            });
        }
    }
    
    handleNodeGrab(nodeId, newPosition) {
        if (this.isForceLayoutMode && this.forceLayout) {
            // Let force layout handle the positioning
            this.forceLayout.setNodePosition(nodeId, newPosition);
        } else {
            // Manual positioning
            const node = this.getNodeById(nodeId);
            if (node) node.position.copy(newPosition);
        }
    }
}
```

### 3. **EdgeManager Integration**
```javascript
// In EdgeManager.js - Dynamic edge updates
export class EdgeManager {
    updateEdgePositions() {
        this.edges.forEach(edge => {
            const sourceNode = this.getNodeById(edge.source);
            const targetNode = this.getNodeById(edge.target);
            
            if (sourceNode && targetNode) {
                // Update line geometry
                const geometry = edge.line.geometry;
                const positions = geometry.attributes.position.array;
                
                positions[0] = sourceNode.position.x;
                positions[1] = sourceNode.position.y;
                positions[2] = sourceNode.position.z;
                
                positions[3] = targetNode.position.x;
                positions[4] = targetNode.position.y;
                positions[5] = targetNode.position.z;
                
                geometry.attributes.position.needsUpdate = true;
                
                // Update edge label position
                if (edge.label) {
                    edge.label.position.lerpVectors(
                        sourceNode.position, 
                        targetNode.position, 
                        0.5
                    );
                }
            }
        });
    }
}
```

### 4. **UI Controls**
```javascript
// Add to thumb menu or voice commands
const layoutControls = {
    "Grid Layout": () => sceneManager.setLayoutMode('grid'),
    "Force Layout": () => sceneManager.setLayoutMode('force'),
    "Tight Clustering": () => {
        sceneManager.forceLayout = ForceLayoutPresets.tight();
        sceneManager.startForceLayout();
    },
    "Spread Nodes": () => {
        sceneManager.forceLayout = ForceLayoutPresets.spread();
        sceneManager.startForceLayout();
    }
};
```

## Configuration Presets

### **Small Graphs (< 50 nodes)**
- `springStrength: 0.2`
- `restLength: 1.5` 
- `chargeStrength: -200`
- Tight clustering for detailed exploration

### **Large Graphs (100+ nodes)**
- `springStrength: 0.05`
- `restLength: 3.0`
- `chargeStrength: -500`
- Spread out to prevent overcrowding

### **Hierarchical Data**
- Extended Y bounds for vertical structure
- Medium spring strength
- Good for organizational charts

## Performance Optimizations

1. **Frame Rate Control**: Max 3 iterations per frame
2. **Boundary Constraints**: Keep nodes in VR comfort zone
3. **Stability Detection**: Auto-stop when forces stabilize
4. **Force Clamping**: Prevent explosive forces

## VR-Specific Features

1. **Manual Override**: Grab nodes to reposition manually
2. **Restart Simulation**: Grabbing adds energy back to system
3. **Boundary Walls**: Nodes bounce off VR space limits
4. **Performance Monitoring**: Track simulation health

This creates a robust, modular system that plays nicely with your existing architecture while adding powerful 3D physics! 🚀