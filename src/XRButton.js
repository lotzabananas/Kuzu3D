// Unified XR button that supports both VR and AR modes
class XRButton {
	static createButton(renderer, sessionInit = {}) {
		const button = document.createElement('button');
		let currentSession = null;
		let sessionMode = null; // Will be determined based on device support
		
		function showStartXR(mode) {
			sessionMode = mode;
			
			async function onSessionStarted(session) {
				session.addEventListener('end', onSessionEnded);
				
				// Set the session
				await renderer.xr.setSession(session);
				
				// Update button text
				button.textContent = mode === 'immersive-ar' ? 'EXIT AR' : 'EXIT VR';
				currentSession = session;
			}
			
			function onSessionEnded() {
				currentSession.removeEventListener('end', onSessionEnded);
				
				button.textContent = sessionMode === 'immersive-ar' ? 'ENTER AR' : 'ENTER VR';
				currentSession = null;
			}
			
			button.style.display = '';
			button.style.cursor = 'pointer';
			button.style.left = 'calc(50% - 50px)';
			button.style.width = '100px';
			button.textContent = mode === 'immersive-ar' ? 'ENTER AR' : 'ENTER VR';
			
			button.onmouseenter = function() {
				button.style.opacity = '1.0';
			};
			
			button.onmouseleave = function() {
				button.style.opacity = '0.5';
			};
			
			button.onclick = function() {
				if (currentSession === null) {
					// Configure session options based on mode
					const sessionOptions = {
						...sessionInit,
						requiredFeatures: [...(sessionInit.requiredFeatures || [])]
					};
					
					// Add mode-specific features
					if (mode === 'immersive-ar') {
						// AR mode - use local-floor reference space
						if (!sessionOptions.requiredFeatures.includes('local-floor')) {
							sessionOptions.requiredFeatures.push('local-floor');
						}
						sessionOptions.optionalFeatures = [
							'hand-tracking',
							'mesh-detection',
							'hit-test',
							...(sessionInit.optionalFeatures || [])
						];
					} else {
						// VR mode - use local-floor or bounded-floor
						if (!sessionOptions.requiredFeatures.includes('local-floor')) {
							sessionOptions.requiredFeatures.push('local-floor');
						}
						sessionOptions.optionalFeatures = [
							'hand-tracking',
							'bounded-floor',
							...(sessionInit.optionalFeatures || [])
						];
					}
					
					// Start XR session
					navigator.xr.requestSession(mode, sessionOptions)
						.then(onSessionStarted)
						.catch((error) => {
							console.error(`Failed to start ${mode} session:`, error);
							alert(`Failed to start ${mode === 'immersive-ar' ? 'AR' : 'VR'}: ${error.message}`);
						});
				} else {
					currentSession.end();
				}
			};
		}
		
		function disableButton() {
			button.style.display = '';
			button.style.cursor = 'auto';
			button.style.left = 'calc(50% - 75px)';
			button.style.width = '150px';
			button.onmouseenter = null;
			button.onmouseleave = null;
			button.onclick = null;
			button.textContent = 'XR NOT SUPPORTED';
		}
		
		function showXRNotSupported() {
			disableButton();
			button.textContent = 'XR NOT SUPPORTED';
		}
		
		function stylizeElement(element) {
			element.style.position = 'absolute';
			element.style.bottom = '20px';
			element.style.padding = '12px 6px';
			element.style.border = '1px solid #fff';
			element.style.borderRadius = '4px';
			element.style.background = 'rgba(0,0,0,0.1)';
			element.style.color = '#fff';
			element.style.font = 'normal 13px sans-serif';
			element.style.textAlign = 'center';
			element.style.opacity = '0.5';
			element.style.outline = 'none';
			element.style.zIndex = '999';
		}
		
		if ('xr' in navigator) {
			button.id = 'XRButton';
			button.style.display = 'none';
			
			stylizeElement(button);
			
			// Check for both AR and VR support
			Promise.all([
				navigator.xr.isSessionSupported('immersive-ar'),
				navigator.xr.isSessionSupported('immersive-vr')
			]).then(([arSupported, vrSupported]) => {
				if (arSupported) {
					// Prefer AR for passthrough on Quest 3
					showStartXR('immersive-ar');
				} else if (vrSupported) {
					// Fall back to VR
					showStartXR('immersive-vr');
				} else {
					showXRNotSupported();
				}
			}).catch(showXRNotSupported);
			
			return button;
		} else {
			const message = document.createElement('a');
			
			if (window.isSecureContext === false) {
				message.href = document.location.href.replace(/^http:/, 'https:');
				message.innerHTML = 'WEBXR NEEDS HTTPS';
			} else {
				message.href = 'https://immersiveweb.dev/';
				message.innerHTML = 'WEBXR NOT AVAILABLE';
			}
			
			message.style.left = 'calc(50% - 90px)';
			message.style.width = '180px';
			message.style.textDecoration = 'none';
			
			stylizeElement(message);
			
			return message;
		}
	}
}

export { XRButton };