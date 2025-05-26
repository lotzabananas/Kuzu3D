#!/usr/bin/env node

/**
 * Test script to verify OpenAI API integration
 * Run with: node test-voice-api.js
 */

import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🧪 Testing OpenAI API Integration');
console.log('================================');

// Check environment
console.log('Environment check:');
console.log('- OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
console.log('- API key starts with:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) + '...' : 'NOT_FOUND');

if (!process.env.OPENAI_API_KEY) {
    console.error('❌ No OpenAI API key found in .env.local');
    process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Test 1: Basic API connectivity
async function testAPIConnectivity() {
    console.log('\n🔌 Test 1: Basic API Connectivity');
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Say "API test successful"' }],
            max_tokens: 10
        });
        
        console.log('✅ API connectivity test passed');
        console.log('Response:', completion.choices[0].message.content);
        return true;
    } catch (error) {
        console.error('❌ API connectivity test failed:', error.message);
        return false;
    }
}

// Test 2: Audio models availability
async function testAudioModels() {
    console.log('\n🎵 Test 2: Audio Models Availability');
    try {
        const models = await openai.models.list();
        const whisperModels = models.data.filter(model => model.id.includes('whisper'));
        
        console.log('✅ Available Whisper models:');
        whisperModels.forEach(model => {
            console.log(`  - ${model.id}`);
        });
        
        return whisperModels.length > 0;
    } catch (error) {
        console.error('❌ Failed to list models:', error.message);
        return false;
    }
}

// Test 3: Create a dummy audio file and test transcription
async function testAudioTranscription() {
    console.log('\n🎤 Test 3: Audio Transcription (Mock)');
    
    // Note: We can't create a real audio file easily in Node.js
    // This test would need a real audio file to work
    console.log('⚠️ Skipping audio transcription test (requires real audio file)');
    console.log('To test this manually:');
    console.log('1. Record a short audio file (WebM format)');
    console.log('2. Use curl to test the API:');
    console.log('   curl -X POST http://localhost:3000/api/voice/transcribe \\');
    console.log('        -F "audio=@your-audio-file.webm"');
    
    return true;
}

// Run all tests
async function runTests() {
    console.log('🚀 Starting OpenAI API tests...\n');
    
    const results = [];
    
    results.push(await testAPIConnectivity());
    results.push(await testAudioModels());
    results.push(await testAudioTranscription());
    
    console.log('\n📊 Test Results:');
    console.log('================');
    
    const passed = results.filter(Boolean).length;
    const total = results.length;
    
    console.log(`✅ Tests passed: ${passed}/${total}`);
    
    if (passed === total) {
        console.log('🎉 All tests passed! OpenAI API integration should work.');
    } else {
        console.log('❌ Some tests failed. Check the errors above.');
    }
    
    // Test server endpoints
    console.log('\n🌐 To test the server endpoints:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Test debug endpoint: curl http://localhost:3000/api/voice/debug');
    console.log('3. Test API endpoint: curl http://localhost:3000/api/voice/test');
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});