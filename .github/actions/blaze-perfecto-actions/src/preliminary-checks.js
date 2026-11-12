/**
 * preliminary-checks.js
 * Preliminary checks helper functions for GitHub Action
 * Extracted core functionality from original preliminary-checks.js
 */

const { logInfo, logSuccess, logWarning, logError, logSection } = require('./logging-helper');
const blazemeterHelpers = require('./blazemeter-helpers');
const perfectoHelpers = require('./perfecto-helpers');

/**
 * Validate common inputs
 * @param {string} bzmApiKey - BlazeMeter API key
 * @param {string} bzmApiSecret - BlazeMeter API secret
 * @param {string} perfectoCloud - Perfecto cloud name
 * @param {string} perfectoToken - Perfecto security token
 * @param {string} perfectoDeviceId - Perfecto device ID
 * @param {string} perfectoScriptKey - Perfecto script key
 * @returns {boolean} True if validation passes
 */
function validateInputs(bzmApiKey, bzmApiSecret, perfectoCloud, perfectoToken, perfectoDeviceId, perfectoScriptKey) {
    logInfo('Validating input parameters...');

    if (!bzmApiKey || bzmApiKey.trim() === '') {
        logError('BlazeMeter API key cannot be empty');
        return false;
    }

    if (!bzmApiSecret || bzmApiSecret.trim() === '') {
        logError('BlazeMeter API secret cannot be empty');
        return false;
    }

    if (!perfectoCloud || perfectoCloud.trim() === '') {
        logError('Perfecto cloud name cannot be empty');
        return false;
    }

    if (!perfectoToken || perfectoToken.trim() === '') {
        logError('Perfecto security token cannot be empty');
        return false;
    }

    if (!perfectoDeviceId || perfectoDeviceId.trim() === '') {
        logError('Perfecto device ID cannot be empty');
        return false;
    }

    if (!perfectoScriptKey || perfectoScriptKey.trim() === '') {
        logError('Perfecto script key cannot be empty');
        return false;
    }

    // Additional validation warnings
    if (bzmApiKey.length < 10) {
        logWarning(`BlazeMeter API key seems short (${bzmApiKey.length} characters) - this may be invalid`);
    }

    if (perfectoToken.length < 10) {
        logWarning(`Perfecto security token seems short (${perfectoToken.length} characters) - this may be invalid`);
    }

    if (!perfectoScriptKey.match(/^(PRIVATE|PUBLIC)/)) {
        logWarning("Perfecto script key doesn't start with PRIVATE or PUBLIC - this may be invalid");
    }

    logSuccess('Input validation completed');
    return true;
}

/**
 * Run comprehensive preliminary checks
 * @param {string} bzmTestId - BlazeMeter test ID
 * @param {string} bzmApiKey - BlazeMeter API key
 * @param {string} bzmApiSecret - BlazeMeter API secret
 * @param {string} bzmTestName - BlazeMeter test name
 * @param {string} bzmProjectId - BlazeMeter project ID
 * @param {string} perfectoCloud - Perfecto cloud name
 * @param {string} perfectoToken - Perfecto security token
 * @param {string} perfectoDeviceId - Perfecto device ID
 * @param {string} perfectoScriptKey - Perfecto script key
 * @returns {Promise<string>} Status: PASSED, WARNING, or FAILED
 */
async function runPreliminaryChecks(bzmTestId, bzmApiKey, bzmApiSecret, bzmTestName, bzmProjectId, perfectoCloud, perfectoToken, perfectoDeviceId, perfectoScriptKey) {
    logSection('=== BlazeMeter + Perfecto Preliminary Checks ===');
    logInfo(`Timestamp: ${new Date().toISOString()}`);

    // Validate inputs
    if (!validateInputs(bzmApiKey, bzmApiSecret, perfectoCloud, perfectoToken, perfectoDeviceId, perfectoScriptKey)) {
        return 'FAILED';
    }

    // Log masked parameters for debugging
    logInfo('Parameters (masked):');
    logInfo(`  • BlazeMeter Test ID: ${bzmTestId || '(search by name)'}`);
    logInfo(`  • BlazeMeter API Key: ${bzmApiKey.substring(0, 8)}***`);
    logInfo(`  • Perfecto Cloud: ${perfectoCloud}`);
    logInfo(`  • Perfecto Token: ${perfectoToken.substring(0, 8)}***`);
    logInfo(`  • Device ID: ${perfectoDeviceId}`);
    logInfo(`  • Script Key: ${perfectoScriptKey}`);
    logInfo(`  • Test Name: ${bzmTestName}`);
    logInfo(`  • Project ID: ${bzmProjectId}`);

    let overallStatus = 'PASSED';

    try {
        // Check BlazeMeter test
        logInfo('');
        if (!await blazemeterHelpers.checkBlazeMeterTest(bzmTestId, bzmApiKey, bzmApiSecret, bzmTestName, bzmProjectId)) {
            logError('BlazeMeter test check failed');
            overallStatus = 'FAILED';
        }

        // Check Perfecto connectivity
        logInfo('');
        if (!await perfectoHelpers.checkPerfectoConnectivity(perfectoCloud, perfectoToken)) {
            logError('Perfecto connectivity check failed');
            overallStatus = 'FAILED';
        }

        // Check Perfecto device (non-blocking)
        logInfo('');
        if (!await perfectoHelpers.checkPerfectoDevice(perfectoCloud, perfectoToken, perfectoDeviceId)) {
            logWarning('Perfecto device check had issues (non-blocking)');
            if (overallStatus === 'PASSED') {
                overallStatus = 'WARNING';
            }
        }

        // Check Perfecto script (non-blocking)
        logInfo('');
        if (!await perfectoHelpers.checkPerfectoScript(perfectoCloud, perfectoToken, perfectoScriptKey)) {
            logWarning('Perfecto script check had issues (non-blocking)');
            if (overallStatus === 'PASSED') {
                overallStatus = 'WARNING';
            }
        }

        // Final status
        logInfo('');
        logSection('Preliminary Checks Summary');

        switch (overallStatus) {
            case 'PASSED':
                logSuccess('=== All Preliminary Checks Passed ===');
                logSuccess('✅ BlazeMeter test is accessible');
                logSuccess('✅ Perfecto cloud connectivity verified');
                logSuccess('✅ Perfecto device and script checks completed');
                logSuccess('Ready to start BlazeMeter and Perfecto tests!');
                break;
            case 'WARNING':
                logWarning('=== Preliminary Checks Completed with Warnings ===');
                logWarning('⚠️  Some non-critical checks had issues');
                logWarning('Tests may still proceed but monitor for issues');
                break;
            case 'FAILED':
                logError('=== Preliminary Checks Failed ===');
                logError('❌ Critical issues found that may prevent test execution');
                logError('Please resolve the issues above before proceeding');
                break;
        }

        return overallStatus;

    } catch (error) {
        logError(`Unexpected error during preliminary checks: ${error.message}`);
        return 'FAILED';
    }
}

module.exports = {
    validateInputs,
    runPreliminaryChecks
};
