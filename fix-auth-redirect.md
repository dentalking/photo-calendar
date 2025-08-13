# 로그인 후 리다이렉트 문제 해결 가이드

## 문제
Google 로그인 후 다시 로그인 페이지로 리다이렉트되는 문제

## 원인 분석

### 1. 환경변수 설정 문제
- ✅ `NEXTAUTH_URL`이 production에 올바르게 설정됨 (https://photo-calendar.vercel.app)
- ✅ `NEXTAUTH_SECRET`이 설정되어 있음
- ✅ `GOOGLE_CLIENT_ID`와 `GOOGLE_CLIENT_SECRET`이 설정되어 있음

### 2. Google Cloud Console OAuth 설정 확인 필요

#### 승인된 리디렉션 URI에 다음이 모두 등록되어 있어야 함:
```
https://photo-calendar.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
http://localhost:3004/api/auth/callback/google
```

#### 승인된 JavaScript 원본:
```
https://photo-calendar.vercel.app
http://localhost:3000
http://localhost:3004
```

## 해결 단계

### 1. Google Cloud Console에서 OAuth 설정 확인
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택
3. "API 및 서비스" → "사용자 인증 정보"
4. OAuth 2.0 클라이언트 ID 클릭
5. 승인된 리디렉션 URI 확인 및 추가

### 2. Vercel 환경변수 재설정 (완료)
```bash
# 이미 완료된 작업
vercel env rm NEXTAUTH_URL production
echo "https://photo-calendar.vercel.app" | vercel env add NEXTAUTH_URL production
```

### 3. 세션 및 JWT 설정 확인
`lib/auth/config.ts`에서:
- JWT strategy 사용 중 (올바름)
- Session maxAge: 24시간
- JWT 암호화 설정 정상

### 4. Middleware 확인
`middleware.ts`에서:
- 보호된 경로: `/calendar`, `/dashboard`, `/settings`, `/onboarding`
- 온보딩 리다이렉트 로직 존재
- `token.onboardingCompleted` 확인 중

### 5. 데이터베이스 스키마 확인 필요
```bash
# Prisma 스키마 확인
npx prisma db push
npx prisma generate
```

## 추가 디버깅 단계

### 1. 브라우저 개발자 도구에서 확인
- Network 탭에서 `/api/auth/callback/google` 응답 확인
- Console에서 에러 메시지 확인
- Application → Cookies에서 `next-auth.session-token` 확인

### 2. Vercel 로그 확인
```bash
vercel logs --follow
```

### 3. 테스트 코드 추가
```typescript
// app/api/auth/debug/route.ts
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  return NextResponse.json({
    hasSession: !!session,
    session: session,
    env: {
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      nextAuthUrl: process.env.NEXTAUTH_URL
    }
  })
}
```

## 임시 해결 방법

### Onboarding 우회
`middleware.ts`에서 온보딩 체크 임시 비활성화:
```typescript
// Line 50-54를 주석 처리
// const needsOnboarding = !token.onboardingCompleted
// 
// if (needsOnboarding && isProtectedPath && pathname !== '/onboarding') {
//   return NextResponse.redirect(new URL('/onboarding', request.url))
// }
```

## 권장 사항

1. **즉시 확인**
   - Google Cloud Console OAuth 설정
   - Vercel 배포 후 환경변수 반영 확인 (재배포 필요할 수 있음)

2. **디버그 정보 수집**
   - 브라우저 콘솔 에러
   - Network 탭 응답
   - Vercel 로그

3. **테스트**
   - 시크릿 브라우징 모드에서 테스트
   - 다른 브라우저에서 테스트
   - 쿠키/캐시 삭제 후 테스트

## 예상 원인
1. Google OAuth 콜백 URL 미등록 (가장 가능성 높음)
2. 세션 토큰이 제대로 생성되지 않음
3. Onboarding 상태 확인 로직 문제