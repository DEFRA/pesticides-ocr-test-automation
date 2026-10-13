import { test, expect } from '#fixtures'

test.describe('Pesticides OCR home page', () => {
  test('Should display the register heading', async ({
    pesticidesOcrHomePage
  }) => {
    await pesticidesOcrHomePage.open()

    await expect(pesticidesOcrHomePage.pageHeading).toHaveText(
      'Register as a user of Plant Protection Products (PPPs)'
    )
  })
})
