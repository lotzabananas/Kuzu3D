# Speech-to-Text API Comparison for VR

## OpenAI Whisper API

### Pricing
- **$0.006 per minute** (as of 2024)
- No minimum charges
- Pay-as-you-go

### Pros
- Excellent accuracy across accents
- 57+ languages supported
- Handles background noise well
- Simple API
- Can use same API key for GPT models later
- Good for VR environments (noise robust)

### Cons
- Requires internet connection
- ~1-3 second latency
- Max file size 25MB (plenty for voice commands)

### Example Cost
- Average voice command: 5 seconds = $0.0005
- Heavy user (100 commands/day): $0.05/day = $1.50/month

## Alternatives Considered

### 1. Google Cloud Speech-to-Text
- **Pricing**: $0.006-$0.009 per 15 seconds
- **Pros**: Streaming support, very low latency
- **Cons**: More complex setup, similar price

### 2. Azure Speech Services
- **Pricing**: $1 per audio hour
- **Pros**: Real-time streaming, custom models
- **Cons**: More expensive for short commands

### 3. Web Speech API (Browser)
- **Pricing**: FREE
- **Pros**: No API key needed, instant
- **Cons**: Browser support varies, less accurate, privacy concerns

### 4. Deepgram
- **Pricing**: $0.0059 per minute
- **Pros**: Fast, streaming, good accuracy
- **Cons**: Another API to manage

## Recommendation: OpenAI Whisper

**Why Whisper:**
1. Best accuracy for the price
2. Same API ecosystem as GPT for Cypher generation
3. Simple integration
4. Great with VR audio conditions
5. Cost negligible for typical usage

## Implementation Architecture

```
Double Tap Gesture
    ↓
Start Recording (local)
    ↓
Show Visual Indicator
    ↓
Stop on silence/timeout
    ↓
Send to Whisper API
    ↓
Get transcript
    ↓
Send to GPT for Cypher
    ↓
Execute query
```

## Security Setup

```javascript
// .env.local (git ignored)
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-... (optional)

// Never send API key to frontend!
// All API calls through backend
```

## Estimated Latencies
- Gesture detection: ~50ms
- Audio recording: real-time
- Whisper API: 1-2s
- GPT to Cypher: 1-2s
- Query execution: <500ms
- **Total: 3-5 seconds** from speech end to results

Good enough for magical experience!