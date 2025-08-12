import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      onboardingCompleted?: boolean
    } & DefaultSession["user"]
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }

  interface User {
    id: string
    onboardingCompleted?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    onboardingCompleted?: boolean
  }
}