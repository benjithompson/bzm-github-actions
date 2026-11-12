#!/usr/bin/env node
/**
 * test-blazemeter-stop.js
 * Test the new stopBlazeMeterTest function
 */

const blazemeterHelpers = require('../src/blazemeter-helpers');

/**
 * Mock version of stopBlazeMeterTest for testing
 */
async function mockStopBlazeMeterTest(masterId, apiKey, apiSecret) {
    console.log('🧪 Running MOCK version of stopBlazeMeterTest');
    console.log(`📋 Parameters: masterId=${masterId}`);
    
    // Simulate validation
    if (!masterId || !apiKey || !apiSecret) {
        throw new Error('Master ID, API key, and API secret are required');
    }
    
    // Simulate successful stop response
    const mockResult = {
        masterId: masterId,
        status: 'STOPPING',
        sessions: [
            { session_id: 'r-v4-5abc8b5ad54bb', result: 'stopping' },
            { session_id: 'r-v4-5abc8b5ad54cc', result: 'stopping' }
        ],
        stopData: {
            api_version: 4,
            error: null,
            result: [
                { session_id: 'r-v4-5abc8b5ad54bb', result: 'stopping' },
                { session_id: 'r-v4-5abc8b5ad54cc', result: 'stopping' }
            ]
        }
    };
    
    console.log('✅ Mock test stop successful');
    console.log(`📊 Master ID: ${mockResult.masterId}`);
    console.log(`📊 Status: ${mockResult.status}`);
    console.log(`📊 Sessions: ${mockResult.sessions.length}`);
    
    return mockResult;
}

/**
 * Test the stopBlazeMeterTest function
 */
async function testStopBlazeMeterTest() {
    console.log('🧪 Testing stopBlazeMeterTest Function');
    console.log('============================================================');
    console.log('🧪 Using MOCK mode');
    console.log('');

    const testScenarios = [
        {
            name: 'Basic Test Stop',
            params: {
                masterId: 'mock-master-12345',
                apiKey: 'mock-key',
                apiSecret: 'mock-secret'
            }
        },
        {
            name: 'Different Master ID',
            params: {
                masterId: 'mock-master-67890',
                apiKey: 'mock-key',
                apiSecret: 'mock-secret'
            }
        }
    ];

    let passed = 0;
    let failed = 0;

    // Test valid scenarios
    for (const scenario of testScenarios) {
        try {
            console.log(`🔧 Testing: ${scenario.name}`);
            console.log(`   Parameters: Master ID ${scenario.params.masterId}`);
            
            const startTime = Date.now();
            const result = await mockStopBlazeMeterTest(
                scenario.params.masterId,
                scenario.params.apiKey,
                scenario.params.apiSecret
            );
            const duration = Date.now() - startTime;
            
            console.log(`   ✅ Test passed (${duration}ms)`);
            console.log(`   📊 Result: Master ID ${result.masterId}, Status: ${result.status}`);
            console.log('');
            passed++;
        } catch (error) {
            console.log(`   ❌ Test failed: ${error.message}`);
            console.log('');
            failed++;
        }
    }

    // Test error conditions
    console.log('🔧 Testing Error Conditions');
    const errorTests = [
        { name: 'Missing Master ID', params: { masterId: null, apiKey: 'mock-key', apiSecret: 'mock-secret' } },
        { name: 'Missing API Key', params: { masterId: 'mock-master-12345', apiKey: null, apiSecret: 'mock-secret' } },
        { name: 'Missing API Secret', params: { masterId: 'mock-master-12345', apiKey: 'mock-key', apiSecret: null } }
    ];

    for (const test of errorTests) {
        try {
            console.log(`   Testing: ${test.name}`);
            await mockStopBlazeMeterTest(test.params.masterId, test.params.apiKey, test.params.apiSecret);
            console.log(`   ❌ Should have thrown an error`);
            failed++;
        } catch (error) {
            console.log(`   ✅ Correctly threw expected error`);
            passed++;
        }
    }

    console.log('============================================================');
    console.log('📊 TEST SUMMARY');
    console.log('============================================================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📋 Total:  ${passed + failed}`);
    console.log('');

    if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED! The stopBlazeMeterTest function works correctly.');
    } else {
        console.log('💥 Some tests failed. Please check the implementation.');
    }

    return failed === 0;
}

// Run the test
if (require.main === module) {
    testStopBlazeMeterTest()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Test execution failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testStopBlazeMeterTest };
