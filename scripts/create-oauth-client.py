#!/usr/bin/env python3

import json
import subprocess
import sys

def run_command(cmd):
    """Run a shell command and return the output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.stdout.strip(), result.returncode
    except Exception as e:
        print(f"Error running command: {e}")
        return None, 1

def main():
    project_id = "photo-calendar-20250811-150939"
    
    print("🔧 Google OAuth 2.0 Client 생성 스크립트")
    print("=" * 50)
    
    # 1. 현재 프로젝트 확인
    print(f"\n1. 프로젝트 설정: {project_id}")
    run_command(f"gcloud config set project {project_id}")
    
    # 2. OAuth consent screen 확인
    print("\n2. OAuth Consent Screen 설정 확인...")
    consent_cmd = f"gcloud alpha iap oauth-brands list --project={project_id} --format=json 2>/dev/null"
    output, returncode = run_command(consent_cmd)
    
    if returncode != 0 or not output or output == "[]":
        print("   ⚠️  OAuth Consent Screen이 설정되지 않았습니다.")
        print("   📌 Google Cloud Console에서 직접 설정해주세요:")
        print(f"      https://console.cloud.google.com/apis/credentials/consent?project={project_id}")
        print("\n   설정 방법:")
        print("   1. User Type: External 선택")
        print("   2. App name: Photo Calendar")
        print("   3. User support email: 본인 이메일")
        print("   4. Developer contact: 본인 이메일")
        print("   5. Save and Continue")
        print("\n   설정 후 이 스크립트를 다시 실행하세요.")
        sys.exit(1)
    
    # 3. 기존 OAuth Client 확인
    print("\n3. 기존 OAuth 2.0 Client 확인...")
    
    # OAuth 2.0 Client 생성을 위한 JSON 템플릿
    oauth_config = {
        "web": {
            "client_id": "",
            "project_id": project_id,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "redirect_uris": [
                "https://photo-calendar.vercel.app/api/auth/callback/google",
                "https://photo-calendar-dentalkings-projects.vercel.app/api/auth/callback/google",
                "http://localhost:3000/api/auth/callback/google"
            ],
            "javascript_origins": [
                "https://photo-calendar.vercel.app",
                "https://photo-calendar-dentalkings-projects.vercel.app",
                "http://localhost:3000"
            ]
        }
    }
    
    print("\n4. OAuth 2.0 Client 생성 안내")
    print("=" * 50)
    print("\n📌 Google Cloud Console에서 OAuth 2.0 Client를 생성하세요:")
    print(f"   https://console.cloud.google.com/apis/credentials?project={project_id}")
    print("\n설정 방법:")
    print("1. '+ CREATE CREDENTIALS' → 'OAuth client ID' 클릭")
    print("2. Application type: 'Web application' 선택")
    print("3. Name: 'Photo Calendar Web Client' 입력")
    print("\n4. Authorized JavaScript origins 추가:")
    for origin in oauth_config["web"]["javascript_origins"]:
        print(f"   • {origin}")
    print("\n5. Authorized redirect URIs 추가:")
    for uri in oauth_config["web"]["redirect_uris"]:
        print(f"   • {uri}")
    print("\n6. 'CREATE' 클릭")
    print("7. Client ID와 Client Secret 복사")
    
    print("\n" + "=" * 50)
    print("📝 복사한 정보로 Vercel 환경 변수 업데이트:")
    print("\n# Client ID 업데이트")
    print("vercel env rm GOOGLE_CLIENT_ID production --yes")
    print("vercel env add GOOGLE_CLIENT_ID production")
    print("\n# Client Secret 업데이트")
    print("vercel env rm GOOGLE_CLIENT_SECRET production --yes")
    print("vercel env add GOOGLE_CLIENT_SECRET production")
    print("\n# 재배포")
    print("vercel --prod")
    
    print("\n✅ 설정 완료 후 https://photo-calendar.vercel.app/auth/signin 에서 테스트하세요.")

if __name__ == "__main__":
    main()