/**
 * perfecto-helpers.js
 * Perfecto API helper functions for GitHub Action
 * Extracted core functionality from/**
 * St/**
 * Start a Perfecto test execution
 * @param {string} cloudName - Perfecto cloud name
 * @param {string} securityToken - Perfecto security token
 * @param {string} scriptKey - Perfecto script key
/**
 * perfecto-helpers.js
 * Perfecto API helper functions for GitHub Action
 * Extracted core functionality from original perfecto-helpers.js
 */

const https = require('https');
const { URL } = require('url');
const { logInfo, logSuccess, logWarning, logError, logSection, logStop } = require('./logging-helper');
const { makeSimpleHttpCall } = require('./blazemeter-helpers');

// Configuration constants
const STATUS_CHECK_DELAY = 5000; // 5 seconds in milliseconds
const SHUTDOWN_TIMEOUT = 60000; // 60 seconds in milliseconds
const SHUTDOWN_CHECK_INTERVAL = 5000; // 5 seconds in milliseconds
const PROCESSING_CHECK_DELAY = 10000; // 10 seconds in milliseconds
const PROCESSING_TIMEOUT = 600000; // 5 minutes in milliseconds

/**
 * Make HTTP request to Perfecto API
 * @param {string} url - The URL to call
 * @param {string} method - HTTP method
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} Response object
 */
async function makeHttpRequest(url, method = 'GET', headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            timeout: 30000
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

/**
 * URL encode script key if needed
 * @param {string} scriptKey - The script key to encode
 * @returns {string} Encoded script key
 */
function encodeScriptKey(scriptKey) {
    // Check if already encoded
    if (/%[0-9A-Fa-f]{2}/.test(scriptKey)) {
        logInfo('Script key appears to be already URL encoded');
        return scriptKey;
    }
    
    // URL encode colon character
    return scriptKey.replace(/:/g, '%3A');
}

/**
 * Start Perfecto test execution
 * @param {string} cloudName - Perfecto cloud name
 * @param {string} securityToken - Perfecto security token
 * @param {string} scriptKey - Perfecto script key
 * @param {string} deviceId - Perfecto device ID
 * @param {Object} euxOptions - Optional EUX reporting options
 * @param {boolean} euxOptions.enabled - Whether to enable EUX reporting (default: false)
 * @param {string} euxOptions.bzmApiKey - BlazeMeter API key
 * @param {string} euxOptions.bzmApiSecret - BlazeMeter API secret
 * @param {string} euxOptions.bzmMasterId - BlazeMeter master ID
 * @returns {Promise<Object>} Result object with execution ID and EUX status
 */
async function startPerfectoTest(cloudName, securityToken, scriptKey, deviceId, euxOptions = {}) {
    logInfo('Starting Perfecto scriptless test...');
    logInfo(`Cloud: ${cloudName}`);
    logInfo(`Script Key: ${scriptKey}`);
    logInfo(`Device ID: ${deviceId}`);
    
    if (euxOptions.enabled) {
        logInfo('EUX reporting enabled - will wait for processing completion');
    }
    
    // Test connectivity and authentication first
    if (!(await checkPerfectoConnectivity(cloudName, securityToken))) {
        throw new Error('Perfecto connectivity and authentication test failed');
    }
    
    // URL encode script key if needed
    const encodedScriptKey = encodeScriptKey(scriptKey);
    logInfo(`Encoded Script Key: ${encodedScriptKey}`);
    
    // Build execution URL
    const perfectoUrl = `https://${cloudName}.perfectomobile.com/services/executions`;
    const executionUrl = `${perfectoUrl}?operation=execute&scriptKey=${encodedScriptKey}&param.DUT=${deviceId}&securityToken=${securityToken}`;
    
    logInfo(`Perfecto Base URL: ${perfectoUrl}`);
    logInfo(`Full execution URL (token masked): ${executionUrl.replace(/securityToken=[^&]*/, 'securityToken=***')}`);
    
    // Make API call to start test
    logInfo('Making API call to start test execution...');
    
    try {
        const response = await makeHttpRequest(executionUrl, 'POST');
        
        logInfo(`API Response HTTP Code: ${response.statusCode}`);
        
        if (response.statusCode !== 200) {
            logError(`API request failed with HTTP status: ${response.statusCode}`);
            if (response.body) {
                logError(`Response: ${response.body}`);
            }
            throw new Error(`API request failed with status ${response.statusCode}`);
        }
        
        // Parse execution ID from response
        if (!response.body) {
            throw new Error('Empty response from Perfecto API');
        }
        
        logInfo(`Raw API Response: ${response.body}`);
        
        let executionId;
        try {
            const jsonResponse = JSON.parse(response.body);
            executionId = jsonResponse.executionId || jsonResponse.id || jsonResponse.execution_id;
        } catch (parseError) {
            // Try regex extraction as fallback
            const match = response.body.match(/executionId["']*:["']*([^"'\\s,}]+)/);
            if (match) {
                executionId = match[1];
            } else {
                const idMatch = response.body.match(/"id"["']*:["']*([^"'\\s,}]+)/);
                if (idMatch) {
                    executionId = idMatch[1];
                }
            }
        }
        
        if (!executionId) {
            logError('Failed to extract execution ID from response');
            logError(`Response: ${response.body}`);
            throw new Error('Failed to extract execution ID');
        }
        
        logSuccess('Successfully started test execution');
        logSuccess(`Execution ID: ${executionId}`);
        
        // Handle EUX processing if enabled
        let euxResult = null;
        if (euxOptions.enabled && euxOptions.bzmApiKey && euxOptions.bzmApiSecret && euxOptions.bzmMasterId) {
            logInfo('EUX reporting enabled, waiting for processing completion...');
            try {
                euxResult = await sendPerfectoExecutionMetricsToBlazeMeterReport(
                    cloudName, 
                    securityToken, 
                    executionId, 
                    euxOptions.bzmApiKey, 
                    euxOptions.bzmApiSecret, 
                    euxOptions.bzmMasterId
                );
            } catch (euxError) {
                logWarning(`EUX processing failed: ${euxError.message}`);
                euxResult = { status: 'FAILED', error: euxError.message, intervalsPosted: 0 };
            }
        }
        
        // Return object with execution ID and EUX status
        return {
            executionId: executionId,
            euxResult: euxResult
        };
        
    } catch (error) {
        logError(`Network error: ${error.message}`);
        throw error;
    }
}

