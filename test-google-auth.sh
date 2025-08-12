#!/bin/bash

echo "🔍 Google OAuth 테스트 스크립트"
echo "=================================="
echo ""

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. 디버그 API 테스트
echo "1. 환경변수 확인..."
curl -s https://photo-calendar.vercel.app/api/auth/debug | jq '.' 2>/dev/null || echo "디버그 API 접근 실패"
echo ""

# 2. Health Check
echo "2. Health Check..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://photo-calendar.vercel.app/api/health)
if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ API 서버 정상 작동${NC}"
else
    echo -e "${RED}❌ API 서버 응답 오류: $HEALTH${NC}"
fi
echo ""

# 3. NextAuth 프로바이더 확인
echo "3. NextAuth 프로바이더 확인..."
curl -s https://photo-calendar.vercel.app/api/auth/providers | jq '.' 2>/dev/null || echo "프로바이더 정보 가져오기 실패"
echo ""

echo "=================================="
echo -e "${YELLOW}브라우저 테스트:${NC}"
echo ""
echo "1. 로그인 페이지 접속:"
echo "   https://photo-calendar.vercel.app/auth/signin"
echo ""
echo "2. 'Continue with Google' 클릭"
echo ""
echo "3. Test User 계정으로 로그인:"
echo "   bangjeongfam@gmail.com"
echo ""
echo "4. 오류 발생 시 다음 확인:"
echo "   - URL의 error 파라미터"
echo "   - 브라우저 콘솔 로그"
echo "   - Network 탭의 callback 요청"
echo ""
echo "=================================="