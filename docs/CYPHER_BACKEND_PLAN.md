# Cypher Query Backend Architecture Plan

## Overview
This document outlines the backend architecture for integrating Cypher query capabilities into the Kùzu Explore 3D VR application. The design prioritizes simplicity, robustness, and scalability while maintaining clean separation between the backend API and VR frontend.

## Architecture Goals
1. **Simple**: Minimal complexity, leveraging existing Kùzu APIs
2. **Robust**: Comprehensive error handling and graceful fallbacks
3. **Scalable**: Support for complex queries and large result sets
4. **VR-Optimized**: Result formatting designed for 3D visualization

## Core Components

### 1. Query Service Layer (`src/services/CypherQueryService.js`)
```javascript
class CypherQueryService {
  - executeQuery(cypher, params = {})
  - validateQuery(cypher)
  - formatResultsForVR(rawResults)
  - getQueryTemplates()
  - saveQueryToHistory(query, results)
}
```

**Responsibilities:**
- Direct interface with Kùzu database
- Query validation and sanitization
- Result transformation for VR visualization
- Query caching and optimization

### 2. API Endpoints (Enhanced `server.js`)

#### `/api/cypher/execute` (POST)
```javascript
{
  query: "MATCH (n:Person) RETURN n LIMIT 10",
  parameters: {},
  options: {
    limit: 1000,
    timeout: 30000,
    format: "vr" // or "raw"
  }
}
```

**Response Format:**
```javascript
{
  success: true,
  data: {
    nodes: [
      {
        id: "Person_1",
        label: "Person",
        properties: { name: "Alice", age: 30 },
        position: { x: 0, y: 0, z: 0 } // Optional
      }
    ],
    edges: [
      {
        id: "edge_1",
        source: "Person_1",
        target: "Company_1",
        type: "WORKS_AT",
        properties: { since: 2020 }
      }
    ],
    metadata: {
      queryTime: 123,
      nodeCount: 10,
      edgeCount: 5,
      truncated: false
    }
  },
  error: null
}
```

#### `/api/cypher/validate` (POST)
- Quick syntax validation without execution
- Returns parsing errors and suggestions

#### `/api/cypher/templates` (GET)
- Returns categorized query templates
- Categories: Exploration, Analysis, Modification, Utilities

#### `/api/cypher/history` (GET/POST)
- Store and retrieve query history
- Optional: User session support

### 3. Query Result Formatter (`src/utils/QueryResultFormatter.js`)

**Key Features:**
1. **Node Extraction**: Identifies all unique nodes from query results
2. **Edge Detection**: Automatically detects relationships in results
3. **Property Filtering**: Removes internal properties (e.g., `_id`, `_label`)
4. **Layout Hints**: Optional 3D positioning suggestions
5. **Aggregation Handling**: Special formatting for COUNT, SUM, etc.

### 4. Query Template System

**Template Categories:**

#### Exploration Templates
```cypher
-- Find all nodes of a type
MATCH (n:${nodeType}) RETURN n LIMIT 100

-- Find connected nodes
MATCH (n:${nodeType})-[r]-(m) 
WHERE n.${property} = $value
RETURN n, r, m LIMIT 50

-- Find paths between nodes
MATCH path = shortestPath((a:${typeA})-[*]-(b:${typeB}))
WHERE a.id = $startId AND b.id = $endId
RETURN path
```

#### Analysis Templates
```cypher
-- Node degree analysis
MATCH (n:${nodeType})
RETURN n, count((n)-[]-()) as degree
ORDER BY degree DESC LIMIT 20

-- Clustering coefficient
MATCH (n:${nodeType})-[]->(m)-[]->(o)
WHERE (n)-[]->(o)
RETURN n, count(distinct m) as triangles
```

#### Modification Templates
```cypher
-- Create new node
CREATE (n:${nodeType} {name: $name, ${properties}})
RETURN n

-- Create relationship
MATCH (a:${typeA} {id: $aId}), (b:${typeB} {id: $bId})
CREATE (a)-[r:${relType} {${properties}}]->(b)
RETURN a, r, b
```

### 5. Error Handling Strategy

1. **Query Validation Errors**: Return helpful syntax error messages
2. **Execution Timeouts**: Configurable timeout with graceful termination
3. **Large Result Sets**: Automatic pagination and warnings
4. **Connection Failures**: Fall back to cached results or sample data
5. **Invalid Operations**: Clear error messages for unsupported operations

### 6. Performance Optimizations

1. **Query Caching**: LRU cache for frequently used queries
2. **Result Streaming**: Stream large results to avoid memory issues
3. **Query Analysis**: Pre-execution analysis for optimization hints
4. **Batch Operations**: Support for multiple queries in one request
5. **Index Recommendations**: Suggest indexes based on query patterns

## Implementation Phases

### Phase 1: Core Query Execution
- Basic `/api/cypher/execute` endpoint
- Simple result formatting for nodes and edges
- Basic error handling

### Phase 2: Enhanced Features
- Query validation endpoint
- Template system implementation
- Query history with in-memory storage

### Phase 3: Optimization & Polish
- Query caching layer
- Performance monitoring
- Advanced result formatting (paths, aggregations)
- Persistent query history

## Security Considerations

1. **Query Sanitization**: Prevent injection attacks
2. **Parameter Binding**: Always use parameterized queries
3. **Rate Limiting**: Prevent DoS through expensive queries
4. **Read-Only Mode**: Option to restrict to read operations
5. **Query Whitelisting**: Optional approved query list

## Integration with VR Frontend

The backend provides a clean REST API that the VR frontend can consume through the existing `DataService`. The frontend will handle:
- Query input UI (VR keyboard, voice, templates)
- Result visualization and layout
- Query history browsing
- Error display in VR

## Testing Strategy

1. **Unit Tests**: Test individual query service methods
2. **Integration Tests**: Test full query execution pipeline
3. **Performance Tests**: Benchmark with various query complexities
4. **Error Scenario Tests**: Verify all error paths
5. **VR Integration Tests**: End-to-end testing with frontend

## Monitoring & Debugging

1. **Query Logging**: Log all queries with execution time
2. **Error Tracking**: Detailed error logs with context
3. **Performance Metrics**: Track query execution times
4. **Debug Mode**: Verbose logging for development

## Future Enhancements

1. **Query Builder API**: Programmatic query construction
2. **Subscription Queries**: Real-time updates for changing data
3. **Distributed Queries**: Support for federated graph queries
4. **AI Query Assistance**: Natural language to Cypher conversion
5. **Query Optimization Hints**: ML-based query optimization

## Example Implementation Flow

1. User enters Cypher query in VR
2. Frontend sends POST to `/api/cypher/execute`
3. Backend validates query syntax
4. Query executed against Kùzu database
5. Results formatted for VR visualization
6. Frontend receives nodes/edges with metadata
7. Graph updated with new/filtered data
8. Query saved to history for reuse

This architecture provides a solid foundation for Cypher query integration while maintaining flexibility for future enhancements.