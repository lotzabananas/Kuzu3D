export class Logger {
	constructor(name, level = Logger.logLevels.INFO) {
		this.name = name;
		this.level = level;
	}
	
	error(message, ...args) {
		if (this.level >= Logger.logLevels.ERROR) {
			console.error(`[${this.name}] ERROR:`, message, ...args);
		}
	}
	
	warn(message, ...args) {
		if (this.level >= Logger.logLevels.WARN) {
			console.warn(`[${this.name}] WARN:`, message, ...args);
		}
	}
	
	info(message, ...args) {
		if (this.level >= Logger.logLevels.INFO) {
			console.log(`[${this.name}] INFO:`, message, ...args);
		}
	}
	
	debug(message, ...args) {
		if (this.level >= Logger.logLevels.DEBUG) {
			console.log(`[${this.name}] DEBUG:`, message, ...args);
		}
	}
}

// Define log levels as static property
Logger.logLevels = {
	ERROR: 0,
	WARN: 1,
	INFO: 2,
	DEBUG: 3
};

// Global logger instance
export const logger = new Logger('KuzuVR', Logger.logLevels.INFO);