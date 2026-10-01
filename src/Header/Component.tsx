import Link from 'next/link'
import { Feather } from 'lucide-react'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { getSite } from '@/services/publicBlog'
import { BlogNavigation } from '@/components/BlogChrome'
export async function Header() {
  const [data, site] = await Promise.all([getCachedGlobal('header', 1)(), getSite()])
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Feather size={21} strokeWidth={1.5} />
          </span>
          <span>{site.title}</span>
        </Link>
        <BlogNavigation data={data} />
      </div>
    </header>
  )
}
