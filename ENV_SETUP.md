# 🔐 환경변수 관리 가이드

## 1. 환경변수 보안 정책

### ❌ 절대 하지 말아야 할 것들:
- API 키를 코드에 하드코딩
- .env 파일을 Git에 커밋
- 프로덕션 환경변수를 로컬에 저장

### ✅ 반드시 해야 할 것들:
- Vercel CLI를 통한 환경변수 관리
- 로컬 개발은 `.env.local` 사용
- 정기적인 API 키 로테이션

## 2. 초기 설정

### 2.1 Vercel CLI 설치 및 로그인
```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 프로젝트 연결 (이미 연결된 경우 스킵)
vercel link
```

### 2.2 환경변수 가져오기
```bash
# Vercel에서 환경변수를 .env.local로 가져오기
vercel env pull .env.local

# 개발 서버 실행
npm run dev
```

## 3. 환경변수 목록

### 필수 환경변수:
```env
# Database
DATABASE_URL=              # PostgreSQL 연결 URL
DIRECT_URL=                 # Direct database URL (for migrations)

# NextAuth
NEXTAUTH_URL=               # 프로덕션: https://your-domain.com
NEXTAUTH_SECRET=            # openssl rand -hex 32로 생성

# Google OAuth
GOOGLE_CLIENT_ID=           # Google Cloud Console에서 획득
GOOGLE_CLIENT_SECRET=       # Google Cloud Console에서 획득

# Google Cloud Vision (OCR)
GOOGLE_APPLICATION_CREDENTIALS_BASE64=  # Service Account 키를 Base64로 인코딩
GOOGLE_CLOUD_PROJECT=       # GCP 프로젝트 ID

# OpenAI
OPENAI_API_KEY=             # OpenAI Platform에서 획득

# 사용 제한
MAX_FILE_SIZE=5242880       # 5MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp
FREE_MONTHLY_LIMIT=30
PRO_MONTHLY_LIMIT=1000
```

### 선택 환경변수:
```env
# Kakao OAuth (추후 구현)
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

# 결제 (추후 구현)
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=

# 모니터링 (추후 구현)
SENTRY_DSN=
POSTHOG_API_KEY=
```

## 4. 환경변수 관리 명령어

### 환경변수 목록 확인
```bash
vercel env ls
```

### 환경변수 추가
```bash
# 대화형 모드
vercel env add

# 직접 입력
echo "value" | vercel env add KEY_NAME production
```

### 환경변수 삭제
```bash
vercel env rm KEY_NAME production
```

### 환경변수 가져오기
```bash
# .env.local로 가져오기
vercel env pull .env.local
```

## 5. 환경별 설정

### Development (로컬 개발)
- `.env.local` 파일 사용
- `vercel env pull`로 최신 환경변수 동기화

### Preview (PR 브랜치)
- Vercel이 자동으로 Preview 환경변수 적용
- PR별로 격리된 환경

### Production (프로덕션)
- Vercel 대시보드 또는 CLI로만 관리
- 절대 로컬에 저장하지 않음

## 6. 보안 체크리스트

- [ ] OpenAI API 키 재발급 완료
- [ ] Google Cloud Service Account 키 로테이션
- [ ] NextAuth Secret 재생성
- [ ] .gitignore에 모든 .env 파일 포함 확인
- [ ] 팀원들에게 새 환경변수 공유

## 7. 문제 해결

### 환경변수가 적용되지 않을 때:
1. 서버 재시작: `npm run dev`
2. 캐시 삭제: `rm -rf .next`
3. 환경변수 재동기화: `vercel env pull`

### API 키가 노출되었을 때:
1. 즉시 해당 키 무효화
2. 새 키 발급
3. `scripts/update-openai-key.sh` 실행
4. 새 배포 트리거: `vercel --prod`

## 8. 스크립트

### OpenAI API 키 업데이트
```bash
./scripts/update-openai-key.sh
```

### 전체 환경변수 검증
```bash
./scripts/verify-env.sh
```

## 9. 참고 문서

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [NextAuth Configuration](https://next-auth.js.org/configuration/options)
- [Google Cloud Vision Setup](https://cloud.google.com/vision/docs/setup)
- [OpenAI API Keys](https://platform.openai.com/api-keys)

---

**마지막 업데이트**: 2025-01-11
**작성자**: Photo Calendar Team