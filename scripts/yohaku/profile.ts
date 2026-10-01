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
const { getPayload } = await import('payload')
const { default: config } = await import('../../src/payload.config')
const payload = await getPayload({ config })
try {
  const marker = `${root}/profile-imported.json`
  let imported = false
  try {
    await readFile(marker)
    imported = true
  } catch {
    /* first import */
  }
  if (!imported) {
    const profile = JSON.parse(
      await readFile('src/components/yohaku/captured-profile.json', 'utf8'),
    )
    const manifest = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8'))
    const aboutPage = manifest.pages.find(
      (p: { url: string }) => p.url === 'https://innei.in/about',
    )
    const document = parseHTML(
      await readFile(`${root}/pages/${aboutPage.file.replace('.html', '.resolved.html')}`, 'utf8'),
      aboutPage.url,
    )
    const about = toLexical(document.querySelector('.rich-content')?.innerHTML || '', {
      baseURL: aboutPage.url,
    }) as SiteSetting['about']
    const user = (
      await payload.find({ collection: 'users', where: { role: { equals: 'admin' } }, limit: 1 })
    ).docs[0]
    if (!user) throw new Error('Administrator required')
    const previous = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    await writeFile(`${root}/site-before-import.json`, JSON.stringify(previous, null, 2), {
      flag: 'wx',
    }).catch((error) => {
      if (error.code !== 'EEXIST') throw error
    })
    await payload.updateGlobal({
      slug: 'site-settings',
      user,
      context: { disableRevalidate: true },
      data: { title: profile.title, description: profile.description, about },
    })
    await writeFile(
      marker,
      JSON.stringify({ capturedAt: manifest.capturedAt, title: profile.title }),
    )
    console.log('Imported source title, introduction and editable about page.')
  } else console.log('Profile already imported; preserving local edits.')
  const envPath = '.env.local'
  const env = await readFile(envPath, 'utf8')
  if (!/^YOHAKU_SOURCE_MODE=/m.test(env))
    await writeFile(envPath, `${env.trimEnd()}\nYOHAKU_SOURCE_MODE=1\n`)
} finally {
  await payload.destroy()
}
process.exit(0)
