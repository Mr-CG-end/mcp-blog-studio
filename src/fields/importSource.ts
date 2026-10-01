import type { Field } from 'payload'

/** Provenance is stored separately from the editable article; re-imports never replace edits. */
export const importSource: Field = {
  name: 'importSource',
  type: 'group',
  label: '采集来源',
  admin: {
    description: '采集来源与溯源元信息，可由管理员编辑维护。',
  },
  fields: [
    { name: 'url', type: 'text', index: true, label: '原文链接' },
    { name: 'author', type: 'text', label: '原文作者' },
    { name: 'capturedAt', type: 'date', label: '采集时间' },
    { name: 'hash', type: 'text', label: '版本指纹 (Hash)', admin: { readOnly: true } },
    { name: 'batch', type: 'text', index: true, label: '导入批次', admin: { readOnly: true } },
    { name: 'headings', type: 'json', label: '标题结构快照', admin: { readOnly: true } },
  ],
}
