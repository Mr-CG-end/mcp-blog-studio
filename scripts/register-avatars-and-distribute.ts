import { loadEnv } from 'payload/node'
import path from 'node:path'
import { getPayload } from 'payload'

const explicitDbUrl = process.env.DATABASE_URL
loadEnv()
if (explicitDbUrl) {
  process.env.DATABASE_URL = explicitDbUrl
}
console.log('Connecting to database:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'))

async function main() {
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })

  try {
    const adminUser = (
      await payload.find({
        collection: 'users',
        where: { role: { equals: 'admin' } },
        limit: 1,
        depth: 0,
      })
    ).docs[0]

    if (!adminUser) throw new Error('No admin user found!')
    console.log('Admin user id:', adminUser.id)

    const avatarFiles = [
      { key: 'avatar-1', file: 'avatar-1.webp', alt: '预设头像 1 - 角色单人照' },
      { key: 'avatar-2', file: 'avatar-2.webp', alt: '预设头像 2 - 角色单人照' },
      { key: 'avatar-3', file: 'avatar-3.webp', alt: '预设头像 3 - 角色单人照' },
      { key: 'avatar-4', file: 'avatar-4.webp', alt: '预设头像 4 - 角色单人照' },
      { key: 'avatar-5', file: 'avatar-5.webp', alt: '预设头像 5 - 角色单人照' },
      { key: 'group', file: 'group.webp', alt: '团队合照 - 默认头像' },
    ]

    const mediaMap: Record<string, number> = {}

    for (const item of avatarFiles) {
      const existing = await payload.find({
        collection: 'media',
        where: { 'importSource.hash': { equals: item.key } },
        limit: 1,
        depth: 0,
      })

      if (existing.docs.length > 0) {
        mediaMap[item.key] = existing.docs[0].id
        console.log(`Media ${item.key} already exists with ID:`, existing.docs[0].id)
      } else {
        const filePath = path.resolve('public/avatars', item.file)
        console.log(`Creating media for ${item.key} from ${filePath}...`)
        const doc = await payload.create({
          collection: 'media',
          filePath,
          user: adminUser,
          overrideAccess: true,
          data: {
            owner: adminUser.id,
            alt: item.alt,
            importSource: {
              url: `/avatars/${item.file}`,
              capturedAt: new Date().toISOString(),
              hash: item.key,
              batch: 'preset-avatars',
              author: '系统预设',
            },
          },
        })
        mediaMap[item.key] = doc.id
        console.log(`Created media ${item.key} with ID:`, doc.id)
      }
    }

    // 1. Assign avatars to the 3 users
    const users = await payload.find({
      collection: 'users',
      user: adminUser,
      sort: 'id',
      limit: 10,
      depth: 0,
    })

    console.log('Found users:', users.docs.map((u) => ({ id: u.id, name: u.name, role: u.role })))

    const u1 = users.docs.find((u) => u.name === '博客管理员' || u.role === 'admin')
    const u2 = users.docs.find((u) => u.name === '林间')
    const u3 = users.docs.find((u) => u.name === '知远')

    if (u1 && mediaMap['avatar-1']) {
      await payload.update({
        collection: 'users',
        id: u1.id,
        user: adminUser,
        overrideAccess: true,
        data: { avatar: mediaMap['avatar-1'] },
      })
      console.log(`Assigned avatar-1 to user ${u1.name} (id: ${u1.id})`)
    }

    if (u2 && mediaMap['avatar-2']) {
      await payload.update({
        collection: 'users',
        id: u2.id,
        user: adminUser,
        overrideAccess: true,
        data: { avatar: mediaMap['avatar-2'] },
      })
      console.log(`Assigned avatar-2 to user ${u2.name} (id: ${u2.id})`)
    }

    if (u3 && mediaMap['avatar-3']) {
      await payload.update({
        collection: 'users',
        id: u3.id,
        user: adminUser,
        overrideAccess: true,
        data: { avatar: mediaMap['avatar-3'] },
      })
      console.log(`Assigned avatar-3 to user ${u3.name} (id: ${u3.id})`)
    }

    // 2. Set site settings brandImage to the group photo
    if (mediaMap['group']) {
      await payload.updateGlobal({
        slug: 'site-settings',
        user: adminUser,
        overrideAccess: true,
        data: {
          brandImage: mediaMap['group'],
        },
      })
      console.log('Updated site-settings brandImage to group photo (id:', mediaMap['group'], ')')
    }

    // 3. Balanced distribution of 34 posts to 3 users
    const allPosts = await payload.find({
      collection: 'posts',
      user: adminUser,
      sort: 'id',
      limit: 1000,
      depth: 0,
    })

    console.log(`Total posts to balance: ${allPosts.docs.length}`)
    const targetUserIds = [u1?.id, u2?.id, u3?.id].filter(Boolean) as number[]
    console.log('Distributing across user IDs:', targetUserIds)

    for (let i = 0; i < allPosts.docs.length; i++) {
      const post = allPosts.docs[i]
      const assignedUserId = targetUserIds[i % targetUserIds.length]
      await payload.update({
        collection: 'posts',
        id: post.id,
        user: adminUser,
        overrideAccess: true,
        data: {
          owner: assignedUserId,
          authors: [assignedUserId],
        },
        context: { disableRevalidate: true },
      })
    }

    console.log('Successfully distributed all posts evenly across 3 users!')
  } finally {
    await payload.destroy()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
