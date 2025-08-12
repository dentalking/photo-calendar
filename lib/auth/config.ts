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
    }),
    // KakaoProvider will be added when configured
    // KakaoProvider({
    //   clientId: process.env.KAKAO_CLIENT_ID!,
    //   clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    // }),
  ],

  // Secure session configuration
  session: {
    strategy: "jwt", // Changed from "database" to "jwt" for simpler setup
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Update every hour
  },

  // JWT configuration with encryption
  jwt: {
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 24 * 60 * 60, // 24 hours
    // Use HS256 for better compatibility and security
    encode: async ({ secret, token }) => {
      const { SignJWT } = await import('jose')
      const alg = 'HS256'
      
      return await new SignJWT(token as any)
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(new TextEncoder().encode(secret))
    },
    decode: async ({ secret, token }) => {
      if (!token) return null
      
      try {
        const { jwtVerify } = await import('jose')
        const { payload } = await jwtVerify(
          token,
          new TextEncoder().encode(secret)
        )
        return payload
      } catch (error) {
        console.error('JWT decode error:', error)
        return null
      }
    },
  },

  // Secure cookie configuration
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60, // 24 hours
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.callback-url' 
        : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60,
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Host-next-auth.csrf-token' 
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60,
      },
    },
    pkceCodeVerifier: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.pkce.code_verifier' 
        : 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60, // 15 minutes
      },
    },
    state: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.state' 
        : 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60, // 15 minutes
      },
    },
    nonce: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.nonce' 
        : 'next-auth.nonce',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60, // 15 minutes
      },
    },
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

    async session({ session, token }) {
      try {
        // Add user ID to session when using JWT strategy
        if (session.user && token) {
          session.user.id = token.sub || ''
          // Add provider info if available
          if (token.provider) {
            (session.user as any).provider = token.provider
          }
        }

        return session
      } catch (error) {
        console.error('Session callback error:', error)
        return session
      }
    },
    
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
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

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Security options
  useSecureCookies: process.env.NODE_ENV === 'production',
  
  // Theme configuration
  theme: {
    colorScheme: 'light',
    brandColor: '#346df1',
    logo: '/logo.png',
  },
}

export default authOptions