# BlazeMeter Load Configuration Update Function Testing

This directory contains comprehensive tests for the `updateBlazeMeterLoadConfiguration` function, which is responsible for updating BlazeMeter test load configurations via PATCH requests to the BlazeMeter API.

## Function Behavior

The `updateBlazeMeterLoadConfiguration` function:
1. **Fetches** the current test configuration from BlazeMeter API
2. **Modifies** the load parameters (concurrency, duration, ramp-up)
3. **Recalculates** user distribution across locations
4. **Sends** a PATCH request to update the test configuration
5. **Returns** the updated configuration and API response

## Test Files

### `test-blazemeter-payload-update.js`
Main test file for the `updateBlazeMeterLoadConfiguration` function with two testing modes:

1. **Mock Mode** (default): Tests function logic without making real API calls
2. **Real API Mode**: Tests with actual BlazeMeter API calls using your credentials

### `direct-blazemeter-test.js`
Direct usage example showing how to call the function with custom parameters. Useful for:
- Quick testing with specific load configurations
- Debugging individual scenarios
- Learning how to integrate the function into your own code

### `blazemeter-test-config.example.json`
Example configuration file showing the required format for real API testing.

### `blazemeter-test-config.local.json` (you create this)
Your actual BlazeMeter credentials for real API testing. This file is ignored by git.

## Test Scenarios Configuration

Test scenarios are now **config-driven** and stored in the `blazemeter-test-config.local.json` file. This approach provides:

1. **Centralized Configuration**: All test scenarios are defined in one place
2. **Easy Customization**: Modify test scenarios without changing code
3. **Consistent Testing**: Same scenarios used across mock and real API modes
4. **Scalable**: Add or remove test scenarios by editing the config file

### Test Scenarios Structure

In your `blazemeter-test-config.local.json`, define test scenarios like this:

```json
{
  "testId": "YOUR_TEST_ID",
  "apiKey": "YOUR_API_KEY",
  "apiSecret": "YOUR_API_SECRET",
  "testScenarios": [
    {
      "name": "Basic Load Configuration",
      "concurrency": 10,
      "duration": "5m",
      "rampUp": "1m"
    },
    {
      "name": "High Load Configuration",
      "concurrency": 50,
      "duration": "10m",
      "rampUp": "2m"
    },
    {
      "name": "Quick Test Configuration",
      "concurrency": 5,
      "duration": "2m",
      "rampUp": "30s"
    },
    {
      "name": "Minimal Test Configuration",
      "concurrency": 2,
      "duration": "1m",
      "rampUp": "15s"
    }
  ]
}
```

### Fallback Scenarios

If no `testScenarios` are defined in the config file, the test will use minimal fallback scenarios. However, for comprehensive testing, it's recommended to define your scenarios in the config file.

## Running Tests

### Mock Mode (Safe - No Real API Calls)
```bash
# Run individual test
node test-blazemeter-payload-update.js

# Run all tests (includes this test)
node run-tests.js

# Direct function test with custom parameters
node direct-blazemeter-test.js --mock
```

### Real API Mode (Requires BlazeMeter Credentials)
```bash
# 1. First, create your config file
cp blazemeter-test-config.example.json blazemeter-test-config.local.json

# 2. Edit the config file with your actual credentials
{
  "testId": "your-actual-test-id",
  "apiKey": "your-actual-api-key", 
  "apiSecret": "your-actual-api-secret",
  "projectId": "your-project-id",
  "testName": "your-test-name"
}

# 3. Run test with real API
node test-blazemeter-payload-update.js --real

# Direct function test with real API
node direct-blazemeter-test.js --real
```

## What the Tests Validate

### Function Logic Tests
- ✅ Basic load configuration updates (10 users, 5m duration, 1m ramp-up)
- ✅ High load configuration updates (50 users, 10m duration, 2m ramp-up)  
- ✅ Quick test configuration updates (5 users, 2m duration, 30s ramp-up)
- ✅ User distribution across multiple locations
- ✅ Correct calculation of location-based user allocation
- ✅ Proper handling of rounding/remainder users

### Error Handling Tests
- ✅ Missing test ID validation
- ✅ Missing API key validation
- ✅ Missing API secret validation
- ✅ Missing concurrency parameter validation
- ✅ Missing duration parameter validation
- ✅ Missing ramp-up parameter validation

### Output Structure Tests
- ✅ Correct payload structure (`overrideExecutions` array)
- ✅ Proper execution configuration values
- ✅ Valid location distribution totals
- ✅ Correct return object structure

## Test Output Example

```
🧪 Testing updateBlazeMeterLoadConfiguration Function
============================================================
🧪 Using MOCK mode

🔧 Testing: Basic Load Configuration
   Parameters: 10 users, 5m, ramp-up 1m
🔄 Simulating PATCH request to update BlazeMeter test configuration...
   ✅ User distribution validated (10 users across 2 locations)
      • harbor-5d4d9dfccd-pfgvm: 6 users
      • harbor-5d4d9dfccd-x8n2k: 4 users
   ✅ Test passed (502ms)
   📊 Result: mock-test-12345, 10 users, 5m, ramp-up 1m

🔧 Testing Error Conditions
   Testing: Missing Test ID
   ✅ Correctly threw expected error

============================================================
📊 TEST SUMMARY
============================================================
✅ Passed: 6
❌ Failed: 0
📋 Total:  6

🎉 ALL TESTS PASSED! The updateBlazeMeterLoadConfiguration function works correctly.
```

## Getting BlazeMeter Credentials for Real API Testing

1. **API Key & Secret**:
   - Log into your BlazeMeter account
   - Go to Settings > API Keys
   - Create a new API key or use an existing one

2. **Test ID**:
   - Open your BlazeMeter test in the web interface
   - The test ID is in the URL: `https://a.blazemeter.com/app/#/accounts/{account}/workspaces/{workspace}/projects/{project}/tests/{TEST_ID}`

3. **Project ID**:
   - From the same URL, extract the project ID
   - Or find it in the project settings

## Security Note

**Never commit `blazemeter-test-config.local.json` to version control!**

This file contains sensitive API credentials. The `.gitignore` file in this directory automatically excludes it from git commits.

## Integration with CI/CD

In CI/CD environments, you can:

1. **Always use mock mode** for basic validation
2. **Use real API mode** only in secure environments with proper secret management
3. **Configure secrets** as environment variables and create the config file dynamically

Example CI/CD setup:
```bash
# Create config from environment variables
echo '{"testId":"'$BZM_TEST_ID'","apiKey":"'$BZM_API_KEY'","apiSecret":"'$BZM_API_SECRET'"}' > blazemeter-test-config.local.json

# Run real API tests
node test-blazemeter-payload-update.js --real
```

## Troubleshooting

### "Configuration file not found"
- Make sure you've created `blazemeter-test-config.local.json` from the example file
- Check that the file is in the correct directory (`__tests__/`)

### "Failed to fetch test configuration: HTTP 401"
- Verify your API key and secret are correct
- Check that the API key has sufficient permissions

### "Failed to fetch test configuration: HTTP 404"
- Verify the test ID exists and is accessible
- Check that the test belongs to the correct project/workspace

### "Failed to update test configuration: HTTP 4xx"
- ✅ Verify API key has write permissions for the test
- ✅ Check that the test is not currently running (some updates may be restricted)
- ✅ Ensure the payload structure matches BlazeMeter API requirements

### "Test configuration does not have overrideExecutions data"
- The test may not have been configured with custom execution settings
- Try creating a new test with load configuration in BlazeMeter web interface first
