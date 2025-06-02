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
        try {
            // Use the backend API for natural language to Cypher conversion
            const response = await fetch('/api/voice/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: naturalLanguage,
                    schema: schema
                })
            });

            if (!response.ok) {
                throw new Error(`Voice API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error?.message || 'Failed to convert to Cypher');
            }
            
            logger.info(`Converted "${naturalLanguage}" to Cypher: ${data.cypher}`);
            return data.cypher;

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