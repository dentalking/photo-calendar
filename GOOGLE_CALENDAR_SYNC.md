# 📅 Google Calendar 동기화 가이드

## 1. 기능 개요

Photo Calendar 애플리케이션과 Google Calendar를 양방향으로 동기화하는 기능입니다.

### 주요 기능:
- ✅ **일정 내보내기** - Photo Calendar → Google Calendar
- ✅ **일정 가져오기** - Google Calendar → Photo Calendar  
- ✅ **실시간 동기화** - 변경사항 자동 반영
- ✅ **충돌 해결** - 중복 방지 및 버전 관리
- ✅ **선택적 동기화** - 특정 캘린더만 선택

## 2. 구현 상태

### ✅ 완료된 기능
- Google OAuth 인증 (Calendar 권한 포함)
- Google Calendar API 서비스 클래스
- 동기화 API 엔드포인트
- 캘린더 페이지 동기화 버튼
- 동기화 설정 UI 컴포넌트

### 🚧 추가 필요 기능
- 실시간 웹훅 동기화
- 충돌 해결 UI
- 동기화 히스토리
- 배치 동기화 스케줄러

## 3. 사용 방법

### 3.1 초기 설정

#### Google Cloud Console 설정
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 선택 또는 생성
3. APIs & Services → Enable APIs 이동
4. Google Calendar API 활성화
5. Credentials → OAuth 2.0 Client ID 생성
6. Authorized redirect URIs 추가:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google`

#### 환경변수 설정
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

### 3.2 사용자 가이드

#### 최초 연결
1. 캘린더 페이지 접속
2. "Google 동기화" 버튼 클릭
3. Google 계정으로 로그인
4. Calendar 권한 승인
5. 동기화 시작

#### 동기화 방법

**전체 동기화**
```javascript
// 모든 확인된 이벤트를 Google Calendar로 전송
POST /api/calendar/sync
{
  "action": "sync-all"
}
```

**개별 이벤트 동기화**
```javascript
// 특정 이벤트만 동기화
POST /api/calendar/sync
{
  "action": "sync-event",
  "eventId": "event-id-here"
}
```

**Google Calendar에서 가져오기**
```javascript
// 특정 기간의 이벤트 가져오기
POST /api/calendar/sync
{
  "action": "pull-events",
  "timeMin": "2025-01-01T00:00:00Z",
  "timeMax": "2025-12-31T23:59:59Z"
}
```

## 4. API 엔드포인트

### POST /api/calendar/sync
동기화 작업 실행

**Actions:**
- `test-connection` - 연결 상태 확인
- `sync-all` - 모든 이벤트 동기화
- `sync-event` - 단일 이벤트 동기화
- `pull-events` - Google에서 가져오기
- `create` - 새 이벤트 생성
- `update` - 이벤트 업데이트
- `delete` - 이벤트 삭제

**Response:**
```json
{
  "success": true,
  "message": "Synced 10 events to Google Calendar",
  "summary": {
    "total": 10,
    "succeeded": 9,
    "failed": 1,
    "skipped": 0
  }
}
```

### GET /api/calendar/sync
Google Calendar 이벤트 조회

**Parameters:**
- `timeMin` - 시작 날짜
- `timeMax` - 종료 날짜
- `maxResults` - 최대 결과 수

## 5. 데이터베이스 스키마

### Event 테이블 동기화 필드
```prisma
model Event {
  // ... 기존 필드
  googleEventId  String?   // Google Calendar Event ID
  syncedAt       DateTime? // 마지막 동기화 시간
  syncStatus     String?   // pending, synced, failed
  syncError      String?   // 동기화 오류 메시지
}
```

## 6. 동기화 로직

### 동기화 규칙
1. **확인된 이벤트만 동기화** - `status: CONFIRMED`
2. **중복 방지** - `googleEventId`로 체크
3. **소프트 삭제 제외** - `deletedAt: null`
4. **사용자별 격리** - `userId` 체크

### 충돌 해결
- **Last Write Wins** - 마지막 수정이 우선
- **Version Control** - `updatedAt` 타임스탬프 비교
- **User Confirmation** - 충돌 시 사용자 확인

## 7. 보안 고려사항

### 권한 관리
- 최소 권한 원칙: Calendar 읽기/쓰기만 요청
- 토큰 만료 처리: Refresh Token 자동 갱신
- 사용자별 격리: 다른 사용자 데이터 접근 차단

### 데이터 보호
- API 호출 암호화 (HTTPS)
- 토큰 안전 저장 (httpOnly cookie)
- 민감 정보 로깅 방지

## 8. 성능 최적화

### 배치 처리
```javascript
// 여러 이벤트를 한 번에 처리
const batchSize = 50;
for (let i = 0; i < events.length; i += batchSize) {
  const batch = events.slice(i, i + batchSize);
  await syncBatch(batch);
  await delay(100); // Rate limiting
}
```

### 캐싱
- Calendar 목록 캐싱 (5분)
- 이벤트 메타데이터 캐싱
- 동기화 상태 로컬 저장

### Rate Limiting
- Google API: 분당 60 요청
- 재시도 로직: Exponential backoff
- 큐 시스템: Bull Queue (선택사항)

## 9. 에러 처리

### 일반적인 에러
1. **401 Unauthorized** - 토큰 만료
   - 해결: Refresh token으로 재인증

2. **403 Forbidden** - 권한 부족
   - 해결: Calendar 권한 재요청

3. **429 Too Many Requests** - Rate limit
   - 해결: 재시도 with delay

4. **404 Not Found** - 이벤트 없음
   - 해결: DB에서 googleEventId 제거

## 10. 테스트

### 유닛 테스트
```javascript
describe('GoogleCalendarService', () => {
  it('should create event in Google Calendar', async () => {
    const service = new GoogleCalendarService(token);
    const result = await service.createEvent(mockEvent);
    expect(result.success).toBe(true);
    expect(result.googleEventId).toBeDefined();
  });
});
```

### 통합 테스트
```bash
# 연결 테스트
curl -X POST http://localhost:3000/api/calendar/sync \
  -H "Content-Type: application/json" \
  -d '{"action": "test-connection"}'

