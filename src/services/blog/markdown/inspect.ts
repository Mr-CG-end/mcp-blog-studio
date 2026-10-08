import type { Compatibility, LexicalContent, LexicalBlockNode } from './types'

const KNOWN_SUPPORTED_NODE_TYPES = new Set([
  'paragraph',
  'heading',
  'quote',
  'list',
  'listitem',
  'horizontalrule',
  'text',
  'link',
])

const KNOWN_SUPPORTED_BLOCK_TYPES = new Set([
  'code',
  'mediaBlock',
])

/**
 * 递归检查 Lexical 内容是否可无损双向转换为 Markdown。
 * 若包含 Banner、表格或未知节点，标记 contentReplaceable: false 并附带警告。
 */
export async function inspectContent(content: unknown): Promise<Compatibility> {
  const warnings: string[] = []
  let contentReplaceable = true

  if (!content || typeof content !== 'object') {
    return { contentReplaceable: true, warnings: [] }
  }

  const lexical = content as LexicalContent
  const root = lexical.root
  if (!root || !Array.isArray(root.children)) {
    return { contentReplaceable: true, warnings: [] }
  }

  function checkNode(node: LexicalBlockNode | unknown) {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>
    const type = typeof n.type === 'string' ? n.type : ''

    if (type === 'table' || type === 'tablenode' || type === 'tablerow' || type === 'tablecell') {
      contentReplaceable = false
      if (!warnings.includes('文章包含表格结构，当前暂不支持无损转换为 Markdown 覆盖编辑')) {
        warnings.push('文章包含表格结构，当前暂不支持无损转换为 Markdown 覆盖编辑')
      }
    } else if (type === 'block') {
      const fields = n.fields as Record<string, unknown> | undefined
      const blockType = typeof fields?.blockType === 'string' ? fields.blockType : 'unknown'
      if (blockType === 'banner') {
        contentReplaceable = false
        if (!warnings.includes('文章包含横幅区块 (Banner)，当前暂不支持无损转换为 Markdown 覆盖编辑')) {
          warnings.push('文章包含横幅区块 (Banner)，当前暂不支持无损转换为 Markdown 覆盖编辑')
        }
      } else if (!KNOWN_SUPPORTED_BLOCK_TYPES.has(blockType)) {
        contentReplaceable = false
        warnings.push(`文章包含未知自定义区块 (${blockType})，当前暂不支持无损替换`)
      }
    } else if (type && !KNOWN_SUPPORTED_NODE_TYPES.has(type)) {
      contentReplaceable = false
      warnings.push(`文章包含未受支持的节点类型 (${type})，当前暂不支持无损替换`)
    }

    // 递归检查子节点
    if (Array.isArray(n.children)) {
      for (const child of n.children) {
        checkNode(child)
      }
    }
  }

  for (const child of root.children) {
    checkNode(child)
  }

  return {
    contentReplaceable,
    warnings,
  }
}
