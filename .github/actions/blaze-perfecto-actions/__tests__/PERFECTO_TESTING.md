# Perfecto Helper Functions Testing

This directory contains comprehensive tests for the Perfecto helper functions, which handle all Perfecto cloud interactions including connectivity checks, test execution, and EUX data reporting to BlazeMeter.

## Perfecto Helper Functions

The Perfecto helper functions provide:
1. **Connectivity Testing**: Basic and authenticated connectivity checks
2. **Resource Validation**: Device and script accessibility verification  
3. **Test Execution**: Starting and monitoring Perfecto test runs
4. **Data Retrieval**: Getting execution metrics and commands
5. **EUX Integration**: Translating and sending EUX data to BlazeMeter

## Test Files

### `test-perfecto-helpers.js`
Comprehensive test suite for all Perfecto helper functions with two testing modes:

1. **Mock Mode** (default): Tests function logic without making real API calls
2. **Real API Mode**: Tests with actual Perfecto and BlazeMeter API calls using your credentials

### `perfecto-test-config.example.json`
Example configuration file showing the required format for real API testing.

### `perfecto-test-config.local.json` (you create this)
Your actual Perfecto and BlazeMeter credentials for real API testing. This file is ignored by git.

## Running Tests

### Mock Mode (Safe - No Real API Calls)
```bash
# Run individual Perfecto helper test
node test-perfecto-helpers.js

# Run all tests (includes this test)
node run-tests.js
```

### Real API Mode (Requires Perfecto & BlazeMeter Credentials)
```bash
# 1. First, create your config file
cp perfecto-test-config.example.json perfecto-test-config.local.json

# 2. Edit the config file with your credentials
# Fill in: perfectoCloud, securityToken, deviceId, scriptKey, executionId, externalId
# Fill in: blazemeter.apiKey, blazemeter.apiSecret, blazemeter.masterId

# 3. Run tests with real API calls
node test-perfecto-helpers.js --real
```

## Configuration Options

The `perfecto-test-config.local.json` file supports:

### Required Fields
- `perfectoCloud`: Your Perfecto cloud name
- `securityToken`: Your Perfecto security token

### Optional Fields
- `scriptKey`: Script identifier for test execution
- `deviceId`: Target device for testing
- `blazemeter`: BlazeMeter API credentials for EUX data reporting

### Dynamic Values (Generated at Runtime)
- `executionId`: Generated when a Perfecto test starts
- `externalId`: Generated when a Perfecto test starts  
- `masterId`: Generated when a BlazeMeter test starts

### Testing Values (For API Testing)
- `testingValues.executionId`: Real execution ID from existing Perfecto test execution
- `testingValues.externalId`: Real external ID from existing Perfecto test execution  
- `blazemeter.testingValues.masterId`: Real master ID from existing BlazeMeter test

**Important**: 
- **Production**: Do not hardcode `executionId`, `externalId`, or `masterId` values - these are obtained dynamically during test execution
- **Testing**: Use real `executionId` and `externalId` from existing test execution in `testingValues` to test API functionality without starting new tests
- **API Requirements**: Some Perfecto API operations require `externalId` for test status lookups, while others use `executionId` for metrics retrieval

### How to Get Testing Values

1. **Get Perfecto Testing Values**:
   - Run a Perfecto test manually in the Perfecto Cloud interface
   - Note both the `Execution ID` and `External ID` from the test results
   - Add these to `testingValues.executionId` and `testingValues.externalId`
   - **Note**: Different API operations require different IDs (some need `externalId` for status, others need `executionId` for metrics)

2. **Get BlazeMeter Testing Values**:
   - Start a BlazeMeter test manually
   - Note the `Master ID` from the test execution
   - Add this to `blazemeter.testingValues.masterId`

3. **Alternative**: Check existing test reports in both platforms for valid IDs

### Error Handling
The system now includes intelligent error handling for common scenarios:
- **Non-existent external IDs**: Fails gracefully after 3 attempts (30 seconds) with a clear error message
- **API connectivity issues**: Retries with exponential backoff
- **Invalid credentials**: Immediate failure with actionable error messages  
- `deviceId`: Device ID for device availability tests
- `scriptKey`: Script key for script accessibility tests
- `executionId`: Existing execution ID for status/metrics tests
- `externalId`: External ID for execution ID lookup tests
- `blazemeter.apiKey`: BlazeMeter API key for EUX reporting tests
- `blazemeter.apiSecret`: BlazeMeter API secret for EUX reporting tests
- `blazemeter.masterId`: BlazeMeter master ID for EUX reporting tests

### Test Scenarios
Each test scenario can be enabled/disabled in the config:

