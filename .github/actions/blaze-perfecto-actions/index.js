#!/usr/bin/env node

/**
 * index.js
 * Main entry point for the BlazeMeter Perfecto EUX GitHub Action
 * Routes operations to appropriate helper functions
 */

const core = require('@actions/core');
const { logInfo, logSuccess, logWarning, logError, logSection } = require('./src/logging-helper');
const blazemeterHelpers = require('./src/blazemeter-helpers');
const perfectoHelpers = require('./src/perfecto-helpers');
const preliminaryChecks = require('./src/preliminary-checks');

// Action version
const ACTION_VERSION = '1.0.0';

/**
 * Main execution function
 */
async function run() {
    try {
        logSection(`BlazeMeter Perfecto EUX Action v${ACTION_VERSION}`);
        logInfo(`Node.js version: ${process.version}`);
        logInfo(`Timestamp: ${new Date().toISOString()}`);

        // Get operation from environment
        const operation = process.env.OPERATION;
        if (!operation) {
            throw new Error('Operation not specified. Use OPERATION environment variable.');
        }

        logInfo(`Operation: ${operation}`);

        // Set debug mode if enabled
        if (process.env.DEBUG === 'true') {
            logInfo('Debug mode enabled');
        }

        // Route to appropriate handler
        switch (operation.toLowerCase()) {
            case 'preliminary-checks':
                await handlePreliminaryChecks();
                break;
            case 'blazemeter-start':
                await handleBlazeMeterStart();
                break;
            case 'blazemeter-stop':
                await handleBlazeMeterStop();
                break;
            case 'blazemeter-status':
                await handleBlazeMeterStatus();
                break;
            case 'blazemeter-update-load-configuration':
                await handleBlazeMeterUpdateLoadConfiguration();
                break;
            case 'perfecto-start':
                await handlePerfectoStart();
                break;
            case 'perfecto-stop':
                await handlePerfectoStop();
                break;
            case 'perfecto-status':
                await handlePerfectoStatus();
                break;
            case 'perfecto-continuous':
                await handlePerfectoContinuous();
                break;
            case 'perfecto-report-to-blaze-master':
                await handlePerfectoReportToBlazeMaster();
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }

        logSuccess('Operation completed successfully');
        core.setOutput('operation-status', 'PASSED');

    } catch (error) {
        logError(`Action failed: ${error.message}`);
        core.setOutput('operation-status', 'FAILED');
        core.setFailed(error.message);
        process.exit(1);
    }
}

/**
 * Handle preliminary checks operation
 */
async function handlePreliminaryChecks() {
    logSection('Running Preliminary Checks');

    const bzmTestId = process.env.BZM_TEST_ID || '';
    const bzmApiKey = process.env.BZM_API_KEY;
    const bzmApiSecret = process.env.BZM_API_SECRET;
    const bzmTestName = process.env.BZM_TEST_NAME;
    const bzmProjectId = process.env.BZM_PROJECT_ID;
    
    const perfectoCloud = process.env.PERFECTO_CLOUD;
    const perfectoToken = process.env.PERFECTO_TOKEN;
    const perfectoDeviceId = process.env.PERFECTO_DEVICE_ID;
    const perfectoScriptKey = process.env.PERFECTO_SCRIPT_KEY;

    // Validate required parameters
    if (!bzmApiKey || !bzmApiSecret) {
        throw new Error('BlazeMeter API key and secret are required for preliminary checks');
    }
    if (!perfectoCloud || !perfectoToken || !perfectoDeviceId || !perfectoScriptKey) {
        throw new Error('Perfecto cloud, token, device ID, and script key are required for preliminary checks');
    }

    let overallStatus = 'PASSED';

    try {
        // Check BlazeMeter test
        const blazemeterCheck = await blazemeterHelpers.checkBlazeMeterTest(
            bzmTestId, bzmApiKey, bzmApiSecret, bzmTestName, bzmProjectId
        );
        if (!blazemeterCheck) {
            overallStatus = 'FAILED';
        }

        // Check Perfecto connectivity
        const perfectoConnCheck = await perfectoHelpers.checkPerfectoConnectivity(perfectoCloud, perfectoToken);
        if (!perfectoConnCheck) {
            overallStatus = 'FAILED';
        }

        // Check Perfecto device (non-blocking)
        const deviceCheck = await perfectoHelpers.checkPerfectoDevice(perfectoCloud, perfectoToken, perfectoDeviceId);
        if (!deviceCheck && overallStatus === 'PASSED') {
            overallStatus = 'WARNING';
        }

        // Check Perfecto script (non-blocking)
        const scriptCheck = await perfectoHelpers.checkPerfectoScript(perfectoCloud, perfectoToken, perfectoScriptKey);
        if (!scriptCheck && overallStatus === 'PASSED') {
            overallStatus = 'WARNING';
        }

        // Set outputs
        core.setOutput('operation-status', overallStatus);
        core.setOutput('execution-summary', `Preliminary checks completed with status: ${overallStatus}`);

        if (overallStatus === 'FAILED') {
            throw new Error('Critical preliminary checks failed');
        }

    } catch (error) {
        core.setOutput('operation-status', 'FAILED');
        throw error;
    }
}

