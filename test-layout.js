#!/usr/bin/env node

/**
 * Test runner for layout command processing
 * Run with: node test-layout.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Mocha from 'mocha';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a new Mocha instance
const mocha = new Mocha({
    ui: 'bdd',
    reporter: 'spec',
    color: true
});

// Add the test file
mocha.addFile(join(__dirname, 'test/test-layout-commands.js'));

// Run the tests
mocha.run(failures => {
    process.exitCode = failures ? 1 : 0;
});