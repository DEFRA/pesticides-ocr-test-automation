import { defineConfig, devices } from '@playwright/test'

/**
 * Single config for every environment:
 *  - CDP Portal: ENVIRONMENT is injected by the platform, tests target the deployed service
 *  - Local / GitHub / Docker compose: BASE_URL (defaults to http://localhost:3000)
 */
const isLocal = !process.env.ENVIRONMENT
const isCI = !!process.env.CI || !isLocal

const oneMinute = 60 * 1000

const baseURL = isLocal
  ? process.env.BASE_URL || 'http://localhost:3000'
  : `https://pesticides-ocr-frontend.${process.env.ENVIRONMENT}.cdp-int.defra.cloud`

/**
 * Headed runs (--headed / --debug) are local only and open a maximised window that fits the screen.
 * CDP and CI always run headless with a fixed Full HD viewport so results are consistent.
 * The flag is stored in the environment so worker processes see the same value.
 */
const isHeaded =
  process.env.HEADED === 'true' ||
  !!process.env.PWDEBUG ||
  process.argv.includes('--headed')

if (isHeaded && isCI) {
  throw new Error(
    'Headed mode (--headed / --debug) is only supported for local runs, not in CDP or CI'
  )
}

if (isHeaded) {
  process.env.HEADED = 'true'
}

const fullHdViewport = { width: 1920, height: 1080 }

function desktop(device) {
  if (!isHeaded) {
    return { ...device, viewport: fullHdViewport }
  }

  // A null viewport sizes the page to the window; deviceScaleFactor is not allowed with it
  const { viewport: _viewport, deviceScaleFactor: _scale, ...rest } = device

  return { ...rest, viewport: null }
}

export default defineConfig({
  testDir: './test/specs',
  testMatch: '**/*.test.js',
  outputDir: './test-results',

  fullyParallel: false,
  forbidOnly: isCI,
  retries: isLocal ? 0 : 2,
  workers: 1,

  timeout: 2 * oneMinute,
  expect: {
    timeout: 10000
  },

  reporter: [
    // Rolling output to the logger so progress is visible in the CDP Portal / GitHub logs
    ['list'],
    // Allure is used to generate the final HTML report published to S3
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results'
      }
    ]
  ],

  use: {
    baseURL,
    headless: true,
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
    navigationTimeout: 30000,
    // Screenshots (every page load + final screen) come from the navigationScreenshots fixture
    screenshot: 'off',
    trace: isLocal ? 'retain-on-failure' : 'on-first-retry',
    video: isLocal ? 'retain-on-failure' : 'off',

    // CDP routes outbound traffic through a squid proxy exposed as HTTP_PROXY
    ...(process.env.HTTP_PROXY && {
      proxy: {
        server: process.env.HTTP_PROXY
      }
    })
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...desktop(devices['Desktop Chrome']),
        ...(isHeaded && {
          launchOptions: { args: ['--start-maximized'] }
        })
      }
    },
    // Local only: uses the installed Google Chrome, for machines that cannot run `npx playwright install`
    ...(isCI
      ? []
      : [
          {
            name: 'chrome',
            use: {
              ...desktop(devices['Desktop Chrome']),
              channel: 'chrome',
              // Video recording needs Playwright's ffmpeg, which comes from `npx playwright install`
              video: 'off',
              ...(isHeaded && {
                launchOptions: { args: ['--start-maximized'] }
              })
            }
          }
        ]),
    {
      name: 'firefox',
      use: desktop(devices['Desktop Firefox'])
    },
    {
      name: 'webkit',
      use: desktop(devices['Desktop Safari'])
    }
  ]
})
