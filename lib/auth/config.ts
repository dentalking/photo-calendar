import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/db"
import { Adapter } from "next-auth/adapters"

// Kakao OAuth Provider Configuration
function KakaoProvider(options: {
  clientId: string
  clientSecret: string
}) {
  return {
    id: "kakao",
    name: "Kakao",
    type: "oauth" as const,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorization: {
      url: "https://kauth.kakao.com/oauth/authorize",
      params: {
        scope: "profile_nickname profile_image account_email",
        response_type: "code",
      },
    },
    token: "https://kauth.kakao.com/oauth/token",
    userinfo: "https://kapi.kakao.com/v2/user/me",
    profile(profile: any) {
      return {
        id: profile.id.toString(),
        name: profile.properties?.nickname || profile.kakao_account?.profile?.nickname || null,
        email: profile.kakao_account?.email || null,
        image: profile.properties?.profile_image || profile.kakao_account?.profile?.profile_image_url || null,
      }
    },
    checks: ["state", "pkce"] as const,
  }
}

// Validate required environment variables
function validateEnvVars() {
  const required = [
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ]

  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    console.warn(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Validate environment variables on startup
validateEnvVars()

export const authOptions: NextAuthOptions = {
  // Use Prisma adapter for database integration
  adapter: PrismaAdapter(prisma) as Adapter,
  
  // Debug logging for OAuth issues
  debug: process.env.NODE_ENV === 'development',
  
  // Configure OAuth providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
      // Explicitly set the correct redirect URI
      httpOptions: {
        timeout: 10000,
      },
    }),
    // KakaoProvider will be added when configured
    // KakaoProvider({
    //   clientId: process.env.KAKAO_CLIENT_ID!,
    //   clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    // }),
  ],

  // Secure session configuration
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update every day
  },

  // JWT configuration - use default NextAuth JWT handling
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },


  // Custom pages
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },

  // Callbacks for additional security and data handling
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      try {
        // Additional security checks
        if (!user.email) {
          console.error('Sign in failed: No email provided')
          return false
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(user.email)) {
          console.error('Sign in failed: Invalid email format')
          return false
        }

        // Check for banned domains (optional)
        const bannedDomains = ['tempmail.com', '10minutemail.com']
        const emailDomain = user.email.split('@')[1]
        if (bannedDomains.includes(emailDomain)) {
          console.error('Sign in failed: Email from banned domain')
          return false
        }

        return true
      } catch (error) {
        console.error('Sign in error:', error)
        return false
      }
    },

    async redirect({ url, baseUrl }) {
      console.log('NextAuth redirect callback:', { url, baseUrl })
      
      // If URL is relative, convert to absolute
      if (url.startsWith("/")) {
        const redirectUrl = `${baseUrl}${url}`
        console.log('Redirecting to relative URL:', redirectUrl)
        return redirectUrl
      }
      
      // If URL is on the same origin, allow it
      try {
        const urlObj = new URL(url)
        const baseUrlObj = new URL(baseUrl)
        
        if (urlObj.origin === baseUrlObj.origin) {
          console.log('Redirecting to same origin URL:', url)
          return url
        }
      } catch (e) {
        console.error('Invalid URL in redirect:', e)
      }
      
      // Default redirect to dashboard
      const defaultRedirect = `${baseUrl}/dashboard`
      console.log('Default redirect to dashboard:', defaultRedirect)
      return defaultRedirect
    },

    async session({ session, token }) {
      console.log('Session callback:', { 
        hasSession: !!session, 
        hasToken: !!token,
        tokenSub: token?.sub,
        sessionUser: session?.user?.email 
      })
      
      try {
        // Add user ID to session when using JWT strategy
        if (session.user && token) {
          session.user.id = token.sub || token.id || ''
          session.user.email = token.email || session.user.email
          session.user.name = token.name || session.user.name
          session.user.image = token.picture || session.user.image
          
          // Add provider info if available
          if (token.provider) {
            (session.user as any).provider = token.provider
          }
        }

        console.log('Final session:', { 
          userId: session?.user?.id,
          userEmail: session?.user?.email 
        })
        
        return session
      } catch (error) {
        console.error('Session callback error:', error)
        return session
      }
    },
    
    async jwt({ token, user, account, trigger }) {
      console.log('JWT callback:', { 
        trigger, 
        hasUser: !!user, 
        hasAccount: !!account,
        tokenSub: token?.sub 
      })
      
      // Initial sign in
      if (account && user) {
        console.log('Initial sign in - setting token data')
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
        token.provider = account.provider
        token.providerAccountId = account.providerAccountId
      }
      
      return token
    },

  },

  // Event handlers for logging and monitoring
  events: {
    async signIn({ user, account, profile }) {
      console.log(`User signed in: ${user.email} via ${account?.provider}`)
    },
    async signOut({ session, token }) {
      console.log(`User signed out: ${session?.user?.email}`)
    },
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`)
    },
    async linkAccount({ user, account, profile }) {
      console.log(`Account linked: ${user.email} with ${account.provider}`)
    },
    async session({ session, token }) {
      // Optional: Log session access for monitoring
      // console.log(`Session accessed: ${session.user?.email}`)
    },
  },

  // Enable debug mode only in development
  debug: process.env.NODE_ENV === 'development',
  
  // Custom logger to capture OAuth errors
  logger: {
    error: (code, metadata) => {
      console.error(`NextAuth Error [${code}]:`, {
        code,
        metadata,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        hasGoogleCreds: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      })
    },
    warn: (code) => console.warn(`NextAuth Warning [${code}]`),
    debug: (code, metadata) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`NextAuth Debug [${code}]:`, metadata)
      }
    },
  },

  
  // Theme configuration
  theme: {
    colorScheme: 'light',
    brandColor: '#346df1',
    logo: '/logo.png',
  },
}

export default authOptions