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
        // 토큰이 있으면 인증된 것으로 간주
        // database strategy를 사용하므로 token이 아닌 세션 체크가 필요할 수 있음
        const { pathname } = req.nextUrl
        
        // 보호된 경로에 대한 체크
        if (pathname.startsWith('/calendar') || 
            pathname.startsWith('/dashboard') || 
            pathname.startsWith('/settings')) {
          // 쿠키에서 세션 토큰 직접 확인
          const sessionToken = req.cookies.get('next-auth.session-token') || 
                              req.cookies.get('__Secure-next-auth.session-token')
          return !!sessionToken
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