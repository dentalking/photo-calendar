#!/bin/bash

# 환경변수 검증 스크립트
# 필수 환경변수가 모두 설정되어 있는지 확인

echo "🔍 환경변수 검증 스크립트"
echo "========================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 검증 결과 카운터
TOTAL=0
PASSED=0
FAILED=0
WARNING=0

# 환경 확인
echo "📍 현재 환경: ${NODE_ENV:-development}"
echo ""

# Vercel 환경변수 확인 함수
check_vercel_env() {
    local env_name=$1
    local env_type=$2
    local description=$3
    
    TOTAL=$((TOTAL + 1))
    
    # Vercel에서 환경변수 확인
    if vercel env ls 2>/dev/null | grep -q "^$env_name"; then
        echo -e "${GREEN}✅${NC} $env_name - $description"
        PASSED=$((PASSED + 1))
    else
        if [[ "$env_type" == "required" ]]; then
            echo -e "${RED}❌${NC} $env_name - $description (필수)"
            FAILED=$((FAILED + 1))
        else
            echo -e "${YELLOW}⚠️${NC} $env_name - $description (선택)"
            WARNING=$((WARNING + 1))
        fi
    fi
}

# 로컬 환경변수 확인 함수
check_local_env() {
    local env_name=$1
    local env_type=$2
    local description=$3
    
    TOTAL=$((TOTAL + 1))
    
    # .env.local에서 환경변수 확인
    if [[ -f .env.local ]] && grep -q "^$env_name=" .env.local; then
        # 값이 비어있지 않은지 확인
        local value=$(grep "^$env_name=" .env.local | cut -d'=' -f2-)
        if [[ -n "$value" && "$value" != '""' && "$value" != "''" ]]; then
            echo -e "${GREEN}✅${NC} $env_name - $description"
            PASSED=$((PASSED + 1))
        else
            echo -e "${YELLOW}⚠️${NC} $env_name - $description (값이 비어있음)"
            WARNING=$((WARNING + 1))
        fi
    else
        if [[ "$env_type" == "required" ]]; then
            echo -e "${RED}❌${NC} $env_name - $description (필수)"
            FAILED=$((FAILED + 1))
        else
            echo -e "${YELLOW}⚠️${NC} $env_name - $description (선택)"
            WARNING=$((WARNING + 1))
        fi
    fi
}

# 환경 선택
echo "검증할 환경을 선택하세요:"
echo "1) 로컬 개발 환경 (.env.local)"
echo "2) Vercel 프로덕션 환경"
echo ""
read -p "선택 (1 또는 2): " choice

echo ""
echo "환경변수 검증 시작..."
echo "-------------------"

if [[ "$choice" == "2" ]]; then
    # Vercel 환경변수 검증
    echo "🌍 Vercel 환경변수 확인"
    echo ""
    
    # 필수 환경변수
    echo "[ 필수 환경변수 ]"
    check_vercel_env "DATABASE_URL" "required" "PostgreSQL 데이터베이스 URL"
    check_vercel_env "NEXTAUTH_URL" "required" "NextAuth 인증 URL"
    check_vercel_env "NEXTAUTH_SECRET" "required" "NextAuth 시크릿 키"
    check_vercel_env "GOOGLE_CLIENT_ID" "required" "Google OAuth 클라이언트 ID"
    check_vercel_env "GOOGLE_CLIENT_SECRET" "required" "Google OAuth 시크릿"
    check_vercel_env "GOOGLE_APPLICATION_CREDENTIALS_BASE64" "required" "Google Cloud 서비스 계정 키"
    check_vercel_env "GOOGLE_CLOUD_PROJECT" "required" "Google Cloud 프로젝트 ID"
    check_vercel_env "OPENAI_API_KEY" "required" "OpenAI API 키"
    
    echo ""
    echo "[ 설정 환경변수 ]"
    check_vercel_env "MAX_FILE_SIZE" "required" "최대 파일 크기"
    check_vercel_env "ALLOWED_FILE_TYPES" "required" "허용 파일 타입"
    check_vercel_env "FREE_MONTHLY_LIMIT" "required" "무료 플랜 월 제한"
    check_vercel_env "PRO_MONTHLY_LIMIT" "required" "프로 플랜 월 제한"
    
    echo ""
    echo "[ 선택 환경변수 ]"
    check_vercel_env "KAKAO_CLIENT_ID" "optional" "Kakao OAuth 클라이언트 ID"
    check_vercel_env "KAKAO_CLIENT_SECRET" "optional" "Kakao OAuth 시크릿"
    check_vercel_env "SENTRY_DSN" "optional" "Sentry 에러 추적"
    
