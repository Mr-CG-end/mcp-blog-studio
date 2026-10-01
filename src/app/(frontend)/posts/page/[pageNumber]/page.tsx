import { redirect } from 'next/navigation'
import { pageNumber } from '@/services/publicBlog'
export default async function LegacyPage({ params }: { params: Promise<{ pageNumber: string }> }) {
  redirect(`/posts?page=${pageNumber((await params).pageNumber)}`)
}
