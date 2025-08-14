# 🔧 Google Calendar OAuth 권한 설정 가이드

## 문제 상황
현재 Google OAuth 로그인은 작동하지만, Calendar API 권한이 요청되지 않아 동기화 기능이 작동하지 않습니다.

## 해결 방법

### 1단계: OAuth 동의 화면 설정 확인 및 수정

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/apis/credentials/consent?project=photo-calendar-20250811-150939
   ```

2. **'EDIT APP' 버튼 클릭**

3. **OAuth consent screen 정보 확인**
   - App name: Photo Calendar
   - User support email: 설정되어 있는지 확인
   - Developer contact information: 설정되어 있는지 확인

4. **'Scopes' 섹션으로 이동**
   - 'ADD OR REMOVE SCOPES' 클릭
   - 다음 스코프들이 추가되어 있는지 확인:
     ```
     ✅ .../auth/userinfo.email
     ✅ .../auth/userinfo.profile  
     ✅ .../auth/calendar
     ✅ .../auth/calendar.events
     ```
   - 없다면 검색하여 추가
   - 'UPDATE' 버튼 클릭

5. **변경사항 저장**
   - 'SAVE AND CONTINUE' 클릭
   - 모든 섹션을 거쳐 완료

### 2단계: OAuth 2.0 클라이언트 설정 확인

1. **OAuth 클라이언트 설정 페이지 접속**
   ```
   https://console.cloud.google.com/apis/credentials/oauthclient/321098167940-88ce9sk71u7qu34erp0u3mrq41oo653b.apps.googleusercontent.com?project=photo-calendar-20250811-150939
   ```

2. **Authorized redirect URIs 확인**
   다음 URI들이 반드시 포함되어야 함:
   - `https://photo-calendar.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (로컬 테스트용)

3. **변경사항 저장**

### 3단계: 기존 연결 해제 (중요!)

1. **Google 계정 연결 관리 페이지 접속**
   ```
   https://myaccount.google.com/connections
   ```

2. **'Photo Calendar' 앱 찾기**
   - 앱을 찾아서 클릭
   - '액세스 권한 삭제' 또는 'Remove Access' 클릭

3. **브라우저 캐시 삭제**
   - 브라우저 쿠키 및 캐시 삭제
   - 또는 시크릿/프라이빗 창 사용

### 4단계: 권한 테스트

1. **테스트 URL 접속 (시크릿/프라이빗 창에서)**
   ```
   https://accounts.google.com/o/oauth2/v2/auth?client_id=321098167940-88ce9sk71u7qu34erp0u3mrq41oo653b.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fphoto-calendar.vercel.app%2Fapi%2Fauth%2Fcallback%2Fgoogle&response_type=code&scope=openid+email+profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&access_type=offline&prompt=consent
   ```

2. **권한 확인**
   로그인 시 다음 권한들이 표시되어야 함:
   - ✅ 이메일 주소 보기
   - ✅ 개인정보(이름, 사진 등) 보기
   - ✅ **Google Calendar를 사용해 액세스할 수 있는 모든 캘린더 보기, 수정, 공유, 영구 삭제**
   - ✅ **모든 캘린더의 일정 보기 및 수정**

### 5단계: 애플리케이션에서 테스트

1. **Photo Calendar 접속**
   ```
   https://photo-calendar.vercel.app
   ```

2. **로그아웃 후 다시 로그인**
   - 로그아웃: https://photo-calendar.vercel.app/auth/signout
   - 다시 로그인: https://photo-calendar.vercel.app/auth/signin
   - Google으로 로그인 선택

3. **Calendar 권한 승인**
   - 권한 요청 화면에서 Calendar 관련 권한이 표시되는지 확인
   - 모든 권한 승인

4. **동기화 테스트**
   - Calendar 페이지로 이동
   - 'Google 동기화' 버튼 클릭
   - 성공 메시지 확인

## 문제 해결

### Calendar 권한이 여전히 표시되지 않는 경우

1. **API 활성화 확인**
   ```bash
   gcloud services list --enabled | grep calendar
   ```
   결과에 `calendar-json.googleapis.com`이 표시되어야 함

2. **프로젝트 빌링 확인**
   ```bash
   gcloud billing projects describe photo-calendar-20250811-150939
   ```

3. **브라우저 문제**
   - 다른 브라우저에서 테스트
   - 모든 브라우저 데이터 삭제 후 재시도

### 토큰이 저장되지 않는 경우

세션 확인 엔드포인트로 디버깅:
```
https://photo-calendar.vercel.app/api/auth/check-session
```

`hasAccessToken: true`가 표시되어야 정상

## 추가 리소스

- [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials?project=photo-calendar-20250811-150939)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api/v3/reference)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)

## 연락처

문제가 지속되면 다음으로 연락:
- 이메일: bangjeongfam@gmail.com
- 프로젝트 관리자: bangheerack@gmail.com

---
*작성일: 2025-08-14*
*작성자: Claude (Anthropic)*