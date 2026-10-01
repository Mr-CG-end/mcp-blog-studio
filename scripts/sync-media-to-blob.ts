import { put, head } from '@vercel/blob'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Script to sync local media files from public/media/ to Vercel Blob.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... pnpm exec tsx scripts/sync-media-to-blob.ts
 */
async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.error('Error: BLOB_READ_WRITE_TOKEN environment variable is not set.')
    console.error('Usage: BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... pnpm exec tsx scripts/sync-media-to-blob.ts')
    process.exit(1)
  }

  const mediaDir = path.resolve('public/media')
  console.log(`Scanning media directory: ${mediaDir}...`)

  const files = await readdir(mediaDir)
  const imageFiles = files.filter(
    (file) => file.endsWith('.webp') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'),
  )

  console.log(`Found ${imageFiles.length} media files to sync.`)

  let uploadedCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i]
    const filePath = path.join(mediaDir, filename)

    try {
      // Check if blob already exists to avoid redundant uploads
      try {
        const existing = await head(filename, { token })
        if (existing) {
          skippedCount++
          process.stdout.write(`[${i + 1}/${imageFiles.length}] Already exists: ${filename}\n`)
          continue
        }
      } catch {
        // BlobNotFoundError, proceed to upload
      }

      const fileBuffer = await readFile(filePath)
      const ext = path.extname(filename).toLowerCase()
      const contentType =
        ext === '.webp'
          ? 'image/webp'
          : ext === '.png'
            ? 'image/png'
            : ext === '.svg'
              ? 'image/svg+xml'
              : 'image/jpeg'

      const blob = await put(filename, fileBuffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType,
        token,
      })

      uploadedCount++
      process.stdout.write(`[${i + 1}/${imageFiles.length}] Uploaded: ${filename} -> ${blob.url}\n`)
    } catch (err) {
      errorCount++
      console.error(`Failed to upload ${filename}:`, err)
    }
  }

  console.log('\n--- Sync Complete ---')
  console.log(`Total: ${imageFiles.length}`)
  console.log(`Uploaded: ${uploadedCount}`)
  console.log(`Skipped: ${skippedCount}`)
  console.log(`Errors: ${errorCount}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
