# Voice-Driven Graph Exploration Vision

## Overview
Voice commands should feel like having a conversation with an intelligent assistant that understands both your data queries AND your visualization needs.

## Two-Track Command System

### Track 1: Data Queries (via Cypher)
Natural language → LLM → Cypher → Results

Examples:
- "Show me all people who work at TechCorp"
- "Find the shortest path between Alice and Bob"
- "Which companies have the most employees?"

### Track 2: Visualization Commands (via Custom DSL)
Natural language → LLM → Visualization DSL → Layout Engine

Examples:
- "Arrange these nodes in a circle"
- "Group nodes by company"
- "Focus on Alice and her connections"
- "Spread out the crowded nodes"
- "Color nodes by department"
- "Hide all edges except MANAGES relationships"

## Proposed Architecture

```
Voice Input
    ↓
Speech-to-Text (Whisper API)
    ↓
Intent Classifier (LLM)
    ↓
  ╱   ╲
Data Query          Viz Command
    ↓                    ↓
Cypher Generator    Layout DSL Parser
    ↓                    ↓
Query Execution     Layout Engine
    ↓                    ↓
  ╲   ╱
    ↓
Unified Graph Update
```

## Visualization DSL Examples

```javascript
// "Arrange nodes in a circle"
{
  action: "layout",
  type: "circular",
  targets: "visible" // or specific node IDs
}

// "Group by company"
{
  action: "layout", 
  type: "force-directed",
  constraints: {
    groupBy: "company",
    groupSpacing: 5.0
  }
}

// "Focus on Alice"
{
  action: "focus",
  target: "node:Person_1",
  includeConnections: 1, // depth
  hideOthers: false
}

// "Color by department"
{
  action: "style",
  property: "color",
  mapping: {
    attribute: "department",
    scheme: "categorical"
  }
}
```

## Natural Conversation Flow

User: "Show me the engineering team"
→ Cypher: MATCH (p:Person)-[:WORKS_AT]->(c:Company) WHERE p.department = 'Engineering' RETURN p, c

User: "Arrange them by seniority"
→ Viz DSL: { action: "layout", type: "hierarchical", orderBy: "p.years_experience" }

User: "Now highlight anyone who knows Python"
→ Combined:
  - Cypher: MATCH (p:Person)-[:KNOWS]->(s:Skill {name: 'Python'}) RETURN p
  - Viz DSL: { action: "style", targets: [results], property: "highlight", value: true }

## Implementation Phases

### Phase 1: Basic Commands (1 week)
- Simple Cypher queries
- Predefined layouts (circle, grid, force)
- Basic focus/zoom commands

### Phase 2: Smart Layout (2-3 weeks)
- Layout DSL implementation
- Constraint-based positioning
- Smooth transitions between layouts

### Phase 3: Contextual Understanding (1 month)
- Multi-turn conversations
- Reference previous results ("make them bigger")
- Compound commands ("show the management structure and color by salary range")

## Key Technical Decisions

### 1. LLM Integration Pattern
```javascript
class VoiceCommandProcessor {
  async processCommand(transcript) {
    // Use LLM to classify intent
    const classification = await this.classifyIntent(transcript);
    
    if (classification.type === 'data_query') {
      const cypher = await this.generateCypher(transcript, this.context);
      return { type: 'query', cypher };
    } else {
      const vizCommand = await this.parseVizCommand(transcript, this.context);
      return { type: 'visualization', command: vizCommand };
    }
  }
}
```

### 2. Layout Engine Requirements
- Spring physics for force-directed layouts
- Constraint solver for hierarchical layouts
- Animation system for smooth transitions
- Collision detection to prevent overlaps

### 3. Context Management
- Remember recent queries
- Track current focus/selection
- Maintain conversation state
- Enable references like "those nodes" or "the previous results"

## Example Voice Session

**User:** "Show me the social network"
- System loads all Person nodes and their relationships

**User:** "Just the people who work at startups"
- System filters to show only people at companies with type='startup'

**User:** "Arrange them by company"
- System groups nodes, with each company's employees clustered

**User:** "Which ones know each other?"
- System highlights KNOWS relationships between visible nodes

**User:** "Focus on the most connected person"
- System calculates degree, centers on highest-degree node

**User:** "Show me their skills"
- System adds Skill nodes connected to the focused person

## Why This Approach?

1. **Natural**: Users don't need to know Cypher or specific commands
2. **Flexible**: Handles both data and visualization needs
3. **Contextual**: Maintains conversation flow
4. **Powerful**: Combines query and layout for rich exploration
5. **Extensible**: Easy to add new layout algorithms or command types

## Alternative Approaches Considered

1. **Pure Cypher Extension**: Extend Cypher with layout hints
   - Pros: Single language
   - Cons: Cypher wasn't designed for visualization

2. **Template-Based**: Predefined query+layout templates
   - Pros: Simple to implement
   - Cons: Too rigid for exploration

3. **Direct Manipulation Only**: Voice just selects, gestures do layout
   - Pros: Clear separation
   - Cons: Misses the power of voice for complex operations

## Recommendation

Build the two-track system (Cypher + Viz DSL) because it:
- Leverages Cypher's power for data
- Gives full control over visualization
- Provides the best user experience
- Sets foundation for AI-assisted exploration