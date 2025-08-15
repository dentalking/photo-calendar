import { NextAuthOptions } from 'next-auth'
import { getGoogleProvider } from './google-provider-config'

// JWT-only configuration without adapter for testing
export const authOptionsJWT: NextAuthOptions = {
  debug: true, // Enable debug mode
  // NOTE: Adapter removed when using JWT strategy to avoid conflicts
  providers: [
    getGoogleProvider(),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      try {
        // Initial sign in
        if (account && user) {
          console.log('[JWT Callback] Initial sign in with user:', {
            id: user.id,
            email: user.email,
            name: user.name,
          });
          console.log('[JWT Callback] Account info:', {
            provider: account.provider,
            access_token: !!account.access_token,
            refresh_token: !!account.refresh_token,
            scope: account.scope,
          });
          
          return {
            ...token,
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.image,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
          }
        }
        
        // Return the token for subsequent requests
        return token
      } catch (error) {
        console.error('[JWT Callback] Error:', error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (token) {
          session.user = {
            ...session.user,
            id: token.id as string || token.sub,
            email: token.email as string,
            name: token.name as string,
            image: token.picture as string,
          }
          session.accessToken = token.accessToken as string
          session.refreshToken = token.refreshToken as string
          session.expiresAt = token.expiresAt as number
        }
        console.log('[Session Callback] Session created:', {
          userId: session.user?.id,
          email: session.user?.email,
          hasAccessToken: !!session.accessToken,
        });
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