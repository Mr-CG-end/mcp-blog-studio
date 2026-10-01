import type { GlobalConfig } from 'payload'
import { lockContent } from '@/services/media'
import { adminOnly } from '@/access/roles'
import {
  BlocksFeature,
  HeadingFeature,
  OrderedListFeature,
  UnorderedListFeature,
  BlockquoteFeature,
  HorizontalRuleFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { MediaBlock } from '@/blocks/MediaBlock/config'
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: '站点设置',
  access: { read: () => true, update: adminOnly },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        await lockContent(req)
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, defaultValue: 'MCP Blog Studio' },
    { name: 'description', type: 'textarea', defaultValue: '记录想法、分享实践与探索。' },
    {
      name: 'siteStartDate',
      type: 'date',
      label: '建站起始日期',
      defaultValue: '2026-10-01T00:00:00.000Z',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'yyyy-MM-dd',
        },
        description: '设置博客成立或上线的起始日期。首页统计天数将自动基于此日期实时计算递增。',
      },
    },
    {
      name: 'heroSlogan',
      type: 'text',
      label: '首页 Slogan 标语',
      defaultValue: 'I orchestrate ideas into products with AI Agents',
      admin: {
        description: '显示在首页标题下方，享有原站动态高亮与闪烁光标效果。留空则隐藏。',
      },
    },
    {
      name: 'quoteSettings',
      type: 'group',
      label: '名言 / 金句配置',
      fields: [
        {
          name: 'mode',
          type: 'select',
          label: '名言获取模式',
          defaultValue: 'hitokoto',
          options: [
            { label: '一言 API（默认，每次刷新随机名言）', value: 'hitokoto' },
            { label: '自定义第三方 API（输入接口网址与解析路径）', value: 'custom_api' },
            { label: '固定自定文案（手动输入金句）', value: 'manual' },
            { label: '关闭名言展示', value: 'disabled' },
          ],
        },
        {
          name: 'manualQuote',
          type: 'text',
          label: '自定义金句内容',
          admin: {
            condition: (data, siblingData) => siblingData?.mode === 'manual',
            description: '例如：当第一颗卫星飞向大气层外，我们便以为自己终有一日会征服宇宙。',
          },
        },
        {
          name: 'manualAuthor',
          type: 'text',
          label: '出处 / 作者（可选）',
          admin: {
            condition: (data, siblingData) => siblingData?.mode === 'manual',
          },
        },
        {
          name: 'customApiUrl',
          type: 'text',
          label: '第三方 API 地址',
          defaultValue: 'https://v1.hitokoto.cn/',
          admin: {
            condition: (data, siblingData) => siblingData?.mode === 'custom_api',
            description: '支持任何返回 JSON 格式的 HTTP(S) GET API。',
          },
        },
        {
          name: 'quoteJsonPath',
          type: 'text',
          label: 'JSON 内容字段名称（默认自动匹配 hitokoto / text / content / quote）',
          admin: {
            condition: (data, siblingData) => siblingData?.mode === 'custom_api',
          },
        },
      ],
    },
    {
      name: 'customStats',
      type: 'group',
      label: '首页统计数据覆盖（默认由数据库自动聚合）',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: '启用手动覆盖（未勾选时自动根据数据库文章数与字数实时统计）',
          defaultValue: false,
        },
        {
          name: 'postsCount',
          type: 'text',
          label: '自定义篇数展示（如：384 篇）',
          admin: {
            condition: (data, siblingData) => Boolean(siblingData?.enabled),
          },
        },
        {
          name: 'wordsCount',
          type: 'text',
          label: '自定义字数展示（如：164 万字）',
          admin: {
            condition: (data, siblingData) => Boolean(siblingData?.enabled),
          },
        },
        {
          name: 'siteDays',
          type: 'text',
          label: '自定义建站天数展示（如：2948 天）',
          admin: {
            condition: (data, siblingData) => Boolean(siblingData?.enabled),
          },
        },
      ],
    },
    {
      name: 'aboutTitle',
      type: 'text',
      label: '关于页大标题',
      defaultValue: '自述',
    },
    {
      name: 'aboutSubtitle',
      type: 'text',
      label: '关于页副标题',
      defaultValue: '这是一份关于站长的报告，请查收',
    },
    {
      name: 'about',
      type: 'richText',
      label: '关于本站',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }),
          OrderedListFeature(),
          UnorderedListFeature(),
          BlockquoteFeature(),
          HorizontalRuleFeature(),
          BlocksFeature({ blocks: [MediaBlock] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ],
      }),
    },
    { name: 'brandImage', type: 'upload', relationTo: 'media', label: '品牌图片（可选）' },
    {
      name: 'socialLinks',
      type: 'array',
      label: '社交链接',
      maxRows: 12,
      fields: [
        {
          name: 'platform',
          type: 'select',
          label: '平台图标',
          defaultValue: 'custom',
          options: [
            { label: 'GitHub', value: 'github' },
            { label: 'X (Twitter)', value: 'x' },
            { label: 'Telegram', value: 'telegram' },
            { label: '哔哩哔哩 (Bilibili)', value: 'bilibili' },
            { label: '网易云音乐', value: 'netease' },
            { label: '电子邮箱 (Email)', value: 'email' },
            { label: 'RSS 订阅', value: 'rss' },
            { label: '自定义网页链接', value: 'custom' },
          ],
        },
        { name: 'label', type: 'text', required: true, label: '名称' },
        {
          name: 'url',
          type: 'text',
          required: true,
          label: '网址',
          validate: (value: string | null | undefined) => {
            try {
              return (
                ['https:', 'http:', 'mailto:'].includes(new URL(value || '').protocol) ||
                '请输入 HTTP(S) 或 mailto 网址'
              )
            } catch {
              if (value?.startsWith('mailto:')) return true
              return '请输入完整网址'
            }
          },
        },
      ],
    },
  ],
}
