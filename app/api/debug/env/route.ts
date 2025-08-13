import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 환경 변수 체크
    const envCheck = {
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        keyLength: process.env.OPENAI_API_KEY?.length || 0,
        hasNewline: process.env.OPENAI_API_KEY?.includes('\n'),
      },
      database: {
        configured: !!process.env.DATABASE_URL,
        hasNewline: process.env.DATABASE_URL?.includes('\n'),
        url: process.env.DATABASE_URL?.substring(0, 30) + '...',
      },
      google: {
        projectConfigured: !!process.env.GOOGLE_CLOUD_PROJECT,
        projectHasNewline: process.env.GOOGLE_CLOUD_PROJECT?.includes('\n'),
        project: process.env.GOOGLE_CLOUD_PROJECT?.trim(),
        credentialsConfigured: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
        credentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64?.length || 0,
      },
      nextauth: {
        urlConfigured: !!process.env.NEXTAUTH_URL,
        urlHasNewline: process.env.NEXTAUTH_URL?.includes('\n'),
        url: process.env.NEXTAUTH_URL?.trim(),
        secretConfigured: !!process.env.NEXTAUTH_SECRET,
      },
    }

    // Database 연결 테스트
    let dbConnection = false
    let dbError = null
    try {
      await prisma.$connect()
      const result = await prisma.$queryRaw`SELECT NOW()`
      dbConnection = true
      await prisma.$disconnect()
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Unknown database error'
    }

    // Google Cloud 인증 테스트
    let gcpAuth = false
    let gcpError = null
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
        const decoded = Buffer.from(
          process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
          'base64'
        ).toString('utf-8')
        const credentials = JSON.parse(decoded)
        gcpAuth = !!credentials.project_id
      }
    } catch (error) {
      gcpError = error instanceof Error ? error.message : 'GCP decode error'
    }

    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      vercel: process.env.VERCEL === '1' || process.env.VERCEL === 'true',
      checks: {
        ...envCheck,
        database: {
          ...envCheck.database,
          connected: dbConnection,
          error: dbError,
        },
        googleCloud: {
          ...envCheck.google,
          authValid: gcpAuth,
          error: gcpError,
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}