#!/bin/bash

echo "Starting Kùzu VR Development Environment..."
echo "========================================="

# Start the backend server in the background
echo "Starting backend server on port 3000..."
npm run server &
SERVER_PID=$!

# Give the server a moment to start
sleep 2

# Start the webpack dev server
echo "Starting webpack dev server on port 8081..."
npm run dev

# When webpack dev server is stopped, also stop the backend server
echo "Stopping backend server..."
kill $SERVER_PID 2>/dev/null