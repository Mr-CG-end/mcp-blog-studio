import { getPayload } from 'payload'
import config from '@payload-config'
import { handleWebMCP } from '@/services/webmcp'

export async function GET(request: Request): Promise<Response> {
  if (process.env.NEXT_PUBLIC_WEBMCP_ENABLED !== 'true') return Response.json({ success: false, message: '未找到资源', data: null, code: 404 }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  try {
    const payload = await getPayload({ config })
    return handleWebMCP(request, payload, process.env.NEXT_PUBLIC_WEBMCP_ENABLED === 'true')
  } catch {
    return Response.json({ success: false, message: '请求失败', data: null, code: 500 }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
