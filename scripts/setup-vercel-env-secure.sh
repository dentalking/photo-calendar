#!/bin/bash

echo "🚀 Vercel 환경 변수 안전 설정 시작..."
echo "⚠️  보안 경고: 이 스크립트는 민감한 정보를 안전하게 입력받습니다."
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 함수: 안전한 입력 받기
secure_input() {
    local var_name=$1
    local prompt=$2
    local is_secret=$3
    
    echo -e "${YELLOW}$prompt${NC}"
    if [ "$is_secret" = "true" ]; then
        read -s value
        echo "(입력 완료)"
    else
        read value
    fi
    
    if [ -z "$value" ]; then
        echo -e "${RED}❌ 값을 입력하지 않았습니다. 건너뜁니다.${NC}"
        return 1
    fi
    
    echo "$value" | vercel env add "$var_name" production --force
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $var_name 설정 완료${NC}"
    else
        echo -e "${RED}❌ $var_name 설정 실패${NC}"
    fi
    echo ""
}

echo "========================================="
echo "1. NextAuth 설정"
echo "========================================="
secure_input "NEXTAUTH_URL" "Production URL (예: https://photo-calendar.vercel.app):" false
secure_input "NEXTAUTH_SECRET" "NextAuth Secret (32자 이상의 랜덤 문자열):" true

echo "========================================="
echo "2. Database 설정 (Supabase)"
echo "========================================="
secure_input "DATABASE_URL" "Supabase Pooling Connection String:" true
secure_input "DIRECT_URL" "Supabase Direct Connection String:" true

echo "========================================="
echo "3. Google OAuth 설정"
echo "========================================="
secure_input "GOOGLE_CLIENT_ID" "Google OAuth Client ID:" false
secure_input "GOOGLE_CLIENT_SECRET" "Google OAuth Client Secret:" true

echo "========================================="
echo "4. Google Cloud 설정"
echo "========================================="
echo "GOOGLE_CLOUD_PROJECT를 geulpi-prod로 설정합니다..."
echo "geulpi-prod" | vercel env add GOOGLE_CLOUD_PROJECT production --force
echo -e "${GREEN}✅ GOOGLE_CLOUD_PROJECT 설정 완료${NC}"
echo ""

echo "Google Cloud 서비스 계정 키 파일 설정..."
if [ -f "google-cloud-key.json" ]; then
    echo "google-cloud-key.json 파일을 Base64로 인코딩 중..."
    GOOGLE_KEY_BASE64=$(base64 -i google-cloud-key.json | tr -d '\n')
    echo "$GOOGLE_KEY_BASE64" | vercel env add GOOGLE_APPLICATION_CREDENTIALS_BASE64 production --force
    echo -e "${GREEN}✅ Google Cloud 키 설정 완료${NC}"
else
    echo -e "${YELLOW}⚠️  google-cloud-key.json 파일을 찾을 수 없습니다.${NC}"
    echo "Google Cloud Console에서 서비스 계정 키를 다운로드하세요:"
    echo "https://console.cloud.google.com/iam-admin/serviceaccounts?project=geulpi-prod"
fi
echo ""

echo "========================================="
echo "5. OpenAI API 설정"
echo "========================================="
secure_input "OPENAI_API_KEY" "OpenAI API Key (sk-로 시작):" true

echo "========================================="
echo "6. Application 설정"
echo "========================================="
echo "기본 애플리케이션 설정을 적용합니다..."
echo "5242880" | vercel env add MAX_FILE_SIZE production --force
echo "image/jpeg,image/png,image/gif,image/webp" | vercel env add ALLOWED_FILE_TYPES production --force
echo "30" | vercel env add FREE_MONTHLY_LIMIT production --force
echo "1000" | vercel env add PRO_MONTHLY_LIMIT production --force
echo -e "${GREEN}✅ 애플리케이션 설정 완료${NC}"
echo ""

echo "========================================="
echo "설정 완료!"
echo "========================================="
echo ""
echo "📋 설정된 환경 변수 목록:"
vercel env ls production

echo ""
echo -e "${YELLOW}🔍 다음 단계:${NC}"
echo "1. Google Cloud Console에서 OAuth 리다이렉트 URI 추가:"
echo "   - https://photo-calendar.vercel.app/api/auth/callback/google"
echo "   - https://geulpi-calendar.vercel.app/api/auth/callback/google (도메인 변경 시)"
echo ""
echo "2. Google Cloud Console에서 필요한 API 활성화 확인:"
echo "   - Vision API"
echo "   - Calendar API"
echo "   프로젝트: https://console.cloud.google.com/apis/dashboard?project=geulpi-prod"
echo ""
echo "3. Supabase 프로젝트 설정:"
echo "   - RLS (Row Level Security) 정책 구성"
echo "   - Connection Pooling 활성화"
echo ""
echo "4. 배포 실행:"
echo "   vercel --prod"
echo ""
echo -e "${GREEN}✨ 환경 변수 설정이 완료되었습니다!${NC}"