import { loadEnv } from 'payload/node'
import { readFile, writeFile } from 'node:fs/promises'
import { parseHTML } from './dom.mjs'
import { toLexical } from './lexical.mjs'
import type { SiteSetting } from '../../src/payload-types'

loadEnv()
const database = new URL(process.env.DATABASE_URL || '')
if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/blog_studio')
  throw new Error('Local database only')
const root = '.local/yohaku-zh'
const manifest = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8'))
const page = manifest.pages.find((p: { url: string }) => p.url === 'https://innei.in/about')
const document = parseHTML(
  await readFile(`${root}/pages/${page.file.replace('.html', '.resolved.html')}`, 'utf8'),
  page.url,
)
const details = document.querySelector('.rich-content details')
if (!details) throw new Error('Archived details missing')
const replacement = (
  toLexical(details.outerHTML, { baseURL: page.url }) as NonNullable<SiteSetting['about']>
).root.children
type TextNode = { text?: string; children?: TextNode[] }
const textOf = (node: TextNode): string => node.text || node.children?.map(textOf).join('') || ''
const expected = replacement.map((node) => textOf(node as TextNode)).join('')
const { getPayload } = await import('payload')
const { default: config } = await import('../../src/payload.config')
const payload = await getPayload({ config })
try {
  const site = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const nodes = site.about?.root.children || []
  const index = nodes.findIndex(
    (node) => node.type === 'paragraph' && textOf(node as TextNode) === expected,
  )
  if (index < 0)
    console.log('No unchanged flattened details paragraph; preserving current content.')
  else {
    await writeFile(`${root}/before-about-details-repair.json`, JSON.stringify(site, null, 2), {
      flag: 'wx',
    })
    const user = (
      await payload.find({ collection: 'users', where: { role: { equals: 'admin' } }, limit: 1 })
    ).docs[0]
    if (!user) throw new Error('Administrator required')
    const about = structuredClone(site.about!)
    about.root.children.splice(index, 1, ...(replacement as typeof nodes))
    await payload.updateGlobal({
      slug: 'site-settings',
      user,
      context: { disableRevalidate: true },
      data: { about: about as SiteSetting['about'] },
    })
    console.log(
      `Replaced one unchanged paragraph with ${replacement.length} structured blocks; other content preserved.`,
    )
  }
} finally {
  await payload.destroy()
}
process.exit(0)
