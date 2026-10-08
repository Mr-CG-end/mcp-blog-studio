import { Banner } from '@/blocks/Banner/config'
import { importSource } from '@/fields/importSource'
import { lockContentChange } from '@/services/media'
import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'
import {
  BlocksFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  FixedToolbarFeature,
  OrderedListFeature,
  UnorderedListFeature,
  BlockquoteFeature,
  InlineCodeFeature,
  lexicalEditor,
  EXPERIMENTAL_TableFeature,
} from '@payloadcms/richtext-lexical'
import { signedIn, ownContent, readPosts, deletePosts, ownVersions } from '@/access/roles'
import { Code } from '@/blocks/Code/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { revalidatePost, revalidateDelete } from './hooks/revalidatePost'
import { populateAuthors } from './hooks/populateAuthors'
import { enforcePost } from './hooks/enforcePost'
import { auditPost, auditDeleted } from '@/services/audit'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { MetaTitleField, MetaDescriptionField, MetaImageField } from '@payloadcms/plugin-seo/fields'

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  trash: true,
  labels: { singular: '文章', plural: '文章' },
  access: {
    create: signedIn,
    read: readPosts,
    update: ownContent,
    delete: deletePosts,
    readVersions: ownVersions,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'pinned', '_status', 'owner', 'updatedAt'],
    preview: (data, { req }) =>
      generatePreviewPath({ slug: data?.slug as string, collection: 'posts', req }),
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({ slug: data?.slug as string, collection: 'posts', req }),
    },
  },
  defaultPopulate: {
    title: true,
    slug: true,
    pinned: true,
    showSourceCredit: true,
    categories: true,
    meta: { image: true, description: true },
  },
  fields: [
    importSource,
    { name: 'title', type: 'text', required: true, label: '标题' },
    { name: 'summary', type: 'textarea', maxLength: 500, label: '摘要' },
    { name: 'heroImage', type: 'upload', relationTo: 'media', label: '封面' },
    {
      name: 'content',
      type: 'richText',
      required: true,
      label: '正文',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }),
          OrderedListFeature(),
          UnorderedListFeature(),
          BlockquoteFeature(),
          InlineCodeFeature(),
          EXPERIMENTAL_TableFeature(),
          HorizontalRuleFeature(),
          BlocksFeature({ blocks: [Code, MediaBlock, Banner] }),
          InlineToolbarFeature(),
          FixedToolbarFeature(),
        ],
      }),
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      label: '分类',
    },
    {
      name: 'relatedPosts',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      label: '相关文章',
    },
    {
      name: 'authors',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: '展示作者',
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: '所有者',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: '_status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: '草稿 / 已下架', value: 'draft' },
        { label: '已发布', value: 'published' },
      ],
      admin: { position: 'sidebar' },
      label: '发布状态',
    },
    {
      name: 'revision',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: { readOnly: true, position: 'sidebar' },
      label: '版本号',
    },
    { name: 'publishedAt', type: 'date', admin: { position: 'sidebar' }, label: '发布日期' },
    {
      name: 'pinned',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: '在首页与文章列表中优先置顶显示',
      },
      label: '置顶文章',
    },
    {
      name: 'showSourceCredit',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: '是否在文章底部展示原文作者与来源链接',
      },
      label: '显示来源溯源',
    },
    {
      name: 'searchText',
      type: 'textarea',
      maxLength: 1000000,
      admin: { hidden: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'populatedAuthors',
      type: 'array',
      access: { update: () => false },
      admin: { disabled: true },
      fields: [
        { name: 'id', type: 'text' },
        { name: 'name', type: 'text' },
        { name: 'avatar', type: 'text' },
      ],
    },
    {
      name: 'meta',
      type: 'group',
      fields: [
        MetaTitleField({ hasGenerateFn: true }),
        MetaDescriptionField({}),
        MetaImageField({ relationTo: 'media' }),
      ],
    },
    slugField(),
  ],
  hooks: {
    beforeChange: [lockContentChange, enforcePost],
    afterChange: [auditPost, revalidatePost],
    afterRead: [populateAuthors],
    afterDelete: [auditDeleted, revalidateDelete],
  },
  // Explicit status + ordinary version history: saving a published article updates it
  // immediately, without Payload's separate autosaved unpublished version branch.
  versions: { maxPerDoc: 50 },
}
