import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    const userCount = await prisma.user.count()
    const accountCount = await prisma.account.count()
    const sessionCount = await prisma.session.count()
    
    // Try to get database version
    const result = await prisma.$queryRaw<any[]>`SELECT version()`
    
    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        userCount,
        accountCount,
        sessionCount,
        version: result[0]?.version || 'Unknown',
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}