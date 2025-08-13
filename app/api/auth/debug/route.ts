import { NextResponse } from 'next/server'

export async function GET() {
  const config = {
    nextAuthUrl: process.env.NEXTAUTH_URL,
    hasSecret: !!process.env.NEXTAUTH_SECRET,
    hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    actualUrl: process.env.NEXTAUTH_URL || 'NOT SET',
  }

  return NextResponse.json(config)
}
