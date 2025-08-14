import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Dynamic import to ensure environment variables are loaded
    const OpenAI = (await import('openai')).default
    
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'No API key',
        env: Object.keys(process.env).filter(k => k.includes('OPENAI'))
      })
    }
    
    const openai = new OpenAI({
      apiKey: apiKey,
    })
    
    const text = "프로젝트 킥오프 미팅\n일시: 2025년 1월 20일 월요일 오전 10:00\n장소: 본사 회의실 A"
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Extract calendar events from Korean text. Return JSON with events array.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })
    
    return NextResponse.json({
      success: true,
      response: response.choices[0]?.message?.content,
      usage: response.usage,
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      type: error.constructor.name,
      code: error.code,
      status: error.status,
      response: error.response?.data,
    }, { status: 500 })
  }
}