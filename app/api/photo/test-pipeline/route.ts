import { NextRequest, NextResponse } from 'next/server'

/**
 * Test the complete photo-to-event pipeline
 * 1. OCR text extraction
 * 2. AI event analysis  
 * 3. Event creation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const logs: string[] = []
  
  try {
    logs.push('Starting pipeline test...')
    
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file provided',
        logs 
      }, { status: 400 })
    }
    
    logs.push(`File received: ${file.name} (${file.size} bytes)`)
    
    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Step 1: OCR Text Extraction
    let extractedText = ''
    try {
      const { ocrService } = await import('@/lib/ocr')
      logs.push('OCR service imported')
      
      const ocrResult = await ocrService.extractText(buffer)
      logs.push(`OCR result keys: ${JSON.stringify(Object.keys(ocrResult))}`)
      logs.push(`OCR result text type: ${typeof ocrResult.text}`)
      logs.push(`OCR result text length: ${ocrResult.text?.length || 0}`)
      logs.push(`OCR result text preview: ${JSON.stringify(ocrResult.text?.substring(0, 100))}`)
      logs.push(`OCR result confidence: ${ocrResult.confidence}`)
      logs.push(`Full OCR result: ${JSON.stringify(ocrResult, null, 2).substring(0, 500)}`)
      
      extractedText = ocrResult.text || ''
      logs.push(`✅ OCR: Extracted ${extractedText.length} characters`)
      if (extractedText) {
        logs.push(`Preview: ${extractedText.substring(0, 100)}...`)
      } else {
        logs.push('No text property in OCR result')
        // Try direct Vision API
        logs.push('Trying direct Vision API...')
        const { ImageAnnotatorClient } = await import('@google-cloud/vision')
        
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
          const fs = (await import('fs')).default
          const path = (await import('path')).default
          
          const credentials = Buffer.from(
            process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
            'base64'
          ).toString('utf-8')
          
          const tempPath = path.join('/tmp', `google-cloud-key-${Date.now()}.json`)
          fs.writeFileSync(tempPath, credentials)
          process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath
        }
        
        const client = new ImageAnnotatorClient({
          projectId: process.env.GOOGLE_CLOUD_PROJECT || 'photo-calendar-20250811-150939'
        })
        
        const [result] = await client.textDetection({
          image: { content: buffer }
        })
        
        const detections = result.textAnnotations
        extractedText = detections && detections[0] ? detections[0].description || '' : ''
        logs.push(`Direct Vision API: ${extractedText.length} characters extracted`)
      }
    } catch (ocrError) {
      logs.push(`❌ OCR failed: ${ocrError}`)
      logs.push(`Error stack: ${ocrError instanceof Error ? ocrError.stack : 'No stack'}`)
      return NextResponse.json({ success: false, error: 'OCR failed', logs }, { status: 500 })
    }
    
    if (!extractedText) {
      logs.push('⚠️ No text found in image')
      return NextResponse.json({ 
        success: true, 
        text: '',
        events: [],
        logs 
      })
    }
    
    // Step 2: AI Event Analysis
    let events = []
    try {
      const { aiAnalysisService } = await import('@/lib/ai/openai-service')
      
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        logs.push('⚠️ OpenAI API key not configured')
        // Try fallback intelligent parser
        const { IntelligentEventParser } = await import('@/lib/ai/intelligent-parser')
        const parser = new IntelligentEventParser({
          currentDate: new Date().toISOString(),
          timezone: 'Asia/Seoul',
          language: 'ko',
          processingDate: new Date().toISOString()
        })
        events = await parser.parseEvents(extractedText)
        logs.push(`✅ Fallback parser: Found ${events.length} events`)
      } else {
        logs.push(`OpenAI API key configured (length: ${process.env.OPENAI_API_KEY.length})`)
        
        let aiSucceeded = false
        try {
          const analysis = await aiAnalysisService.extractEventsFromText(extractedText, {
            minConfidence: 0.5,
            defaultCategory: 'general'
          })
          logs.push(`AI Analysis result: ${JSON.stringify(analysis, null, 2).substring(0, 500)}`);
          events = analysis.events || [];
          logs.push(`✅ AI Analysis: Found ${events.length} events`);
          
          if (events.length > 0) {
            aiSucceeded = true;
          } else {
            logs.push(`⚠️ AI found no events, will use enhanced fallback parser`);
          }
        } catch (aiError: any) {
          logs.push(`❌ AI Service error: ${aiError.message}`);
          logs.push(`Error stack: ${aiError.stack?.substring(0, 500)}`);
        }
        
        // If AI didn't find any events, use our enhanced fallback
        if (!aiSucceeded) {
          logs.push(`🚀 Running enhanced Korean fallback parser...`)
          
          // Enhanced Korean text parser
          const lines = extractedText.split('\n').filter(line => line.trim().length > 0)
          logs.push(`Text lines: ${JSON.stringify(lines)}`)
          
          // Extract title (first line that looks like a title)
          const title = lines[0] || 'Extracted Event'
          logs.push(`Extracted title: ${title}`)
          
          // Extract date - Korean format
          const datePattern = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/
          const dateMatch = extractedText.match(datePattern)
          let eventDate = new Date()
          
          if (dateMatch) {
            const year = parseInt(dateMatch[1])
            const month = parseInt(dateMatch[2]) - 1 // JavaScript months are 0-indexed
            const day = parseInt(dateMatch[3])
            eventDate = new Date(year, month, day)
            logs.push(`✅ Date extracted: ${year}-${month+1}-${day} -> ${eventDate.toISOString()}`)
          } else {
            logs.push(`⚠️ No date pattern found, using current date`)
          }
          
          // Extract time - Korean format
          const timePattern = /오후\s*(\d{1,2})시\s*(\d{1,2})분?|오전\s*(\d{1,2})시\s*(\d{1,2})분?|(\d{1,2}):(\d{2})/
          const timeMatch = extractedText.match(timePattern)
          
          if (timeMatch) {
            let hour = 0
            let minute = 0
            
            if (timeMatch[1] && timeMatch[2]) { // 오후 format
              hour = parseInt(timeMatch[1])
              minute = parseInt(timeMatch[2]) || 0
              if (hour !== 12) hour += 12 // Convert to 24-hour format
              logs.push(`✅ PM Time extracted: ${hour}:${minute}`)
            } else if (timeMatch[3] && timeMatch[4]) { // 오전 format
              hour = parseInt(timeMatch[3])
              minute = parseInt(timeMatch[4]) || 0
              if (hour === 12) hour = 0 // 12 AM = 0 hours
              logs.push(`✅ AM Time extracted: ${hour}:${minute}`)
            } else if (timeMatch[5] && timeMatch[6]) { // HH:MM format
              hour = parseInt(timeMatch[5])
              minute = parseInt(timeMatch[6])
              logs.push(`✅ 24-hour Time extracted: ${hour}:${minute}`)
            }
            
            eventDate.setHours(hour, minute, 0, 0)
          }
          
          // Extract location
          const locationPattern = /(.*돔|.*경기장|.*센터|.*홀|.*극장|.*공원)/
          const locationMatch = extractedText.match(locationPattern)
          const location = locationMatch ? locationMatch[0] : ''
          logs.push(`Location extracted: ${location}`)
          
          // Create event if we have enough information
          if (title && (dateMatch || timeMatch)) {
            events = [{
              title: title,
              startDate: eventDate.toISOString(),
              endDate: null,
              location: location,
              description: extractedText,
              confidence: 0.8,
              isAllDay: !timeMatch
            }]
            logs.push(`✅ Enhanced Fallback: Created event - ${title} on ${eventDate.toISOString()}`)
          } else {
            logs.push(`⚠️ Not enough information to create event`)
          }
        }
      }
      
      if (events.length > 0) {
        logs.push('Events found:')
        events.forEach((event: any, index: number) => {
          logs.push(`  ${index + 1}. ${event.title} - ${event.startDate}`)
        })
      }
    }
    
    // Step 3: Test Event Creation (without actual DB save)
    let createdEvents = []
    if (events.length > 0) {
      logs.push('Testing event creation...')
      
      // Simulate event creation
      createdEvents = events.map((event: any) => ({
        id: `test-${Date.now()}-${Math.random()}`,
        ...event,
        status: 'test',
        created: new Date().toISOString()
      }))
      
      logs.push(`✅ Would create ${createdEvents.length} events in database`)
    }
    
    // Summary
    logs.push('---')
    logs.push('Pipeline test complete!')
    logs.push(`- Text extracted: ${extractedText ? 'Yes' : 'No'}`)
    logs.push(`- Events found: ${events.length}`)
    logs.push(`- Ready for creation: ${createdEvents.length}`)
    
    return NextResponse.json({
      success: true,
      pipeline: {
        ocr: {
          success: !!extractedText,
          textLength: extractedText.length,
          preview: extractedText.substring(0, 200)
        },
        ai: {
          success: events.length > 0,
          eventsFound: events.length,
          events: events
        },
        creation: {
          ready: createdEvents.length > 0,
          events: createdEvents
        }
      },
      logs,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logs.push(`❌ Pipeline error: ${error}`)
    
    return NextResponse.json({
      success: false,
      error: 'Pipeline failed',
      logs,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}