import { JSDOM } from 'jsdom'
export function parseHTML(html, url) {
  return new JSDOM(html, { url }).window.document
}
