import { Card, type CardPostData } from '@/components/Card'
export type Props = { posts: CardPostData[] }
export const CollectionArchive = ({ posts }: Props) => (
  <div>
    {posts.map((post) => (
      <Card key={post.slug} doc={post} />
    ))}
  </div>
)