/**
 * Get test status from Perfecto API
 * @param {string} cloudName - Perfecto cloud name
 * @param {string} externalId - Perfecto external ID (required for status API)
 * @param {string} securityToken - Perfecto security token
 * @returns {Promise<string>} Status response
 */
async function getTestExecutionStatusResponse(cloudName, externalId, securityToken) {
    logInfo(`Retrieving test status for external ID: ${externalId}`);
    
    // Build status URL using the export API with externalId parameter
    const statusUrl = `https://${cloudName}.app.perfectomobile.com/export/api/v3/test-executions?externalId=${encodeURIComponent(externalId)}`;
    
    logInfo(`Status URL: ${statusUrl}`);
    
    try {
        const response = await makeHttpRequest(statusUrl, 'GET', {
            'Perfecto-Authorization': securityToken
        });
        
        logInfo(`Status API Response HTTP Code: ${response.statusCode}`);
        
        if (response.statusCode !== 200) {
            logError(`Status API request failed with HTTP status: ${response.statusCode}`);
            if (response.body) {
                logError(`Response: ${response.body}`);
            }
            throw new Error(`Status API request failed with status ${response.statusCode}`);
        }
        
        if (!response.body) {
            throw new Error('Empty response from Perfecto status API');
        }
        
        return response.body;
        
    } catch (error) {
        logError(`Network error: Unable to connect to Perfecto API for status check - ${error.message}`);
        throw error;
    }
}



/**
 * Send stop request to Perfecto
 * @param {string} executionId - Perfecto execution ID
 * @param {string} cloudName - Perfecto cloud name
 * @param {string} securityToken - Perfecto security token
 * @returns {Promise<boolean>} True if stop request successful
 */
async function sendPerfectoStopTestRequest(executionId, cloudName, securityToken) {
    logStop(`Sending stop request for execution ID: ${executionId}`);
    
    const stopUrl = `https://${cloudName}.perfectomobile.com/services/executions/${executionId}?operation=stop&securityToken=${securityToken}`;
    
    logInfo(`Stop URL (token masked): ${stopUrl.replace(/securityToken=[^&]*/, 'securityToken=***')}`);
    
    logInfo('Sending POST request to stop test execution...');
    
    try {
        const response = await makeHttpRequest(stopUrl, 'POST');
        
        logInfo(`HTTP Status Code: ${response.statusCode}`);
        
        // Check for successful HTTP status codes (2xx)
        if (response.statusCode >= 200 && response.statusCode < 300) {
            logInfo(`Stop request response: ${response.body}`);
            logSuccess(`Stop request sent successfully (HTTP ${response.statusCode})`);
            return true;
        } else {
            logError(`Stop request failed with HTTP status code: ${response.statusCode}`);
            logError(`Response body: ${response.body}`);
            return false;
        }
    } catch (error) {
        logError(`Stop request failed: ${error.message}`);
        return false;
    }
}

