import { Page } from '#page-objects/page'

class PesticidesOcrHomePage extends Page {
  open() {
    return super.open('/')
  }
}

export { PesticidesOcrHomePage }
