# pesticides-ocr-test-automation

Journey test suite for the Pesticides OCR service, built with [Playwright](https://playwright.dev/).

- end-to-end user journey tests (Chromium, Firefox, WebKit)
- cross-browser testing on real browsers via [BrowserStack](https://www.browserstack.com/)
- [Allure](https://allurereport.org/) reporting, published to S3 for the CDP Portal

- [Local Development](#local-development)
  - [Requirements](#requirements)
  - [Setup](#setup)
  - [Running tests](#running-tests)
  - [Debugging tests](#debugging-tests)
  - [Reporting](#reporting)
- [Project structure](#project-structure)
- [Writing tests](#writing-tests)
- [Production](#production)
- [Running on GitHub](#running-on-github)
- [BrowserStack](#browserstack)
- [Environment variables](#environment-variables)
- [Licence](#licence)

## Local Development

### Requirements

Node.js `>= v24` and npm `>= v11`. Use [nvm](https://github.com/creationix/nvm) to pick up the version in `.nvmrc`:

```bash
nvm use
```

### Setup

```bash
npm install
npx playwright install
cp .env.example .env
```

`BASE_URL` in `.env` controls which service the tests target (defaults to `http://localhost:3000`).

### Running tests

Start the application you are testing on `BASE_URL`, then:

| Script                      | Description                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm test`                  | Run all tests on Chromium, Firefox and WebKit                                                  |
| `npm run test:chromium`     | Run all tests on Chromium only                                                                 |
| `npm run test:chrome`       | Run all tests on your installed Google Chrome (local only, no `npx playwright install` needed) |
| `npm run test:headed`       | Run on your installed Google Chrome with a visible, maximised window (local only)              |
| `npm run test:browserstack` | Run on BrowserStack (see [BrowserStack](#browserstack))                                        |
| `npm run test:all`          | Run local browsers, then BrowserStack                                                          |

Any Playwright CLI option can be appended after `--`:

```bash
npm test -- --project=firefox
npm test -- test/specs/pesticides-ocr-home.test.js
npm test -- --grep "register heading"
```

### Debugging tests

```bash
npm run test:debug   # Playwright Inspector, step through each action
npm run test:ui      # Playwright UI mode: watch, time-travel and pick locators
```

When a test fails locally a screenshot, video and trace are saved to `test-results/`. Open a trace with:

```bash
npx playwright show-trace test-results/<test-folder>/trace.zip
```

### Reporting

Results are written to `allure-results/` on every run.

```bash
npm run report        # Generate the HTML report in allure-report/
npm run report:open   # Generate and open it in a browser
```

## Project structure

```
playwright.config.js               # Base config: base URL, browsers, timeouts, reporters
playwright.browserstack.config.js  # Extends the base config for BrowserStack runs
browserstack.yml                   # BrowserStack platforms and tunnel settings
test/
  fixtures/index.js                # Extended `test` that injects page objects
  page-objects/                    # One class per page, extending Page
  specs/                           # *.test.js spec files
```

Modules are imported through the subpath aliases defined in `package.json` (`#fixtures`, `#page-objects/*`).

## Writing tests

1. Create a page object in `test/page-objects/` that extends `Page`:

   ```javascript
   import { Page } from '#page-objects/page'

   class UploadPage extends Page {
     get fileInput() {
       return this.page.locator('input[type="file"]')
     }

     open() {
       return super.open('/upload')
     }
   }

   export { UploadPage }
   ```

2. Register it as a fixture in `test/fixtures/index.js`:

   ```javascript
   uploadPage: async ({ page }, use) => {
     await use(new UploadPage(page))
   }
   ```

3. Use it in a spec in `test/specs/`, importing `test` and `expect` from `#fixtures`:

   ```javascript
   import { test, expect } from '#fixtures'

   test('Should show the upload form', async ({ uploadPage }) => {
     await uploadPage.open()
     await expect(uploadPage.fileInput).toBeVisible()
   })
   ```

Prefer web-first assertions (`await expect(locator).toBeVisible()`) over manual waits; Playwright retries them automatically until `expect.timeout`.

## Production

### Running the tests

Tests are run from the CDP-Portal under the Test Suites section. Before any changes can be run, a new docker image must be built, this will happen automatically when a pull request is merged into the `main` branch.
You can check the progress of the build under the actions section of this repository. Builds typically take around 1-2 minutes.

The platform injects `ENVIRONMENT`, which points the tests at `https://pesticides-ocr-test-automation.${ENVIRONMENT}.cdp-int.defra.cloud` and enables 2 retries with traces captured on the first retry.

The container runs `npm run $TEST_SCRIPT` (default `test`). Set `TEST_SCRIPT=test:browserstack` or `test:all` to change what runs.

The results of the test run are made available in the portal.

### Requirements of CDP Environment Tests

1. Your service builds as a docker container using the `.github/workflows/publish.yml`
   The workflow tags the docker images allowing the CDP Portal to identify how the container should be run on the platform.
   It also ensures its published to the correct docker repository.

2. The Dockerfile's entrypoint script should return exit code of 0 if the test suite passes or 1/>0 if it fails

3. Test reports should be published to S3 using the script in `./bin/publish-tests.sh`

The Docker image is based on `mcr.microsoft.com/playwright`; keep its tag in sync with the `@playwright/test` version in `package.json`.

## Running on GitHub

Alternatively you can run the test suite as a GitHub workflow.
Test runs on GitHub are not able to connect to the CDP Test environments. Instead, they run the tests against a version of the services running in docker.
A docker compose `compose.yml` is included as a starting point, which includes the databases (mongodb, redis) and infrastructure (localstack) pre-setup.

Steps:

1. Edit the compose.yml to include your services.
2. Modify the scripts in docker/scripts to pre-populate the database, if required and create any localstack resources.
3. Test the setup locally with `docker compose up` and `npm run test:chromium`
4. Set up the workflow trigger in `.github/workflows/journey-tests.yml`.

By default, the provided workflow will run when triggered manually from GitHub or when triggered by another workflow. It uses the local `run-journey-tests` action and uploads the Allure report and, on failure, the Playwright traces.

## BrowserStack

BrowserStack runs use the `browserstack-node-sdk`, which wraps the Playwright CLI and manages the remote sessions and the BrowserStackLocal tunnel.

| File                                | Purpose                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `browserstack.yml`                  | Browsers/devices to run on, tunnel settings                       |
| `playwright.browserstack.config.js` | Base config plus proxy support for talking to BrowserStack on CDP |

Add `BROWSERSTACK_USER` and `BROWSERSTACK_KEY` to `.env` (locally) or as secrets on the test suite (CDP), then run `npm run test:browserstack`.

## Environment variables

`.env` is loaded automatically by the npm scripts via Node's `--env-file-if-exists`.

| Variable                  | Required          | Description                                                                   |
| ------------------------- | ----------------- | ----------------------------------------------------------------------------- |
| `BASE_URL`                | No                | Target URL when `ENVIRONMENT` is not set. Defaults to `http://localhost:3000` |
| `ENVIRONMENT`             | CDP only          | CDP environment name (injected by the platform)                               |
| `HTTP_PROXY`              | CDP only          | Outbound proxy for the browser and BrowserStack (injected by the platform)    |
| `BROWSERSTACK_USER`       | BrowserStack only | BrowserStack username                                                         |
| `BROWSERSTACK_KEY`        | BrowserStack only | BrowserStack access key                                                       |
| `BROWSERSTACK_BUILD_NAME` | No                | Build label in the BrowserStack dashboard                                     |
| `TEST_SCRIPT`             | No                | npm script run by the Docker entrypoint (default `test`)                      |
| `PUBLISH_TEST_RESULTS`    | No                | Set to `0` to skip publishing the report to S3 from the container             |

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government licence v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
