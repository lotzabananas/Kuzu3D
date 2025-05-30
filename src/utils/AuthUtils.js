/**
 * Authentication utilities for API requests
 */

export class AuthUtils {
	static SESSION_KEY = 'kuzu_session_token';
	static API_KEY_HEADER = 'X-API-Key';
	
	/**
	 * Generate a simple session token (for basic security)
	 */
	static generateSessionToken() {
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
	}
	
	/**
	 * Get or create session token
	 */
	static getSessionToken() {
		let token = sessionStorage.getItem(this.SESSION_KEY);
		if (!token) {
			token = this.generateSessionToken();
			sessionStorage.setItem(this.SESSION_KEY, token);
		}
		return token;
	}
	
	/**
	 * Clear session token
	 */
	static clearSession() {
		sessionStorage.removeItem(this.SESSION_KEY);
	}
	
	/**
	 * Get authentication headers for API requests
	 */
	static getAuthHeaders() {
		const headers = {
			'Content-Type': 'application/json',
			'X-Session-Token': this.getSessionToken()
		};
		
		// Add timestamp for request validation
		headers['X-Request-Time'] = Date.now().toString();
		
		// Add origin validation
		headers['X-Origin'] = window.location.origin;
		
		return headers;
	}
	
	/**
	 * Validate API response for security
	 */
	static validateResponse(response) {
		// Check response headers for security indicators
		const securityHeaders = [
			'X-Content-Type-Options',
			'X-Frame-Options',
			'X-XSS-Protection'
		];
		
		const missingHeaders = securityHeaders.filter(header => 
			!response.headers.has(header)
		);
		
		if (missingHeaders.length > 0) {
			console.warn('Missing security headers:', missingHeaders);
		}
		
		// Validate content type
		const contentType = response.headers.get('Content-Type');
		if (contentType && !contentType.includes('application/json')) {
			console.warn('Unexpected content type:', contentType);
		}
		
		return true;
	}
	
	/**
	 * Create authenticated fetch request
	 */
	static async secureRequest(url, options = {}) {
		const authHeaders = this.getAuthHeaders();
		
		const secureOptions = {
			...options,
			headers: {
				...authHeaders,
				...options.headers
			},
			credentials: 'same-origin', // CSRF protection
			mode: 'cors'
		};
		
		try {
			const response = await fetch(url, secureOptions);
			
			// Validate response security
			this.validateResponse(response);
			
			// Check for authentication errors
			if (response.status === 401) {
				this.clearSession();
				throw new Error('Authentication failed');
			}
			
			if (response.status === 403) {
				throw new Error('Access denied');
			}
			
			if (response.status === 429) {
				throw new Error('Rate limit exceeded');
			}
			
			return response;
		} catch (error) {
			// Log security-related errors
			if (error.name === 'TypeError' && error.message.includes('fetch')) {
				console.error('Network security error:', error);
			}
			throw error;
		}
	}
	
	/**
	 * Validate request origin (CSRF protection)
	 */
	static validateOrigin(request) {
		const origin = request.headers.get('X-Origin');
		const referer = request.headers.get('Referer');
		const host = request.headers.get('Host');
		
		// In development, allow localhost variants
		const allowedOrigins = [
			`http://localhost:3000`,
			`https://localhost:3000`,
			`http://127.0.0.1:3000`,
			`https://127.0.0.1:3000`
		];
		
		// Add current host to allowed origins
		if (host) {
			allowedOrigins.push(`http://${host}`);
			allowedOrigins.push(`https://${host}`);
		}
		
		const isValidOrigin = origin && allowedOrigins.some(allowed => 
			origin.startsWith(allowed)
		);
		
		const isValidReferer = !referer || allowedOrigins.some(allowed => 
			referer.startsWith(allowed)
		);
		
		return isValidOrigin && isValidReferer;
	}
	
	/**
	 * Rate limiting for client-side requests
	 */
	static rateLimiter = new Map();
	
	static checkClientRateLimit(endpoint, maxRequests = 60, windowMs = 60000) {
		const now = Date.now();
		const key = `${endpoint}_${this.getSessionToken()}`;
		
		if (!this.rateLimiter.has(key)) {
			this.rateLimiter.set(key, []);
		}
		
		const requests = this.rateLimiter.get(key);
		
		// Remove old requests
		while (requests.length > 0 && requests[0] < now - windowMs) {
			requests.shift();
		}
		
		if (requests.length >= maxRequests) {
			return false;
		}
		
		requests.push(now);
		return true;
	}
}