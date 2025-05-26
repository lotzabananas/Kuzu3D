import { Logger } from '../utils/Logger.js';

const logger = new Logger('NaturalLanguageService');

export class NaturalLanguageService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-4.1-nano-2025-04-14';
    }

    async convertToCypher(naturalLanguage, schema = null) {
        const systemPrompt = `Convert natural language to Cypher query. Output ONLY the query, no explanation.

CRITICAL: NEVER add LIMIT to any query unless the user explicitly says "limit" or specifies a number.

Rules:
- Use MATCH to find nodes
- Use RETURN to specify output
- For relationships use -[:TYPE]->
- NO LIMIT clause unless explicitly requested

Examples:
"show all people" → MATCH (p:Person) RETURN p
"show me all the people" → MATCH (p:Person) RETURN p
"who works at TechCorp" → MATCH (p:Person)-[:WorksAt]->(c:Company {name: 'TechCorp'}) RETURN p
"show all nodes" → MATCH (n) RETURN n
"show me 10 people" → MATCH (p:Person) RETURN p LIMIT 10`;

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