# 동기화 테스트
curl -X POST http://localhost:3000/api/calendar/sync \
  -H "Content-Type: application/json" \
  -d '{"action": "sync-all"}'
```

## 11. 모니터링

### 메트릭
- 동기화 성공률
- 평균 동기화 시간
- API 호출 횟수
- 에러 발생률

### 로깅
```javascript
// Sentry로 에러 추적
captureException(error, {
  tags: {
    type: 'calendar_sync_error',
    action: 'sync-all'
  },
  extra: {
    userId,
    eventCount,
    googleCalendarId
  }
});
```

## 12. 향후 개선사항

### 단기 (1-2주)
- [ ] 실시간 웹훅 동기화
- [ ] 동기화 진행률 표시
- [ ] 에러 재시도 UI

### 중기 (1개월)
- [ ] 다중 캘린더 지원
- [ ] 선택적 필드 동기화
- [ ] 동기화 히스토리 뷰

### 장기 (3개월)
- [ ] 양방향 실시간 동기화
- [ ] 팀 캘린더 공유
- [ ] 타 캘린더 서비스 연동 (Outlook, Apple)

## 13. 트러블슈팅

### 동기화가 안 될 때
1. Google 계정 재인증
2. Calendar API 활성화 확인
3. 네트워크 연결 확인
4. 브라우저 캐시 삭제

### 중복 이벤트 발생
1. DB에서 중복 확인
2. googleEventId 유니크 제약
3. 수동으로 중복 제거

### 권한 에러
1. OAuth scope 확인
2. Refresh token 갱신
3. 계정 권한 재승인

---

**문서 버전**: 1.0.0
**최종 수정**: 2025-01-11
**작성자**: Photo Calendar Team