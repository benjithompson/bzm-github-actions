/**
 * blazemeter-helpers.js
 * BlazeMeter API helper functions for GitHub Action
 * Extracted core functionality from original blazemeter-helpers.js
 */

const https = require('https');
const { logInfo, logSuccess, logWarning, logError, logSection } = require('./logging-helper');

/**
 * Make a simple HTTP call
 * @param {string} url - The URL to call
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response object with statusCode and body
 */
async function makeSimpleHttpCall(url, options = {}) {
    return new Promise((resolve) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'BlazeMeter-Perfecto-EUX-Action/1.0.0',
                ...options.headers
            },
            timeout: options.timeout || 30000
        };

        const req = https.request(requestOptions, (res) => {
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
            resolve({
                statusCode: 0,
                body: '',
                error: error.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                statusCode: 0,
                body: '',
                error: 'Request timeout'
            });
        });

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

/**
 * Check BlazeMeter test accessibility and validity
 * @param {string} testId - BlazeMeter test ID
 * @param {string} apiKey - BlazeMeter API key
 * @param {string} apiSecret - BlazeMeter API secret
 * @param {string} testName - Test name for fallback search
 * @param {string} projectId - Project ID for test search
 * @returns {Promise<boolean>} True if test is accessible
 */
async function checkBlazeMeterTestExists(testId, apiKey, apiSecret, testName, projectId) {
    logSection('Checking BlazeMeter Test Accessibility');

    try {
        // Validate credentials
        logInfo('Testing BlazeMeter API authentication...');
        const authUrl = 'https://a.blazemeter.com/api/v4/user';
        const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

        const authResponse = await makeSimpleHttpCall(authUrl, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        if (authResponse.statusCode >= 400) {
            logError(`HTTP Error ${authResponse.statusCode} received`);
            logError('Failed to authenticate with BlazeMeter API');
            logError('Please verify API key and secret are valid');
            return false;
        }

        logSuccess('BlazeMeter API authentication successful');

        // Check test accessibility
        if (testId && testId.trim() !== '') {
            logInfo(`Checking test ID: ${testId}`);
            const testUrl = `https://a.blazemeter.com/api/v4/tests/${testId}`;
            
            const testResponse = await makeSimpleHttpCall(testUrl, {
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                }
            });

            if (testResponse.statusCode >= 400) {
                logError(`Test ID ${testId} not accessible`);
                return false;
            }

            logSuccess(`Test ID ${testId} is accessible`);
        } else {
            logInfo(`Searching for test by name: ${testName}`);
            // This would require more complex search logic
            logInfo('Test name search would be performed here');
        }

        return true;

    } catch (error) {
        logError(`BlazeMeter test check failed: ${error.message}`);
        return false;
    }
}

/**
 * Get latest master ID for a BlazeMeter test
 * @param {string} testId - BlazeMeter test ID
 * @param {string} apiKey - BlazeMeter API key
 * @param {string} apiSecret - BlazeMeter API secret
 * @param {string} testName - Test name for fallback search
 * @param {string} projectId - Project ID for test search
 * @returns {Promise<Object>} Object with masterId and testId
 */
async function getLatestBlazeMeterTestMasterId(testId, apiKey, apiSecret, testName, projectId) {
    logSection('Getting BlazeMeter Latest Master ID');

    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    try {
        let actualTestId = testId;

        // If no test ID provided, search by name
        if (!testId || testId.trim() === '') {
            logInfo(`Searching for test by name: ${testName}`);
            const searchUrl = `https://a.blazemeter.com/api/v4/tests?projectId=${projectId}&name=${encodeURIComponent(testName)}`;
            
            const searchResponse = await makeSimpleHttpCall(searchUrl, {
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                }
            });

            if (searchResponse.statusCode >= 400) {
                throw new Error(`Failed to search for test: HTTP ${searchResponse.statusCode}`);
            }

            const searchData = JSON.parse(searchResponse.body);
            if (!searchData.result || searchData.result.length === 0) {
                throw new Error(`No test found with name: ${testName}`);
            }

            actualTestId = searchData.result[0].id;
            logSuccess(`Found test ID: ${actualTestId}`);
        }

        // Get latest master for the test
        logInfo(`Getting latest master for test ID: ${actualTestId}`);
        const mastersUrl = `https://a.blazemeter.com/api/v4/tests/${actualTestId}/masters?limit=1`;
        
        const mastersResponse = await makeSimpleHttpCall(mastersUrl, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        if (mastersResponse.statusCode >= 400) {
            throw new Error(`Failed to get masters: HTTP ${mastersResponse.statusCode}`);
        }

        const mastersData = JSON.parse(mastersResponse.body);
        if (!mastersData.result || mastersData.result.length === 0) {
            throw new Error('No masters found for test');
        }

        const latestMaster = mastersData.result[0];
        const masterId = latestMaster.id;

        logSuccess(`Latest Master ID: ${masterId}`);

        return {
            masterId: masterId,
            testId: actualTestId
        };

    } catch (error) {
        logError(`Failed to get master ID: ${error.message}`);
        throw error;
    }
}

