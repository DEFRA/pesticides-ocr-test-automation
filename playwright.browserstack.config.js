import { defineConfig } from '@playwright/test'
import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { bootstrap } from 'global-agent'

import baseConfig from './playwright.config.js'

/**
 * Run via browserstack-node-sdk, which reads platforms and credentials from browserstack.yml.
 * On CDP the SDK must talk to BrowserStack through the platform proxy (HTTP_PROXY).
 */
const proxyUrl = process.env.HTTP_PROXY

if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent({ uri: proxyUrl }))
  bootstrap()
  globalThis.GLOBAL_AGENT.HTTP_PROXY = proxyUrl
}

const { proxy: _proxy, ...use } = baseConfig.use

export default defineConfig({
  ...baseConfig,
  // Browsers and devices are supplied by browserstack.yml
  projects: [{ name: 'browserstack' }],
  use: {
    ...use,
    ignoreHTTPSErrors: true
  },
  globalTimeout: 45 * 60 * 1000
})
