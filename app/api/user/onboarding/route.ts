import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const preferences = await request.json()

    // Update user preferences
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        onboardingCompleted: true,
        timezone: preferences.timezone,
        language: preferences.language,
        dateFormat: preferences.dateFormat,
        timeFormat: preferences.timeFormat,
        weekStart: preferences.weekStart,
        defaultEventDuration: preferences.defaultEventDuration,
        defaultReminder: preferences.defaultReminder,
        enableNotifications: preferences.enableNotifications,
        calendarView: preferences.calendarView,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        onboardingCompleted: updatedUser.onboardingCompleted,
      },
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        onboardingCompleted: true,
        timezone: true,
        language: true,
        dateFormat: true,
        timeFormat: true,
        weekStart: true,
        defaultEventDuration: true,
        defaultReminder: true,
        enableNotifications: true,
        calendarView: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    )
  }
}