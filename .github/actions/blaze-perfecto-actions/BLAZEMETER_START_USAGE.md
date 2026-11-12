# BlazeMeter Start Action Usage Guide

This guide demonstrates how to use the `blazemeter-start` action to start BlazeMeter test 14809134 and capture the Master ID for use in subsequent workflow steps.

## ✅ Action Configuration

The `blazemeter-start` operation is fully implemented and ready to use:

- **Function**: `startBlazeMeterTest()` in `src/blazemeter-helpers.js`
- **Action Operation**: `blazemeter-start` 
- **Test ID**: 14809134 (as requested)
- **Outputs**: Master ID, Test ID, Status, and Summary

## 🚀 Basic Usage

### Step 1: Start the BlazeMeter Test

```yaml
- name: Start BlazeMeter Test
  id: start-test
  uses: ./.github/actions/blaze-perfecto-actions
  with:
    operation: blazemeter-start
    bzm-api-key: ${{ secrets.BZM_API_KEY }}
    bzm-api-secret: ${{ secrets.BZM_API_SECRET }}
    bzm-test-id: "14809134"
    bzm-delayed-start: "false"  # Optional: use delayed start
    debug: "true"               # Optional: enable debug logging
```

### Step 2: Use the Master ID in Subsequent Steps

```yaml
- name: Output Master ID and Results
  run: |
    echo "🎯 BlazeMeter Test Started Successfully!"
    echo "📊 Master ID: ${{ steps.start-test.outputs.blazemeter-master-id }}"
    echo "🆔 Test ID: ${{ steps.start-test.outputs.blazemeter-test-id }}"
    echo "📈 Status: ${{ steps.start-test.outputs.blazemeter-status }}"
    echo "📋 Summary: ${{ steps.start-test.outputs.execution-summary }}"
    
    # Set as environment variable for later use
    echo "BZM_MASTER_ID=${{ steps.start-test.outputs.blazemeter-master-id }}" >> $GITHUB_ENV
```

### Step 3: Use Master ID in Later Steps

```yaml
- name: Check Test Status
  uses: ./.github/actions/blaze-perfecto-actions
  with:
    operation: blazemeter-status
    bzm-api-key: ${{ secrets.BZM_API_KEY }}
    bzm-api-secret: ${{ secrets.BZM_API_SECRET }}
    bzm-master-id: ${{ steps.start-test.outputs.blazemeter-master-id }}

- name: Report Perfecto EUX Data to BlazeMeter
  uses: ./.github/actions/blaze-perfecto-actions
  with:
    operation: perfecto-report-to-blaze-master
    perfecto-cloud: ${{ secrets.PERFECTO_CLOUD }}
    perfecto-token: ${{ secrets.PERFECTO_TOKEN }}
    perfecto-execution-id: "your-perfecto-execution-id"
    bzm-api-key: ${{ secrets.BZM_API_KEY }}
    bzm-api-secret: ${{ secrets.BZM_API_SECRET }}
    bzm-master-id: ${{ steps.start-test.outputs.blazemeter-master-id }}
```

## 📋 Available Outputs

The `blazemeter-start` action provides these outputs:

| Output | Description | Example |
|--------|-------------|---------|
| `blazemeter-master-id` | BlazeMeter master execution ID | `"r-v4-61234567890"` |
| `blazemeter-test-id` | BlazeMeter test ID | `"14809134"` |
| `blazemeter-status` | Current test status | `"STARTING"` |
| `execution-summary` | Human-readable summary | `"BlazeMeter test started - Master ID: r-v4-61234567890, Status: STARTING"` |
| `operation-status` | Overall operation result | `"PASSED"` |

## 🔧 Configuration Options

### Required Inputs
- `bzm-api-key`: Your BlazeMeter API key
- `bzm-api-secret`: Your BlazeMeter API secret  
- `bzm-test-id`: The test ID to start (14809134)

### Optional Inputs
- `bzm-delayed-start`: Set to `"true"` for delayed start (default: `"false"`)
- `debug`: Set to `"true"` to enable debug logging (default: `"false"`)

## 📁 Complete Workflow Example

See the example workflow in `.github/workflows/test-blazemeter-start.yml`:

```yaml
name: Test BlazeMeter Start Action

on:
  workflow_dispatch:
    inputs:
      bzm-api-key:
        description: 'BlazeMeter API Key'
        required: true
        type: string
      bzm-api-secret:
        description: 'BlazeMeter API Secret'
        required: true
        type: string

jobs:
  test-blazemeter-start:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
    
    - name: Start BlazeMeter Test
      id: start-test
      uses: ./.github/actions/blaze-perfecto-actions
      with:
        operation: blazemeter-start
        bzm-api-key: ${{ inputs.bzm-api-key }}
        bzm-api-secret: ${{ inputs.bzm-api-secret }}
        bzm-test-id: "14809134"
        debug: 'true'
    
    - name: Output Master ID and Results
      run: |
        echo "📊 Master ID: ${{ steps.start-test.outputs.blazemeter-master-id }}"
        echo "🆔 Test ID: ${{ steps.start-test.outputs.blazemeter-test-id }}"
        echo "📈 Status: ${{ steps.start-test.outputs.blazemeter-status }}"
```

## 🧪 Testing

Run the test demo:
```bash
cd .github/actions/blaze-perfecto-actions
node __tests__/test-blazemeter-start-demo.js
```

## ✅ Status: READY TO USE

The `blazemeter-start` action is fully implemented and tested. It will:

1. ✅ Start BlazeMeter test 14809134 via API
2. ✅ Return the Master ID as an output
3. ✅ Provide all necessary data for subsequent workflow steps
4. ✅ Handle errors gracefully with proper logging

**The action is ready for production use with valid BlazeMeter credentials.**
