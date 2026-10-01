import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import path from 'node:path'

const root = '.local/yohaku-zh'
const manifest = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8'))
const assets = new Map(manifest.assets.filter((a) => a.file).map((a) => [a.url, a]))
await mkdir('public/yohaku', { recursive: true })
const local = async (url) => {
  const asset = assets.get(new URL(url, manifest.origin).href)
  if (!asset) return url
  const name = path.basename(asset.file)
  await copyFile(`${root}/${asset.file}`, `public/yohaku/${name}`)
  return `/yohaku/${name}`
}
const fonts = []
// Retain upstream styles as an explicit capture, without loading upstream JavaScript.
const home = manifest.pages.find((p) => p.url === `${manifest.origin}/`)
for (const url of home.styles) {
  const asset = assets.get(url)
  if (!asset) throw new Error(`Missing stylesheet ${url}`)
  let css = await readFile(`${root}/${asset.file}`, 'utf8')
  const matches = [...css.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)]
  for (const match of matches) {
    if (/^(data:|#)/.test(match[1])) continue
    const resolved = new URL(match[1], url).href
    const mapped = await local(resolved)
    if (mapped !== resolved) css = css.replaceAll(match[0], `url('${mapped}')`)
  }
  fonts.push(css)
}
await writeFile(
  'public/yohaku/captured.css',
  `/* Captured from https://innei.in/; ${manifest.capturedAt}. See THIRD_PARTY_NOTICES.md. */\n${fonts.join('\n')}`,
)
const document = new JSDOM(await readFile(`${root}/pages/${home.file}`, 'utf8')).window.document
const hero = document.querySelector('h1').parentElement
const avatar = hero.querySelector('img')
avatar.removeAttribute('srcset')
avatar.setAttribute('src', await local(avatar.getAttribute('src')))
// Actual animation constants read from the archived home JS chunk.
const animated = [...hero.children].filter((el) =>
  el.getAttribute('style')?.includes('opacity:0.001'),
)
animated.forEach((el, index) => {
  el.style.removeProperty('opacity')
  el.style.removeProperty('transform')
  el.classList.add(el.tagName === 'H1' ? 'capture-fade' : 'capture-rise')
  el.style.animationDelay = `${[100, 200, 400, 600, 800][index]}ms`
})
hero.querySelectorAll('a').forEach((el) => {
  if (el.getAttribute('aria-label') === 'Email') el.setAttribute('href', 'mailto:i@innei.in')
})
const counts = hero.querySelector('.tracking-wide')
if (counts)
  counts.innerHTML =
    '<span>384 篇</span><span>·</span><span>164 万字</span><span>·</span><span>2948 天</span>'
const aliases = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  srcset: 'srcSet',
  crossorigin: 'crossOrigin',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
}
const voids = new Set(['img', 'br', 'hr', 'input', 'source', 'wbr'])
function jsx(node) {
  if (node.nodeType === 3)
    return node.textContent === 'Innei'
      ? '{title}'
      : node.textContent ===
          'A product-minded engineer building interfaces, workflows, and tiny autonomous systems.'
        ? '{description}'
        : `{${JSON.stringify(node.textContent)}}`
  if (node.nodeType !== 1) return ''
  const tag = node.tagName.toLowerCase()
  if (['script', 'iframe', 'template'].includes(tag)) return ''
  let props = ''
  for (const attribute of node.attributes) {
    if (/^on/i.test(attribute.name) || attribute.name === 'data-nimg') continue
    if (tag === 'img' && attribute.name === 'src')
      props += ` src={avatar || ${JSON.stringify(attribute.value)}}`
    else if (attribute.name === 'style') {
      const style = Object.fromEntries(
        Array.from({ length: node.style.length }, (_, index) => node.style[index]).map((key) => [
          key.startsWith('--') ? key : key.replace(/-([a-z])/g, (_, char) => char.toUpperCase()),
          node.style.getPropertyValue(key),
        ]),
      )
      props += ` style={${JSON.stringify(style)}}`
    } else
      props += ` ${aliases[attribute.name] || attribute.name}={${JSON.stringify(attribute.value)}}`
  }
  return voids.has(tag)
    ? `<${tag}${props}/>`
    : `<${tag}${props}>${[...node.childNodes].map(jsx).join('')}</${tag}>`
}
await writeFile(
  'src/components/yohaku/CapturedHero.tsx',
  `/* Generated from the captured Chinese home DOM by scripts/yohaku/prepare-ui.mjs. */\n/* eslint-disable @next/next/no-img-element */\nexport function CapturedHero({ title, description, avatar }: { title: string; description?: string | null; avatar?: string | null }) { return (${jsx(hero)}) }\n`,
)
await writeFile(
  'src/components/yohaku/captured-profile.json',
  JSON.stringify(
    {
      capturedAt: manifest.capturedAt,
      bodyClass: home.bodyClass,
      avatar: avatar.getAttribute('src'),
      title: 'Innei',
      description:
        'A product-minded engineer building interfaces, workflows, and tiny autonomous systems.',
    },
    null,
    2,
  ),
)
console.log('Prepared captured CSS, local fonts, avatar and React hero.')
