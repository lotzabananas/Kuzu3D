# Voice Feature Quick Start Guide

## Setup Steps

### 1. Get OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy it immediately (you can't see it again)

### 2. Configure Environment
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local and add your key
OPENAI_API_KEY=sk-your-actual-key-here
```

### 3. Install Dependencies
```bash
npm install dotenv openai multer
```

## Implementation Order

### Week 1: Core Voice Input
1. **Day 1**: Double-tap gesture + visual indicator
2. **Day 2**: Audio recording with Web Audio API  
3. **Day 3**: Backend Whisper endpoint
4. **Day 4**: Display transcript in VR
5. **Day 5**: Test and polish

### Week 2: Cypher Integration
1. **Day 1**: GPT prompt engineering for Cypher
2. **Day 2**: Context management (current nodes, schema)
3. **Day 3**: Error handling and retries
4. **Day 4**: Query execution and visualization
5. **Day 5**: Polish the full flow

## Test Commands to Support

Start simple:
- "Show all nodes"
- "Show people" 
- "Show companies"
- "Find Alice"

Then advance to:
- "Show me who works at TechCorp"
- "Find connections between Alice and Bob"
- "Show the most connected person"
- "Find all people who know Python"

## Success Metrics
- Gesture recognition: >95% accuracy
- Speech recognition: >90% accuracy  
- Cypher generation: >80% valid queries
- End-to-end: <5 seconds
- User delight: Priceless 🎉