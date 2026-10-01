import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const uploadedDir = '/Users/wanghong/.gemini/antigravity/brain/6ed28878-f915-4e09-99a3-f0aba39fe5a9/.user_uploaded'
const publicAvatarsDir = path.resolve('public/avatars')

const files = {
  group: path.join(uploadedDir, 'media_1790855185554.jpg'),
  avatar1: path.join(uploadedDir, 'media_1790855314934.jpg'), // 蓝发男孩
  avatar2: path.join(uploadedDir, 'media_1790855314942.jpg'), // 紫发女孩
  avatar3: path.join(uploadedDir, 'media_1790855314946.jpg'), // 棕发女孩
  avatar4: path.join(uploadedDir, 'media_1790855315005.jpg'), // 白发女孩
  avatar5: path.join(uploadedDir, 'media_1790855851673.jpg'), // 绿衣白发男孩
}

async function convertImages() {
  await fs.mkdir(publicAvatarsDir, { recursive: true })

  // 1. Group photo -> public/avatar.jpg & public/avatars/group.webp
  console.log('Processing group photo...')
  await sharp(files.group)
    .jpeg({ quality: 92 })
    .toFile(path.resolve('public/avatar.jpg'))

  await sharp(files.group)
    .webp({ quality: 90 })
    .toFile(path.join(publicAvatarsDir, 'group.webp'))

  // 2. Character avatars 1..5
  const characterFiles = [files.avatar1, files.avatar2, files.avatar3, files.avatar4, files.avatar5]
  for (let i = 0; i < characterFiles.length; i++) {
    const src = characterFiles[i]
    const dest = path.join(publicAvatarsDir, `avatar-${i + 1}.webp`)
    console.log(`Converting ${src} -> ${dest}`)
    await sharp(src)
      .webp({ quality: 90 })
      .toFile(dest)
  }

  console.log('All avatar images successfully converted and saved!')
}

convertImages().catch((err) => {
  console.error(err)
  process.exit(1)
})
