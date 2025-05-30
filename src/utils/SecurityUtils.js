/**
 * Security utilities for input validation and sanitization
 */

export class SecurityUtils {
	/**
	 * Sanitize string input by removing dangerous characters
	 */
	static sanitizeString(input, maxLength = 1000) {
		if (!input || typeof input !== 'string') {
			return '';
		}
		
		return input
			.trim()
			.slice(0, maxLength)
			.replace(/[<>:"|?*]/g, '')
			.replace(/\x00/g, ''); // Remove null bytes
	}
	
	/**
	 * Validate and sanitize database path
	 */
	static validateDatabasePath(path) {
		if (!path || typeof path !== 'string') {
			return { valid: false, error: 'Database path is required and must be a string' };
		}
		
		const trimmed = path.trim();
		if (trimmed.length === 0) {
			return { valid: false, error: 'Database path cannot be empty' };
		}
		
		if (trimmed.length > 1000) {
			return { valid: false, error: 'Database path is too long' };
		}
		
		// Check for dangerous patterns
		const dangerousPatterns = [
			/\.\./,  // Directory traversal
			/\/etc\//i,  // System directories
			/\/var\//i,
			/\/usr\//i,
			/\/bin\//i,
			/\/sbin\//i,
			/system32/i,
			/windows/i
		];
		
		for (const pattern of dangerousPatterns) {
			if (pattern.test(trimmed)) {
				return { valid: false, error: 'Database path contains dangerous patterns' };
			}
		}
		
		const sanitized = this.sanitizeString(trimmed);
		return { valid: true, sanitized };
	}
	
	/**
	 * Validate Cypher query
	 */
	static validateCypherQuery(query) {
		if (!query || typeof query !== 'string') {
			return { valid: false, error: 'Query is required and must be a string' };
		}
		
		const trimmed = query.trim();
		if (trimmed.length === 0) {
			return { valid: false, error: 'Query cannot be empty' };
		}
		
		if (trimmed.length > 10000) {
			return { valid: false, error: 'Query is too long (max 10000 characters)' };
		}
		
		// Check for dangerous patterns
		const dangerousPatterns = [
			/drop\s+database/i,
			/delete\s+from/i,
			/truncate/i,
			/alter\s+database/i,
			/<script/i,
			/javascript:/i,
			/\bexec\b/i,
			/\beval\b/i
		];
		
		for (const pattern of dangerousPatterns) {
			if (pattern.test(trimmed)) {
				return { valid: false, error: 'Query contains potentially dangerous patterns' };
			}
		}
		
		return { valid: true, sanitized: trimmed };
	}
	
	/**
	 * Generate Content Security Policy headers
	 */
	static getCSPHeaders() {
		return {
			'Content-Security-Policy': [
				"default-src 'self'",
				"script-src 'self' 'unsafe-eval'", // Three.js needs unsafe-eval
				"style-src 'self' 'unsafe-inline'",
				"img-src 'self' data: blob:",
				"media-src 'self' blob:",
				"connect-src 'self' localhost:* 127.0.0.1:*",
				"worker-src 'self' blob:",
				"font-src 'self' data:",
				"object-src 'none'",
				"base-uri 'self'"
			].join('; ')
		};
	}
	
	/**
	 * Generate security headers for API responses
	 */
	static getSecurityHeaders() {
		return {
			...this.getCSPHeaders(),
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY',
			'X-XSS-Protection': '1; mode=block',
			'Referrer-Policy': 'strict-origin-when-cross-origin',
			'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(), payment=()'
		};
	}
	
	/**
	 * Rate limiting check (simple in-memory implementation)
	 */
	static rateLimiter = new Map();
	
	static checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
		const now = Date.now();
		const windowStart = now - windowMs;
		
		if (!this.rateLimiter.has(identifier)) {
			this.rateLimiter.set(identifier, []);
		}
		
		const requests = this.rateLimiter.get(identifier);
		
		// Remove old requests
		while (requests.length > 0 && requests[0] < windowStart) {
			requests.shift();
		}
		
		if (requests.length >= maxRequests) {
			return { allowed: false, remaining: 0 };
		}
		
		requests.push(now);
		return { allowed: true, remaining: maxRequests - requests.length };
	}
}