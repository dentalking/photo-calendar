# 🛡️ Sentry 에러 모니터링 설정 가이드

## 1. Sentry 계정 설정

### 1.1 Sentry 가입
1. [Sentry.io](https://sentry.io) 접속
2. 무료 계정 생성 (월 5,000 에러까지 무료)
3. Organization 생성: `photo-calendar`

### 1.2 프로젝트 생성
1. Create Project 클릭
2. Platform: **Next.js** 선택
3. Project Name: `javascript-nextjs`
4. Team: Default 선택

### 1.3 DSN 획득
프로젝트 생성 후 Settings → Client Keys (DSN)에서 DSN 복사

## 2. 환경변수 설정

### 2.1 Vercel 환경변수 추가
```bash
# Sentry DSN 추가 (프로덕션)
echo "your-dsn-here" | vercel env add SENTRY_DSN production

# 퍼블릭 DSN 추가 (클라이언트 사이드)
echo "your-dsn-here" | vercel env add NEXT_PUBLIC_SENTRY_DSN production

# Auth Token 추가 (소스맵 업로드용)
echo "your-auth-token" | vercel env add SENTRY_AUTH_TOKEN production
```

### 2.2 로컬 개발 환경
`.env.local` 파일에 추가:
```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
SENTRY_ORG=photo-calendar
SENTRY_PROJECT=javascript-nextjs
```

## 3. 이미 구현된 기능

### ✅ 자동 에러 캡처
- 전역 에러 자동 캡처
- Promise rejection 처리
- API 에러 로깅

### ✅ 성능 모니터링
- API 응답 시간 추적
- 느린 요청 자동 감지 (3초 이상)
- 트랜잭션별 샘플링

### ✅ 컨텍스트 추가
- 사용자 정보 자동 추가
- 요청 메타데이터
- 브라우저/디바이스 정보

### ✅ 필터링
- 개발 환경 에러 제외
- 404 에러 필터링
- 브라우저 확장 프로그램 에러 제외

## 4. 사용 방법

### 4.1 수동 에러 캡처
```typescript
import { captureException, captureMessage } from '@/lib/utils/sentry';

// 에러 캡처
try {
  // 위험한 작업
} catch (error) {
  captureException(error, {
    tags: { component: 'PhotoUpload' },
    extra: { fileName: file.name },
    user: { id: userId },
    level: 'error'
  });
}

// 메시지 로깅
captureMessage('Payment successful', 'info', {
  tags: { type: 'payment' },
  extra: { amount: 9900 }
});
```

### 4.2 API 에러 로깅
```typescript
import { logApiError } from '@/lib/utils/sentry';

// API 핸들러에서
catch (error) {
  logApiError('/api/photo/extract', 'POST', error, {
    userId: session.user.id,
    statusCode: 500
  });
}
```

### 4.3 특정 서비스 에러
```typescript
import { logOcrError, logAiError } from '@/lib/utils/sentry';

// OCR 에러
logOcrError(error, {
  userId,
  fileName: file.name,
  fileSize: file.size
});

// AI 에러
logAiError(error, {
  userId,
  model: 'gpt-4',
  textLength: text.length
});
```

## 5. 대시보드 활용

### 5.1 Issues 탭
- 에러 그룹별 확인
- 발생 빈도 및 영향 사용자 수
- 에러 상세 스택 트레이스

### 5.2 Performance 탭
- API 엔드포인트별 성능
- 느린 트랜잭션 식별
- 데이터베이스 쿼리 성능

### 5.3 Releases 탭
- 릴리즈별 에러율
- 회귀 버그 추적
- 배포 건전성 확인

### 5.4 Alerts 설정
1. Settings → Alerts 이동
2. Create Alert Rule 클릭
3. 조건 설정:
   - 에러율 급증 (10분간 100개 이상)
   - 새로운 에러 타입 발생
   - 성능 저하 (p95 > 5초)
4. 알림 채널: 이메일, Slack

## 6. 모범 사례

### DO ✅
- 중요 비즈니스 로직에 에러 로깅 추가
- 사용자 컨텍스트 포함
- 의미있는 태그와 메타데이터 추가
- 정기적으로 대시보드 확인

### DON'T ❌
- 민감한 정보 로깅 (비밀번호, 토큰)
- 예상된 에러 과도하게 로깅
- 개발 환경에서 프로덕션 DSN 사용
- 너무 높은 샘플링 레이트 설정

## 7. 트러블슈팅

### Sentry가 작동하지 않을 때
1. DSN 확인: 올바른 형식인지 확인
2. 환경변수 확인: `vercel env ls`
3. 네트워크: 광고 차단기 확인
4. 콘솔 로그: 개발자 도구에서 에러 확인

### 에러가 너무 많이 캡처될 때
1. `ignoreErrors` 배열에 추가
2. `beforeSend` 함수에서 필터링
3. 샘플링 레이트 조정

### 소스맵이 표시되지 않을 때
1. `SENTRY_AUTH_TOKEN` 확인
2. `sentry-cli` 설치 및 설정
3. 빌드 로그에서 업로드 확인

## 8. 비용 관리

### 무료 플랜 (Developer)
- 월 5,000 에러
- 10,000 성능 이벤트
- 1GB 첨부 파일
- 30일 데이터 보관

### 비용 절감 팁
- 샘플링 레이트 조정 (프로덕션: 0.1)
- 불필요한 에러 필터링
- 개발/스테이징 환경 분리
- 정기적인 에러 해결

## 9. 통합

### Vercel 통합
1. Vercel 대시보드 → Integrations
2. Sentry 설치
3. 프로젝트 연결
4. 자동 릴리즈 추적 활성화

### Slack 통합
1. Sentry → Settings → Integrations
2. Slack 추가
3. 워크스페이스 연결
4. Alert Rule에서 Slack 채널 선택

## 10. 체크리스트

- [ ] Sentry 계정 생성
- [ ] 프로젝트 설정
- [ ] DSN 환경변수 추가
- [ ] 로컬 테스트
- [ ] 프로덕션 배포
- [ ] Alert 규칙 설정
- [ ] 팀 멤버 초대
- [ ] Slack 통합

---

**참고 문서**
- [Sentry Next.js 가이드](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry 모범 사례](https://docs.sentry.io/product/best-practices/)
- [성능 모니터링](https://docs.sentry.io/product/performance/)

**지원**
- 이슈: GitHub Issues
- 이메일: support@photo-calendar.com