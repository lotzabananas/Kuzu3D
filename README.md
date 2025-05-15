# Kùzu Explore 3D VR - Proof of Concept

This project is a Proof of Concept (PoC) for visualizing Kùzu graph database nodes in an immersive 3D WebXR environment.

## Project Goal (PoC)

The primary goal of this PoC is to:
1. Connect to a local Kùzu database.
2. Retrieve a list of nodes.
3. Render these nodes as simple 3D objects (e.g., spheres) in a WebXR scene.
4. Allow basic VR viewing and navigation of the visualized nodes.

This PoC serves to establish the foundational capability and assess the visual impact of representing graph data in VR, paving the way for more advanced graph exploration features.

## Current Status

- Basic WebXR scene setup using Three.js.
- Project structure cleaned up from the original WebXR starter template.
- Placeholder for Kùzu data loading and node visualization logic.

## Prerequisites

- A VR-ready browser with WebXR support.
- A VR headset compatible with WebXR (e.g., Meta Quest, HTC Vive, Valve Index).
- Node.js and npm (or yarn) installed.

## Getting Started

1.  **Clone the repository (if you haven't already):**
    ```bash
    # git clone <repository-url>
    # cd kuzu-explore-3d-vr-poc
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
    (Or `yarn install` if you use Yarn)

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
4.  Open your VR-ready browser and navigate to the URL provided by the development server (usually `http://localhost:8080` or similar).
5.  Click the "Enter VR" button.

## Next Steps (Post-PoC / Future Ideas)

- Implement Kùzu database connection and node data fetching.
- Visualize nodes as 3D spheres.
- Implement basic spatial distribution for nodes.
- Add basic VR interaction (e.g., teleportation if not already robust).
- Display node properties on selection.
- Visualize edges between nodes.
- Implement graph layout algorithms in 3D.
- Add in-VR querying capabilities.

## Project Structure

- `src/index.html`: Main HTML file.
- `src/index.js`: Main JavaScript entry point, initializes the experience.
- `src/init.js`: Core Three.js and WebXR scene setup logic.
- `Kuzu_Explore_3D_VR_PRD.md`: Product Requirements Document for the PoC.
- `package.json`: Project dependencies and scripts.
- `webpack.config.cjs`: Webpack configuration for bundling the application.
