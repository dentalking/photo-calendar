# Google Cloud Setup Guide for Photo Calendar

## 프로젝트 정보
- **Project ID**: photo-calendar-0809
- **Project Name**: Photo Calendar
- **Created**: 2025-08-09

## 활성화된 APIs
1. **Google Vision API** - 이미지에서 텍스트 추출 (OCR)
2. **Google Calendar API** - 캘린더 연동
3. **IAM Service Account Credentials API** - 서비스 계정 관리

## 서비스 계정
- **Service Account**: photo-calendar-service@photo-calendar-0809.iam.gserviceaccount.com
- **Display Name**: Photo Calendar Service Account
- **Role**: Vision AI Admin
- **Key File**: `google-cloud-key.json` (프로젝트 루트에 위치)

## 환경변수 설정

`.env.local` 파일에 다음 환경변수를 설정하세요:

```env
# Google Cloud Vision API
GOOGLE_APPLICATION_CREDENTIALS="./google-cloud-key.json"
GOOGLE_CLOUD_PROJECT="photo-calendar-0809"

# Google OAuth (Console에서 생성 필요)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Google OAuth 2.0 설정 방법

1. [Google Cloud Console](https://console.cloud.google.com)에 접속
2. 프로젝트 선택: `photo-calendar-0809`
3. 좌측 메뉴에서 **APIs & Services** > **Credentials** 클릭
4. **+ CREATE CREDENTIALS** > **OAuth client ID** 선택
5. Application type: **Web application** 선택
6. 다음 정보 입력:
   - Name: `Photo Calendar Web Client`
   - Authorized JavaScript origins:
     - `http://localhost:3003`
     - `http://localhost:3000`
     - `https://your-production-domain.com` (프로덕션용)
   - Authorized redirect URIs:
     - `http://localhost:3003/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google`
     - `https://your-production-domain.com/api/auth/callback/google` (프로덕션용)
7. **CREATE** 클릭
8. 생성된 Client ID와 Client Secret을 `.env.local`에 복사

## OAuth 동의 화면 설정

1. **APIs & Services** > **OAuth consent screen** 이동
2. User Type: **External** 선택 (공개 서비스용)
3. 앱 정보 입력:
   - App name: `Photo Calendar`
   - User support email: `bangheerack@gmail.com`
   - App logo: (선택사항)
   - Application home page: `http://localhost:3003` (개발) / 프로덕션 URL
   - Application privacy policy link: `/privacy`
   - Application terms of service link: `/terms`
   - Developer contact information: `bangheerack@gmail.com`
4. Scopes 설정:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `../auth/calendar` (Google Calendar 연동용)
5. Test users 추가 (개발 중일 때)
6. Summary 확인 후 **SAVE AND CONTINUE**

## Google Cloud CLI 명령어

### 프로젝트 전환
```bash
gcloud config set project photo-calendar-0809
```

### 활성화된 서비스 확인
```bash
gcloud services list --enabled --project=photo-calendar-0809
```

### 서비스 계정 목록
```bash
gcloud iam service-accounts list --project=photo-calendar-0809
```

### 새 서비스 계정 키 생성 (필요시)
```bash
gcloud iam service-accounts keys create ./new-key.json \
  --iam-account=photo-calendar-service@photo-calendar-0809.iam.gserviceaccount.com \
  --project=photo-calendar-0809
```

### IAM 정책 확인
```bash
gcloud projects get-iam-policy photo-calendar-0809
```

## Vision API 사용 예제

```typescript
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: './google-cloud-key.json',
  projectId: 'photo-calendar-0809'
});

async function extractTextFromImage(imagePath: string) {
  const [result] = await client.textDetection(imagePath);
  const detections = result.textAnnotations;
  return detections?.[0]?.description || '';
}
```

## 비용 관리

### 무료 할당량
- Vision API: 월 1,000개 유닛 무료
- Calendar API: 무제한 (사용자당 할당량 제한 있음)

### 예상 비용 (무료 할당량 초과 시)
- Vision API OCR: $1.50 / 1,000 이미지
- 월 1,000장 처리 시: 약 $1.50
- 월 10,000장 처리 시: 약 $15.00

### 비용 알림 설정
1. [Billing](https://console.cloud.google.com/billing) 페이지 이동
2. 예산 및 알림 설정
3. 권장 설정:
   - 월 예산: $10
   - 알림: 50%, 90%, 100% 도달 시

## 보안 주의사항

1. **절대 하지 말아야 할 것들**:
   - `google-cloud-key.json` 파일을 Git에 커밋하지 마세요
   - 서비스 계정 키를 클라이언트 코드에 포함하지 마세요
   - API 키를 소스 코드에 하드코딩하지 마세요

2. **권장 사항**:
   - 프로덕션에서는 Workload Identity 사용 권장
   - 서비스 계정 키는 정기적으로 교체
   - 최소 권한 원칙 적용 (필요한 권한만 부여)
   - API 사용량 모니터링 및 할당량 설정

## 문제 해결

### "Application Default Credentials not found" 오류
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./google-cloud-key.json"
```

### "Permission denied" 오류
서비스 계정에 필요한 권한이 있는지 확인:
```bash
gcloud projects get-iam-policy photo-calendar-0809 \
  --flatten="bindings[].members" \
  --filter="bindings.members:photo-calendar-service@photo-calendar-0809.iam.gserviceaccount.com"
```

### API 활성화 확인
```bash
gcloud services list --enabled --filter="name:vision.googleapis.com" --project=photo-calendar-0809
```

## 추가 리소스
- [Google Cloud Console](https://console.cloud.google.com/welcome?project=photo-calendar-0809)
- [Vision API Documentation](https://cloud.google.com/vision/docs)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)