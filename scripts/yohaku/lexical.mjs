import { JSDOM } from 'jsdom'

const base = { version: 1, direction: null, format: '', indent: 0 }
const text = (value, format = 0) => ({
  type: 'text',
  version: 1,
  text: value,
  detail: 0,
  format,
  mode: 'normal',
  style: '',
})
const paragraph = (children) => ({
  ...base,
  type: 'paragraph',
  textFormat: 0,
  textStyle: '',
  children,
})
const block = (fields) => ({ ...base, type: 'block', fields })

export function toLexical(
  html,
  { media = new Map(), links = new Map(), baseURL = 'https://innei.in', omissions = [] } = {},
) {
  const document = new JSDOM(`<body>${html}</body>`, { url: baseURL }).window.document
  document.querySelectorAll('button').forEach(el => {
    if (el.querySelector('img')) el.replaceWith(...el.childNodes)
  })
  document
    .querySelectorAll('script,style,button,[aria-hidden="true"],.rich-heading-anchor')
    .forEach((el) => el.remove())
  function inline(node, format = 0) {
    if (node.nodeType === 3) return [text(node.textContent, format)]
    if (node.nodeType !== 1) return []
    const tag = node.tagName.toLowerCase()
    if (tag === 'br') return [{ type: 'linebreak', version: 1 }]
    const flags = { strong: 1, b: 1, em: 2, i: 2, s: 4, del: 4, u: 8, code: 16, sub: 32, sup: 64 }
    const children = [...node.childNodes].flatMap((child) =>
      inline(child, format | (flags[tag] || 0)),
    )
    if (tag === 'a') {
      const raw = node.getAttribute('href') || ''
      const url = new URL(raw, baseURL)
      if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return children
      return [
        {
          ...base,
          type: 'link',
          children,
          fields: {
            linkType: 'custom',
            url: raw.startsWith('#')
              ? raw
              : links.get(url.href) ||
                (links.has(url.origin + url.pathname)
                  ? links.get(url.origin + url.pathname) + url.search + url.hash
                  : url.href),
            newTab: url.origin !== new URL(baseURL).origin,
          },
        },
      ]
    }
    return children
  }
  function convert(node) {
    if (node.nodeType === 3)
      return node.textContent.trim() ? [paragraph([text(node.textContent)])] : []
    if (node.nodeType !== 1) return []
    const tag = node.tagName.toLowerCase()
    const children = () => [...node.childNodes].flatMap(convert)
    if (/^h[1-6]$/.test(tag)) return [{ ...base, type: 'heading', tag, children: inline(node) }]
    if (tag === 'p' && !node.querySelector('img')) return [paragraph(inline(node))]
    if (tag === 'blockquote')
      return [
        {
          ...base,
          type: 'quote',
          children: [...node.children].flatMap((child, i) => [
            ...(i ? [{ type: 'linebreak', version: 1 }] : []),
            ...inline(child),
          ]),
        },
      ]
    if (tag === 'hr') return [{ type: 'horizontalrule', version: 1 }]
    if (tag === 'ul' || tag === 'ol')
      return [
        {
          ...base,
          type: 'list',
          tag,
          listType: tag === 'ol' ? 'number' : 'bullet',
          start: Number(node.getAttribute('start')) || 1,
          children: [...node.children]
            .filter((el) => el.tagName === 'LI')
            .map((el, index) => ({
              ...base,
              type: 'listitem',
              value: index + 1,
              children: [...el.childNodes].flatMap((child) =>
                child.nodeType === 1 && (/^(UL|OL|PRE|TABLE|FIGURE)$/.test(child.tagName) || child.querySelector('pre,table,img'))
                  ? convert(child)
                  : inline(child),
              ),
            })),
        },
      ]
    if (tag === 'pre') {
      const code = node.querySelector('code') || node
      const language =
        node.getAttribute('data-language') ||
        code.getAttribute('data-language') ||
        code.className.match(/language-([\w+-]+)/)?.[1] ||
        'text'
      return [block({ blockType: 'code', language, code: code.textContent })]
    }
    if (tag === 'table')
      return [
        {
          ...base,
          type: 'table',
          children: [...node.querySelectorAll('tr')].map((row) => ({
            ...base,
            type: 'tablerow',
            children: [...row.children].map((cell) => ({
              ...base,
              type: 'tablecell',
              headerState: cell.tagName === 'TH' ? 1 : 0,
              colSpan: cell.colSpan || 1,
              rowSpan: cell.rowSpan || 1,
              backgroundColor: null,
              children: [paragraph(inline(cell))],
            })),
          })),
        },
      ]
    if (tag === 'a' && node.querySelector('img')) return [...node.querySelectorAll('img')].flatMap(convert).concat(paragraph(inline(node)))
    if (tag === 'img') {
      const url = new URL(node.getAttribute('src') || '', baseURL).href
      const id = media.get(url)
      if (id) return [block({ blockType: 'mediaBlock', media: id })]
      omissions.push({ type: 'image', url })
      return [paragraph([text(node.alt || '图片未能获取')])]
    }
    if (tag === 'iframe' || tag === 'video' || tag === 'audio') {
      omissions.push({ type: tag, url: node.getAttribute('src') })
      return []
    }
    if (
      node.classList.contains('rich-block-anchor') &&
      /^(Whiteboard|Interactive component)$/.test(node.textContent.trim())
    ) {
      omissions.push({ type: 'interactive-embed', id: node.id })
      return []
    }
    if (['script', 'style', 'noscript', 'template'].includes(tag)) return []
    // Inline-only wrappers must remain a paragraph, not one paragraph per text span.
    if (['figure', 'picture', 'div', 'section', 'details'].includes(tag)) return children()
    return [paragraph(inline(node))]
  }
  const children = [...document.body.childNodes].flatMap(convert)
  return { root: { ...base, type: 'root', children: children.length ? children : [paragraph([])] } }
}
