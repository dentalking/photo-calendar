import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { google } from 'googleapis';

/**
 * Debug endpoint to test Google Calendar API
 * Tests both API key and OAuth access
 */
export async function GET(request: NextRequest) {
  try {
    const results: any = {
      apiKey: process.env.GOOGLE_API_KEY ? 'Present' : 'Missing',
      clientId: process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing',
      project: process.env.GOOGLE_CLOUD_PROJECT || 'Not set',
      tests: [],
    };

    // Test 1: Check session and tokens
    const session = await getServerSession(authOptions);
    results.session = {
      authenticated: !!session,
      hasAccessToken: !!session?.accessToken,
      hasRefreshToken: !!session?.refreshToken,
      user: session?.user?.email || null,
    };

    // Test 2: Try to initialize OAuth2 client
    if (session?.accessToken) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
        );

        oauth2Client.setCredentials({
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
        });

        // Test 3: Try to access Calendar API
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        try {
          const calendarList = await calendar.calendarList.list({
            minAccessRole: 'reader',
          });

          results.tests.push({
            name: 'Calendar List Access',
            success: true,
            calendars: calendarList.data.items?.map(cal => ({
              id: cal.id,
              summary: cal.summary,
              primary: cal.primary,
            })) || [],
          });
        } catch (calError: any) {
          results.tests.push({
            name: 'Calendar List Access',
            success: false,
            error: calError.message,
            statusCode: calError.code,
            details: calError.errors,
          });
        }

        // Test 4: Try to list events
        try {
          const events = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 5,
            singleEvents: true,
            orderBy: 'startTime',
          });

          results.tests.push({
            name: 'Events List Access',
            success: true,
            eventCount: events.data.items?.length || 0,
          });
        } catch (eventError: any) {
          results.tests.push({
            name: 'Events List Access',
            success: false,
            error: eventError.message,
            statusCode: eventError.code,
          });
        }
      } catch (authError: any) {
        results.tests.push({
          name: 'OAuth Client Setup',
          success: false,
          error: authError.message,
        });
      }
    } else {
      results.tests.push({
        name: 'OAuth Token Check',
        success: false,
        error: 'No access token in session',
      });
    }

    // Test 5: Try using API key (for public calendar test)
    if (process.env.GOOGLE_API_KEY) {
      try {
        const calendar = google.calendar({ 
          version: 'v3', 
          key: process.env.GOOGLE_API_KEY 
        });
        
        // This will only work for public calendars
        const publicTest = await calendar.calendarList.list().catch(err => ({
          error: 'API key cannot access private calendars (expected)',
        }));
        
        results.tests.push({
          name: 'API Key Test',
          success: true,
          note: 'API key is configured (but Calendar API requires OAuth for private data)',
        });
      } catch (apiKeyError: any) {
        results.tests.push({
          name: 'API Key Test',
          success: false,
          error: apiKeyError.message,
        });
      }
    }

    // Summary
    results.summary = {
      totalTests: results.tests.length,
      passed: results.tests.filter((t: any) => t.success).length,
      failed: results.tests.filter((t: any) => !t.success).length,
    };

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error('Google Calendar debug error:', error);
    return NextResponse.json(
      {
        error: 'Debug endpoint error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}