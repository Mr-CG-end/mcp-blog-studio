import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import config from '@payload-config'
import { handleWebMCPPreview } from '@/services/webmcp'

export async function GET(request: Request): Promise<Response> {
  if (process.env.NEXT_PUBLIC_WEBMCP_ENABLED !== 'true') return Response.json({ success: false, message: '未找到资源', data: null, code: 404 }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  try {
    const payload = await getPayload({ config })
    return handleWebMCPPreview(request, payload, async () => { (await draftMode()).enable() }, process.env.NEXT_PUBLIC_WEBMCP_ENABLED === 'true')
  } catch {
    return Response.json({ success: false, message: '请求失败', data: null, code: 500 }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