/**
 * Wait for graceful shutdown
 * @param {string} executionId - Perfecto execution ID (for metrics)
 * @param {string} cloudName - Perfecto cloud name
 * @param {string} securityToken - Perfecto security token
 * @param {string} externalId - Perfecto external ID (for status checks, optional)
 * @returns {Promise<void>}
 */
async function waitForPerfectoTestCompletion(executionId, cloudName, securityToken, externalId = null) {
    logInfo(`Waiting for graceful shutdown (timeout: ${SHUTDOWN_TIMEOUT/1000}s)...`);
    
    let shutdownElapsed = 0;
    
    while (shutdownElapsed < SHUTDOWN_TIMEOUT) {
        try {
            // Use externalId for status check if provided, otherwise fall back to executionId
            const statusId = externalId || executionId;
            const finalStatusResponse = await getTestExecutionStatusResponse(cloudName, statusId, securityToken);
            let finalStatus;
            
            try {
                const jsonResponse = JSON.parse(finalStatusResponse);
                finalStatus = jsonResponse.status || jsonResponse.state || jsonResponse.result || 'Unknown';
            } catch (parseError) {
                finalStatus = 'Unknown';
            }
            
            logInfo(`Shutdown status: ${finalStatus} (Elapsed: ${shutdownElapsed/1000}s)`);
            
            switch (finalStatus.toUpperCase()) {
                case 'COMPLETED':
                case 'ENDED':
                case 'SUCCESS':
                case 'FINISHED':
                    logSuccess('Perfecto test gracefully stopped');
                    return;
                case 'FAILED':
                case 'ERROR':
                    logWarning(`Perfecto test ended with status: ${finalStatus}`);
                    return;
            }
        } catch (error) {
            // Ignore errors during shutdown check
        }
        
        await new Promise(resolve => setTimeout(resolve, SHUTDOWN_CHECK_INTERVAL));
        shutdownElapsed += SHUTDOWN_CHECK_INTERVAL;
    }
    
    if (shutdownElapsed >= SHUTDOWN_TIMEOUT) {
        logWarning('Perfecto test shutdown timed out, but continuing pipeline');
    }
}

/**
 * Get execution ID from external ID by polling until processing is complete
 * @param {string} cloudName - Perfecto cloud name
 * @param {string} securityToken - Perfecto security token
 * @param {string} externalId - External ID from test execution
 * @returns {Promise<string>} Execution ID
 * @private
 */
async function getExecutionIdFromExternalId(cloudName, securityToken, externalId) {
    logInfo(`Getting execution ID for external ID: ${externalId}`);
    
    try {
        // Use the new completion check function
        const completionResult = await waitForPerfectoTestExecutionData(
            cloudName, 
            securityToken, 
            externalId, 
            PROCESSING_TIMEOUT, 
            PROCESSING_CHECK_DELAY
        );
        
        if (!completionResult.isComplete || !completionResult.executionId) {
            throw new Error('Test execution completion check failed or execution ID not found');
        }
        
        logSuccess(`Execution ID retrieved: ${completionResult.executionId}`);
        return completionResult.executionId;
        
    } catch (error) {
        logError(`Failed to get execution ID: ${error.message}`);
        throw error;
    }
}

/**
 * Check Perfecto cloud connectivity
 * @param {string} perfectoCloud - Perfecto cloud name
 * @param {string} perfectoToken - Perfecto security token
 * @returns {Promise<boolean>} True if connectivity successful
 */
