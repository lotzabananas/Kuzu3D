#!/usr/bin/env node

// Simple script to monitor logs from the VR app
import express from 'express';

const app = express();
app.use(express.json());

const logs = [];

app.post('/api/log', (req, res) => {
    const { level, message, data } = req.body;
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data };
    
    logs.push(logEntry);
    
    // Print to console
    const levelColor = {
        'error': '\x1b[31m',
        'warn': '\x1b[33m',
        'info': '\x1b[36m',
        'debug': '\x1b[90m'
    }[level] || '\x1b[0m';
    
    console.log(`${levelColor}[${timestamp.substring(11, 19)}] [${level.toUpperCase()}] ${message}\x1b[0m`);
    if (data) {
        console.log('  Data:', JSON.stringify(data, null, 2));
    }
    
    res.json({ success: true });
});

app.get('/api/logs', (req, res) => {
    res.json({ logs });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Log monitor listening on port ${PORT}`);
    console.log('Waiting for VR app logs...');
});