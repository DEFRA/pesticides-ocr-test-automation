class Page {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page
  }

  get pageHeading() {
    return this.page.locator('h1.govuk-heading-xl')
  }

  open(path) {
    return this.page.goto(path)
  }
}

export { Page }