async function checkPerfectoConnectivity(perfectoCloud, perfectoToken) {
    logSection('Checking Perfecto Cloud Connectivity');

    try {
        // Test basic connectivity
        const perfectoUrl = `https://${perfectoCloud}.perfectomobile.com`;
        logInfo(`Testing connectivity to: ${perfectoUrl}`);

        const connectivityResponse = await makeSimpleHttpCall(perfectoUrl, {
            timeout: 30000
        });

        if (connectivityResponse.statusCode === 0) {
            logError(`Cannot connect to Perfecto cloud: ${perfectoUrl}`);
            return false;
        }

        logSuccess('Basic connectivity to Perfecto cloud verified');

        // Test API authentication
        logInfo('Testing Perfecto API authentication...');
        const authUrl = `${perfectoUrl}/services/handsets?securityToken=${perfectoToken}&operation=list`;
        
        const authResponse = await makeSimpleHttpCall(authUrl, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (authResponse.statusCode >= 400) {
            logError(`HTTP Error ${authResponse.statusCode} received`);
            logError('Failed to authenticate with Perfecto API');
            return false;
        }

        logSuccess('Perfecto API authentication successful');
        return true;

    } catch (error) {
        logError(`Perfecto connectivity check failed: ${error.message}`);
        return false;
    }
}

/**
 * Check Perfecto device availability
 * @param {string} perfectoCloud - Perfecto cloud name
 * @param {string} perfectoToken - Perfecto security token
 * @param {string} deviceId - Perfecto device ID
 * @returns {Promise<boolean>} True if device check successful
 */
async function checkPerfectoDevice(perfectoCloud, perfectoToken, deviceId) {
    logSection('Checking Perfecto Device Availability');

    try {
        logInfo(`Checking device availability: ${deviceId}`);

        const deviceUrl = `https://${perfectoCloud}.app.perfectomobile.com/api/v1/device-management/devices`;
        const requestBody = JSON.stringify({
            device: {
                deviceId: deviceId
            }
        });

        const deviceResponse = await makeSimpleHttpCall(deviceUrl, {
            method: 'POST',
            headers: {
                'Perfecto-Authorization': perfectoToken,
                'Content-Type': 'application/json'
            },
            body: requestBody
        });

        if (deviceResponse.statusCode >= 400) {
            logError(`HTTP Error ${deviceResponse.statusCode} received`);
            logError(`Failed to get device information for: ${deviceId}`);
            return false;
        }

        logSuccess('Device information retrieved successfully');
        return true;

    } catch (error) {
        logWarning(`Perfecto device check had issues: ${error.message}`);
        return false;
    }
}

/**
 * Check Perfecto script accessibility
 * @param {string} perfectoCloud - Perfecto cloud name
 * @param {string} perfectoToken - Perfecto security token
 * @param {string} scriptKey - Perfecto script key
 * @returns {Promise<boolean>} True if script check successful
 */
async function checkPerfectoScript(perfectoCloud, perfectoToken, scriptKey) {
    logSection('Checking Perfecto Script Accessibility');

    try {
        logInfo(`Checking script accessibility: ${scriptKey}`);

        // URL encode script key if needed
        let encodedScriptKey = scriptKey;
        if (!scriptKey.includes('%')) {
            encodedScriptKey = scriptKey.replace(/:/g, '%3A');
        }

        const scriptUrl = `https://${perfectoCloud}.app.perfectomobile.com/native-automation-webapp/rest/v1/native-automation/script?itemKey=${encodedScriptKey}`;

        const scriptResponse = await makeSimpleHttpCall(scriptUrl, {
            headers: {
                'Content-Type': 'application/json',
                'Perfecto-Authorization': perfectoToken
            }
        });

        if (scriptResponse.statusCode >= 400) {
            logWarning('Could not directly verify script accessibility');
            logInfo('Script will be verified during test execution');
            return true;
        }

        logSuccess('Script appears to be accessible');
        return true;

    } catch (error) {
        logWarning(`Perfecto script check had issues: ${error.message}`);
        return true;
    }
}

/**
 * Run continuous test iterations
 * @param {string} cloudName - Perfecto cloud name
 * @param {string} securityToken - Perfecto security token
 * @param {string} scriptKey - Perfecto script key
 * @param {string} deviceId - Perfecto device ID
 * @param {number} iterations - Number of iterations (-1 for infinite)
 * @param {Object} options - Options object
 * @param {string} options.bzmApiKey - BlazeMeter API key (optional)
 * @param {string} options.bzmApiSecret - BlazeMeter API secret (optional)
 * @param {string} options.bzmMasterId - BlazeMeter master ID (optional)
 * @param {number} options.delayBetweenTests - Delay between tests in milliseconds (default: 10000)
 * @returns {Promise<Object>} Result object with success status and results
 */
async function startPerfectoTestLoop(cloudName, securityToken, scriptKey, deviceId, iterations, options = {}) {
    logInfo('Starting continuous test execution...');
    logInfo(`Iterations: ${iterations === -1 ? 'infinite' : iterations}`);
    
    const {
        bzmApiKey,
        bzmApiSecret,
        bzmMasterId,
        delayBetweenTests = 10000
    } = options;
    
    const sendToBlazeMeter = !!(bzmApiKey && bzmApiSecret && bzmMasterId);
    if (sendToBlazeMeter) {
        logInfo(`BlazeMeter reporting enabled - Master ID: ${bzmMasterId}`);
    }
    
    let iterationCount = 0;
    let successfulRuns = 0;
    let failedRuns = 0;
    let results = [];
    
    // For GitHub Actions, limit infinite runs to prevent endless execution
    const maxIterations = iterations === -1 ? 10 : iterations;
    
    while (iterationCount < maxIterations) {
        iterationCount++;
        logInfo(`=== Starting Iteration ${iterationCount} ===`);
        
        try {
            // 1. Start Perfecto test
            const testResult = await startPerfectoTest(cloudName, securityToken, scriptKey, deviceId);
            const executionId = testResult.executionId || testResult;
            logSuccess(`Test started - Execution ID: ${executionId}`);
            
            // 2. Wait for test to complete using the existing completion function
            logInfo('Waiting for test to complete...');
            try {
                await waitForPerfectoTestCompletion(executionId, cloudName, securityToken, executionId);
                logSuccess('Test completed successfully');
                successfulRuns++;
            } catch (completionError) {
                logWarning(`Test completion failed: ${completionError.message}`);
                failedRuns++;
                continue;
            }
    
            
            // 3. Check if BlazeMeter test is still running (if configured)
            let blazeMeterStillRunning = true;
            if (sendToBlazeMeter) {
                try {
                    const blazemeterHelpers = require('./blazemeter-helpers');
                    
                    // Get the status for the specific master ID we're using
                    const masterStatusResult = await blazemeterHelpers.getBlazeMeterMasterStatus(
                        bzmMasterId,
                        bzmApiKey,
                        bzmApiSecret
                    );
                    
                    const status = masterStatusResult.status;
                    blazeMeterStillRunning = !['ENDED', 'ERROR', 'FAILURE'].includes(status.toUpperCase());
                    logInfo(`BlazeMeter master status: ${status} (still running: ${blazeMeterStillRunning})`);
                    
                    if (!blazeMeterStillRunning) {
                        logInfo('BlazeMeter test has ended, stopping continuous loop');
                        break;
                    }else{
                        try {
                            const result = await sendPerfectoExecutionMetricsToBlazeMeterReport(
                                cloudName, 
                                securityToken, 
                                executionId,
                                bzmApiKey, 
                                bzmApiSecret, 
                                bzmMasterId
                            );

                        } catch (error) {
                            logError(`Failed to send Perfecto execution metrics to BlazeMeter: ${error.message}`);
                            throw error;
                        }
                    }
                } catch (statusError) {
                    logWarning(`Could not check BlazeMeter status: ${statusError.message}`);
                    // Continue anyway
                }
            }
            
            results.push({
                iteration: iterationCount,
                executionId: executionId,
                blazeMeterResult: blazeMeterResult
            });
            
            // 5. Wait before next iteration (if not last iteration)
            if (iterationCount < maxIterations && blazeMeterStillRunning) {
                logInfo(`Waiting ${delayBetweenTests/1000}s before next iteration...`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenTests));
            }
            
        } catch (error) {
            logError(`Failed in iteration ${iterationCount}: ${error.message}`);
            failedRuns++;
        }
    }
    
    // Final summary
    logSuccess('=== Continuous Test Execution Completed ===');
    logInfo(`Total iterations: ${iterationCount}`);
    logInfo(`Successful runs: ${successfulRuns}`);
    logInfo(`Failed runs: ${failedRuns}`);
    
    if (sendToBlazeMeter) {
        const successfulReports = results.filter(r => r.blazeMeterResult?.status === 'SUCCESS').length;
        logInfo(`BlazeMeter reports sent: ${successfulReports}/${results.length}`);
    }
    
    return {
        success: successfulRuns > 0,
        totalIterations: iterationCount,
        successfulRuns: successfulRuns,
        failedRuns: failedRuns,
        results: results
    };
}

