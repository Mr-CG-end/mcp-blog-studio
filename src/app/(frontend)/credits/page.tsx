import { NormalContainer } from '@/components/shiro/layout/NormalContainer'
import Link from 'next/link'
export const metadata = { title: '开源说明与源码' }
export default function Credits() {
  return (
    <NormalContainer>
      <div className="mb-8">
        <h1 className="mb-8 text-4xl font-bold leading-tight">开源说明</h1>
      </div>
      <div className="prose dark:prose-invert">
        <p>
          本站是基于 Next.js 与 Payload CMS 的非商业博客
          Demo。首页、导航、页脚、文章列表、搜索与阅读布局移植自 Innei 的
          Shiro，并适配本站数据与路由。
        </p>
        <p>
          Shiro 来源版本：
          <a href="https://github.com/Innei/Shiro/tree/891bb24cd59aff7c9baaf4d9a3579ca4275da3b7">
            891bb24
          </a>
          。改动包括 Payload 数据接入、多人作者、分类链接和文章路由适配，移除了 Mix Space 专用依赖。
        </p>
        <p>
          本项目按 AGPLv3
          提供源码，并保留上游附加条款；上游声明商业用途需另行获得作者授权。软件按现状提供，不附带担保。完整条款、修改说明与第三方声明均包含在源码包中。
        </p>
        <p>
          <a href="/source/blog-source.tar.gz" download>
            下载当前构建的对应源码
          </a>
        </p>
        <p>
          源码包包括应用代码、依赖锁文件、迁移与运行说明，不包含账号密码、环境密钥、数据库内容及用户上传文件。
        </p>
        <Link href="/">返回首页 →</Link>
      </div>
    </NormalContainer>
  )
}
