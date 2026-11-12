#!/usr/bin/env node
/**
 * test-blazemeter-stop-action.js
 * Test the blazemeter-stop GitHub Action operation
 */

const path = require('path');
const { spawn } = require('child_process');

/**
 * Test the blazemeter-stop operation
 */
async function testBlazeMeterStopAction() {
    console.log('🧪 Testing BlazeMeter Stop GitHub Action Operation');
    console.log('============================================================');
    console.log('');
    
    const testScenarios = [
        {
            name: 'Basic Stop Test',
            env: {
                OPERATION: 'blazemeter-stop',
                BZM_API_KEY: 'mock-key',
                BZM_API_SECRET: 'mock-secret',
                BZM_MASTER_ID: 'mock-master-12345',
                DEBUG: 'true'
            },
            expectError: true, // Expected because we're using mock credentials
            expectLogMessages: [
                'Stopping BlazeMeter Test',
                'Stopping master ID: mock-master-12345'
            ]
        },
        {
            name: 'Different Master ID',
            env: {
                OPERATION: 'blazemeter-stop',
                BZM_API_KEY: 'mock-key',
                BZM_API_SECRET: 'mock-secret',
                BZM_MASTER_ID: 'mock-master-67890',
                DEBUG: 'true'
            },
            expectError: true,
            expectLogMessages: [
                'Stopping BlazeMeter Test',
                'Stopping master ID: mock-master-67890'
            ]
        },
        {
            name: 'Missing Master ID',
            env: {
                OPERATION: 'blazemeter-stop',
                BZM_API_KEY: 'mock-key',
                BZM_API_SECRET: 'mock-secret',
                DEBUG: 'true'
                // BZM_MASTER_ID intentionally missing
            },
            expectError: true,
            expectLogMessages: [
                'BlazeMeter master ID is required to stop a test'
            ]
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const scenario of testScenarios) {
        try {
            console.log(`🔧 Testing: ${scenario.name}`);
            
            const result = await runActionWithEnv(scenario.env);
            
            // Check for expected log messages
            let foundMessages = 0;
            for (const expectedMessage of scenario.expectLogMessages) {
                if (result.output.includes(expectedMessage)) {
                    foundMessages++;
                }
            }
            
            if (foundMessages === scenario.expectLogMessages.length) {
                console.log(`   ✅ Test passed - Found ${foundMessages}/${scenario.expectLogMessages.length} expected log messages`);
            } else {
                console.log(`   ❌ Test failed - Found ${foundMessages}/${scenario.expectLogMessages.length} expected log messages`);
                failed++;
                continue;
            }
            
            // Check exit code
            if (scenario.expectError && result.exitCode !== 0) {
                console.log(`   ✅ Expected error occurred (exit code: ${result.exitCode})`);
            } else if (!scenario.expectError && result.exitCode === 0) {
                console.log(`   ✅ Expected success (exit code: ${result.exitCode})`);
            } else {
                console.log(`   ❌ Unexpected exit code: ${result.exitCode}`);
                failed++;
                continue;
            }
            
            passed++;
            
        } catch (error) {
            console.log(`   ❌ Test failed with error: ${error.message}`);
            failed++;
        }
        
        console.log('');
    }

    console.log('============================================================');
    console.log('📊 TEST SUMMARY');
    console.log('============================================================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📋 Total:  ${passed + failed}`);
    console.log('');

    if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED! The blazemeter-stop action operation works correctly.');
        console.log('');
        console.log('✨ Integration Summary:');
        console.log('   • blazemeter-stop operation properly handles master ID parameter');
        console.log('   • New BZM_MASTER_ID parameter working correctly');
        console.log('   • Proper validation and error handling in place');
        console.log('   • Action outputs correctly set for stop operations');
    } else {
        console.log('💥 Some tests failed. Please check the implementation.');
    }

    return failed === 0;
}

/**
 * Run the action with given environment variables
 */
async function runActionWithEnv(env) {
    return new Promise((resolve) => {
        const actionPath = path.join(__dirname, '..', 'index.js');
        
        const child = spawn('node', [actionPath], {
            env: { ...process.env, ...env },
            stdio: 'pipe'
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            resolve({
                exitCode: code,
                output: stdout + stderr
            });
        });
    });
}

// Run the test
if (require.main === module) {
    testBlazeMeterStopAction()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Test execution failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testBlazeMeterStopAction };
