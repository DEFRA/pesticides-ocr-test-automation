import { test as base, expect } from '@playwright/test'

import { PesticidesOcrHomePage } from '#page-objects/pesticides-ocr-home.page'

/**
 * Page objects are exposed as fixtures so each test gets instances bound to its own `page`.
 * Register new page objects here and destructure them in the test signature.
 */
export const test = base.extend({
  /**
   * Attaches a full-page screenshot to the report every time a page (or a new tab/popup)
   * finishes loading, plus one of the final screen, so each screen in the journey is
   * visible whether the test passes or fails.
   */
  navigationScreenshots: [
    async ({ context }, use, testInfo) => {
      const pending = []
      let count = 0

      const capture = async (page, label = new URL(page.url()).pathname) => {
        const name = `${String(++count).padStart(2, '0')} - ${label}`

        try {
          const body = await page.screenshot({ fullPage: true })
          await testInfo.attach(name, { body, contentType: 'image/png' })
        } catch {
          // The page was closed or navigated away before the screenshot completed
        }
      }

      const track = (page) => {
        page.on('load', () => pending.push(capture(page)))
      }

      context.pages().forEach(track)
      context.on('page', track)

      await use()

      await Promise.all(pending)

      const lastPage = context.pages().at(-1)

      if (lastPage) {
        await capture(lastPage, `Final screen (${testInfo.status})`)
      }
    },
    { auto: true }
  ],

  pesticidesOcrHomePage: async ({ page }, use) => {
    await use(new PesticidesOcrHomePage(page))
  }
})

export { expect }