```json
{
  "testScenarios": {
    "connectivity": { "enabled": true, "description": "Test basic connectivity" },
    "deviceCheck": { "enabled": true, "description": "Test device availability" },
    "scriptCheck": { "enabled": true, "description": "Test script accessibility" },
    "testStatus": { "enabled": true, "description": "Test execution status retrieval" },
    "executionIdFromExternal": { "enabled": true, "description": "Get execution ID from external ID" },
    "executionMetrics": { "enabled": true, "description": "Get test execution commands/metrics" },
    "euxToBlazeMeter": { "enabled": true, "description": "Send EUX data to BlazeMeter" },
    "startTest": { "enabled": false, "description": "Start new test execution (disabled by default)" }
  }
}
```

## Functions Tested

### Core Helper Functions
1. **`checkPerfectoConnectivity`**: Tests both basic connectivity and authentication
2. **`checkPerfectoDevice`**: Validates device availability
3. **`checkPerfectoScript`**: Verifies script accessibility
4. **`getTestStatus`**: Retrieves test execution status
5. **`getExecutionIdFromExternalId`**: Gets execution ID from external ID
6. **`getPerfectoTestExecutionMetrics`**: Fetches test execution commands/metrics
7. **`sendPerfectoExecutionMetricsToBlazeMeterReport`**: Main EUX reporting function

### Test Scenarios by Function

#### `checkPerfectoConnectivity`
- **Purpose**: Verify connection to Perfecto cloud and API authentication
- **Requirements**: `perfectoCloud`, `securityToken`
- **Mock behavior**: Simulates successful connectivity and authentication

#### `checkPerfectoDevice` 
- **Purpose**: Check if specified device is available
- **Requirements**: `perfectoCloud`, `securityToken`, `deviceId`
- **Mock behavior**: Simulates successful device availability check

#### `checkPerfectoScript`
- **Purpose**: Verify script accessibility  
- **Requirements**: `perfectoCloud`, `securityToken`, `scriptKey`
- **Mock behavior**: Simulates successful script accessibility check

#### `getTestStatus`
- **Purpose**: Get current status of test execution
- **Requirements**: `perfectoCloud`, `securityToken`, `executionId`
- **Mock behavior**: Returns mock status indicating completion

#### `getExecutionIdFromExternalId`
- **Purpose**: Lookup execution ID using external ID (with processing wait)
- **Requirements**: `perfectoCloud`, `securityToken`, `externalId`  
- **Mock behavior**: Simulates processing delay then returns mock execution ID

#### `getPerfectoTestExecutionMetrics`
- **Purpose**: Retrieve detailed commands/metrics from completed execution
- **Requirements**: `perfectoCloud`, `securityToken`, `executionId`
- **Mock behavior**: Returns sample payload data (from `sample_perfecto_payload.json`)

#### `sendPerfectoExecutionMetricsToBlazeMeterReport`
- **Purpose**: Complete EUX workflow - wait for processing, get metrics, translate, and send to BlazeMeter
- **Requirements**: `perfectoCloud`, `securityToken`, `executionId`, `blazemeter.*` 
- **Mock behavior**: Simulates full EUX workflow with successful BlazeMeter posting

## Test Output Examples

### Mock Mode Output
```
🧪 Testing Perfecto Helper Functions
============================================================
🧪 Using MOCK mode

🔧 Testing checkPerfectoConnectivity
🧪 Running MOCK version of checkPerfectoConnectivity
📋 Parameters: cloud=mock-cloud, token=***
✅ Mock connectivity test passed
   ✅ Connectivity test passed

🔧 Testing checkPerfectoDevice
🧪 Running MOCK version of checkPerfectoDevice
📋 Parameters: cloud=mock-cloud, token=***, device=MOCK_DEVICE_12345
✅ Mock device check passed
   ✅ Device check passed

📊 TEST SUMMARY
============================================================
✅ Passed: 7
❌ Failed: 0
📋 Total:  7

🎉 ALL TESTS PASSED! The Perfecto helper functions work correctly.
```

### Real API Mode Output
```
🧪 Testing Perfecto Helper Functions
============================================================
🌐 Using REAL API mode
📋 Perfecto Cloud: demo-perfectomobile-com
📋 Security Token: abc12345...

🔧 Testing checkPerfectoConnectivity
   ✅ Connectivity test passed

🔧 Testing getPerfectoTestExecutionMetrics
   ✅ Execution metrics retrieval passed
   📊 Resources found: 2
   📊 Total commands: 11

📊 TEST SUMMARY
============================================================
✅ Passed: 7
❌ Failed: 0
📋 Total:  7

🎉 ALL TESTS PASSED! The Perfecto helper functions work correctly.
```

## Error Handling

The tests include comprehensive error handling for:
- Missing configuration parameters
- Invalid credentials
- Network connectivity issues
- API response parsing errors
- Timeout scenarios

## Integration with Other Tests

The Perfecto helper tests integrate with the existing test suite:
- Run automatically with `node run-tests.js`
- Share common configuration patterns with BlazeMeter tests
- Use the same sample payload data for consistent testing

This provides complete coverage of the Perfecto integration functionality.
