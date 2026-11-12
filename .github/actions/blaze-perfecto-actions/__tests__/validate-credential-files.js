#!/usr/bin/env node

/**
 * Credential File Validation Script
 * 
 * This script validates that:
 * 1. All credential files use the .local.json naming convention
 * 2. Example files exist for all local config files
 * 3. All .local.json files are properly ignored by git
 * 4. No credential files are accidentally tracked in git
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔐 Validating credential file configuration...\n');

// Define the test directory
const testDir = __dirname;

// Expected config files
const expectedConfigs = [
    {
        example: 'blazemeter-test-config.example.json',
        local: 'blazemeter-test-config.local.json',
        purpose: 'BlazeMeter API testing'
    },
    {
        example: 'perfecto-test-config.example.json', 
        local: 'perfecto-test-config.local.json',
        purpose: 'Perfecto API testing'
    }
];

let allValid = true;

// Check 1: Verify example files exist
console.log('📋 Checking example configuration files...');
expectedConfigs.forEach(config => {
    const examplePath = path.join(testDir, config.example);
    if (fs.existsSync(examplePath)) {
        console.log(`✅ ${config.example} exists`);
    } else {
        console.log(`❌ ${config.example} missing`);
        allValid = false;
    }
});

// Check 2: Verify local files exist (optional, but recommended)
console.log('\n🔧 Checking local configuration files...');
expectedConfigs.forEach(config => {
    const localPath = path.join(testDir, config.local);
    if (fs.existsSync(localPath)) {
        console.log(`✅ ${config.local} exists for ${config.purpose}`);
    } else {
        console.log(`⚠️  ${config.local} not found (create from ${config.example} to enable ${config.purpose})`);
    }
});

// Check 3: Verify git ignore status
console.log('\n🚫 Checking git ignore status...');
expectedConfigs.forEach(config => {
    try {
        const localPath = path.join(testDir, config.local);
        if (fs.existsSync(localPath)) {
            // Check if file is ignored by git
            const result = execSync(`git check-ignore "${localPath}"`, { 
                cwd: testDir, 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            console.log(`✅ ${config.local} is properly ignored by git`);
        }
    } catch (error) {
        if (fs.existsSync(path.join(testDir, config.local))) {
            console.log(`❌ ${config.local} is NOT ignored by git - SECURITY RISK!`);
            allValid = false;
        }
    }
});

// Check 4: Look for any credential files that might be tracked
console.log('\n🔍 Checking for accidentally tracked credential files...');
try {
    const trackedFiles = execSync('git ls-files | grep -E "(config|credential|secret|key).*\\.json$"', {
        cwd: testDir,
        encoding: 'utf8'
    }).trim().split('\n').filter(f => f);
    
    if (trackedFiles.length > 0) {
        console.log('❌ Found potentially sensitive files tracked by git:');
        trackedFiles.forEach(file => {
            if (!file.includes('example')) {
                console.log(`   🚨 ${file} - May contain credentials!`);
                allValid = false;
            } else {
                console.log(`   ✅ ${file} - Example file (safe)`);
            }
        });
    } else {
        console.log('✅ No credential files are being tracked by git');
    }
} catch (error) {
    console.log('✅ No credential files found in git tracking');
}

// Check 5: Verify .gitignore contains proper patterns
console.log('\n📝 Checking .gitignore patterns...');
const gitignorePath = path.join(testDir, '.gitignore');
if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignoreContent.includes('*.local.json')) {
        console.log('✅ .gitignore contains *.local.json pattern');
    } else {
        console.log('❌ .gitignore missing *.local.json pattern');
        allValid = false;
    }
} else {
    console.log('⚠️  No local .gitignore found');
}

// Summary
console.log('\n' + '='.repeat(50));
if (allValid) {
    console.log('🎉 All credential file configurations are valid!');
    console.log('✅ Your credentials are protected from accidental commits.');
    process.exit(0);
} else {
    console.log('❌ Some credential file configurations need attention.');
    console.log('🔧 Please fix the issues above before proceeding.');
    process.exit(1);
}
