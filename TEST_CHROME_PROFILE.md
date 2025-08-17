# Chrome BANG 프로필 테스트 가이드

## 테스트 전 필수 준비사항

### 1. Chrome 프로필 설정
1. **모든 Chrome 창을 완전히 종료**
2. **Chrome 재시작 시 프로필 선택**:
   - Chrome 시작 화면 왼쪽에 "BANG" 프로필 클릭
   - 이 프로필은 이미 bangjeongfam@gmail.com으로 Google 로그인 완료 상태

### 2. OAuth 인증 확인
1. BANG 프로필로 Chrome 실행
2. https://photo-calendar.vercel.app 접속
3. "로그인" 버튼 클릭
4. Google OAuth가 자동으로 통과되는지 확인
5. Dashboard로 리다이렉트 확인

### 3. 프로필 경로 확인
```bash
# Chrome에서 chrome://version 접속
# "프로필 경로" 복사
# 예: /Users/heerackbang/Library/Application Support/Google/Chrome/Profile 1
```

## 수동 테스트 플로우

### 사진 업로드 → OCR → 이벤트 생성
1. BANG 프로필로 Chrome 실행 상태 유지
2. https://photo-calendar.vercel.app/calendar 접속
3. "일정 추가" 버튼 클릭
4. 테스트 이미지 업로드 (한국어 포스터)
5. OCR 처리 및 이벤트 생성 확인

## 자동화 테스트 제약사항

### 현재 제약
- MCP Playwright: 기존 Chrome 프로필 연결 미지원
- Puppeteer: Google OAuth 봇 감지로 차단
- Headless 모드: OAuth 인증 불가

### 대안
1. **수동 테스트**: BANG 프로필로 직접 테스트
2. **개발 환경 OAuth 우회**: 개발 모드에서 인증 스킵
3. **E2E 테스트 프레임워크 변경**: Selenium 등 프로필 지원 도구 사용

## 테스트 체크리스트

- [ ] Chrome BANG 프로필 로그인 상태 확인
- [ ] photo-calendar.vercel.app OAuth 인증 작동
- [ ] Calendar 페이지 정상 로드
- [ ] 일정 추가 모달 열기
- [ ] 사진 업로드 기능
- [ ] OCR 텍스트 추출
- [ ] 이벤트 생성 및 저장
- [ ] Google Calendar 동기화 (선택)