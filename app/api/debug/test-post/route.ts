import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'POST endpoint working correctly',
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(request.headers.entries())
  }, { status: 200 })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'GET endpoint working correctly', 
    timestamp: new Date().toISOString()
  }, { status: 200 })
}