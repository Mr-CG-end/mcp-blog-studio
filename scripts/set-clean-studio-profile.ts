import { loadEnv } from 'payload/node'
loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })

console.log('Updating SiteSettings with clean studio profile...')

await payload.updateGlobal({
  slug: 'site-settings',
  context: { disableRevalidate: true },
  data: {
    title: 'Blog Studio',
    description: '记录想法、分享实践与探索。',
    heroSlogan: 'Crafting ideas into software with modern workflows',
    aboutTitle: '自述',
    aboutSubtitle: '记录技术探索、设计思考与生活随笔',
    socialLinks: [
      { platform: 'github', label: 'GitHub', url: 'https://github.com' },
      { platform: 'rss', label: 'RSS', url: 'https://innei.in/feed' },
      { platform: 'email', label: 'Email', url: 'mailto:contact@example.com' },
      { platform: 'x', label: 'X', url: 'https://x.com' },
    ],
  },
})

console.log('SiteSettings updated with clean studio profile.')
process.exit(0)
