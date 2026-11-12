# BlazeMeter Perfecto EUX Integration Action

A modular GitHub Action that integrates BlazeMeter performance testing with Perfecto mobile EUX testing through operation-based workflows. This action replaces the original Node.js helper scripts with a unified, reusable composite action.

> **📍 Location**: This action follows GitHub's best practices by being located in `.github/actions/` for proper organization in multi-purpose repositories.

## 🚀 Refactoring Benefits

- **Single Reusable Action**: Replaces multiple Node.js scripts with one modular action
- **Operation-Based**: Use the same action with different `operation` parameters
- **Simplified Workflows**: Declarative workflow steps instead of manual script calls
- **Better Error Handling**: Integrated with GitHub Actions core for proper error reporting
- **Consistent I/O**: Standardized inputs and outputs through `action.yml`
- **Improved Maintainability**: Centralized codebase with modular helper functions

## 🎯 Operations Supported

- **preliminary-checks**: Validate BlazeMeter and Perfecto connectivity and accessibility
- **blazemeter-start**: Start tests and get master IDs and status
- **blazemeter-status**: Check status of running BlazeMeter tests
- **blazemeter-update-load-configuration**: Update BlazeMeter test configuration (concurrency, duration, ramp-up)
- **perfecto-start**: Start Perfecto mobile EUX tests
- **perfecto-stop**: Stop running Perfecto tests gracefully
- **perfecto-status**: Check status of running Perfecto tests
- **perfecto-continuous**: Run continuous test iterations
- **perfecto-report-to-blaze-master**: Fetch Perfecto EUX data and report to BlazeMeter as timeseries data

## � Automatic EUX Data Reporting

The `perfecto-start` and `perfecto-continuous` operations now support automatic EUX data reporting to BlazeMeter. When `perfecto-eux-enabled` is set to `true` (default), the action will:

1. **Start the Perfecto test** as usual
2. **Wait for processing completion** - monitors the test until it reaches `PROCESSING_COMPLETE` status
3. **Fetch command data** - retrieves all EUX commands from the Perfecto execution
4. **Translate to BlazeMeter format** - converts Perfecto command data to BlazeMeter timeseries format
5. **Post to BlazeMeter** - sends the data as timeseries intervals to the specified BlazeMeter master

This eliminates the need for separate `perfecto-report-to-blaze-master` operations in most workflows.

## �📤 Key Outputs

- **blazemeter-master-id**: BlazeMeter master ID for the test execution
- **perfecto-execution-id**: Perfecto execution ID for the test
- **operation-status**: Overall operation status (PASSED, FAILED, WARNING)

## Usage

## 📋 Complete Usage Example

