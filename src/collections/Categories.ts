import type { CollectionConfig } from 'payload'
import { importSource } from '@/fields/importSource'

import { anyone } from '../access/anyone'
import { adminOnly as authenticated } from '../access/roles'
import { slugField } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: '分类', plural: '分类' },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    importSource,
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField({
      position: undefined,
    }),
  ],
}