/**
 * Handle BlazeMeter start operation
 */
async function handleBlazeMeterStart() {
    logSection('Starting BlazeMeter Test');

    const bzmTestId = process.env.BZM_TEST_ID || '';
    const bzmApiKey = process.env.BZM_API_KEY;
    const bzmApiSecret = process.env.BZM_API_SECRET;
    const bzmTestName = process.env.BZM_TEST_NAME;
    const bzmProjectId = process.env.BZM_PROJECT_ID;
    const bzmDelayedStart = process.env.BZM_DELAYED_START === 'true';

    if (!bzmApiKey || !bzmApiSecret) {
        throw new Error('BlazeMeter API key and secret are required');
    }

    if (!bzmTestId || bzmTestId.trim() === '') {
        throw new Error('BlazeMeter test ID is required to start a test');
    }

    try {
        // Start the BlazeMeter test
        const startResult = await blazemeterHelpers.startBlazeMeterTest(
            bzmTestId, bzmApiKey, bzmApiSecret, bzmDelayedStart
        );

        // Set outputs
        core.setOutput('blazemeter-master-id', startResult.masterId);
        core.setOutput('blazemeter-test-id', startResult.testId);
        core.setOutput('blazemeter-status', startResult.status);
        core.setOutput('execution-summary', `BlazeMeter test started - Master ID: ${startResult.masterId}, Status: ${startResult.status}`);

        logSuccess(`BlazeMeter test started successfully`);
        logSuccess(`Master ID: ${startResult.masterId}`);
        logInfo(`Status: ${startResult.status}`);
        if (startResult.sessions && startResult.sessions.length > 0) {
            logInfo(`Sessions created: ${startResult.sessions.length}`);
        }

    } catch (error) {
        throw new Error(`Failed to start BlazeMeter test: ${error.message}`);
    }
}

/**
 * Handle BlazeMeter stop operation
 */
async function handleBlazeMeterStop() {
    logSection('Stopping BlazeMeter Test');

    const bzmMasterId = process.env.BZM_MASTER_ID;
    const bzmApiKey = process.env.BZM_API_KEY;
    const bzmApiSecret = process.env.BZM_API_SECRET;

    if (!bzmApiKey || !bzmApiSecret) {
        throw new Error('BlazeMeter API key and secret are required');
    }

    if (!bzmMasterId || bzmMasterId.trim() === '') {
        throw new Error('BlazeMeter master ID is required to stop a test');
    }

    try {
        // Stop the BlazeMeter test
        const stopResult = await blazemeterHelpers.stopBlazeMeterTest(
            bzmMasterId, bzmApiKey, bzmApiSecret
        );

        // Set outputs
        core.setOutput('blazemeter-master-id', stopResult.masterId);
        core.setOutput('blazemeter-status', stopResult.status);
        core.setOutput('execution-summary', `BlazeMeter test stopped - Master ID: ${stopResult.masterId}, Status: ${stopResult.status}`);

        logSuccess(`BlazeMeter test stop request sent successfully`);
        logSuccess(`Master ID: ${stopResult.masterId}`);
        logInfo(`Status: ${stopResult.status}`);
        if (stopResult.sessions && stopResult.sessions.length > 0) {
            logInfo(`Sessions being stopped: ${stopResult.sessions.length}`);
        }

    } catch (error) {
        throw new Error(`Failed to stop BlazeMeter test: ${error.message}`);
    }
}