/**
 * Get status for a specific BlazeMeter master
 * @param {string} masterId - BlazeMeter master ID
 * @param {string} apiKey - BlazeMeter API key
 * @param {string} apiSecret - BlazeMeter API secret
 * @returns {Promise<Object>} Object with masterId and status
 */
async function getBlazeMeterMasterStatus(masterId, apiKey, apiSecret) {
    logSection('Getting BlazeMeter Master Status');

    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    try {
        logInfo(`Getting status for master ID: ${masterId}`);
        const masterUrl = `https://a.blazemeter.com/api/v4/masters/${masterId}/status`;
        
        const masterResponse = await makeSimpleHttpCall(masterUrl, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        if (masterResponse.statusCode >= 400) {
            throw new Error(`Failed to get master status: HTTP ${masterResponse.statusCode}`);
        }

        const masterData = JSON.parse(masterResponse.body);
        if (!masterData.result) {
            throw new Error('No master data found');
        }

        const master = masterData.result;
        const status = master.result.status || 'UNKNOWN';

        logInfo(`Master Status: ${status}`);

        return {
            masterId: masterId,
            status: status,
            masterData: master
        };

    } catch (error) {
        logError(`Failed to get master status: ${error.message}`);
        throw error;
    }
}

/**
 * Update BlazeMeter test load configuration with new performance parameters
 * Fetches current test configuration, modifies it, and sends PATCH request to update it
 * Converts the bash/jq logic to Node.js for updating test configuration
 * @param {string} testId - BlazeMeter test ID
 * @param {string} apiKey - BlazeMeter API key
 * @param {string} apiSecret - BlazeMeter API secret
 * @param {number} concurrency - Number of virtual users
 * @param {string} duration - Test duration (e.g., "10m", "600s")
 * @param {string} rampUp - Ramp-up time (e.g., "2m", "120s")
 * @returns {Promise<Object>} Updated payload object with API response
 */
async function updateBlazeMeterLoadConfiguration(testId, apiKey, apiSecret, concurrency, duration, rampUp) {
    logSection('Updating BlazeMeter Load Configuration');
    
    if (!testId || !apiKey || !apiSecret) {
        throw new Error('Test ID, API key, and API secret are required');
    }
    
    if (!concurrency || !duration || !rampUp) {
        throw new Error('Concurrency, duration, and ramp-up parameters are required');
    }

    logInfo(`Test ID: ${testId}`);
    logInfo(`Concurrency: ${concurrency} users`);
    logInfo(`Duration: ${duration}`);
    logInfo(`Ramp-up: ${rampUp}`);

    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    try {
        // Step 1: Get current test configuration
        logInfo('Fetching current test configuration...');
        const testUrl = `https://a.blazemeter.com/api/v4/tests/${testId}`;
        
        const testResponse = await makeSimpleHttpCall(testUrl, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        if (testResponse.statusCode >= 400) {
            throw new Error(`Failed to fetch test configuration: HTTP ${testResponse.statusCode}`);
        }

        const testData = JSON.parse(testResponse.body);
        logSuccess('Current test configuration retrieved');

        // Step 2: Extract and modify the execution configuration
        const currentConfig = testData.result;
        
        if (!currentConfig.overrideExecutions || !currentConfig.overrideExecutions[0]) {
            throw new Error('Test configuration does not have overrideExecutions data');
        }

        const execution = currentConfig.overrideExecutions[0];
        
        // Update basic parameters
        execution.concurrency = parseInt(concurrency);
        execution.holdFor = duration;
        execution.rampUp = rampUp;

        logInfo('Updated execution parameters');

        // Step 3: Recalculate location distribution (replicating jq logic)
        if (execution.locations && execution.locationsPercents) {
            const locationKeys = Object.keys(execution.locations);
            const newLocations = {};
            
            logInfo(`Redistributing ${concurrency} users across ${locationKeys.length} locations`);
            
            // Calculate base allocation for each location
            let totalAllocated = 0;
            for (const locationKey of locationKeys) {
                const percentage = execution.locationsPercents[locationKey] || 0;
                const baseAllocation = Math.floor((percentage * concurrency) / 100);
                newLocations[locationKey] = baseAllocation;
                totalAllocated += baseAllocation;
            }
            
            // Distribute remaining users to first locations (matching jq logic)
            const remaining = concurrency - totalAllocated;
            for (let i = 0; i < remaining && i < locationKeys.length; i++) {
                newLocations[locationKeys[i]]++;
            }
            
            execution.locations = newLocations;
            logInfo('Location distribution updated');
            
            // Log the distribution
            for (const [location, users] of Object.entries(newLocations)) {
                const percentage = execution.locationsPercents[location] || 0;
                logInfo(`  • ${location}: ${users} users (${percentage}%)`);
            }
        }

        // Step 4: Create the payload for the PATCH request
        const payload = {
            overrideExecutions: [execution]
        };

        // Step 5: Send PATCH request to update the test configuration
        logInfo('Sending PATCH request to update test configuration...');
        const patchUrl = `https://a.blazemeter.com/api/v4/tests/${testId}`;
        
        const patchResponse = await makeSimpleHttpCall(patchUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (patchResponse.statusCode >= 400) {
            throw new Error(`Failed to update test configuration: HTTP ${patchResponse.statusCode} - ${patchResponse.body}`);
        }

        const updateResult = JSON.parse(patchResponse.body);
        logSuccess('BlazeMeter test configuration updated successfully via PATCH request');
        logInfo(`Response status: ${patchResponse.statusCode}`);
        
        return {
            payload: payload,
            testId: testId,
            concurrency: concurrency,
            duration: duration,
            rampUp: rampUp,
            locations: execution.locations || {},
            apiResponse: updateResult
        };

    } catch (error) {
        logError(`Failed to update BlazeMeter load configuration: ${error.message}`);
        throw error;
    }
}

/**
 * Post timeseries data to BlazeMeter API
 * Internal helper function for submitting custom metrics data
 * @param {string} apiKey - BlazeMeter API key
 * @param {string} apiSecret - BlazeMeter API secret
 * @param {Object} timeseriesData - Timeseries data payload with intervals array
 * @returns {Promise<Object>} API response object
 * @private
 */
async function postTimeseriesData(apiKey, apiSecret, timeseriesData) {
    logInfo('Posting timeseries data to BlazeMeter API...');
    
    if (!apiKey || !apiSecret) {
        throw new Error('API key and API secret are required');
    }
    
    if (!timeseriesData || !timeseriesData.intervals || !Array.isArray(timeseriesData.intervals)) {
        throw new Error('Valid timeseries data with intervals array is required');
    }

    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const timeseriesUrl = 'https://a.blazemeter.com/api/v4/data/timeseries';

    try {
        logInfo(`Posting ${timeseriesData.intervals.length} timeseries intervals to BlazeMeter Timesearies APIs`);
        
        const response = await makeSimpleHttpCall(timeseriesUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(timeseriesData)
        });

        if (response.statusCode >= 400) {
            throw new Error(`Failed to post timeseries data: HTTP ${response.statusCode} - ${response.body}`);
        }

        logSuccess('Timeseries data posted successfully');
        
        return {
            statusCode: response.statusCode,
            data: response.body ? JSON.parse(response.body) : null
        };

    } catch (error) {
        logError(`Failed to post timeseries data: ${error.message}`);
        throw error;
    }
}

/**
 * Start a BlazeMeter test
 * @param {string} testId - BlazeMeter test ID
 * @param {string} apiKey - BlazeMeter API key
 * @param {string} apiSecret - BlazeMeter API secret
 * @param {boolean} delayedStart - Whether to use delayed start (default: false)
 * @returns {Promise<Object>} Object with masterId and test start details
 */
async function startBlazeMeterTest(testId, apiKey, apiSecret, delayedStart = false) {

    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    if (!testId || !apiKey || !apiSecret) {
        throw new Error('Test ID, API key, and API secret are required');
    }

    try {
        logInfo(`Starting test ID: ${testId}`);
        logInfo(`Delayed start: ${delayedStart}`);
        
        const startUrl = `https://a.blazemeter.com/api/v4/tests/${testId}/start?delayedStart=${delayedStart}`;
        
        const startResponse = await makeSimpleHttpCall(startUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        if (startResponse.statusCode >= 400) {
            throw new Error(`Failed to start test: HTTP ${startResponse.statusCode} - ${startResponse.body}`);
        }

        const startData = JSON.parse(startResponse.body);
        if (!startData.result) {
            throw new Error('No result data found in start response');
        }

        const result = startData.result;
        const masterId = result.id || result.masterId;

        if (!masterId) {
            throw new Error('No master ID found in start response');
        }

        
        // Log additional information if available
        if (result.status) {
            logInfo(`Initial Status: ${result.status}`);
        }
        if (result.sessions && result.sessions.length > 0) {
            logInfo(`Sessions created: ${result.sessions.length}`);
        }

        return {
            masterId: masterId,
            testId: testId,
            status: result.status || 'STARTED',
            sessions: result.sessions || [],
            startData: result
        };

    } catch (error) {
        logError(`Failed to start BlazeMeter test: ${error.message}`);
        throw error;
    }
}

/**
 * Stop a BlazeMeter test
 * @param {string} masterId - BlazeMeter master ID
 * @param {string} apiKey - BlazeMeter API key
 * @param {string} apiSecret - BlazeMeter API secret
 * @returns {Promise<Object>} Object with masterId and stop details
 */
async function stopBlazeMeterTest(masterId, apiKey, apiSecret) {
    logSection('Stopping BlazeMeter Test');

    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    if (!masterId || !apiKey || !apiSecret) {
        throw new Error('Master ID, API key, and API secret are required');
    }

    try {
        logInfo(`Stopping master ID: ${masterId}`);
        
        const stopUrl = `https://a.blazemeter.com/api/v4/masters/${masterId}/stop`;
        
        const stopResponse = await makeSimpleHttpCall(stopUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        if (stopResponse.statusCode >= 400) {
            throw new Error(`Failed to stop test: HTTP ${stopResponse.statusCode} - ${stopResponse.body}`);
        }

        const stopData = JSON.parse(stopResponse.body);
        if (!stopData.result) {
            throw new Error('No result data found in stop response');
        }

        const result = stopData.result;
        
        logSuccess(`Test stop request sent successfully`);
        logSuccess(`Master ID: ${masterId}`);
        
        // Log session stop details if available
        if (Array.isArray(result)) {
            logInfo(`Sessions being stopped: ${result.length}`);
            result.forEach((session, index) => {
                logInfo(`  Session ${index + 1}: ${session.session_id} - ${session.result}`);
            });
        }

        return {
            masterId: masterId,
            status: 'STOPPING',
            sessions: result,
            stopData: stopData
        };

    } catch (error) {
        logError(`Failed to stop BlazeMeter test: ${error.message}`);
        throw error;
    }
}

module.exports = {
    makeSimpleHttpCall,
    checkBlazeMeterTest: checkBlazeMeterTestExists,
    getLatestBlazeMeterTestMasterId,
    getBlazeMeterMasterStatus,
    updateBlazeMeterLoadConfiguration,
    postTimeseriesData,
    startBlazeMeterTest,
    stopBlazeMeterTest
};