/**
 * Get test execution commands from Perfecto API
 * @param {string} cloudName - Perfecto cloud name
 * @param {string} securityToken - Perfecto security token
 * @param {string} executionId - Perfecto execution ID
 * @returns {Promise<Object>} Commands response as JSON object
 * @private
 */
async function getPerfectoTestExecutionMetrics(cloudName, securityToken, executionId) {
    logInfo(`Getting test execution commands for execution ID: ${executionId}`);
    
    const commandsUrl = `https://${cloudName}.app.perfectomobile.com/export/api/v3/test-executions/${executionId}/commands`;
    
    logInfo(`Commands URL: ${commandsUrl}`);
    
    try {
        const response = await makeHttpRequest(commandsUrl, 'GET', {
            'Content-Type': 'application/json',
            'Perfecto-Authorization': securityToken
        });
        
        logInfo(`Commands API Response HTTP Code: ${response.statusCode}`);
        
        if (response.statusCode !== 200) {
            logError(`Commands API request failed with HTTP status: ${response.statusCode}`);
            if (response.body) {
                logError(`Response: ${response.body}`);
            }
            throw new Error(`Commands API request failed with status ${response.statusCode}`);
        }
        
        if (!response.body) {
            throw new Error('Empty response from Perfecto commands API');
        }
        
        // Parse and return JSON response
        try {
            const commandsData = JSON.parse(response.body);
            logSuccess('Test execution commands retrieved successfully');
            
            // Log basic info about the commands (if available)
            if (commandsData.resources && Array.isArray(commandsData.resources) && commandsData.resources.length > 0) {
                const totalCommands = commandsData.resources.reduce((total, resource) => {
                    return total + (resource.commands ? resource.commands.length : 0);
                }, 0);
                logInfo(`Found ${totalCommands} commands across ${commandsData.resources.length} resource(s)`);
                
                // Log commands with uxDuration > 0
                const commandsWithUx = commandsData.resources.reduce((total, resource) => {
                    if (resource.commands) {
                        return total + resource.commands.filter(cmd => cmd.uxDuration && cmd.uxDuration > 0).length;
                    }
                    return total;
                }, 0);
                logInfo(`Commands with UX duration: ${commandsWithUx}`);
            }
            
            return commandsData;
            
        } catch (parseError) {
            logError(`Failed to parse commands response as JSON: ${parseError.message}`);
            throw new Error(`Invalid JSON response from commands API: ${parseError.message}`);
        }
        
    } catch (error) {
        logError(`Failed to get test execution commands: ${error.message}`);
        throw error;
    }
}

