# Node Creation & Editing Implementation Plan

## Overview
Add the ability to create, edit, and delete nodes and relationships directly from the VR interface while maintaining data integrity and user safety.

## Current System Analysis

### ✅ What We Have
1. **Backend Support**
   - Full Cypher query execution (CREATE, MATCH, SET, DELETE)
   - Schema introspection
   - Node/relationship querying
   
2. **VR UI Components**
   - Thumb menu system
   - Voice input with transcription
   - Hand gesture detection
   - Node selection/hovering
   
3. **Data Flow**
   - NodeManager for visualization
   - DataService for backend communication
   - Real-time graph updates

### 🔲 What We Need
1. **Input Methods**
   - VR keyboard for text entry
   - Property editor panels
   - Form validation
   
2. **UI Components**
   - Node creation wizard
   - Property inspector
   - Relationship builder
   
3. **Safety Features**
   - Read-only mode toggle
   - Confirmation dialogs
   - Undo/redo system

## Implementation Phases

### Phase 1: Read-Only Property Inspector (1-2 days)
**Goal**: View node properties when selected

**Tasks**:
1. Create PropertyPanel component
   - Floating panel near selected node
   - Display all node properties
   - Show node type and ID
   
2. Update node selection
   - Trigger property panel on pinch-hold
   - Position panel in view
   - Close on deselection

**Code Structure**:
```javascript
// src/components/PropertyPanel.js
class PropertyPanel {
  constructor() {
    this.panel = new THREE.Group();
    this.properties = [];
  }
  
  showNodeProperties(node) {
    // Display node.userData properties
  }
  
  hide() {
    // Hide panel
  }
}
```

### Phase 2: Mode Toggle System (1 day)
**Goal**: Safe switching between read-only and edit modes

**Tasks**:
1. Add mode toggle to home screen
   - "Read-Only Mode" (default)
   - "Edit Mode" (requires confirmation)
   
2. Visual indicators
   - Mode badge in VR view
   - Different node highlight colors
   - Warning colors in edit mode
   
3. Update thumb menu
   - Show different options based on mode
   - Add "Create Node" option in edit mode

### Phase 3: Property Editing (2-3 days)
**Goal**: Edit existing node properties

**Tasks**:
1. Create VR keyboard component
   - QWERTY layout
   - Number pad
   - Special characters
   - Voice-to-text option
   
2. Make PropertyPanel interactive
   - Editable text fields
   - Type-specific inputs (number, date, etc.)
   - Save/Cancel buttons
   
3. Backend integration
   - Generate UPDATE queries
   - Validate against schema
   - Show success/error feedback

**Input Methods Priority**:
1. **Voice** (primary) - "Set name to John Smith"
2. **Virtual Keyboard** (fallback)
3. **Hand Writing** (future enhancement)

### Phase 4: Node Creation (3-4 days)
**Goal**: Create new nodes with properties

**Tasks**:
1. Node Creation Wizard
   - Step 1: Select node type (from schema)
   - Step 2: Set required properties
   - Step 3: Set optional properties
   - Step 4: Confirm creation
   
2. Placement system
   - Ghost node preview
   - Snap to grid option
   - Position with hand
   
3. Voice commands
   - "Create person named Alice"
   - "Add company called TechCorp"
   
4. Backend integration
   - Generate CREATE queries
   - Return new node with ID
   - Update visualization

### Phase 5: Relationship Creation (2-3 days)
**Goal**: Connect nodes with relationships

**Tasks**:
1. Relationship builder
   - Select source node (pinch)
   - Draw line to target (drag)
   - Select relationship type
   - Set relationship properties
   
2. Visual feedback
   - Line preview while dragging
   - Valid target highlighting
   - Relationship type selector
   
3. Voice commands
   - "Connect Alice to TechCorp with WorksAt"
   - "Create relationship from selected to Bob"

### Phase 6: Advanced Features (3-4 days)
**Goal**: Professional editing capabilities

**Tasks**:
1. Undo/Redo system
   - Track all operations
   - Visual timeline
   - Keyboard shortcuts
   
2. Batch operations
   - Multi-select nodes
   - Bulk property updates
   - Mass delete with confirmation
   
3. Templates
   - Save node templates
   - Quick create from template
   - Import/export templates

## Technical Architecture

### Component Structure
```
src/
├── components/
│   ├── PropertyPanel.js       # Node property viewer/editor
│   ├── VRKeyboard.js          # Virtual keyboard input
│   ├── NodeCreationWizard.js  # Step-by-step node creation
│   ├── RelationshipBuilder.js # Visual relationship creation
│   └── ModeIndicator.js       # Read/Edit mode display
├── managers/
│   ├── EditModeManager.js     # Handle mode switching
│   ├── PropertyManager.js     # Property validation/updates
│   └── HistoryManager.js      # Undo/redo functionality
└── services/
    └── SchemaValidator.js     # Validate against Kuzu schema
```

### Data Flow
```
User Action → VR Input → Validation → Cypher Generation → Backend → Update Graph
                ↓                          ↓
            History Manager          Error Handling
```

### Security Considerations

1. **Mode Protection**
   - Read-only by default
   - Confirmation for edit mode
   - Auto-revert after inactivity
   
2. **Operation Validation**
   - Schema compliance
   - Property type checking
   - Relationship constraints
   
3. **User Confirmation**
   - Delete operations
   - Bulk updates
   - Schema modifications

## UI/UX Design Principles

### VR-Specific Considerations
1. **Ergonomics**
   - Panels at comfortable arm's length
   - Avoid neck strain positions
   - Large touch targets (min 3cm)
   
2. **Visual Clarity**
   - High contrast text
   - Clear mode indicators
   - Consistent color coding
   
3. **Interaction Patterns**
   - Pinch to select
   - Hold to open menu
   - Swipe to dismiss
   - Voice for text input

### Thumb Menu Integration
```
Read-Only Mode:
1. Legend
2. Voice Search
3. Layout
4. Properties (new)

Edit Mode:
1. Create Node (new)
2. Edit Properties (new) 
3. Delete (new)
4. Voice Input
```

## Implementation Priority

### MVP (Phase 1-3): 4-6 days
- Property viewing
- Mode toggle
- Basic property editing

### Full Feature Set (Phase 1-6): 12-15 days
- Complete CRUD operations
- Voice integration
- Undo/redo
- Templates

## Testing Strategy

1. **Unit Tests**
   - Property validation
   - Cypher query generation
   - Schema compliance
   
2. **Integration Tests**
   - End-to-end CRUD operations
   - Mode switching
   - Error handling
   
3. **VR User Testing**
   - Input method effectiveness
   - Ergonomics validation
   - Workflow efficiency

## Risks & Mitigations

1. **Data Integrity**
   - Risk: Accidental deletions
   - Mitigation: Confirmation dialogs, undo system
   
2. **Performance**
   - Risk: Large graph updates
   - Mitigation: Batch operations, progressive updates
   
3. **Input Complexity**
   - Risk: VR text input frustration
   - Mitigation: Voice-first approach, templates

## Next Steps

1. **Immediate**: Implement PropertyPanel component
2. **This Week**: Complete Phase 1-2
3. **Next Sprint**: Full MVP with editing
4. **Future**: Advanced features based on user feedback