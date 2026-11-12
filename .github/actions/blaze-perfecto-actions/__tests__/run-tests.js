#!/usr/bin/env node

/**
 * run-tests.js
 * Simple test runner for the BlazeMeter Perfecto EUX Action
 * 
 * Usage:
 *   node run-tests.js                                    # Run all tests with default data
 *   node run-tests.js path/to/perfecto_payload.json     # Run tests with real Perfecto payload
 *   node run-tests.js --help                            # Show help
 */

const { spawn } = require('child_process');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log('🧪 BlazeMeter Perfecto EUX Action Test Runner\n');
    console.log('Usage:');
    console.log('  node run-tests.js                                    # Run all tests with built-in sample data');
    console.log('  node run-tests.js path/to/perfecto_payload.json     # Run tests with real Perfecto payload file');
    console.log('  node run-tests.js --help                            # Show this help');
    console.log('\nExamples:');
    console.log('  node run-tests.js');
    console.log('  node run-tests.js ./data/real_perfecto_payload.json');
    process.exit(0);
}

console.log('🧪 Running BlazeMeter Perfecto EUX Action Tests\n');

// List of test files to run
const testFiles = [
    'test-perfecto-translator.js',
    'test-blazemeter-payload-update.js',
    'test-perfecto-helpers.js'
];

let passedTests = 0;
let failedTests = 0;

async function runTest(testFile, testArgs = []) {
    return new Promise((resolve) => {
        console.log(`\n📋 Running: ${testFile}${testArgs.length > 0 ? ' with args: ' + testArgs.join(' ') : ''}`);
        console.log('=' + '='.repeat(50));
        
        const testProcess = spawn('node', [testFile, ...testArgs], {
            cwd: __dirname,
            stdio: 'inherit'
        });
        
        testProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ ${testFile} PASSED`);
                passedTests++;
            } else {
                console.log(`\n❌ ${testFile} FAILED (exit code: ${code})`);
                failedTests++;
            }
            resolve(code);
        });
        
        testProcess.on('error', (error) => {
            console.error(`\n❌ ${testFile} ERROR: ${error.message}`);
            failedTests++;
            resolve(1);
        });
    });
}

async function runAllTests() {
    // Determine if we have a payload file argument
    const payloadFile = args.find(arg => !arg.startsWith('--') && arg.endsWith('.json'));
    const testArgs = payloadFile ? [payloadFile] : [];
    
    if (payloadFile) {
        console.log(`📁 Using Perfecto payload file: ${payloadFile}\n`);
    } else {
        console.log('📋 Using built-in sample data\n');
    }
    
    console.log(`Found ${testFiles.length} test file(s) to run:\n`);
    
    for (const testFile of testFiles) {
        console.log(`  • ${testFile}`);
    }
    
    for (const testFile of testFiles) {
        await runTest(testFile, testArgs);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📋 Total:  ${passedTests + failedTests}`);
    
    if (failedTests === 0) {
        console.log('\n🎉 ALL TESTS PASSED! The action is working correctly.');
        process.exit(0);
    } else {
        console.log('\n💥 Some tests failed. Please check the output above.');
        process.exit(1);
    }
}

// Run the tests
if (require.main === module) {
    runAllTests().catch((error) => {
        console.error('Test runner error:', error);
        process.exit(1);
    });
}
