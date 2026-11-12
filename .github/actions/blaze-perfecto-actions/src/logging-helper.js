/**
 * logging-helper.js
 * Shared logging functions for all Node.js scripts
 * Provides consistent colored output with emojis across all scripts
 */

// Colors for output
const colors = {
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    PURPLE: '\x1b[35m',
    NC: '\x1b[0m' // No Color
};

/**
 * Log an informational message
 * @param {string} message - The message to log
 */
function logInfo(message) {
    console.error(`${colors.BLUE}ℹ️  ${message}${colors.NC}`);
}

/**
 * Log a success message
 * @param {string} message - The message to log
 */
function logSuccess(message) {
    console.error(`${colors.GREEN}✅ ${message}${colors.NC}`);
}

/**
 * Log a warning message
 * @param {string} message - The message to log
 */
function logWarning(message) {
    console.error(`${colors.YELLOW}⚠️  ${message}${colors.NC}`);
}

/**
 * Log an error message
 * @param {string} message - The message to log
 */
function logError(message) {
    console.error(`${colors.RED}❌ ${message}${colors.NC}`);
}

/**
 * Log a section header message
 * @param {string} message - The message to log
 */
function logSection(message) {
    console.error(`${colors.PURPLE}🔍 ${message}${colors.NC}`);
}

/**
 * Log a stop/shutdown message
 * @param {string} message - The message to log
 */
function logStop(message) {
    console.error(`${colors.RED}🛑 ${message}${colors.NC}`);
}

module.exports = {
    logInfo,
    logSuccess,
    logWarning,
    logError,
    logSection,
    logStop,
    colors
};
