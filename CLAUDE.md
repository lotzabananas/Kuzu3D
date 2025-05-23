# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start the development server (https://localhost:8081)
- `npm run build` - Build the project for production
- `npm run format` - Format all source files with Prettier

### Dependencies
- `npm install` - Install all dependencies

## Architecture Overview

This is a WebXR Proof of Concept for visualizing Kùzu graph database nodes in 3D VR space. The project uses:

- **Three.js** for 3D rendering and WebXR integration
- **Webpack** for bundling with HTTPS dev server (required for WebXR)
- **Kùzu** database library for graph data access

### Key Components

1. **src/init.js** - Core WebXR and Three.js scene initialization
   - Sets up VR environment, camera, controllers
   - Manages render loop and VR button
   - Provides `globals` object with scene, camera, renderer, player, controllers

2. **src/index.js** - Main entry point
   - `setupScene()` - Called once after scene initialization (node visualization logic goes here)
   - `onFrame()` - Called every frame for updates

3. **WebXR Configuration**
   - HTTPS required (dev server uses port 8081)
   - VR controllers automatically detected and added to scene
   - Basic environment lighting included

### Current PoC Goals

1. Connect to local Kùzu database
2. Extract node data (no edges/properties yet)
3. Render nodes as simple 3D spheres
4. Allow basic VR viewing and navigation

### Development Notes

- The project is set up for WebXR compatibility across different VR headsets
- Controller models are automatically loaded when connected
- Scene uses a gray background (0x444444) for comfortable VR viewing
- Camera starts at typical standing eye height (y=1.6)