```yaml
name: 'BlazeMeter Perfecto EUX Integration Example'

on:
  workflow_dispatch:

env:
  PROJECT_ID: ${{ vars.PROJECT_ID }}
  BZM_TEST_ID: ${{ vars.BZM_TEST_ID }}
  BZM_API_KEY: ${{ secrets.BZM_API_KEY }}
  BZM_API_SECRET: ${{ secrets.BZM_API_SECRET }}
  PERFECTO_SECURITY_TOKEN: ${{ secrets.PERFECTO_SECURITY_TOKEN }}
  PERFECTO_CLOUD_NAME: ${{ vars.PERFECTO_CLOUD_NAME }}
  PERFECTO_SCRIPT_KEY: ${{ vars.PERFECTO_SCRIPT_KEY }}
  PERFECTO_DEVICE_ID: ${{ vars.PERFECTO_DEVICE_ID }}

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      # Step 1: Validate prerequisites
      - name: Preliminary Checks
        id: checks
        uses: ./.github/actions/blaze-perfecto-actions
        with:
          operation: 'preliminary-checks'
          bzm-api-key: ${{ env.BZM_API_KEY }}
          bzm-api-secret: ${{ env.BZM_API_SECRET }}
          bzm-test-id: ${{ env.BZM_TEST_ID }}
          perfecto-cloud: ${{ env.PERFECTO_CLOUD_NAME }}
          perfecto-token: ${{ env.PERFECTO_SECURITY_TOKEN }}
          perfecto-device-id: ${{ env.PERFECTO_DEVICE_ID }}
          perfecto-script-key: ${{ env.PERFECTO_SCRIPT_KEY }}

      # Step 2: Start BlazeMeter test and get Master ID
      - name: Start BlazeMeter Test
        id: blazemeter
        uses: ./.github/actions/blaze-perfecto-actions
        with:
          operation: 'blazemeter-start'
          bzm-api-key: ${{ env.BZM_API_KEY }}
          bzm-api-secret: ${{ env.BZM_API_SECRET }}
          bzm-test-id: ${{ env.BZM_TEST_ID }}
          bzm-project-id: ${{ env.PROJECT_ID }}

      # Step 2.5: Update BlazeMeter test configuration
      - name: Update Test Configuration
        uses: ./.github/actions/blaze-perfecto-actions
        with:
          operation: 'blazemeter-update-load-configuration'
          bzm-api-key: ${{ env.BZM_API_KEY }}
          bzm-api-secret: ${{ env.BZM_API_SECRET }}
          bzm-test-id: ${{ env.BZM_TEST_ID }}
          bzm-concurrency: '100'
          bzm-duration: '10m'
          bzm-rampup: '2m'

      # Step 3: Start Perfecto EUX test with automatic BlazeMeter reporting
      - name: Start Perfecto Test
        id: perfecto
        uses: ./.github/actions/blaze-perfecto-actions
        with:
          operation: 'perfecto-start'
          perfecto-cloud: ${{ env.PERFECTO_CLOUD_NAME }}
          perfecto-token: ${{ env.PERFECTO_SECURITY_TOKEN }}
          perfecto-device-id: ${{ env.PERFECTO_DEVICE_ID }}
          perfecto-script-key: ${{ env.PERFECTO_SCRIPT_KEY }}
          # EUX reporting enabled (default: true)
          perfecto-eux-enabled: 'true'
          bzm-api-key: ${{ env.BZM_API_KEY }}
          bzm-api-secret: ${{ env.BZM_API_SECRET }}
          bzm-master-id: ${{ steps.blazemeter.outputs.blazemeter-master-id }}

      # Step 4: Run continuous EUX monitoring with automatic reporting
      - name: Monitor with EUX
        uses: ./.github/actions/blaze-perfecto-actions
        with:
          operation: 'perfecto-continuous'
          perfecto-cloud: ${{ env.PERFECTO_CLOUD_NAME }}
          perfecto-token: ${{ env.PERFECTO_SECURITY_TOKEN }}
          perfecto-device-id: ${{ env.PERFECTO_DEVICE_ID }}
          perfecto-script-key: ${{ env.PERFECTO_SCRIPT_KEY }}
          perfecto-iterations: '10'
          # EUX reporting enabled for each iteration
          perfecto-eux-enabled: 'true'
          bzm-api-key: ${{ env.BZM_API_KEY }}
          bzm-api-secret: ${{ env.BZM_API_SECRET }}
          bzm-master-id: ${{ steps.blazemeter.outputs.blazemeter-master-id }}

      # Step 5: Optional manual EUX reporting (only if automatic reporting was disabled)
      - name: Report EUX Data to BlazeMeter (Manual)
        if: false  # Typically not needed with automatic reporting
        uses: ./.github/actions/blaze-perfecto-actions
        with:
          operation: 'perfecto-report-to-blaze-master'
          perfecto-cloud: ${{ env.PERFECTO_CLOUD_NAME }}
          perfecto-token: ${{ env.PERFECTO_SECURITY_TOKEN }}
          perfecto-execution-id: ${{ steps.perfecto.outputs.perfecto-execution-id }}
          bzm-api-key: ${{ env.BZM_API_KEY }}
          bzm-api-secret: ${{ env.BZM_API_SECRET }}
          bzm-master-id: ${{ steps.blazemeter.outputs.blazemeter-master-id }}
          perfecto-test-name: 'Mobile EUX Performance Test'

      # Step 6: Stop Perfecto test gracefully
      - name: Stop Perfecto Test
        uses: ./.github/actions/blaze-perfecto-actions
        with:
          operation: 'perfecto-stop'
          perfecto-cloud: ${{ env.PERFECTO_CLOUD_NAME }}
          perfecto-token: ${{ env.PERFECTO_SECURITY_TOKEN }}
          perfecto-execution-id: ${{ steps.perfecto.outputs.perfecto-execution-id }}

    outputs:
      master-id: ${{ steps.blazemeter.outputs.blazemeter-master-id }}
      execution-id: ${{ steps.perfecto.outputs.perfecto-execution-id }}
```

