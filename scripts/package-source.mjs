// Package only public application sources. Never include environment files or media.
import { mkdirSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
mkdirSync('public/source', { recursive: true })
const roots = [
  'src',
  'scripts',
  'docs',
  'tests',
  'package.json',
  'pnpm-lock.yaml',
  'LICENSE',
  'ADDITIONAL_TERMS.md',
  'THIRD_PARTY_NOTICES.md',
  'README.md',
  '.env.example',
  '.node-version',
  'next.config.ts',
  'next-sitemap.config.cjs',
  'tailwind.config.mjs',
  'postcss.config.js',
  'tsconfig.json',
  'redirects.ts',
  'components.json',
  'docker-compose.yml',
  'eslint.config.mjs',
  'vitest.config.mts',
  'vitest.unit.config.mts',
  'vitest.setup.ts',
  'playwright.config.ts',
]
const assets = readdirSync('public')
  .filter((name) => !['source', 'media'].includes(name))
  .map((name) => `public/${name}`)
const result = spawnSync('tar', ['-czf', 'public/source/blog-source.tar.gz', ...roots, ...assets], {
  stdio: 'inherit',
})
if (result.status !== 0) process.exit(result.status || 1)
