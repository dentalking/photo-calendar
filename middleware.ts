import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // 인증된 경우 그대로 진행
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // 보호된 경로에 대한 체크
        if (pathname.startsWith('/calendar') || 
            pathname.startsWith('/dashboard') || 
            pathname.startsWith('/settings')) {
          // JWT strategy 사용 시 token 체크
          return !!token
        }
        
        return true
      },
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
  }
)

export const config = {
  matcher: [
    '/calendar/:path*',
    '/dashboard/:path*',
    '/settings/:path*',
  ]
}