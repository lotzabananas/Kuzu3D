/**
 * Remote Logger - sends frontend logs to backend terminal
 * Use this in VR to see logs in the terminal instead of trying to access browser console
 */

class RemoteLogger {
	constructor() {
		this.baseUrl = window.location.origin.replace(':8081', ':3000');
		this.logUrl = `${this.baseUrl}/api/log`;
	}

	async sendLog(level, message, data = null) {
		try {
			// Always log to console first as backup
			console.log(`[${level.toUpperCase()}]`, message, data);
			
			const response = await fetch(this.logUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					level,
					message,
					data
				})
			});
			
			if (!response.ok) {
				console.error('Remote logging HTTP error:', response.status);
			}
		} catch (error) {
			// Fallback to console if remote logging fails
			console.error('Remote logging failed:', error);
		}
	}

	info(message, data) {
		this.sendLog('info', message, data);
	}

	warn(message, data) {
		this.sendLog('warn', message, data);
	}

	error(message, data) {
		this.sendLog('error', message, data);
	}

	debug(message, data) {
		this.sendLog('debug', message, data);
	}
}

export const remoteLogger = new RemoteLogger();