/**
 * Translate Perfecto commands response to BlazeMeter timeseries format
 * @param {Object} perfectoCommandsData - Perfecto commands response data
 * @param {number} blazeMeterMasterId - BlazeMeter master ID to use in the output
 * @param {string} testName - Test name to use as profile name (optional)
 * @returns {Object} BlazeMeter timeseries format object
 * @private
 */
async function translatePerfectoToBlazeMeterFormat(perfectoCommandsData, blazeMeterMasterId, testName = 'Perfecto EUX Test') {
    logInfo('Translating Perfecto commands data to BlazeMeter timeseries format');
    
    if (!perfectoCommandsData || !perfectoCommandsData.resources || !Array.isArray(perfectoCommandsData.resources)) {
        throw new Error('Invalid Perfecto commands data structure');
    }
    
    if (!blazeMeterMasterId) {
        throw new Error('BlazeMeter master ID is required for translation');
    }
    
    const intervals = [];
    let totalCommands = 0;
    let filteredCommands = 0;
    
    // Process each resource (test step)
    for (const resource of perfectoCommandsData.resources) {
        if (!resource.commands || !Array.isArray(resource.commands)) {
            continue;
        }
        
        // Process each command within the resource
        for (const command of resource.commands) {
            totalCommands++;
            
            // Only include commands with uxDuration > 0
            if (!command.uxDuration || command.uxDuration <= 0) {
                continue;
            }
            
            filteredCommands++;
            
            // Convert startTime from milliseconds to seconds (BlazeMeter format)
            const timestampSeconds = Math.floor(command.startTime / 1000);
            
            // Create the interval object
            const interval = {
                "_id": {
                    "masterId": blazeMeterMasterId,
                    "metricPath": command.name || 'Unknown Command',
                    "ts": timestampSeconds
                },
                "kpis": [
                    {
                        "value": command.uxDuration,
                        "ts": timestampSeconds
                    }
                ],
                "profileName": testName
            };
            
            intervals.push(interval);
        }
    }
    
    logInfo(`Processed ${totalCommands} total commands`);
    logInfo(`Filtered to ${filteredCommands} commands with uxDuration > 0`);
    logSuccess(`Generated ${intervals.length} BlazeMeter intervals`);
    
    const blazeMeterData = {
        intervals: intervals
    };
    
    // Log sample of the output for debugging
    if (intervals.length > 0) {
        logInfo('Sample interval generated:');
        logInfo(`  • Metric Path: ${intervals[0]._id.metricPath}`);
        logInfo(`  • UX Duration: ${intervals[0].kpis[0].value}ms`);
        logInfo(`  • Timestamp: ${intervals[0]._id.ts}`);
        logInfo(`  • Profile: ${intervals[0].profileName}`);
    }
    
    return blazeMeterData;
}

