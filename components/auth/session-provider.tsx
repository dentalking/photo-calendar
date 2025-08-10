'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import type { Session } from 'next-auth'

interface SessionProviderProps {
  children: ReactNode
  session?: Session | null
}

/**
 * Wrapper for NextAuth SessionProvider with additional configuration
 */
export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider 
      session={session}
      // Refetch session every 5 minutes when window is focused
      refetchInterval={5 * 60}
      // Refetch session on window focus
      refetchOnWindowFocus={true}
      // Base URL for NextAuth.js API routes
      basePath="/api/auth"
    >
      {children}
    </NextAuthSessionProvider>
  )
}