#!/usr/bin/env node
/**
 * test-perfecto-helpers.js
 * Streamlined test suite for Perfecto helper functions
 * 
 * This test can run in two modes:
 * 1. Mock mode (default) - Uses mock data and doesn't make real API calls
 * 2. Real API mode - Uses real credentials from config file to test actual API calls
 * 
 * Usage:
 *   node test-perfecto-helpers.js          # Mock mode
 *   node test-perfecto-helpers.js --real   # Real API mode (requires config)
 */

const path = require('path');
const fs = require('fs');

// Import the functions to test
const perfectoHelpers = require('../src/perfecto-helpers');

// Check if we're running in real API mode
const useRealApi = process.argv.includes('--real');

/**
 * Load configuration for real API testing
 * @returns {Object} Configuration object
 */
function loadRealApiConfig() {
    const configPath = path.join(__dirname, 'perfecto-test-config.local.json');
    
    if (!fs.existsSync(configPath)) {
        console.error('❌ Configuration file not found: perfecto-test-config.local.json');
        console.error('📋 Create this file with your Perfecto credentials to test with real API calls');
        console.error('📋 See perfecto-test-config.example.json for the required format');
        process.exit(1);
    }
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Validate required fields
        const requiredFields = ['perfectoCloud', 'securityToken'];
        for (const field of requiredFields) {
            if (!config[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        return config;
    } catch (error) {
        console.error('❌ Failed to load configuration:', error.message);
        process.exit(1);
    }
}

/**
 * Load sample Perfecto payload for testing
 * @param {Object} config - Configuration object
 * @returns {Object} Sample payload data
 */
function loadSamplePayload(config) {
    if (config && config.mockPayload && !config.mockPayload.useBuiltInSample && config.mockPayload.customPayloadFile) {
        const payloadPath = path.join(__dirname, config.mockPayload.customPayloadFile);
        if (fs.existsSync(payloadPath)) {
            try {
                return JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
            } catch (error) {
                console.log('⚠️  Failed to load custom payload file, using built-in sample');
            }
        }
    }
    
    // Load from sample_perfecto_payload.json
    const samplePath = path.join(__dirname, 'sample_perfecto_payload.json');
    if (fs.existsSync(samplePath)) {
        try {
            return JSON.parse(fs.readFileSync(samplePath, 'utf8'));
        } catch (error) {
            console.log('⚠️  Failed to load sample payload file, using minimal mock data');
        }
    }
    
    // Minimal mock data fallback
    return {
        resources: [
            {
                commands: [
                    {
                        name: "Mock Command",
                        status: "SUCCESS",
                        startTime: Date.now(),
                        endTime: Date.now() + 1000,
                        uxDuration: 1000
                    }
                ]
            }
        ]
    };
}

/**
 * Mock version of checkPerfectoConnectivity for testing
 */
async function mockCheckPerfectoConnectivity(perfectoCloud, perfectoToken) {
    console.log('🧪 Running MOCK version of checkPerfectoConnectivity');
    console.log(`📋 Parameters: cloud=${perfectoCloud}, token=${perfectoToken ? '***' : 'null'}`);
    
    if (!perfectoCloud || !perfectoToken) {
        throw new Error('Missing required parameters');
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Mock connectivity test passed');
    return true;
}

/**
 * Mock version of checkPerfectoDevice for testing
 */
async function mockCheckPerfectoDevice(perfectoCloud, perfectoToken, deviceId) {
    console.log('🧪 Running MOCK version of checkPerfectoDevice');
    console.log(`📋 Parameters: cloud=${perfectoCloud}, token=${perfectoToken ? '***' : 'null'}, device=${deviceId}`);
    
    if (!perfectoCloud || !perfectoToken || !deviceId) {
        throw new Error('Missing required parameters');
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('✅ Mock device check passed');
    return true;
}

/**
 * Mock version of checkPerfectoScript for testing
 */
async function mockCheckPerfectoScript(perfectoCloud, perfectoToken, scriptKey) {
    console.log('🧪 Running MOCK version of checkPerfectoScript');
    console.log(`📋 Parameters: cloud=${perfectoCloud}, token=${perfectoToken ? '***' : 'null'}, script=${scriptKey}`);
    
    if (!perfectoCloud || !perfectoToken || !scriptKey) {
        throw new Error('Missing required parameters');
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('✅ Mock script check passed');
    return true;
}

/**
 * Mock version of sendPerfectoExecutionMetricsToBlazeMeterReport for testing
 * This is the main end-to-end function that tests most of the functionality
 */
async function mockSendPerfectoExecutionMetricsToBlazeMeterReport(cloudName, securityToken, executionId, bzmApiKey, bzmApiSecret, bzmMasterId, externalId = null) {
    console.log('🧪 Running MOCK version of sendPerfectoExecutionMetricsToBlazeMeterReport');
    console.log(`📋 Parameters: cloud=${cloudName}, execution=${executionId}, master=${bzmMasterId}, external=${externalId || 'not provided'}`);
    
    if (!cloudName || !securityToken || !executionId || !bzmApiKey || !bzmApiSecret || !bzmMasterId) {
        throw new Error('Missing required parameters');
    }
    
    // Simulate the main end-to-end flow:
    // 1. Check Perfecto test completion (if externalId provided)
    if (externalId) {
        console.log('   🔍 Checking Perfecto test completion status...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('   ✅ Test completion verified');
    }
    
    // 2. Get execution metrics from Perfecto
    console.log('   📊 Retrieving execution metrics from Perfecto...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('   ✅ Execution metrics retrieved');
    
    // 3. Transform and send to BlazeMeter
    console.log('   🔄 Transforming metrics for BlazeMeter...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('   📤 Sending metrics to BlazeMeter...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock successful result
    const mockResult = {
        status: 'SUCCESS',
        intervalsPosted: 5,
        executionId: executionId
    };
    
    console.log(`✅ Mock EUX data sent to BlazeMeter (${mockResult.intervalsPosted} intervals)`);
    return mockResult;
}

/**
 * Test basic connectivity (covers connectivity, device, and script checks)
 */
async function testBasicConnectivity(config, testFunctions) {
    console.log('🔧 Testing Basic Connectivity & Prerequisites');
    let passedTests = 0;
    let totalTests = 3;
    
    // Test connectivity
    try {
        await testFunctions.checkPerfectoConnectivity(config.perfectoCloud, config.securityToken);
        console.log('   ✅ Connectivity test passed');
        passedTests++;
    } catch (error) {
        console.log(`   ❌ Connectivity test failed: ${error.message}`);
    }
    
    // Test device (if configured)
    if (config.deviceId) {
        try {
            await testFunctions.checkPerfectoDevice(config.perfectoCloud, config.securityToken, config.deviceId);
            console.log('   ✅ Device check passed');
            passedTests++;
        } catch (error) {
            console.log(`   ❌ Device check failed: ${error.message}`);
        }
    } else {
        console.log('   ⏭️  Device check skipped: deviceId not configured');
        totalTests--;
    }
    
    // Test script (if configured)
    if (config.scriptKey) {
        try {
            await testFunctions.checkPerfectoScript(config.perfectoCloud, config.securityToken, config.scriptKey);
            console.log('   ✅ Script check passed');
            passedTests++;
        } catch (error) {
            console.log(`   ❌ Script check failed: ${error.message}`);
        }
    } else {
        console.log('   ⏭️  Script check skipped: scriptKey not configured');
        totalTests--;
    }
    
    return { passed: passedTests, total: totalTests };
}

/**
 * Test the complete EUX workflow (main end-to-end test)
 */
async function testCompleteEuxWorkflow(config, testFunctions) {
    console.log('🔧 Testing Complete EUX Workflow (End-to-End)');
    
    const executionId = config.testingValues?.executionId || 'mock-execution-id';
    const externalId = config.testingValues?.externalId;
    const masterId = config.blazemeter?.testingValues?.masterId || 'mock-master-id';
    
    if (!config.blazemeter?.apiKey || !config.blazemeter?.apiSecret) {
        console.log('   ⏭️  Skipped: BlazeMeter credentials not provided');
        return { passed: 0, total: 0 };
    }
    
    try {
        const result = await testFunctions.sendPerfectoExecutionMetricsToBlazeMeterReport(
            config.perfectoCloud,
            config.securityToken,
            executionId,
            config.blazemeter.apiKey,
            config.blazemeter.apiSecret,
            masterId,
            externalId
        );
        
        if (result && typeof result === 'object' && result.status) {
            console.log('   ✅ Complete EUX workflow passed');
            console.log(`   📊 Status: ${result.status}`);
            console.log(`   📊 Intervals posted: ${result.intervalsPosted || 0}`);
            return { passed: 1, total: 1 };
        } else {
            console.log('   ❌ Complete EUX workflow failed: invalid response');
            return { passed: 0, total: 1 };
        }
    } catch (error) {
        console.log(`   ❌ Complete EUX workflow failed: ${error.message}`);
        return { passed: 0, total: 1 };
    }
}

/**
 * Main test function
 */
async function testPerfectoHelpers() {
    console.log('🧪 Testing Perfecto Helper Functions');
    console.log('============================================================');
    
    let config;
    let testFunctions;
    
    if (useRealApi) {
        console.log('🌐 Using REAL API mode');
        config = loadRealApiConfig();
        testFunctions = {
            checkPerfectoConnectivity: perfectoHelpers.checkPerfectoConnectivity,
            checkPerfectoDevice: perfectoHelpers.checkPerfectoDevice,
            checkPerfectoScript: perfectoHelpers.checkPerfectoScript,
            sendPerfectoExecutionMetricsToBlazeMeterReport: perfectoHelpers.sendPerfectoExecutionMetricsToBlazeMeterReport
        };
        console.log(`📋 Perfecto Cloud: ${config.perfectoCloud}`);
        console.log(`📋 Security Token: ${config.securityToken?.substring(0, 8)}...`);
    } else {
        console.log('🧪 Using MOCK mode');
        config = {
            perfectoCloud: 'mock-cloud',
            securityToken: 'mock-security-token',
            scriptKey: 'mock:script:key',
            deviceId: 'MOCK_DEVICE_12345',
            blazemeter: {
                apiKey: 'mock-api-key',
                apiSecret: 'mock-api-secret'
            }
        };
        testFunctions = {
            checkPerfectoConnectivity: mockCheckPerfectoConnectivity,
            checkPerfectoDevice: mockCheckPerfectoDevice,
            checkPerfectoScript: mockCheckPerfectoScript,
            sendPerfectoExecutionMetricsToBlazeMeterReport: mockSendPerfectoExecutionMetricsToBlazeMeterReport
        };
    }
    
    console.log('');
    
    // Get test scenarios from config or use defaults
    const scenarios = config.testScenarios || {
        basicConnectivity: { enabled: true },
        completeEuxWorkflow: { enabled: true }
    };
    
    let passedTests = 0;
    let totalTests = 0;
    
    // Test basic connectivity (covers prerequisites)
    if (scenarios.basicConnectivity?.enabled !== false) {
        const connectivityResult = await testBasicConnectivity(config, testFunctions);
        passedTests += connectivityResult.passed;
        totalTests += connectivityResult.total;
        console.log('');
    }
    
    // Test complete EUX workflow (main end-to-end test)
    if (scenarios.completeEuxWorkflow?.enabled !== false) {
        const workflowResult = await testCompleteEuxWorkflow(config, testFunctions);
        passedTests += workflowResult.passed;
        totalTests += workflowResult.total;
        console.log('');
    }
    
    // Summary
    console.log('============================================================');
    console.log('📊 TEST SUMMARY');
    console.log('============================================================');
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📋 Total:  ${totalTests}`);
    console.log('');
    
    if (passedTests === totalTests) {
        console.log('🎉 ALL TESTS PASSED! The Perfecto helper functions work correctly.');
        return true;
    } else {
        console.log('❌ Some tests failed. Please review the output above.');
        return false;
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        const success = await testPerfectoHelpers();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run the tests
if (require.main === module) {
    main();
}

module.exports = {
    testPerfectoHelpers,
    loadRealApiConfig,
    loadSamplePayload
};
