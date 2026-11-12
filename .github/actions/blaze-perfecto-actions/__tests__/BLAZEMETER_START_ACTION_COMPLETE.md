# BlazeMeter Start Test - GitHub Action Integration Complete

## Summary

I have successfully integrated the `startBlazeMeterTest` function into the GitHub Action as a new operation. The existing `blazemeter-start` operation has been updated to actually start BlazeMeter tests using the new function.

## Changes Made

### 1. Updated `blazemeter-start` Operation

**File**: `index.js` - `handleBlazeMeterStart()` function

**Changes**:
- Now uses `blazemeterHelpers.startBlazeMeterTest()` instead of just getting latest master ID
- Added support for delayed start parameter
- Requires test ID to be provided (no longer optional)
- Returns actual test start results including master ID, status, and session information

**Before**: Was only getting the latest master ID and status
**After**: Actually starts a new BlazeMeter test execution

### 2. New Input Parameter

**File**: `action.yml`

**Added**:
```yaml
bzm-delayed-start:
  description: 'Whether to use delayed start for BlazeMeter test (default: false)'
  required: false
  default: 'false'
```

**Environment Variable**: `BZM_DELAYED_START`

### 3. Updated Action Behavior

**Operation**: `blazemeter-start`

**Required Inputs**:
- `bzm-api-key`: BlazeMeter API key
- `bzm-api-secret`: BlazeMeter API secret  
- `bzm-test-id`: BlazeMeter test ID (now required)

**Optional Inputs**:
- `bzm-delayed-start`: Whether to use delayed start (default: false)

**Outputs**:
- `blazemeter-master-id`: Master ID of the started test
- `blazemeter-test-id`: Test ID that was started
- `blazemeter-status`: Initial status of the test
- `execution-summary`: Summary of the execution

## Usage Examples

### Basic Test Start
```yaml
- name: Start BlazeMeter Test
  uses: ./.github/actions/blaze-perfecto-actions
  with:
    operation: blazemeter-start
    bzm-api-key: ${{ secrets.BZM_API_KEY }}
    bzm-api-secret: ${{ secrets.BZM_API_SECRET }}
    bzm-test-id: "1234567"
```

### Delayed Start Test
```yaml
- name: Start BlazeMeter Test (Delayed)
  uses: ./.github/actions/blaze-perfecto-actions
  with:
    operation: blazemeter-start
    bzm-api-key: ${{ secrets.BZM_API_KEY }}
    bzm-api-secret: ${{ secrets.BZM_API_SECRET }}
    bzm-test-id: "1234567"
    bzm-delayed-start: "true"
```

### Using Outputs
```yaml
- name: Start BlazeMeter Test
  id: start-test
  uses: ./.github/actions/blaze-perfecto-actions
  with:
    operation: blazemeter-start
    bzm-api-key: ${{ secrets.BZM_API_KEY }}
    bzm-api-secret: ${{ secrets.BZM_API_SECRET }}
    bzm-test-id: "1234567"

- name: Use Test Results
  run: |
    echo "Master ID: ${{ steps.start-test.outputs.blazemeter-master-id }}"
    echo "Status: ${{ steps.start-test.outputs.blazemeter-status }}"
    echo "Summary: ${{ steps.start-test.outputs.execution-summary }}"
```

## API Integration

The action now calls the BlazeMeter API endpoint:
```
POST https://a.blazemeter.com/api/v4/tests/{testId}/start?delayedStart={delayedStart}
```

This matches exactly with the curl command you originally provided:
```bash
curl 'https://a.blazemeter.com/api/v4/tests/1234567/start?delayedStart=false' \
  -X POST \
  -H 'Content-Type: application/json' \
  --user 'api_key_id:api_key_secret'
```

## Testing

### Comprehensive Test Suite
- **File**: `test-blazemeter-start-action.js`
- **Tests**: Basic start, delayed start, validation errors
- **Results**: All tests pass ✅

### Test Validation
- ✅ Function integration working correctly
- ✅ New parameter (delayed start) properly handled
- ✅ Required validation in place
- ✅ Outputs correctly set
- ✅ Error handling functional

## Breaking Change Note

**Important**: The `blazemeter-start` operation now requires `bzm-test-id` to be provided. Previously it could fall back to searching by test name, but starting a test requires a specific test ID.

**Migration**: Ensure all workflows using `blazemeter-start` provide a valid `bzm-test-id`.

## Status: ✅ COMPLETE

The `startBlazeMeterTest` function has been successfully integrated as a GitHub Action operation. The `blazemeter-start` operation now:

1. ✅ Actually starts BlazeMeter tests (not just getting status)
2. ✅ Supports delayed start parameter
3. ✅ Provides comprehensive outputs
4. ✅ Has proper validation and error handling
5. ✅ Is fully tested and documented

The integration is ready for production use!
