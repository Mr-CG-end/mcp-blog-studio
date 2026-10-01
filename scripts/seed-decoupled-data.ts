import { loadEnv } from 'payload/node'
loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })

console.log('Seeding decoupled data...')

// 1. Seed Header global
const currentHeader = await payload.findGlobal({ slug: 'header' })
if (!currentHeader.navItems || currentHeader.navItems.length === 0) {
  console.log('Initializing Header global navigation...')
  await payload.updateGlobal({
    slug: 'header',
    context: { disableRevalidate: true },
    data: {
      navItems: [
        { link: { type: 'custom', url: '/', label: '首页', newTab: false } },
        { link: { type: 'custom', url: '/posts', label: '文稿', newTab: false } },
        { link: { type: 'custom', url: '/categories', label: '分类', newTab: false } },
        { link: { type: 'custom', url: '/search', label: '搜索', newTab: false } },
        { link: { type: 'custom', url: '/about', label: '关于', newTab: false } },
      ],
    },
  })
}

// 2. Seed Footer global
const currentFooter = await payload.findGlobal({ slug: 'footer' })
if (!currentFooter.navItems || currentFooter.navItems.length === 0) {
  console.log('Initializing Footer global navigation...')
  await payload.updateGlobal({
    slug: 'footer',
    context: { disableRevalidate: true },
    data: {
      navItems: [
        { link: { type: 'custom', url: '/about', label: '关于本站', newTab: false } },
        { link: { type: 'custom', url: '/credits', label: '开源说明', newTab: false } },
        { link: { type: 'custom', url: '/posts', label: '文章', newTab: false } },
        { link: { type: 'custom', url: '/categories', label: '分类', newTab: false } },
        { link: { type: 'custom', url: '/sitemap.xml', label: '站点地图', newTab: false } },
      ],
    },
  })
}

// 3. Update SiteSettings global with default quoteSettings, heroSlogan, socialLinks
const siteSettings = await payload.findGlobal({ slug: 'site-settings' })
console.log('Updating SiteSettings...')
await payload.updateGlobal({
  slug: 'site-settings',
  context: { disableRevalidate: true },
  data: {
    heroSlogan: siteSettings.heroSlogan || 'I orchestrate ideas into products with AI Agents',
    quoteSettings: {
      mode: siteSettings.quoteSettings?.mode || 'hitokoto',
      manualQuote: siteSettings.quoteSettings?.manualQuote || '',
      manualAuthor: siteSettings.quoteSettings?.manualAuthor || '',
      customApiUrl: siteSettings.quoteSettings?.customApiUrl || 'https://v1.hitokoto.cn/',
      quoteJsonPath: siteSettings.quoteSettings?.quoteJsonPath || '',
    },
    aboutTitle: siteSettings.aboutTitle || '自述',
    aboutSubtitle: siteSettings.aboutSubtitle || '这是一份关于站长的报告，请查收',
    socialLinks: (siteSettings.socialLinks && siteSettings.socialLinks.length > 0)
      ? siteSettings.socialLinks.map((item: any) => ({
          ...item,
          platform: item.platform || (
            item.url.includes('github') ? 'github' :
            item.url.includes('x.com') || item.url.includes('twitter') ? 'x' :
            item.url.includes('t.me') ? 'telegram' :
            item.url.includes('bilibili') ? 'bilibili' :
            item.url.includes('music.163') ? 'netease' :
            item.url.includes('mailto') ? 'email' :
            item.url.includes('feed') ? 'rss' : 'custom'
          ),
        }))
      : [
          { platform: 'x', label: 'X', url: 'https://x.com/__oQuery' },
          { platform: 'rss', label: 'RSS', url: 'https://innei.in/feed' },
          { platform: 'email', label: 'Email', url: 'mailto:i@innei.in' },
          { platform: 'github', label: 'GitHub', url: 'https://github.com/Innei' },
          { platform: 'netease', label: '网易云音乐', url: 'https://music.163.com/#/user/home?id=84302804' },
          { platform: 'bilibili', label: '哔哩哔哩', url: 'https://space.bilibili.com/26578164' },
          { platform: 'telegram', label: 'Telegram', url: 'https://t.me/+1W9y4-vAZ3swYjk1' },
        ],
  },
})

// 4. Verify pinned post
const pinnedPosts = await payload.find({
  collection: 'posts',
  where: { pinned: { equals: true } },
})
console.log(`Found ${pinnedPosts.totalDocs} pinned posts.`)
if (pinnedPosts.totalDocs === 0) {
  const target = await payload.find({
    collection: 'posts',
    where: {
      'importSource.url': {
        contains: 'ai-era-efficiency-paradox-productivity-gains-cause-fatigue',
      },
    },
  })
  if (target.docs[0]) {
    console.log('Marking target article as pinned...')
    await payload.update({
      collection: 'posts',
      id: target.docs[0].id,
      data: { pinned: true },
    })
  }
}

console.log('Decoupled data seeding completed successfully.')
process.exit(0)
