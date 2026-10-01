import { MediaBlock } from '@/blocks/MediaBlock/Component'
import {
  DefaultNodeTypes,
  SerializedBlockNode,
  SerializedLinkNode,
  type DefaultTypedEditorState,
} from '@payloadcms/richtext-lexical'
import {
  JSXConvertersFunction,
  LinkJSXConverter,
  RichText as ConvertRichText,
} from '@payloadcms/richtext-lexical/react'

import { CodeBlock, CodeBlockProps } from '@/blocks/Code/Component'

import type {
  BannerBlock as BannerBlockProps,
  CallToActionBlock as CTABlockProps,
  MediaBlock as MediaBlockProps,
} from '@/payload-types'
import { BannerBlock } from '@/blocks/Banner/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { cn } from '@/utilities/ui'

type NodeTypes =
  | DefaultNodeTypes
  | SerializedBlockNode<CTABlockProps | MediaBlockProps | BannerBlockProps | CodeBlockProps>

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const { value, relationTo } = linkNode.fields.doc!
  if (typeof value !== 'object') {
    throw new Error('Expected value to be an object')
  }
  const slug = value.slug
  return relationTo === 'posts' ? `/posts/${slug}` : `/${slug}`
}

function headingText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const value = node as { text?: string; children?: unknown[] }
  return value.text ?? value.children?.map(headingText).join('') ?? ''
}

function createConverters(
  sourceHeadings?: { id: string; text: string }[],
): JSXConvertersFunction<NodeTypes> {
  const ids = new Map<string, number>()
  let headingIndex = 0
  return ({ defaultConverters }) => ({
    ...defaultConverters,
    heading: ({ node, nodesToJSX }) => {
      const text = headingText(node)
      const base = `heading-${
        text
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, '-')
          .replace(/^-|-$/g, '') || 'section'
      }`
      const count = (ids.get(base) || 0) + 1
      ids.set(base, count)
      const source = sourceHeadings?.[headingIndex++]
      const id =
        source?.id && source.text.trim() === text.trim()
          ? source.id
          : count === 1
            ? base
            : `${base}-${count}`
      const Tag = node.tag
      return <Tag id={id}>{nodesToJSX({ nodes: node.children })}</Tag>
    },
    ...LinkJSXConverter({ internalDocToHref }),
    blocks: {
      banner: ({ node }) => <BannerBlock className="col-start-2 mb-4" {...node.fields} />,
      mediaBlock: ({ node }) => (
        <MediaBlock
          className="col-start-1 col-span-3"
          imgClassName="m-0"
          {...node.fields}
          captionClassName="mx-auto max-w-[48rem]"
          enableGutter={false}
          disableInnerContainer={true}
        />
      ),
      code: ({ node }) => <CodeBlock className="col-start-2" {...node.fields} />,
      cta: ({ node }) => <CallToActionBlock {...node.fields} />,
    },
  })
}

type Props = {
  data: DefaultTypedEditorState
  enableGutter?: boolean
  enableProse?: boolean
  sourceHeadings?: { id: string; text: string }[]
} & React.HTMLAttributes<HTMLDivElement>

export default function RichText(props: Props) {
  const { className, enableProse = true, enableGutter = true, sourceHeadings, ...rest } = props
  return (
    <ConvertRichText
      converters={createConverters(sourceHeadings)}
      className={cn(
        'payload-richtext markdown',
        {
          container: enableGutter,
          'max-w-none': !enableGutter,
          'mx-auto prose md:prose-md dark:prose-invert': enableProse,
        },
        className,
      )}
      {...rest}
    />
  )
}