/**
 * Handle BlazeMeter status operation
 */
async function handleBlazeMeterStatus() {
    logSection('Getting BlazeMeter Test Status');

    const bzmTestId = process.env.BZM_TEST_ID || '';
    const bzmApiKey = process.env.BZM_API_KEY;
    const bzmApiSecret = process.env.BZM_API_SECRET;
    const bzmTestName = process.env.BZM_TEST_NAME;
    const bzmProjectId = process.env.BZM_PROJECT_ID;

    const bzmMasterId = process.env.BZM_MASTER_ID || '';

    if (!bzmApiKey || !bzmApiSecret) {
        throw new Error('BlazeMeter API key and secret are required');
    }

    try {
        let masterId = bzmMasterId;
        let testId = bzmTestId;

        // If no master ID provided, get the latest master for the test
        if (!masterId || masterId.trim() === '') {
            const masterResult = await blazemeterHelpers.getLatestBlazeMeterTestMasterId(
                bzmTestId, bzmApiKey, bzmApiSecret, bzmTestName, bzmProjectId
            );
            masterId = masterResult.masterId;
            testId = masterResult.testId;
        }
        
        // Get status for the master
        const statusResult = await blazemeterHelpers.getBlazeMeterMasterStatus(
            masterId, bzmApiKey, bzmApiSecret
        );

        // Set outputs
        core.setOutput('blazemeter-master-id', masterId);
        core.setOutput('blazemeter-test-id', testId);
        core.setOutput('blazemeter-status', statusResult.status);
        core.setOutput('execution-summary', `BlazeMeter status: ${statusResult.status} - Master ID: ${masterId}`);

        logInfo(`BlazeMeter Status: ${statusResult.status}`);

    } catch (error) {
        throw new Error(`Failed to get BlazeMeter status: ${error.message}`);
    }
}

/**
 * Handle BlazeMeter update load configuration operation
 */
async function handleBlazeMeterUpdateLoadConfiguration() {
    logSection('Updating BlazeMeter Load Configuration');

    const bzmTestId = process.env.BZM_TEST_ID;
    const bzmApiKey = process.env.BZM_API_KEY;
    const bzmApiSecret = process.env.BZM_API_SECRET;
    const bzmConcurrency = process.env.BZM_CONCURRENCY;
    const bzmDuration = process.env.BZM_DURATION;
    const bzmRampup = process.env.BZM_RAMPUP;

    // Debug logging
    const isDebug = process.env.DEBUG === 'true';
    if (isDebug) {
        logInfo('Debug: Environment variables received:');
        logInfo(`  BZM_TEST_ID: ${bzmTestId ? '[SET]' : '[NOT SET]'}`);
        logInfo(`  BZM_API_KEY: ${bzmApiKey ? '[SET]' : '[NOT SET]'}`);
        logInfo(`  BZM_API_SECRET: ${bzmApiSecret ? '[SET]' : '[NOT SET]'}`);
        logInfo(`  BZM_CONCURRENCY: ${bzmConcurrency || 'undefined'}`);
        logInfo(`  BZM_DURATION: ${bzmDuration || 'undefined'}`);
        logInfo(`  BZM_RAMPUP: ${bzmRampup || 'undefined'}`);
    }

    if (!bzmTestId || !bzmApiKey || !bzmApiSecret) {
        throw new Error('BlazeMeter test ID, API key, and secret are required');
    }

    if (!bzmConcurrency || !bzmDuration || !bzmRampup) {
        throw new Error('Concurrency, duration, and ramp-up parameters are required');
    }

    try {
        const result = await blazemeterHelpers.updateBlazeMeterLoadConfiguration(
            bzmTestId, bzmApiKey, bzmApiSecret, 
            parseInt(bzmConcurrency), bzmDuration, bzmRampup
        );

        // Set outputs
        core.setOutput('blazemeter-test-id', result.testId);
        core.setOutput('blazemeter-payload', JSON.stringify(result.payload));
        core.setOutput('execution-summary', 
            `BlazeMeter load configuration updated - ${result.concurrency} users, ${result.duration} duration, ${result.rampUp} ramp-up`
        );

        logSuccess(`Load configuration updated for test ${result.testId}`);
        logInfo(`Configuration: ${result.concurrency} users, ${result.duration}, ramp-up ${result.rampUp}`);

        // Log location distribution if available
        if (Object.keys(result.locations).length > 0) {
            logInfo('User distribution:');
            for (const [location, users] of Object.entries(result.locations)) {
                logInfo(`  • ${location}: ${users} users`);
            }
        }

    } catch (error) {
        throw new Error(`Failed to update BlazeMeter load configuration: ${error.message}`);
    }
}

