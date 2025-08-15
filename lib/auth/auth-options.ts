import { NextAuthOptions } from 'next-auth'
// import { PrismaAdapter } from '@next-auth/prisma-adapter'
// import { prisma } from '@/lib/prisma'
import { getGoogleProvider } from './google-provider-config'

export const authOptions: NextAuthOptions = {
  debug: true, // Enable debug mode
  // NOTE: Adapter disabled when using JWT strategy to avoid conflicts
  // When using JWT, NextAuth handles sessions in-memory via encrypted tokens
  // adapter: PrismaAdapter(prisma),
  providers: [
    getGoogleProvider(),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      try {
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
        
        // Check if token has expiresAt property, if not set a default
        if (!token.expiresAt) {
          token.expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days default
        }
        
        // Return previous token if the access token has not expired yet
        if (Date.now() < (token.expiresAt as number) * 1000) {
          // TODO: Re-enable onboarding status check when adapter is fixed
          // Currently disabled due to JWT/Adapter conflict
          /*
          if (token.email) {
            try {
              const dbUser = await prisma.user.findUnique({
                where: { email: token.email },
                select: { onboardingCompleted: true },
              })
              if (dbUser) {
                token.onboardingCompleted = dbUser.onboardingCompleted
              }
            } catch (dbError) {
              console.error('[JWT Callback] Database error fetching user:', dbError);
              // Continue without onboarding status
            }
          }
          */
          return token
        }
        
        // Access token has expired, try to update it
        console.log('[JWT Callback] Token expired, attempting refresh');
        
        if (!token.refreshToken) {
          console.error('[JWT Callback] No refresh token available');
          token.error = 'RefreshTokenError';
          return token;
        }

        try {
          // Google's token refresh endpoint
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              grant_type: 'refresh_token',
              refresh_token: token.refreshToken as string,
            }),
          });

          const tokensOrError = await response.json();

          if (!response.ok) {
            console.error('[JWT Callback] Token refresh failed:', tokensOrError);
            token.error = 'RefreshTokenError';
            return token;
          }

          const newTokens = tokensOrError as {
            access_token: string;
            expires_in: number;
            refresh_token?: string;
          };

          console.log('[JWT Callback] Token refreshed successfully');

          return {
            ...token,
            accessToken: newTokens.access_token,
            expiresAt: Math.floor(Date.now() / 1000 + newTokens.expires_in),
            // Some providers only issue refresh tokens once, so preserve if we didn't get a new one
            refreshToken: newTokens.refresh_token ?? token.refreshToken,
            error: undefined, // Clear any previous errors
          };
        } catch (error) {
          console.error('[JWT Callback] Error refreshing access token:', error);
          token.error = 'RefreshTokenError';
          return token;
        }
      } catch (error) {
        console.error('[JWT Callback] Error:', error);
        // Return the token as-is to prevent auth failure
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (token && session.user) {
          session.user.id = token.id as string
          session.user.onboardingCompleted = token.onboardingCompleted as boolean || false
          session.accessToken = token.accessToken as string
          session.refreshToken = token.refreshToken as string
          session.expiresAt = token.expiresAt as number
          session.error = token.error as string | undefined
        }
        return session
      } catch (error) {
        console.error('[Session Callback] Error:', error);
        return session;
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}