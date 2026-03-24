# OSV-UI Test Fixtures

This directory contains comprehensive test cases for all supported ecosystems. Each subdirectory represents a specific language or package manager configuration with known vulnerabilities (CVEs) for testing the scanner and dashboard.

## Supported Ecosystems

| Directory | Language | Tool / Manifest |
| :--- | :--- | :--- |
| `javascript-npm` | JavaScript | `package-lock.json` |
| `javascript-pnpm` | JavaScript | `pnpm-lock.yaml` |
| `javascript-yarn` | JavaScript | `yarn.lock` |
| `python-pip` | Python | `requirements.txt` |
| `python-uv` | Python | `uv.lock` |
| `python-poetry` | Python | `poetry.lock` |
| `python-pipenv` | Python | `Pipfile.lock` |
| `go-service` | Go | `go.sum` |
| `rust-service` | Rust | `Cargo.lock` |
| `java-maven` | Java | `pom.xml` |
| `php-composer` | PHP | `composer.lock` |
| `ruby-bundler` | Ruby | `Gemfile.lock` |

## Usage

Scan all fixtures (discovery mode):
```bash
node bin/cli.js -d test-fixture
```

Scan a specific fixture:
```bash
node bin/cli.js test-fixture/javascript-npm
```