/**
 * Handle Perfecto start operation
 */
async function handlePerfectoStart() {
    logSection('Starting Perfecto Test');

    const perfectoCloud = process.env.PERFECTO_CLOUD;
    const perfectoToken = process.env.PERFECTO_TOKEN;
    const perfectoScriptKey = process.env.PERFECTO_SCRIPT_KEY;
    const perfectoDeviceId = process.env.PERFECTO_DEVICE_ID;
    
    // EUX options
    const perfectoEuxEnabled = process.env.PERFECTO_EUX_ENABLED === 'true';
    const bzmApiKey = process.env.BZM_API_KEY;
    const bzmApiSecret = process.env.BZM_API_SECRET;
    const bzmMasterId = process.env.BZM_MASTER_ID;

    if (!perfectoCloud || !perfectoToken || !perfectoScriptKey || !perfectoDeviceId) {
        throw new Error('Perfecto cloud, token, script key, and device ID are required');
    }

    // Prepare EUX options
    const euxOptions = {
        enabled: perfectoEuxEnabled,
        bzmApiKey: bzmApiKey,
        bzmApiSecret: bzmApiSecret,
        bzmMasterId: bzmMasterId
    };

    try {
        const result = await perfectoHelpers.startPerfectoTest(
            perfectoCloud, perfectoToken, perfectoScriptKey, perfectoDeviceId, euxOptions
        );

        // Handle both old and new return formats
        let executionId;
        let euxResult = null;
        
        if (typeof result === 'string') {
            // Old format - just execution ID
            executionId = result;
        } else {
            // New format - object with executionId and euxResult
            executionId = result.executionId;
            euxResult = result.euxResult;
        }

        // Set outputs
        core.setOutput('perfecto-execution-id', executionId);
        core.setOutput('perfecto-status', 'STARTED');
        
        let summary = `Perfecto test started - Execution ID: ${executionId}`;
        if (euxResult) {
            if (euxResult.status === 'SUCCESS') {
                summary += ` | EUX data sent: ${euxResult.intervalsPosted} intervals`;
                core.setOutput('intervals-posted', euxResult.intervalsPosted);
                core.setOutput('report-status', 'SUCCESS');
            } else {
                summary += ` | EUX reporting failed: ${euxResult.error || 'Unknown error'}`;
                core.setOutput('report-status', 'FAILED');
            }
        }
        
        core.setOutput('execution-summary', summary);

        logSuccess(`Perfecto Execution ID: ${executionId}`);
        if (euxResult) {
            logInfo(`EUX Result: ${euxResult.status}`);
        }

    } catch (error) {
        throw new Error(`Failed to start Perfecto test: ${error.message}`);
    }
}

/**
 * Handle Perfecto stop operation
 */
async function handlePerfectoStop() {
    logSection('Stopping Perfecto Test');

    const perfectoCloud = process.env.PERFECTO_CLOUD;
    const perfectoToken = process.env.PERFECTO_TOKEN;
    const perfectoExecutionId = process.env.PERFECTO_EXECUTION_ID;

    if (!perfectoCloud || !perfectoToken || !perfectoExecutionId) {
        throw new Error('Perfecto cloud, token, and execution ID are required');
    }

    try {
        const stopResult = await perfectoHelpers.sendStopRequest(perfectoExecutionId, perfectoCloud, perfectoToken);
        
        if (stopResult) {
            // Wait for graceful shutdown
            await perfectoHelpers.waitForShutdown(perfectoExecutionId, perfectoCloud, perfectoToken);
        }

        // Set outputs
        core.setOutput('perfecto-execution-id', perfectoExecutionId);
        core.setOutput('perfecto-status', 'STOPPED');
        core.setOutput('execution-summary', `Perfecto test stopped - Execution ID: ${perfectoExecutionId}`);

        logSuccess(`Perfecto test stopped: ${perfectoExecutionId}`);

    } catch (error) {
        throw new Error(`Failed to stop Perfecto test: ${error.message}`);
    }
}

