import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { getGoogleProvider } from './google-provider-config'

export const authOptions: NextAuthOptions = {
  debug: true, // Enable debug mode
  adapter: PrismaAdapter(prisma),
  providers: [
    getGoogleProvider(),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (account && user) {
        console.log('[JWT Callback] Initial sign in, account:', {
          provider: account.provider,
          access_token: !!account.access_token,
          refresh_token: !!account.refresh_token,
          scope: account.scope,
        });
        
        return {
          ...token,
          id: user.id,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        }
      }
      
      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.expiresAt as number) * 1000) {
        // Fetch onboarding status on every token refresh
        if (token.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { onboardingCompleted: true },
          })
          if (dbUser) {
            token.onboardingCompleted = dbUser.onboardingCompleted
          }
        }
        return token
      }
      
      // Access token has expired, try to update it
      console.log('[JWT Callback] Token expired, attempting refresh');
      // TODO: Implement token refresh logic here
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.onboardingCompleted = token.onboardingCompleted as boolean
        session.accessToken = token.accessToken as string
        session.refreshToken = token.refreshToken as string
        session.expiresAt = token.expiresAt as number
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}