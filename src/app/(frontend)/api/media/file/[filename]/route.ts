import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params

  if (!filename) {
    return new NextResponse('Filename is required', { status: 400 })
  }

  // Redirect requests for static media to /media/:filename
  // which is directly served by Next.js static asset layer from public/media/
  const redirectUrl = new URL(`/media/${filename}`, request.url)
  return NextResponse.redirect(redirectUrl, { status: 307 })
}
