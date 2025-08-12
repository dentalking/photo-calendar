#!/bin/bash

# OpenAI API Key 업데이트 스크립트
# 보안 이슈로 인한 긴급 키 교체용

echo "🔐 OpenAI API Key 업데이트 스크립트"
echo "====================================="
echo ""
echo "⚠️  중요: 이 스크립트를 실행하기 전에 다음을 수행하세요:"
echo "1. https://platform.openai.com/api-keys 에서 기존 키 삭제"
echo "2. 새로운 API 키 생성"
echo ""
echo "준비되셨나요? (y/n)"
read -r response

if [[ "$response" != "y" ]]; then
    echo "작업을 취소합니다."
    exit 0
fi

echo ""
echo "새로운 OpenAI API 키를 입력하세요:"
read -s OPENAI_KEY

if [[ -z "$OPENAI_KEY" ]]; then
    echo "❌ API 키가 입력되지 않았습니다."
    exit 1
fi

echo ""
echo "🔄 Vercel 환경변수 업데이트 중..."

# Production 환경 업데이트
echo "Production 환경 설정..."
vercel env rm OPENAI_API_KEY production --yes 2>/dev/null
echo "$OPENAI_KEY" | vercel env add OPENAI_API_KEY production

# Development 환경 업데이트
echo "Development 환경 설정..."
vercel env rm OPENAI_API_KEY development --yes 2>/dev/null
echo "$OPENAI_KEY" | vercel env add OPENAI_API_KEY development

# Preview 환경 업데이트
echo "Preview 환경 설정..."
vercel env rm OPENAI_API_KEY preview --yes 2>/dev/null
echo "$OPENAI_KEY" | vercel env add OPENAI_API_KEY preview

echo ""
echo "✅ Vercel 환경변수 업데이트 완료!"

# 로컬 .env.local 파일 업데이트
echo ""
echo "로컬 개발 환경도 업데이트하시겠습니까? (y/n)"
read -r local_response

if [[ "$local_response" == "y" ]]; then
    # .env.local 백업
    if [[ -f .env.local ]]; then
        cp .env.local .env.local.backup
        echo "📋 기존 .env.local 파일을 .env.local.backup으로 백업했습니다."
    fi
    
    # OPENAI_API_KEY 업데이트 또는 추가
    if grep -q "^OPENAI_API_KEY=" .env.local 2>/dev/null; then
        # macOS와 Linux 모두 호환되는 sed 명령
        sed -i.tmp "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=\"$OPENAI_KEY\"|" .env.local
        rm -f .env.local.tmp
    else
        echo "OPENAI_API_KEY=\"$OPENAI_KEY\"" >> .env.local
    fi
    
    echo "✅ 로컬 .env.local 파일 업데이트 완료!"
fi

echo ""
echo "🎉 모든 작업이 완료되었습니다!"
echo ""
echo "다음 단계:"
echo "1. 새 배포 트리거: vercel --prod"
echo "2. 배포 상태 확인: vercel ls"
echo "3. 로컬 개발 서버 재시작: npm run dev"
echo ""
echo "⚠️  보안 권장사항:"
echo "- API 키를 절대 코드에 하드코딩하지 마세요"
echo "- .env 파일들을 git에 커밋하지 마세요"
echo "- 정기적으로 API 키를 교체하세요"