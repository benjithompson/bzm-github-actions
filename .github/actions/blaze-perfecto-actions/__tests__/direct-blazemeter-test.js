#!/usr/bin/env node
/**
 * direct-blazemeter-test.js
 * Direct usage example of the updateBlazeMeterPayload function
 * 
 * This script shows how to use the function directly with your own parameters
 * Useful for quick testing and debugging specific scenarios
 * 
 * Usage:
 *   node direct-blazemeter-test.js --mock              # Test with mock data
 *   node direct-blazemeter-test.js --real              # Test with real API (requires config)
 *   node direct-blazemeter-test.js --help              # Show help
 */

const { updateBlazeMeterLoadConfiguration } = require('../src/blazemeter-helpers');
const { loadRealApiConfig, getTestScenarios } = require('./test-blazemeter-payload-update');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log('🔧 Direct BlazeMeter updateBlazeMeterLoadConfiguration Function Test\n');
    console.log('Usage:');
    console.log('  node direct-blazemeter-test.js --mock              # Test with mock credentials');
    console.log('  node direct-blazemeter-test.js --real              # Test with real API credentials');
    console.log('  node direct-blazemeter-test.js --help              # Show this help');
    console.log('\nExamples:');
    console.log('  node direct-blazemeter-test.js --mock');
    console.log('  node direct-blazemeter-test.js --real');
    console.log('\nNote: Real API mode requires blazemeter-test-config.local.json file');
    process.exit(0);
}

/**
 * Mock version for testing
 */
async function mockTest() {
    console.log('🧪 Running Direct Mock Test');
    console.log('============================================================');
    
    // Get test scenarios (will use defaults since no config in mock mode)
    const testScenarios = getTestScenarios(null);
    const scenario = testScenarios[1]; // Use "High Load Configuration" scenario
    
    console.log(`📋 Using test scenario: ${scenario.name}`);
    console.log(`📋 Parameters: ${scenario.concurrency} users, ${scenario.duration}, ramp-up ${scenario.rampUp}`);
    
    // Mock function that simulates the real function behavior
    async function mockUpdateBlazeMeterLoadConfiguration(testId, apiKey, apiSecret, concurrency, duration, rampUp) {
        console.log('📋 Mock API Call Parameters:');
        console.log(`   Test ID: ${testId}`);
        console.log(`   API Key: ${apiKey.substring(0, 8)}...`);
        console.log(`   Concurrency: ${concurrency} users`);
        console.log(`   Duration: ${duration}`);
        console.log(`   Ramp-up: ${rampUp}`);
        
        // Simulate API delay
        console.log('⏳ Simulating API call...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('🔄 Simulating PATCH request to update test configuration...');
        
        return {
            payload: {
                overrideExecutions: [{
                    concurrency: parseInt(concurrency),
                    holdFor: duration,
                    rampUp: rampUp,
                    locations: {
                        'us-east-1': Math.ceil(concurrency * 0.6),
                        'us-west-1': Math.floor(concurrency * 0.4)
                    }
                }]
            },
            testId: testId,
            concurrency: parseInt(concurrency),
            duration: duration,
            rampUp: rampUp,
            locations: {
                'us-east-1': Math.ceil(concurrency * 0.6),
                'us-west-1': Math.floor(concurrency * 0.4)
            },
            apiResponse: {
                result: {
                    id: testId,
                    name: 'Mock Direct Test',
                    projectId: '67890',
                    updated: new Date().toISOString()
                }
            }
        };
    }
    
    try {
        const result = await mockUpdateBlazeMeterLoadConfiguration(
            'mock-test-123',
            'mock-api-key-12345',
            'mock-api-secret-67890',
            scenario.concurrency,
            scenario.duration,
            scenario.rampUp
        );
        
        console.log('✅ Mock test completed successfully!');
        console.log('\n📊 Result:');
        console.log(JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.log('❌ Mock test failed:', error.message);
    }
}

/**
 * Real API test
 */
async function realApiTest() {
    console.log('🌐 Running Direct Real API Test');
    console.log('============================================================');
    
    try {
        const config = loadRealApiConfig();
        
        console.log('📋 Real API Call Parameters:');
        console.log(`   Test ID: ${config.testId}`);
        console.log(`   API Key: ${config.apiKey.substring(0, 8)}...`);
        console.log(`   Concurrency: 15 users`);
        console.log(`   Duration: 3m`);
        console.log(`   Ramp-up: 45s`);
        
        console.log('\n⏳ Making real API call...');
        console.log('🔄 This will PATCH your actual BlazeMeter test configuration!');
        console.log('⚠️  The test configuration will be permanently updated');
        
        const result = await updateBlazeMeterLoadConfiguration(
            config.testId,
            config.apiKey,
            config.apiSecret,
            15,  // 15 users
            '3m', // 3 minutes
            '1m' // 1m ramp-up
        );
        
        console.log('✅ Real API test completed successfully!');
        console.log('\n📊 Result:');
        console.log(JSON.stringify(result, null, 2));
        
        console.log('\n📋 Summary:');
        console.log(`   Test ID: ${result.testId}`);
        console.log(`   Users: ${result.concurrency}`);
        console.log(`   Duration: ${result.duration}`);
        console.log(`   Ramp-up: ${result.rampUp}`);
        console.log('   Location Distribution:');
        for (const [location, users] of Object.entries(result.locations)) {
            console.log(`      ${location}: ${users} users`);
        }
        
        if (result.apiResponse && result.apiResponse.result) {
            console.log('\n🔄 API Update Confirmation:');
            console.log(`   Updated Test: ${result.apiResponse.result.name || result.apiResponse.result.id}`);
            console.log(`   Update Time: ${result.apiResponse.result.updated || 'N/A'}`);
        }
        
    } catch (error) {
        console.log('❌ Real API test failed:', error.message);
    }
}

/**
 * Main execution
 */
async function main() {
    if (args.includes('--real')) {
        await realApiTest();
    } else {
        await mockTest();
    }
}

// Run the test
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    });
}

module.exports = {
    mockTest,
    realApiTest
};