/**
 * Wait for test execution to complete processing and send EUX data to BlazeMeter
 * @param {string} cloudName - Perfecto cloud name
 * @param {string} securityToken - Perfecto security token
 * @param {string} executionId - Perfecto execution ID
 * @param {string} bzmApiKey - BlazeMeter API key
 * @param {string} bzmApiSecret - BlazeMeter API secret
 * @param {string} bzmMasterId - BlazeMeter master ID
 * @param {string} externalId - Perfecto external ID (for status checks, optional)
 * @returns {Promise<Object>} Result object with status and intervals posted
 */
async function sendPerfectoExecutionMetricsToBlazeMeterReport(cloudName, securityToken, executionId, bzmApiKey, bzmApiSecret, bzmMasterId, externalId = null) {
    logInfo(`Waiting for test execution ${executionId} to complete processing...`);
    
    if (!externalId) {
        throw new Error('External ID is required for processing status checks');
    }
    
    try {
        // Use the new completion check function
        const completionResult = await waitForPerfectoTestExecutionData(
            cloudName, 
            securityToken, 
            externalId, 
            600000, // 10 minutes timeout
            10000   // 10 seconds check interval
        );
        
        if (!completionResult.isComplete) {
            throw new Error('Test execution processing did not complete within timeout');
        }
        
        logSuccess('Test execution processing completed, fetching command data...');
        
        // Now get commands and send to BlazeMeter
        logInfo('Fetching test execution commands...');
        const commandsData = await getPerfectoTestExecutionMetrics(cloudName, securityToken, executionId);
        
        logInfo('Translating Perfecto commands to BlazeMeter format...');
        const blazeMeterData = await translatePerfectoToBlazeMeterFormat(commandsData, bzmMasterId);
        
        if (!blazeMeterData.intervals || blazeMeterData.intervals.length === 0) {
            logWarning('No timeseries intervals generated from Perfecto data');
            return { status: 'NO_DATA', intervalsPosted: 0 };
        }
        
        logInfo(`Posting ${blazeMeterData.intervals.length} intervals to BlazeMeter master ${bzmMasterId}...`);
        
        // Import BlazeMeter helpers
        const blazemeterHelpers = require('./blazemeter-helpers');
        
        const postResult = await blazemeterHelpers.postTimeseriesData(bzmApiKey, bzmApiSecret, {
            intervals: blazeMeterData.intervals
        });
        
        logSuccess(`Successfully posted EUX data to BlazeMeter`);
        return { 
            status: 'SUCCESS', 
            intervalsPosted: blazeMeterData.intervals.length,
            executionId: executionId
        };
        
    } catch (error) {
        logError(`Failed to process and send EUX data: ${error.message}`);
        return { 
            status: 'FAILED', 
            intervalsPosted: 0,
            error: error.message,
            executionId: executionId
        };
    }
}

/**
 * Check if Perfecto test execution is complete by examining status response
 * @param {string} cloudName - Perfecto cloud name
 * @param {string} securityToken - Perfecto security token
 * @param {string} externalId - External ID from test execution
 * @param {number} maxWaitTime - Maximum time to wait in milliseconds (default: 10 minutes)
 * @param {number} checkInterval - Interval between checks in milliseconds (default: 10 seconds)
 * @returns {Promise<Object>} Object with completion status and execution details
 */