/**
 * Handle Perfecto status operation
 */
async function handlePerfectoStatus() {
    logSection('Getting Perfecto Test Status');

    const perfectoCloud = process.env.PERFECTO_CLOUD;
    const perfectoToken = process.env.PERFECTO_TOKEN;
    const perfectoExecutionId = process.env.PERFECTO_EXECUTION_ID;

    if (!perfectoCloud || !perfectoToken || !perfectoExecutionId) {
        throw new Error('Perfecto cloud, token, and execution ID are required');
    }

    try {
        const statusResponse = await perfectoHelpers.getTestStatus(perfectoCloud, perfectoExecutionId, perfectoToken);
        
        // Parse status from response
        let status = 'Unknown';
        try {
            const statusJson = JSON.parse(statusResponse);
            status = statusJson.status || statusJson.state || statusJson.processingStatus || 'Unknown';
        } catch (parseError) {
            // Use raw response if JSON parsing fails
            status = statusResponse;
        }

        // Set outputs
        core.setOutput('perfecto-execution-id', perfectoExecutionId);
        core.setOutput('perfecto-status', status);
        core.setOutput('execution-summary', `Perfecto status: ${status} - Execution ID: ${perfectoExecutionId}`);

        logInfo(`Perfecto Status: ${status}`);

    } catch (error) {
        throw new Error(`Failed to get Perfecto status: ${error.message}`);
    }
}

/**
 * Handle Perfecto continuous operation
 */
async function handlePerfectoContinuous() {
    logSection('Starting Perfecto Continuous Testing');

    const perfectoCloud = process.env.PERFECTO_CLOUD;
    const perfectoToken = process.env.PERFECTO_TOKEN;
    const perfectoScriptKey = process.env.PERFECTO_SCRIPT_KEY;
    const perfectoDeviceId = process.env.PERFECTO_DEVICE_ID;
    const perfectoIterations = parseInt(process.env.PERFECTO_ITERATIONS || '-1', 10);
    
    // EUX options
    const perfectoEuxEnabled = process.env.PERFECTO_EUX_ENABLED === 'true';
    const bzmApiKey = process.env.BZM_API_KEY;
    const bzmApiSecret = process.env.BZM_API_SECRET;
    const bzmMasterId = process.env.BZM_MASTER_ID;
    if (!perfectoCloud || !perfectoToken || !perfectoScriptKey || !perfectoDeviceId) {
        throw new Error('Perfecto cloud, token, script key, and device ID are required');
    }

    // Prepare EUX options
    const euxOptions = {
        enabled: perfectoEuxEnabled,
        bzmApiKey: bzmApiKey,
        bzmApiSecret: bzmApiSecret,
        bzmMasterId: bzmMasterId
    };

    try {
        const result = await perfectoHelpers.runContinuousTests(
            perfectoCloud, perfectoToken, perfectoScriptKey, perfectoDeviceId, perfectoIterations, euxOptions
        );

        // Handle both old and new return formats
        let success;
        let totalEuxReports = 0;
        let successfulEuxReports = 0;
        
        if (typeof result === 'boolean') {
            // Old format - just success boolean
            success = result;
        } else {
            // New format - object with detailed results
            success = result.success;
            if (result.euxResults && result.euxResults.length > 0) {
                totalEuxReports = result.euxResults.length;
                successfulEuxReports = result.euxResults.filter(r => r.euxResult.status === 'SUCCESS').length;
            }
        }

        // Set outputs
        core.setOutput('perfecto-status', 'CONTINUOUS_COMPLETED');
        
        let summary = `Perfecto continuous testing completed with ${perfectoIterations} iterations`;
        if (totalEuxReports > 0) {
            summary += ` | EUX reports: ${successfulEuxReports}/${totalEuxReports} successful`;
            core.setOutput('intervals-posted', result.euxResults.reduce((sum, r) => sum + (r.euxResult.intervalsPosted || 0), 0));
            core.setOutput('report-status', successfulEuxReports > 0 ? 'SUCCESS' : 'FAILED');
        }
        
        core.setOutput('execution-summary', summary);

        logSuccess('Perfecto continuous testing completed');
        if (totalEuxReports > 0) {
            logInfo(`EUX Reports: ${successfulEuxReports}/${totalEuxReports} successful`);
        }

    } catch (error) {
        throw new Error(`Failed to run Perfecto continuous tests: ${error.message}`);
    }
}