- name: Stop Perfecto Test
  uses: ./blaze-perfecto-actions
  with:
    operation: 'perfecto-stop'
    perfecto-cloud: ${{ vars.PERFECTO_CLOUD_NAME }}
    perfecto-token: ${{ secrets.PERFECTO_SECURITY_TOKEN }}
    perfecto-execution-id: ${{ steps.perfecto.outputs.perfecto-execution-id }}
```

## Operations

### `preliminary-checks`
Validates BlazeMeter and Perfecto connectivity and configuration.

**Required Inputs:**
- `bzm-api-key`: BlazeMeter API key
- `bzm-api-secret`: BlazeMeter API secret
- `perfecto-cloud`: Perfecto cloud name
- `perfecto-token`: Perfecto security token
- `perfecto-device-id`: Perfecto device ID
- `perfecto-script-key`: Perfecto script key

**Optional Inputs:**
- `bzm-test-id`: BlazeMeter test ID
- `bzm-test-name`: BlazeMeter test name (fallback if test ID not provided)
- `bzm-project-id`: BlazeMeter project ID

### `blazemeter-start`
Gets the latest master ID and status for a BlazeMeter test.

**Required Inputs:**
- `bzm-api-key`: BlazeMeter API key
- `bzm-api-secret`: BlazeMeter API secret

**Optional Inputs:**
- `bzm-test-id`: BlazeMeter test ID (if not provided, searches by name)
- `bzm-test-name`: BlazeMeter test name (fallback if test ID not provided)
- `bzm-project-id`: BlazeMeter project ID

**Outputs:**
- `blazemeter-master-id`: The master ID for the test
- `blazemeter-test-id`: The test ID
- `blazemeter-status`: The test status

### `blazemeter-status`
Gets the current status of a BlazeMeter test.

**Inputs:** Same as `blazemeter-start`
**Outputs:** Same as `blazemeter-start`

### `blazemeter-update-payload`
Updates the configuration of a BlazeMeter test.

**Required Inputs:**
- `bzm-api-key`: BlazeMeter API key
- `bzm-api-secret`: BlazeMeter API secret
- `bzm-test-id`: BlazeMeter test ID

**Optional Inputs:**
- `bzm-concurrency`: Number of concurrent users (default: 1)
- `bzm-duration`: Test duration (e.g., '10m' for 10 minutes)
- `bzm-rampup`: Ramp-up time (e.g., '2m' for 2 minutes)

### `perfecto-start`
Starts a Perfecto scriptless test.

**Required Inputs:**
- `perfecto-cloud`: Perfecto cloud name
- `perfecto-token`: Perfecto security token
- `perfecto-script-key`: Perfecto script key
- `perfecto-device-id`: Perfecto device ID

**Optional Inputs:**
- `perfecto-eux-enabled`: Enable automatic EUX data reporting to BlazeMeter after test completion (default: true)
- `bzm-api-key`: BlazeMeter API key (required if `perfecto-eux-enabled` is true)
- `bzm-api-secret`: BlazeMeter API secret (required if `perfecto-eux-enabled` is true)
- `bzm-master-id`: BlazeMeter master ID for timeseries data (required if `perfecto-eux-enabled` is true)

**Outputs:**
- `perfecto-execution-id`: The execution ID for the test
- `perfecto-status`: The test status
- `intervals-posted`: Number of timeseries intervals posted to BlazeMeter (if EUX enabled)
- `report-status`: Status of the EUX reporting operation (if EUX enabled)

### `perfecto-stop`
Stops a running Perfecto test.

**Required Inputs:**
- `perfecto-cloud`: Perfecto cloud name
- `perfecto-token`: Perfecto security token
- `perfecto-execution-id`: Perfecto execution ID

**Outputs:**
- `perfecto-execution-id`: The execution ID
- `perfecto-status`: The test status

### `perfecto-status`
Gets the status of a running Perfecto test.

**Inputs:** Same as `perfecto-stop`
**Outputs:** Same as `perfecto-stop`

### `perfecto-continuous`
Runs continuous Perfecto test iterations.

**Required Inputs:**
- `perfecto-cloud`: Perfecto cloud name
- `perfecto-token`: Perfecto security token
- `perfecto-script-key`: Perfecto script key
- `perfecto-device-id`: Perfecto device ID

**Optional Inputs:**
- `perfecto-iterations`: Number of iterations (default: -1 for infinite, limited to 10 in GitHub Actions)
- `perfecto-eux-enabled`: Enable automatic EUX data reporting to BlazeMeter after test completion (default: true)
- `bzm-api-key`: BlazeMeter API key (required if `perfecto-eux-enabled` is true)
- `bzm-api-secret`: BlazeMeter API secret (required if `perfecto-eux-enabled` is true)
- `bzm-master-id`: BlazeMeter master ID for timeseries data (required if `perfecto-eux-enabled` is true)

### `perfecto-report-to-blaze-master`
Fetches Perfecto EUX execution commands and reports the data to BlazeMeter as timeseries data.

**Required Inputs:**
- `perfecto-cloud`: Perfecto cloud name
- `perfecto-token`: Perfecto security token
- `bzm-api-key`: BlazeMeter API key
- `bzm-api-secret`: BlazeMeter API secret
- `bzm-master-id`: BlazeMeter master ID for timeseries data
- Either `perfecto-execution-id` OR `perfecto-external-id`

**Optional Inputs:**
- `perfecto-test-name`: Test name for BlazeMeter profile (default: "Perfecto EUX Test")
- `bzm-test-name`: Alternative test name source

**Outputs:**
- `perfecto-execution-id`: Perfecto execution ID used
- `bzm-master-id`: BlazeMeter master ID used
- `intervals-posted`: Number of timeseries intervals posted to BlazeMeter
- `report-status`: Status of the reporting operation (`SUCCESS`, `FAILED`)

## Common Outputs

All operations provide these outputs:

- `operation-status`: Overall operation status (`PASSED`, `FAILED`, `WARNING`)
- `execution-summary`: Summary of the execution results

## Environment Variables

Set `debug: 'true'` to enable detailed logging for troubleshooting.

## Error Handling

The action provides comprehensive error handling with:

- Input validation
- Network connectivity checks
- API response validation
- Timeout handling
- Graceful degradation for non-critical checks

## Requirements

- Node.js 18+ (automatically provided by GitHub Actions)
- Valid BlazeMeter API credentials
- Valid Perfecto cloud access and credentials

## 🔐 Credential Management

For local development and testing, this action uses a secure credential file system that prevents accidental commits of sensitive information.

### File Structure
- `blazemeter-test-config.example.json` - Template for BlazeMeter configuration ✅ Safe to commit
- `blazemeter-test-config.local.json` - Your actual BlazeMeter credentials ❌ Never committed  
- `perfecto-test-config.example.json` - Template for Perfecto configuration ✅ Safe to commit
- `perfecto-test-config.local.json` - Your actual Perfecto credentials ❌ Never committed

### Setup Instructions
1. Copy example files to create your local config files:
   ```bash
   cd __tests__
   cp blazemeter-test-config.example.json blazemeter-test-config.local.json
   cp perfecto-test-config.example.json perfecto-test-config.local.json
   ```

2. Edit the `.local.json` files with your actual credentials
3. Verify files are protected: `git check-ignore *.local.json`
4. Run validation: `node validate-credential-files.js`

📖 **See [CREDENTIAL_FILE_MANAGEMENT.md](__tests__/CREDENTIAL_FILE_MANAGEMENT.md) for complete documentation**

## Development

The action is structured as:

```
blaze-perfecto-actions/
├── action.yml          # Action definition
├── index.js            # Main entry point
├── package.json        # Dependencies
├── src/
│   ├── blazemeter-helpers.js    # BlazeMeter API functions
│   ├── perfecto-helpers.js      # Perfecto API functions
│   ├── preliminary-checks.js    # Validation functions
│   └── logging-helper.js        # Shared logging utilities
├── __tests__/          # Test suite (following GitHub Actions best practices)
│   ├── test-perfecto-translator.js    # Translation logic tests
│   ├── run-tests.js     # Test runner with CLI support
│   └── sample_perfecto_payload.json   # Sample test data
└── README.md          # This file
```

### Running Tests

The action includes a comprehensive test suite for the Perfecto-to-BlazeMeter translation logic:

```bash
# Run tests with built-in sample data
cd __tests__
node run-tests.js

# Run tests with a real Perfecto payload file  
node run-tests.js path/to/your_perfecto_payload.json

# Run individual test file
node test-perfecto-translator.js
```

The test suite validates:
- Translation logic accuracy
- Data structure validation  
- Error handling and edge cases
- Real payload compatibility

To use this action in your workflow, reference it as a local action:

```yaml
uses: ./blaze-perfecto-actions
```

Or publish it to the GitHub Marketplace and reference it as:

```yaml
uses: your-org/blaze-perfecto-actions@v1
```
