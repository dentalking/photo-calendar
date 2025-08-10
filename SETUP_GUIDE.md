# Photo Calendar 설정 가이드

## 🚀 빠른 시작

### 1. 환경 설정
```bash
# 1. 환경변수 파일 복사
cp .env.example .env.local

# 2. Docker 컨테이너 시작 (PostgreSQL + Redis)
docker compose up -d

# 3. 데이터베이스 마이그레이션
npx prisma migrate dev

# 4. 개발 서버 시작
npm run dev
```

### 2. 필수 API 키 설정

`.env.local` 파일을 열고 다음 값들을 입력하세요:

#### OpenAI API Key (필수)
```env
OPENAI_API_KEY="sk-..."  # OpenAI Platform에서 발급
```

#### Google OAuth (선택사항)
Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성:
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=geulpi-prod) 접속
2. **CREATE CREDENTIALS** > **OAuth client ID** 클릭
3. Application type: **Web application**
4. 승인된 JavaScript 원본:
   - `http://localhost:3003`
   - `http://localhost:3000`
5. 승인된 리디렉션 URI:
   - `http://localhost:3003/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
6. 생성된 Client ID와 Secret을 `.env.local`에 추가:
```env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

#### Kakao OAuth (선택사항)
[Kakao Developers](https://developers.kakao.com)에서 앱 생성:
1. 내 애플리케이션 > 애플리케이션 추가하기
2. 앱 이름: `Photo Calendar`
3. 플랫폼 설정 > Web 플랫폼 등록:
   - 사이트 도메인: `http://localhost:3003`
4. 카카오 로그인 > 활성화
5. Redirect URI 등록:
   - `http://localhost:3003/api/auth/callback/kakao`
6. 앱 키 > REST API 키와 Secret Key를 `.env.local`에 추가:
```env
KAKAO_CLIENT_ID="..."  # REST API 키
KAKAO_CLIENT_SECRET="..."  # Secret Key (보안 > 코드 생성)
```

## 📦 프로젝트 구조

```
photo-calendar/
├── app/                  # Next.js App Router
│   ├── api/             # API 라우트
│   ├── auth/            # 인증 페이지
│   ├── calendar/        # 캘린더 페이지
│   └── page.tsx         # 랜딩 페이지
├── components/          # React 컴포넌트
├── lib/                 # 유틸리티 및 설정
│   ├── auth.ts         # NextAuth 설정
│   ├── prisma.ts       # Prisma 클라이언트
│   └── stores/         # Zustand 상태 관리
├── prisma/             # 데이터베이스 스키마
├── docker-compose.yml  # Docker 설정
└── scripts/            # 유틸리티 스크립트
```

## 🔧 사용 가능한 스크립트

```bash
# 개발 서버 시작
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 시작
npm run start

# 타입 체크
npm run type-check

# 린트 실행
npm run lint

# Prisma Studio (DB 관리 GUI)
npx prisma studio

# 데이터베이스 마이그레이션
npx prisma migrate dev

# 데이터베이스 리셋
npx prisma migrate reset
```

## 🐳 Docker 명령어

```bash
# 컨테이너 시작
docker compose up -d

# 컨테이너 중지
docker compose down

# 로그 확인
docker compose logs -f

# PostgreSQL 접속
docker exec -it photo-calendar-db psql -U postgres -d photo_calendar

# Redis CLI 접속
docker exec -it photo-calendar-redis redis-cli
```

## 🌐 Google Cloud 정보

- **Project ID**: `geulpi-prod`
- **Service Account**: `geulpi-backend@geulpi-prod.iam.gserviceaccount.com`
- **활성화된 APIs**:
  - Google Vision API (OCR)
  - Google Calendar API
  - Identity Toolkit API (OAuth)

## 🚀 Vercel 배포

```bash
# Vercel CLI 설치 (이미 설치됨)
npm i -g vercel

# 프로젝트 배포
vercel

# 프로덕션 배포
vercel --prod

# 환경변수 설정
vercel env add VARIABLE_NAME production
```

## 📝 주요 기능

1. **사진에서 일정 추출**
   - 이미지 업로드 → Google Vision OCR → OpenAI GPT-4 파싱 → 캘린더 등록

2. **OAuth 로그인**
   - Google, Kakao 소셜 로그인 지원

3. **캘린더 관리**
   - 월별/리스트 뷰
   - 이벤트 CRUD
   - 일정 필터링 및 검색

4. **구독 시스템**
   - 무료: 월 30장
   - Pro: 월 1,000장

## 🔍 트러블슈팅

### PostgreSQL 연결 오류
```bash
# Docker 컨테이너 상태 확인
docker ps

# 컨테이너 재시작
docker compose restart postgres
```

### Prisma 오류
```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 스키마 동기화
npx prisma db push
```

### 포트 충돌
```bash
# 3003 포트 사용 중인 프로세스 확인
lsof -i :3003

# 프로세스 종료
kill -9 [PID]
```

## 📞 지원

문제가 있으시면 다음 정보와 함께 이슈를 생성해주세요:
- 오류 메시지
- 실행한 명령어
- 환경 정보 (OS, Node.js 버전 등)