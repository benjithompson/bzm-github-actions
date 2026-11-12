# Perforce Sandbox - BlazeMeter & Perfecto Test Automation

This repository contains a comprehensive GitHub Action for automated testing using BlazeMeter and Perfecto platforms, along with Kubernetes deployment configurations and testing resources.

## 🚀 GitHub Action: `blaze-perfecto-actions`

The main feature of this repository is the **`blaze-perfecto-actions`** GitHub Action, which provides a modular, operation-based approach to BlazeMeter and Perfecto test automation.

### Location
```
.github/actions/blaze-perfecto-actions/
```

### Features
- **Operation-based workflow**: Modular operations for different test phases
- **Node.js 20 runtime**: Modern, reliable execution environment
- **Comprehensive logging**: Detailed operation status and debugging information
- **Error handling**: Robust error handling and status reporting
- **Flexible configuration**: Support for various test scenarios and environments

### Available Operations

| Operation | Description |
|-----------|-------------|
| `preliminary-checks` | Validate prerequisites and connectivity |
| `blazemeter-start` | Start BlazeMeter load tests |
| `blazemeter-status` | Check BlazeMeter test status |
| `blazemeter-update-load-configuration` | Update BlazeMeter test load configuration |
| `perfecto-start` | Start Perfecto mobile tests |
| `perfecto-stop` | Stop running Perfecto tests |
| `perfecto-status` | Check Perfecto test status |
| `perfecto-continuous` | Run continuous Perfecto test iterations |

### Quick Start

```yaml
- name: Run BlazeMeter and Perfecto Tests
  uses: ./.github/actions/blaze-perfecto-actions
  with:
    operation: 'preliminary-checks'
    bzm-test-id: ${{ vars.BZM_TEST_ID }}
    bzm-api-key: ${{ secrets.BZM_API_KEY }}
    bzm-api-secret: ${{ secrets.BZM_API_SECRET }}
    perfecto-cloud: ${{ vars.PERFECTO_CLOUD_NAME }}
    perfecto-token: ${{ secrets.PERFECTO_SECURITY_TOKEN }}
    perfecto-device-id: ${{ vars.PERFECTO_DEVICE_ID }}
    perfecto-script-key: ${{ vars.PERFECTO_SCRIPT_KEY }}
```

### Documentation

- **[Action README](.github/actions/blaze-perfecto-actions/README.md)**: Complete action documentation
- **[Migration Guide](BLAZEMETER_PAYLOAD_MIGRATION.md)**: Migration from legacy bash scripts
- **[Example Workflows](.github/workflows/)**: Sample workflow configurations

## 📁 Repository Structure

```
├── .github/
│   ├── actions/
│   │   └── blaze-perfecto-actions/          # Main GitHub Action
│   │       ├── action.yml               # Action definition
│   │       ├── index.js                 # Main entry point
│   │       ├── package.json             # Node.js dependencies
│   │       ├── src/                     # Source modules
│   │       └── README.md                # Action documentation
│   └── workflows/                       # Example workflows
├── deployments/                         # Kubernetes configurations
│   ├── blazemeter/                      # BlazeMeter deployment configs
│   └── httpbin/                         # Test service deployments
├── JMeter/                              # JMeter test configurations
└── Taurus/                              # Taurus test configurations
```

## 🔧 Deployment Configurations

### BlazeMeter Deployments
- **Kubernetes manifests** for BlazeMeter agents and services
- **OpenShift configurations** for enterprise deployments
- **Mock services** for testing various ingress controllers (Nginx, Istio, Contour)
- **Certificate management** for secure deployments

### Test Services
- **httpbin**: HTTP testing service for API validation
- **JMeter configurations**: Load testing scenarios
- **Taurus configs**: Cloud-native testing setups

## 🛡️ Security & Best Practices

### Secrets Management
All sensitive information should be stored as GitHub repository secrets:

- `BZM_API_KEY`: BlazeMeter API key
- `BZM_API_SECRET`: BlazeMeter API secret  
- `PERFECTO_SECURITY_TOKEN`: Perfecto security token

### Variables
Non-sensitive configuration stored as repository variables:

- `BZM_TEST_ID`: BlazeMeter test ID
- `PERFECTO_CLOUD_NAME`: Perfecto cloud name
- `PERFECTO_DEVICE_ID`: Perfecto device ID
- `PERFECTO_SCRIPT_KEY`: Perfecto script key

## 📚 Usage Examples

### Basic Test Execution
```yaml
name: Automated Testing
on: [push, workflow_dispatch]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Preliminary Checks
        uses: ./.github/actions/blaze-perfecto-actions
        with:
          operation: 'preliminary-checks'
          bzm-api-key: ${{ secrets.BZM_API_KEY }}
          bzm-api-secret: ${{ secrets.BZM_API_SECRET }}
          # ... other parameters
          
      - name: Start BlazeMeter Test
        uses: ./.github/actions/blaze-perfecto-actions
        with:
          operation: 'blazemeter-start'
          bzm-api-key: ${{ secrets.BZM_API_KEY }}
          bzm-api-secret: ${{ secrets.BZM_API_SECRET }}
          # ... other parameters
```

### Load Configuration Update
```yaml
- name: Update Load Configuration
  uses: ./.github/actions/blaze-perfecto-actions
  with:
    operation: 'blazemeter-update-load-configuration'
    bzm-test-id: ${{ vars.BZM_TEST_ID }}
    bzm-api-key: ${{ secrets.BZM_API_KEY }}
    bzm-api-secret: ${{ secrets.BZM_API_SECRET }}
    location-distribution: |
      us-east-1:70
      eu-west-1:30
```

## 🔄 Migration from Legacy Scripts

This repository previously contained standalone Node.js scripts for BlazeMeter and Perfecto automation. These have been fully migrated to the GitHub Action format for better integration, maintainability, and CI/CD workflow support.

**Migration benefits:**
- ✅ Integrated GitHub Actions workflow
- ✅ Better error handling and logging
- ✅ Modular operation-based design
- ✅ Consistent parameter handling
- ✅ Improved documentation and examples

## 🚀 Getting Started

1. **Fork or use this repository** in your GitHub workflows
2. **Configure secrets and variables** in your repository settings
3. **Use the example workflows** as templates for your testing needs
4. **Customize operations** based on your specific test requirements

## 📞 Support

For questions, issues, or contributions, please refer to the action's documentation or create issues in this repository.

---

**Last Updated**: January 2025  
**Action Version**: 2.0.0  
**Node.js Runtime**: 20.x
