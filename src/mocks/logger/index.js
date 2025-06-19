export class ConsoleLogger {
    info(message, ...args) {
        console.log(`[INFO] ${message}`, ...args);
    }
    warn(message, ...args) {
        console.warn(`[WARN] ${message}`, ...args);
    }
    error(message, ...args) {
        console.error(`[ERROR] ${message}`, ...args);
    }
    debug(message, ...args) {
        console.debug(`[DEBUG] ${message}`, ...args);
    }
}
//# sourceMappingURL=index.js.map