else
    # 로컬 환경변수 검증
    echo "💻 로컬 환경변수 확인 (.env.local)"
    echo ""
    
    if [[ ! -f .env.local ]]; then
        echo -e "${RED}❌ .env.local 파일이 없습니다!${NC}"
        echo ""
        echo "다음 명령어로 Vercel에서 환경변수를 가져오세요:"
        echo "  vercel env pull .env.local"
        exit 1
    fi
    
    # 필수 환경변수
    echo "[ 필수 환경변수 ]"
    check_local_env "DATABASE_URL" "required" "PostgreSQL 데이터베이스 URL"
    check_local_env "NEXTAUTH_URL" "required" "NextAuth 인증 URL"
    check_local_env "NEXTAUTH_SECRET" "required" "NextAuth 시크릿 키"
    check_local_env "GOOGLE_CLIENT_ID" "required" "Google OAuth 클라이언트 ID"
    check_local_env "GOOGLE_CLIENT_SECRET" "required" "Google OAuth 시크릿"
    check_local_env "OPENAI_API_KEY" "required" "OpenAI API 키"
    
    echo ""
    echo "[ 설정 환경변수 ]"
    check_local_env "MAX_FILE_SIZE" "optional" "최대 파일 크기"
    check_local_env "ALLOWED_FILE_TYPES" "optional" "허용 파일 타입"
    check_local_env "FREE_MONTHLY_LIMIT" "optional" "무료 플랜 월 제한"
    check_local_env "PRO_MONTHLY_LIMIT" "optional" "프로 플랜 월 제한"
fi

# 결과 요약
echo ""
echo "====================="
echo "📊 검증 결과 요약"
echo "====================="
echo -e "총 검사: $TOTAL"
echo -e "${GREEN}통과: $PASSED${NC}"
echo -e "${YELLOW}경고: $WARNING${NC}"
echo -e "${RED}실패: $FAILED${NC}"

echo ""

# 결과에 따른 메시지
if [[ $FAILED -eq 0 ]]; then
    if [[ $WARNING -eq 0 ]]; then
        echo -e "${GREEN}🎉 모든 환경변수가 올바르게 설정되어 있습니다!${NC}"
    else
        echo -e "${GREEN}✅ 필수 환경변수는 모두 설정되어 있습니다.${NC}"
        echo -e "${YELLOW}⚠️  일부 선택 환경변수가 누락되었습니다.${NC}"
    fi
else
    echo -e "${RED}❌ 필수 환경변수가 누락되었습니다!${NC}"
    echo ""
    echo "해결 방법:"
    if [[ "$choice" == "2" ]]; then
        echo "1. vercel env add 명령으로 누락된 환경변수 추가"
        echo "2. Vercel 대시보드에서 직접 설정"
    else
        echo "1. vercel env pull .env.local 실행"
        echo "2. 누락된 환경변수를 .env.local에 직접 추가"
        echo "3. .env.example 파일 참고"
    fi
    exit 1
fi

# 추가 권장사항
if [[ $FAILED -eq 0 ]]; then
    echo ""
    echo "📝 권장사항:"
    echo "• 정기적으로 API 키를 로테이션하세요"
    echo "• 프로덕션 환경변수는 Vercel CLI로만 관리하세요"
    echo "• .env 파일을 절대 Git에 커밋하지 마세요"
fi