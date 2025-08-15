import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug AI Service
 * Test OpenAI API directly with Korean text
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const logs: string[] = []
  
  try {
    logs.push('Starting AI service debug...')
    
    // Test text (same as our poster)
    const testText = "2025 K-POP 페스티벌\n2025년 9월 15일 (토)\n오후 7시 30분\n잠실 올림픽공원 KSPO돔\nVIP 150,000원/일반 80,000원"
    logs.push(`Test text: ${testText}`)
    
    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      logs.push('❌ OPENAI_API_KEY not found')
      return NextResponse.json({ success: false, error: 'API key not configured', logs })
    }
    
    logs.push(`✅ API key found (length: ${process.env.OPENAI_API_KEY.length})`)
    logs.push(`API key prefix: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`)
    
    // Try OpenAI import
    try {
      const OpenAI = (await import('openai')).default
      logs.push('✅ OpenAI package imported successfully')
      
      // Initialize client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      logs.push('✅ OpenAI client initialized')
      
      // Simple prompt for event extraction
      const prompt = `Extract calendar events from this Korean text. Return a JSON object with an "events" array.
      
Text:
${testText}

Return format:
{
  "events": [
    {
      "title": "event title",
      "startDate": "2025-09-15T19:30:00.000Z",
      "endDate": null,
      "location": "location",
      "description": "description",
      "confidence": 0.95
    }
  ]
}`

      logs.push('Making OpenAI API call...')
      
      // Make API call
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting calendar event information from Korean text. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      })
      
      logs.push('✅ OpenAI API call successful')
      logs.push(`Response usage: ${JSON.stringify(response.usage)}`)
      
      const content = response.choices[0]?.message?.content
      logs.push(`Response content: ${content}`)
      
      if (content) {
        try {
          const parsed = JSON.parse(content)
          logs.push(`✅ JSON parsed successfully`)
          logs.push(`Events found: ${parsed.events?.length || 0}`)
          
          if (parsed.events && parsed.events.length > 0) {
            parsed.events.forEach((event: any, index: number) => {
              logs.push(`Event ${index + 1}: ${event.title} - ${event.startDate}`)
            })
          }
          
          return NextResponse.json({
            success: true,
            events: parsed.events || [],
            metadata: {
              model: response.model,
              tokensUsed: response.usage?.total_tokens || 0,
              processingTime: Date.now()
            },
            logs
          })
          
        } catch (parseError) {
          logs.push(`❌ JSON parse error: ${parseError}`)
          return NextResponse.json({ success: false, error: 'JSON parse error', content, logs })
        }
      } else {
        logs.push('❌ Empty response content')
        return NextResponse.json({ success: false, error: 'Empty response', logs })
      }
      
    } catch (openaiError: any) {
      logs.push(`❌ OpenAI error: ${openaiError.message}`)
      logs.push(`Error code: ${openaiError.code}`)
      logs.push(`Error type: ${openaiError.type}`)
      logs.push(`Error status: ${openaiError.status}`)
      
      if (openaiError.response) {
        logs.push(`Response status: ${openaiError.response.status}`)
        logs.push(`Response data: ${JSON.stringify(openaiError.response.data)}`)
      }
      
      return NextResponse.json({ success: false, error: 'OpenAI API error', details: openaiError.message, logs })
    }
    
  } catch (error: any) {
    logs.push(`❌ General error: ${error.message}`)
    logs.push(`Error stack: ${error.stack}`)
    
    return NextResponse.json({
      success: false,
      error: 'Debug failed',
      details: error.message,
      logs
    }, { status: 500 })
  }
}