/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// We will need THREE for scene manipulations later
// import * as THREE from 'three'; 

import { init } from './init.js';

// This function will be called once the basic scene is set up.
// For the PoC, we might add lights or placeholder objects here later.
function setupScene({ scene, camera, renderer, player, controllers }) {
	// PoC: Scene is initially empty, or with elements from init.js
	// We will add Kùzu node visualization logic here in future steps.
	console.log('PoC Scene Setup Called');
}

// This function is called every frame, like an update loop.
// For the PoC, it will be minimal.
function onFrame(delta, time, { scene, camera, renderer, player, controllers }) {
	// PoC: No per-frame updates needed yet.
}

// Initialize the WebXR environment and start the loop
init(setupScene, onFrame);
