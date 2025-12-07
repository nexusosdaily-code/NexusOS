#!/bin/bash
# Start both Node.js and Flask servers

echo "Starting NexusOS servers..."

# Start Flask Spectral API in background
python spectral_api.py &
FLASK_PID=$!

# Wait for Flask to start
sleep 2

# Start Node.js server (foreground)
npm run dev

# Cleanup Flask on exit
trap "kill $FLASK_PID 2>/dev/null" EXIT
