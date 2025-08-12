#!/bin/bash

echo "🔧 Google OAuth 설정 확인 및 수정 스크립트"
echo "==========================================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}중요: 이 스크립트를 실행하기 전에 Google Cloud Console에서 다음을 확인하세요:${NC}"
echo ""
echo "1. https://console.cloud.google.com 접속"
echo "2. 프로젝트: geulpi-prod 선택"
echo "3. APIs & Services > Credentials"
echo "4. OAuth 2.0 Client ID 확인/생성"
echo ""
echo -e "${GREEN}필수 설정:${NC}"
echo "Authorized JavaScript origins:"
echo "  ✅ https://photo-calendar.vercel.app"
echo "  ✅ https://photo-calendar-dentalkings-projects.vercel.app"
echo "  ✅ http://localhost:3000"
echo ""
echo "Authorized redirect URIs:"
echo "  ✅ https://photo-calendar.vercel.app/api/auth/callback/google"
echo "  ✅ https://photo-calendar-dentalkings-projects.vercel.app/api/auth/callback/google"
echo "  ✅ http://localhost:3000/api/auth/callback/google"
echo ""

read -p "Google Cloud Console 설정을 완료했습니까? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Google Cloud Console에서 설정을 완료한 후 다시 실행해주세요."
    exit 1
fi

echo ""
echo "새로운 OAuth Client 정보를 입력해주세요:"
echo ""

# Client ID 입력
read -p "Google OAuth Client ID: " CLIENT_ID
if [ -z "$CLIENT_ID" ]; then
    echo -e "${RED}Client ID가 입력되지 않았습니다.${NC}"
    exit 1
fi

# Client Secret 입력
read -s -p "Google OAuth Client Secret: " CLIENT_SECRET
echo ""
if [ -z "$CLIENT_SECRET" ]; then
    echo -e "${RED}Client Secret이 입력되지 않았습니다.${NC}"
    exit 1
fi

echo ""
echo "Vercel 환경변수 업데이트 중..."

# 기존 환경변수 삭제
vercel env rm GOOGLE_CLIENT_ID production 2>/dev/null
vercel env rm GOOGLE_CLIENT_SECRET production 2>/dev/null

# 새 환경변수 추가
echo "$CLIENT_ID" | vercel env add GOOGLE_CLIENT_ID production
echo "$CLIENT_SECRET" | vercel env add GOOGLE_CLIENT_SECRET production

echo ""
echo -e "${GREEN}✅ 환경변수가 업데이트되었습니다.${NC}"
echo ""

# 배포 옵션
read -p "지금 재배포하시겠습니까? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "재배포 중..."
    vercel --prod
    echo ""
    echo -e "${GREEN}✅ 배포가 완료되었습니다!${NC}"
    echo ""
    echo "테스트 URL: https://photo-calendar.vercel.app/auth/signin"
else
    echo "나중에 다음 명령어로 배포하세요: vercel --prod"
fi

echo ""
echo "========================================="
echo -e "${GREEN}설정 완료!${NC}"
echo ""
echo "문제가 지속되는 경우:"
echo "1. OAuth 동의 화면이 'Production' 상태인지 확인"
echo "2. 필요한 Scopes가 추가되었는지 확인"
echo "   - email"
echo "   - profile"
echo "   - https://www.googleapis.com/auth/calendar"
echo "   - https://www.googleapis.com/auth/calendar.events"