/**
 * Handle Perfecto report to BlazeMeter master operation
 * Gets Perfecto execution commands, translates to BlazeMeter format, and posts as timeseries data
 */
async function handlePerfectoReportToBlazeMaster() {
    logSection('Reporting Perfecto EUX Data to BlazeMeter Master');

    // Get required environment variables
    const perfectoCloud = process.env.PERFECTO_CLOUD;
    const perfectoToken = process.env.PERFECTO_TOKEN;
    const perfectoExecutionId = process.env.PERFECTO_EXECUTION_ID;
    const perfectoExternalId = process.env.PERFECTO_EXTERNAL_ID;
    
    const bzmApiKey = process.env.BZM_API_KEY;
    const bzmApiSecret = process.env.BZM_API_SECRET;
    const bzmMasterId = process.env.BZM_MASTER_ID;
    const bzmTestName = process.env.BZM_TEST_NAME || process.env.PERFECTO_TEST_NAME || 'Perfecto EUX Test';

    // Validate required parameters
    if (!perfectoCloud || !perfectoToken) {
        throw new Error('Perfecto cloud and token are required');
    }

    if (!perfectoExecutionId && !perfectoExternalId) {
        throw new Error('Either Perfecto execution ID or external ID must be provided');
    }

    if (!bzmApiKey || !bzmApiSecret) {
        throw new Error('BlazeMeter API key and secret are required');
    }

    if (!bzmMasterId) {
        throw new Error('BlazeMeter master ID is required');
    }

    try {
        let executionId = perfectoExecutionId;

        // If only external ID provided, get execution ID first
        if (!executionId && perfectoExternalId) {
            logInfo(`Getting execution ID from external ID: ${perfectoExternalId}`);
            executionId = await perfectoHelpers.getExecutionIdFromExternalId(
                perfectoCloud, perfectoToken, perfectoExternalId
            );
            logSuccess(`Found execution ID: ${executionId}`);
        }

        // Step 1: Get Perfecto execution commands
        logInfo(`Fetching execution commands for ID: ${executionId}`);
        const commandsData = await perfectoHelpers.getTestExecutionCommands(
            perfectoCloud, perfectoToken, executionId
        );
        logSuccess('Successfully retrieved Perfecto execution commands');

        // Step 2: Translate commands to BlazeMeter timeseries format
        logInfo('Translating Perfecto commands to BlazeMeter timeseries format');
        const timeseriesData = await perfectoHelpers.translatePerfectoToBlazeMeterFormat(
            commandsData, parseInt(bzmMasterId), bzmTestName
        );
        logSuccess(`Translated to ${timeseriesData.intervals.length} BlazeMeter intervals`);

        // Step 3: Post timeseries data to BlazeMeter
        logInfo('Posting timeseries data to BlazeMeter');
        const postResult = await blazemeterHelpers.postTimeseriesData(
            bzmApiKey, bzmApiSecret, timeseriesData
        );
        logSuccess('Successfully posted timeseries data to BlazeMeter');

        // Set outputs
        core.setOutput('perfecto-execution-id', executionId);
        core.setOutput('bzm-master-id', bzmMasterId);
        core.setOutput('intervals-posted', timeseriesData.intervals.length.toString());
        core.setOutput('report-status', 'SUCCESS');

        logSuccess('Perfecto EUX data successfully reported to BlazeMeter master');

    } catch (error) {
        core.setOutput('report-status', 'FAILED');
        throw new Error(`Failed to report Perfecto data to BlazeMeter: ${error.message}`);
    }
}

// Execute the action
if (require.main === module) {
    run();
}

module.exports = {
    run,
    handlePreliminaryChecks,
    handleBlazeMeterStart,
    handleBlazeMeterStop,
    handleBlazeMeterStatus,
    handleBlazeMeterUpdateLoadConfiguration,
    handlePerfectoStart,
    handlePerfectoStop,
    handlePerfectoStatus,
    handlePerfectoContinuous,
    handlePerfectoReportToBlazeMaster
};
