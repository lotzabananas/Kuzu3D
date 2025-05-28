import { logger } from '../utils/Logger.js';

export class NaturalLanguageService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-4.1-nano-2025-04-14';
    }
    
    /**
     * Detect if this is a layout command vs a query command
     */
    isLayoutCommand(text) {
        const layoutKeywords = [
            'arrange', 'group', 'cluster', 'organize',
            'layout', 'position', 'spread', 'place', 'put'
        ];
        
        const queryKeywords = [
            'find', 'search', 'where', 'which', 'who', 'what', 'show', 'get', 'list'
        ];
        
        const textLower = text.toLowerCase();
        
        // Check for layout keywords
        const hasLayoutKeyword = layoutKeywords.some(keyword => 
            textLower.includes(keyword)
        );
        
        // Check for query keywords (these take precedence)
        const hasQueryKeyword = queryKeywords.some(keyword => 
            textLower.includes(keyword)
        );
        
        // If it has layout keywords but not query keywords, it's probably a layout command
        return hasLayoutKeyword && !hasQueryKeyword;
    }

    async convertToCypher(naturalLanguage, schema = null) {
        let systemPrompt = `Convert natural language to Cypher query. Output ONLY the query, no explanation.

IMPORTANT: This system supports TWO types of commands:

1. QUERY COMMANDS (what you handle):
   - Finding nodes/relationships: "find", "show", "search", "where", "which", "who", "what"
   - Return data from the database using Cypher queries
   - Examples: "show all people", "find who works at TechCorp"

2. LAYOUT COMMANDS (handled separately, NOT Cypher):
   - Arranging the visualization: "arrange", "group", "cluster", "organize", "layout", "position", "spread", "place"
   - These modify HOW nodes are displayed in 3D space
   - Examples: "group the nodes by type", "spread nodes apart", "organize the graph"
   - DO NOT convert these to Cypher - they will be handled by the layout system

CRITICAL: NEVER add LIMIT to any query unless the user explicitly says "limit" or specifies a number.

Rules for QUERY commands:
- Use MATCH to find nodes
- Use RETURN to specify output
- For relationships use -[:TYPE]->
- NO LIMIT clause unless explicitly requested
- ONLY use node types and relationship types that exist in the database`;

        if (schema && schema.nodeTypes && schema.relationshipTypes) {
            systemPrompt += `

AVAILABLE NODE TYPES: ${schema.nodeTypes.join(', ')}
AVAILABLE RELATIONSHIP TYPES: ${schema.relationshipTypes.join(', ')}

IMPORTANT: You MUST only use the node types and relationship types listed above. Do NOT invent new types.`;
        }

        systemPrompt += `

CRITICAL RULE: For relationship queries, ALWAYS return ALL relevant nodes and relationships, not just one side.

Query Examples (convert these to Cypher):
"show all people" → MATCH (p:Person) RETURN p
"show me all the people" → MATCH (p:Person) RETURN p
"who works at TechCorp" → MATCH (p:Person)-[:WorksAt]->(c:Company {name: 'TechCorp'}) RETURN p, c
"show all relationships to Java" → MATCH (n)-[r]->(t:Technology {name: 'Java'}) RETURN n, r, t
"show everyone who knows Leo Brown" → MATCH (p:Person)-[r:Knows]->(leo:Person {name: 'Leo Brown'}) RETURN p, r, leo
"show all nodes" → MATCH (n) RETURN n
"show me 10 people" → MATCH (p:Person) RETURN p LIMIT 10

Layout Examples (DO NOT convert to Cypher - return error):
"group the nodes by type" → ERROR: This is a layout command, not a query
"spread the nodes apart" → ERROR: This is a layout command, not a query
"organize the graph better" → ERROR: This is a layout command, not a query`;

        const userPrompt = naturalLanguage;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.1, // Low temperature for consistent outputs
                    max_tokens: 200
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const cypherQuery = data.choices[0].message.content.trim();
            
            logger.info(`Converted "${naturalLanguage}" to Cypher: ${cypherQuery}`);
            return cypherQuery;

        } catch (error) {
            logger.error('Failed to convert to Cypher:', error);
            throw error;
        }
    }

    // Helper method to extract entities from natural language
    extractEntities(text) {
        // Simple entity extraction - can be enhanced
        const entities = {
            people: [],
            companies: [],
            nodeTypes: []
        };

        // Look for quoted names
        const quotedPattern = /"([^"]+)"|'([^']+)'/g;
        let match;
        while ((match = quotedPattern.exec(text)) !== null) {
            entities.people.push(match[1] || match[2]);
        }

        // Look for node type keywords
        const nodeTypes = ['person', 'people', 'company', 'companies', 'project', 'projects', 'technology', 'technologies'];
        nodeTypes.forEach(type => {
            if (text.toLowerCase().includes(type)) {
                entities.nodeTypes.push(type.charAt(0).toUpperCase() + type.slice(1));
            }
        });

        return entities;
    }
}