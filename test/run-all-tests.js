#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🧪 Running All RelationshipLayoutProcessor Tests\n');
console.log('=' .repeat(70));

const testSuites = [
    {
        name: 'Basic Unit Tests',
        file: 'RelationshipLayoutProcessor.test.js',
        description: 'Core functionality and basic operations'
    },
    {
        name: 'Advanced Unit Tests', 
        file: 'RelationshipLayoutProcessor.advanced.test.js',
        description: 'Edge cases, performance, and complex scenarios'
    },
    {
        name: 'Integration Tests',
        file: 'RelationshipLayoutProcessor.integration.test.js',
        description: 'Real-world scenarios and full system testing'
    }
];

let totalPassed = 0;
let totalFailed = 0;
const startTime = Date.now();

async function runTest(suite) {
    return new Promise((resolve) => {
        console.log(`\n📁 ${suite.name}`);
        console.log(`   ${suite.description}`);
        console.log('-'.repeat(50));
        
        const testPath = join(__dirname, suite.file);
        const proc = spawn('node', [testPath], {
            cwd: dirname(__dirname),
            stdio: 'pipe'
        });
        
        let output = '';
        let passed = 0;
        let failed = 0;
        
        proc.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            
            // Count test results
            const passMatches = text.match(/✅/g);
            const failMatches = text.match(/❌/g);
            if (passMatches) passed += passMatches.length;
            if (failMatches) failed += failMatches.length;
            
            // Show progress
            process.stdout.write(text);
        });
        
        proc.stderr.on('data', (data) => {
            process.stderr.write(data);
        });
        
        proc.on('close', (code) => {
            // Extract final counts from output if available
            const resultsMatch = output.match(/(\d+) passed, (\d+) failed/);
            if (resultsMatch) {
                passed = parseInt(resultsMatch[1]);
                failed = parseInt(resultsMatch[2]);
            }
            
            totalPassed += passed;
            totalFailed += failed;
            
            console.log(`\n   Summary: ${passed} passed, ${failed} failed`);
            resolve(code === 0);
        });
    });
}

// Run all tests sequentially
async function runAllTests() {
    const results = [];
    
    for (const suite of testSuites) {
        const success = await runTest(suite);
        results.push({ suite: suite.name, success });
    }
    
    const duration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(70));
    console.log('\n🎯 OVERALL TEST RESULTS\n');
    
    results.forEach(({ suite, success }) => {
        console.log(`   ${success ? '✅' : '❌'} ${suite}`);
    });
    
    console.log(`\n📊 Total: ${totalPassed} tests passed, ${totalFailed} tests failed`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds`);
    
    const allPassed = results.every(r => r.success);
    
    if (allPassed) {
        console.log('\n🎉 All test suites passed! The RelationshipLayoutProcessor is working correctly.\n');
    } else {
        console.log('\n💔 Some tests failed. Please review the output above.\n');
    }
    
    process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
});