export async function POST() {
  return Response.json({ error: '模板清库入口已禁用，请使用受控初始化脚本。' }, { status: 410 })
}
