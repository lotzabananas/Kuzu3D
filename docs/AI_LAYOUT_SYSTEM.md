# AI-Driven Graph Layout System

## Complete Flow Example: "Show me companies grouped by their employees"

### 🎤 Step 1: Voice Input
User speaks: **"Show me companies grouped by their employees"**

The voice system captures this and sends it to the AILayoutEngine.

### 🧠 Step 2: LLM Interpretation
The system sends this to the LLM with context about the graph:

**Input to LLM:**
```javascript
{
  prompt: "Show me companies grouped by their employees",
  graphContext: {
    nodeTypes: ["Company", "Person", "Technology", "Project"],
    relationshipTypes: ["WorksAt", "Uses", "WorksOn", "Knows"],
    nodeCount: 150,
    edgeCount: 200
  }
}
```

**LLM Response:**
```javascript
{
  "strategy": "hierarchical-grouping",
  "primary": {
    "nodeType": "Company",
    "role": "group-center",
    "spatialPriority": "high"
  },
  "secondary": {
    "nodeType": "Person", 
    "role": "group-member",
    "groupBy": "WorksAt relationship to Company"
  },
  "layout": {
    "type": "force-directed",
    "modifications": {
      "Company-Company": { "repulsion": "strong" },
      "Person-Company": { "attraction": "strong via WorksAt" },
      "Person-Person": { "repulsion": "medium within same company" }
    }
  },
  "visual": {
    "emphasis": "Company nodes larger",
    "spacing": "Companies well separated, employees clustered"
  }
}
```

### 📋 Step 3: Layout Parsing
The LayoutParser validates and structures this specification:

**Parser Output:**
```javascript
{
  "type": "hierarchical-force",
  "hierarchy": [
    {
      "type": "Company",
      "level": 0,
      "role": "parent"
    },
    {
      "type": "Person",
      "level": 1,
      "role": "child",
      "groupBy": "WorksAt"
    }
  ],
  "groups": [{
    "parent": "Company",
    "children": "Person",
    "relationship": "WorksAt",
    "layout": "circular",
    "radius": 3.0
  }],
  "forces": {
    "Company-Company": {
      "type": "repulsion",
      "strength": -500
    },
    "Person-Company": {
      "type": "attraction",
      "strength": 0.8,
      "distance": 2.0
    }
  },
  "constraints": [{
    "type": "vertical",
    "higher": "Company",
    "lower": "Person",
    "minDistance": 2.0
  }]
}
```

### ⚙️ Step 4: Layout Compilation
The LayoutCompiler converts this into executable physics:

**Compiled Forces:**

1. **Company Repulsion Force**
   ```javascript
   // Keep companies apart
   force = -500 / distance²
   // Applied between all Company nodes
   ```

2. **Employee Attraction Force**
   ```javascript
   // Pull employees to their company
   springForce = 0.8 * (distance - 2.0)
   // Applied along WorksAt edges
   ```

3. **Circular Arrangement Force**
   ```javascript
   // Arrange employees in circle around company
   angle = index * (2π / employeeCount)
   targetPos = companyPos + [cos(angle), 0, sin(angle)] * 3.0
   ```

4. **Center Gravity**
   ```javascript
   // Keep everything centered
   force = 0.1 * distanceToOrigin
   ```

### 🏃 Step 5: Layout Execution
The LayoutExecutor runs the physics simulation:

**Frame-by-Frame Execution:**

```
Frame 0-10: Initial chaos
- Companies at random positions
- Employees scattered
- High energy, rapid movement

Frame 11-50: Separation begins  
- Companies push apart (repulsion working)
- Employees start moving toward companies
- Groups beginning to form

Frame 51-150: Structure emerges
- Companies well separated
- Employees clustering around their company
- Circular patterns forming

Frame 151-300: Fine tuning
- Minor position adjustments
- Optimal distances achieved
- Energy decreasing

Frame 301+: Convergence
- Movement < 0.001 threshold
- Layout complete
```

### 🎨 Step 6: Visual Result

**Before Layout:**
```
    P  C   P     T
  P    P    C  P
    T    P    P
  C    P  T    C
```
(Random scatter of Companies, People, Technologies)

**After Layout:**
```
    [Company A]          [Company B]
   P    P    P          P    P    P
  P  <--A-->  P        P  <--B-->  P
   P    P    P          P    P    P
   
         [Company C]
        P    P    P
       P  <--C-->  P
        P    P    P
```

### 🔧 Customization Examples

**"Group by projects instead"**
```javascript
{
  "primary": { "nodeType": "Project" },
  "secondary": { "nodeType": "Person", "groupBy": "WorksOn" }
}
```

**"Show hierarchy with managers on top"**
```javascript
{
  "constraints": [{
    "type": "vertical",
    "rule": "Person[role=manager].y > Person[role=employee].y"
  }]
}
```

**"Cluster by department"**
```javascript
{
  "strategy": "semantic",
  "attributes": ["department"],
  "clustering": "tight"
}
```

## Implementation Code

### Using the System
```javascript
// In your VR app
const layoutEngine = new AILayoutEngine(llmService);

// When user speaks
voiceInput.onTranscript(async (text) => {
  // Generate layout from natural language
  const layout = await layoutEngine.generateLayout(text, graphData);
  
  // Execute the layout
  const result = await layoutEngine.executeLayout(layout, graphData);
  
  // Animate transition
  animateToNewPositions(result.transition, 2000);
});
```

### Adding Custom Layouts
```javascript
// Register a new layout strategy
layoutParser.strategies['timeline-flow'] = (spec, context) => {
  return {
    type: 'temporal',
    timeAxis: 'z',
    timeProperty: spec.timeProperty || 'createdAt',
    layers: spec.layers
  };
};
```

## Performance Considerations

### Small Graphs (< 100 nodes)
- Real-time physics simulation
- All forces calculated every frame
- Smooth 60fps in VR

### Medium Graphs (100-500 nodes)
- Batch force calculations
- Update every 3rd frame
- Use spatial indexing

### Large Graphs (500+ nodes)
- Pre-calculate layout on server
- Stream positions to client
- Use level-of-detail (LOD)

## Benefits

1. **Natural Interaction**: Say what you want to see
2. **Intelligent Defaults**: LLM understands context
3. **Flexible**: Infinite layout possibilities
4. **Performant**: Optimized for VR
5. **Extensible**: Easy to add new strategies

This system transforms natural language into meaningful 3D graph layouts, making complex data exploration as simple as having a conversation!