async function waitForPerfectoTestExecutionData(cloudName, securityToken, externalId, maxWaitTime = 600000, checkInterval = 10000) {
    logInfo(`Checking if test execution is complete for external ID: ${externalId}`);
    
    let waitElapsed = 0;
    let consecutiveEmptyResponses = 0;
    const MAX_EMPTY_RESPONSES = 3;
    
    while (waitElapsed < maxWaitTime) {
        try {
            logInfo(`Checking processing status... (Elapsed: ${waitElapsed/1000}s)`);
            
            const statusResponse = await getTestExecutionStatusResponse(cloudName, externalId, securityToken);
            const responseData = JSON.parse(statusResponse);
            
            // Check if we have resources
            if (!responseData.resources || responseData.resources.length === 0) {
                consecutiveEmptyResponses++;
                
                // Check if this is a valid "no results" response vs waiting for processing
                if (responseData.metadata) {
                    logInfo(`API returned valid metadata but no resources (attempt ${consecutiveEmptyResponses}/${MAX_EMPTY_RESPONSES})`);
                    
                    // If we've had several empty responses with metadata, the test probably doesn't exist
                    if (consecutiveEmptyResponses >= MAX_EMPTY_RESPONSES) {
                        throw new Error(`No test execution found for external ID '${externalId}' after ${MAX_EMPTY_RESPONSES} attempts. The test may not have been started or the external ID is incorrect.`);
                    }
                } else {
                    logInfo('No test execution resources found yet, waiting...');
                }
                
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                waitElapsed += checkInterval;
                continue;
            }
            
            // Reset consecutive empty responses counter since we found resources
            consecutiveEmptyResponses = 0;
            
            // Extract resource details
            const resource = responseData.resources[0];
            const metadata = responseData.metadata;
            const processingStatus = metadata?.processingStatus;
            const resourceStatus = resource?.status;
            const resourceId = resource?.id;
            
            logInfo(`Processing status: ${processingStatus}`);
            logInfo(`Resource status: ${resourceStatus}`);
            logInfo(`Resource ID: ${resourceId || 'not available'}`);
            
            // Check completion criteria
            const isProcessingComplete = processingStatus === 'PROCESSING_COMPLETE';
            const hasValidStatus = resourceStatus && resourceStatus !== null;
            const hasValidId = resourceId && resourceId !== null;
            
            if (isProcessingComplete && hasValidStatus && hasValidId) {
                logSuccess('Test execution processing completed successfully');
                return {
                    isComplete: true,
                    executionId: resourceId,
                    status: resourceStatus,
                    processingStatus: processingStatus,
                    metadata: metadata,
                    resource: resource
                };
            } else {
                const missingCriteria = [];
                if (!isProcessingComplete) missingCriteria.push(`processing status (${processingStatus})`);
                if (!hasValidStatus) missingCriteria.push('resource status');
                if (!hasValidId) missingCriteria.push('resource ID');
                
                logInfo(`Processing not complete. Missing: ${missingCriteria.join(', ')}`);
                logInfo(`Waiting ${checkInterval/1000}s before next check...`);
                
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                waitElapsed += checkInterval;
            }
            
        } catch (error) {
            // Don't retry if it's a known error condition
            if (error.message.includes('not found') || error.message.includes('No test execution found')) {
                throw error;
            }
            
            logError(`Error checking processing status: ${error.message}`);
            
            // If it's a parsing error or network error, wait and retry
            if (waitElapsed < maxWaitTime - checkInterval) {
                logInfo(`Retrying in ${checkInterval/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                waitElapsed += checkInterval;
            } else {
                throw error;
            }
        }
    }
    
    throw new Error(`Timeout waiting for test execution processing to complete (${maxWaitTime/1000}s)`);
}

module.exports = {
    startPerfectoTest,
    getTestStatus: getTestExecutionStatusResponse,
    sendStopRequest: sendPerfectoStopTestRequest,
    waitForShutdown: waitForPerfectoTestCompletion,
    checkPerfectoConnectivity,
    checkPerfectoDevice,
    checkPerfectoScript,
    runContinuousTests: startPerfectoTestLoop,
    getTestExecutionCommands: getPerfectoTestExecutionMetrics,
    getExecutionIdFromExternalId,
    translatePerfectoToBlazeMeterFormat,
    waitForProcessingAndSendEux: sendPerfectoExecutionMetricsToBlazeMeterReport,
    // Direct function exports for testing
    getPerfectoTestExecutionMetrics,
    sendPerfectoExecutionMetricsToBlazeMeterReport,
    isPerfectoTestExecutionComplete: waitForPerfectoTestExecutionData
};
