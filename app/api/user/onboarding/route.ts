import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';

export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const preferences = await request.json();

    // Update user preferences in the database
    const updatedUser = await prisma.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        preferences: preferences,
        onboardingCompleted: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding preferences saved successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        onboardingCompleted: updatedUser.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to save onboarding preferences' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user preferences from the database
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        email: true,
        preferences: true,
        onboardingCompleted: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: user,
      preferences: user.preferences || {
        timezone: 'Asia/Seoul',
        language: 'ko',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        weekStart: 1,
        defaultEventDuration: 60,
        defaultReminder: 10,
        enableNotifications: true,
        calendarView: 'month',
      },
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}