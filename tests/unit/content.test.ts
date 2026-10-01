import { expect, it } from 'vitest'
import { plainText } from '@/services/content'
import { referencesMedia } from '@/services/media'
it('索引段落和代码，不包含链接地址等元数据', () => {
  expect(
    plainText({
      root: {
        children: [
          { text: '中文正文' },
          { fields: { code: 'const value = 1' } },
          { fields: { url: 'private' } },
        ],
      },
    }),
  ).toContain('中文正文 const value = 1')
  expect(plainText({ fields: { url: 'private' } })).not.toContain('private')
})
it('识别封面与嵌套媒体引用，不混淆其他关系 ID', () => {
  expect(referencesMedia({ content: { fields: { media: { id: 3 } } } }, 3)).toBe(true)
  expect(referencesMedia({ heroImage: 3 }, 3)).toBe(true)
  expect(referencesMedia({ owner: 3, categories: [3] }, 3)).toBe(false)
})
