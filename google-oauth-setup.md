# Google OAuth 설정 확인 가이드

## 현재 상태
✅ 환경변수 수정 완료:
- `NEXTAUTH_URL`: "https://photo-calendar.vercel.app" (줄바꿈 제거)
- `GOOGLE_CLIENT_ID`: 631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com
- `GOOGLE_CLIENT_SECRET`: 올바르게 설정됨

## Google Cloud Console 설정 확인 필요

### 1. Google Cloud Console 접속
https://console.cloud.google.com/

### 2. 프로젝트 선택
현재 사용 중인 프로젝트를 선택하세요.

### 3. OAuth 2.0 클라이언트 ID 설정
1. 왼쪽 메뉴에서 **"API 및 서비스"** → **"사용자 인증 정보"** 클릭
2. OAuth 2.0 클라이언트 ID 목록에서 사용 중인 클라이언트 클릭
   - Client ID: `631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com`

### 4. 필수 설정 확인

#### 승인된 JavaScript 원본 (Authorized JavaScript origins)
다음 URL들이 **모두** 추가되어 있어야 합니다:
```
https://photo-calendar.vercel.app
http://localhost:3000
http://localhost:3004
```

#### 승인된 리디렉션 URI (Authorized redirect URIs)
다음 URL들이 **모두** 추가되어 있어야 합니다:
```
https://photo-calendar.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
http://localhost:3004/api/auth/callback/google
```

### 5. 저장
변경사항이 있다면 반드시 **"저장"** 버튼을 클릭하세요.

## 테스트 방법

### 1. 브라우저 캐시 삭제
- Chrome: Ctrl+Shift+Delete (Windows) / Cmd+Shift+Delete (Mac)
- 또는 시크릿/프라이빗 모드 사용

### 2. 로그인 테스트
1. https://photo-calendar.vercel.app 접속
2. "로그인" 버튼 클릭
3. "Continue with Google" 클릭
4. Google 계정으로 로그인
5. 권한 승인

### 3. 디버그 확인
로그인 후 다음 URL로 세션 확인:
https://photo-calendar.vercel.app/api/auth/debug

정상적으로 로그인되었다면:
```json
{
  "hasSession": true,
  "hasToken": true,
  "session": {
    "user": {
      "email": "your-email@gmail.com",
      "name": "Your Name"
    }
  }
}
```

## 추가 확인 사항

### Google OAuth 동의 화면
1. **"OAuth 동의 화면"** 메뉴 확인
2. 앱 상태가 **"게시됨"** 또는 **"테스트"** 상태인지 확인
3. 테스트 상태인 경우 테스트 사용자에 이메일이 추가되어 있는지 확인

### 문제가 지속될 경우

1. **Vercel 로그 확인**
```bash
vercel logs --follow
```

2. **브라우저 개발자 도구**
- Network 탭에서 `/api/auth/callback/google` 응답 확인
- Console 탭에서 에러 메시지 확인

3. **쿠키 확인**
- Application → Cookies에서 `next-auth.session-token` 존재 여부 확인

## 예상 문제 및 해결

### 1. "redirect_uri_mismatch" 에러
→ Google Cloud Console에서 리디렉션 URI 추가 필요

### 2. 로그인 후 다시 로그인 페이지로
→ 세션이 생성되지 않음. 환경변수 또는 OAuth 설정 문제

### 3. "Access blocked" 에러
→ OAuth 동의 화면 설정 또는 테스트 사용자 추가 필요

## 현재 확인된 설정
- ✅ NEXTAUTH_URL: https://photo-calendar.vercel.app (줄바꿈 제거됨)
- ✅ NEXTAUTH_SECRET: 설정됨
- ✅ GOOGLE_CLIENT_ID: 631982529712-ehmbs1abm3892pkphoivbbn9v39oia68.apps.googleusercontent.com
- ✅ GOOGLE_CLIENT_SECRET: 설정됨
- ✅ Middleware: 온보딩 리다이렉트 임시 비활성화
- ❓ Google Cloud Console OAuth 설정: 확인 필요