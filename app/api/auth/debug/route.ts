import { NextResponse } from 'next/server'

export async function GET() {
  // 환경변수 확인 (민감한 정보는 일부만 표시)
  const config = {
    nextauth_url: process.env.NEXTAUTH_URL || 'NOT SET',
    google_client_id: process.env.GOOGLE_CLIENT_ID ? 
      process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'NOT SET',
    has_google_secret: !!process.env.GOOGLE_CLIENT_SECRET,
    has_nextauth_secret: !!process.env.NEXTAUTH_SECRET,
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
    vercel_url: process.env.VERCEL_URL,
  }

  return NextResponse.json({
    status: 'ok',
    config,
    timestamp: new Date().toISOString(),
  })
}