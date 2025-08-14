import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const logs: string[] = []
  
  try {
    // Parse request
    const { text } = await request.json()
    
    if (!text) {
      return NextResponse.json({ 
        success: false, 
        error: 'No text provided' 
      }, { status: 400 })
    }
    
    logs.push(`Received text: ${text.substring(0, 100)}...`)
    
    // Check API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      logs.push('❌ OPENAI_API_KEY not found in environment')
      return NextResponse.json({ 
        success: false, 
        error: 'OpenAI API key not configured',
        logs 
      })
    }
    
    logs.push(`✅ API key found (length: ${apiKey.length})`)
    
    // Test OpenAI connection
    try {
      const openai = new OpenAI({
        apiKey: apiKey,
      })
      
      logs.push('Creating chat completion...')
      
      const prompt = `Extract calendar event information from this Korean text and return as JSON:
      
Text: ${text}

Return a JSON object with an "events" array containing:
- title: string (event title)
- startDate: string (ISO date)
- endDate: string (ISO date, optional)
- location: string (optional)
- description: string (optional)

If no events found, return {"events": []}`
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting calendar events from Korean text. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      })
      
      logs.push('✅ OpenAI response received')
      
      const content = response.choices[0]?.message?.content
      if (!content) {
        logs.push('❌ No content in response')
        return NextResponse.json({ 
          success: false, 
          error: 'Empty response from OpenAI',
          logs 
        })
      }
      
      logs.push(`Response content: ${content.substring(0, 200)}...`)
      
      // Parse JSON response
      const parsed = JSON.parse(content)
      logs.push(`✅ Parsed ${parsed.events?.length || 0} events`)
      
      return NextResponse.json({
        success: true,
        events: parsed.events || [],
        raw: content,
        logs,
        usage: response.usage,
      })
      
    } catch (openaiError: any) {
      logs.push(`❌ OpenAI Error: ${openaiError.message}`)
      
      if (openaiError.response) {
        logs.push(`Status: ${openaiError.response.status}`)
        logs.push(`Data: ${JSON.stringify(openaiError.response.data).substring(0, 500)}`)
      }
      
      if (openaiError.code) {
        logs.push(`Error code: ${openaiError.code}`)
      }
      
      return NextResponse.json({
        success: false,
        error: openaiError.message,
        errorDetails: {
          code: openaiError.code,
          status: openaiError.response?.status,
          type: openaiError.type,
        },
        logs,
      }, { status: 500 })
    }
    
  } catch (error: any) {
    logs.push(`❌ General error: ${error.message}`)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      logs,
    }, { status: 500 })
  }
}