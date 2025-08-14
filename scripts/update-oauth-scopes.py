#!/usr/bin/env python3

"""
Script to check and update OAuth 2.0 configuration for Google Calendar API
"""

import json
import subprocess
import sys

def get_access_token():
    """Get access token from gcloud"""
    result = subprocess.run(
        ['gcloud', 'auth', 'application-default', 'print-access-token'],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

def main():
    print("🔍 Google Cloud OAuth Configuration Manager\n")
    
    project_id = "photo-calendar-20250811-150939"
    client_id = "321098167940-88ce9sk71u7qu34erp0u3mrq41oo653b.apps.googleusercontent.com"
    
    print(f"📋 Project: {project_id}")
    print(f"🔑 Client ID: {client_id}\n")
    
    # Define required scopes
    required_scopes = [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events"
    ]
    
    print("✅ Required OAuth Scopes:")
    for scope in required_scopes:
        print(f"   • {scope}")
    
    print("\n📝 Manual Configuration Required:")
    print("━" * 80)
    print("\n1. Open Google Cloud Console OAuth Client Configuration:")
    print(f"   https://console.cloud.google.com/apis/credentials/oauthclient/{client_id}?project={project_id}")
    
    print("\n2. Verify Authorized Redirect URIs include:")
    print("   • https://photo-calendar.vercel.app/api/auth/callback/google")
    print("   • http://localhost:3000/api/auth/callback/google")
    
    print("\n3. Open OAuth Consent Screen Configuration:")
    print(f"   https://console.cloud.google.com/apis/credentials/consent?project={project_id}")
    
    print("\n4. Click 'EDIT APP' and go to 'Scopes' section")
    
    print("\n5. Click 'ADD OR REMOVE SCOPES' and ensure these are selected:")
    print("   • .../auth/userinfo.email (View your email address)")
    print("   • .../auth/userinfo.profile (See your personal info)")
    print("   • .../auth/calendar (See, edit, share, and permanently delete all the calendars)")
    print("   • .../auth/calendar.events (View and edit events on all your calendars)")
    
    print("\n6. Save and publish the changes")
    
    print("\n7. Remove existing user connections (if any):")
    print("   • Go to: https://myaccount.google.com/connections")
    print("   • Find 'Photo Calendar' and remove access")
    print("   • This forces the consent screen to appear again with new permissions")
    
    print("\n━" * 40)
    print("\n🧪 Test OAuth Flow:")
    
    # Generate test URL
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": client_id,
        "redirect_uri": "https://photo-calendar.vercel.app/api/auth/callback/google",
        "response_type": "code",
        "scope": " ".join(required_scopes),
        "access_type": "offline",
        "prompt": "consent"
    }
    
    from urllib.parse import urlencode
    test_url = f"{auth_url}?{urlencode(params)}"
    
    print(f"\nTest URL (open in incognito/private window):")
    print("━" * 80)
    print(test_url)
    print("━" * 80)
    
    print("\n✨ After updating, the consent screen should show:")
    print("   1. Basic profile information")
    print("   2. Email address")  
    print("   3. Calendar permissions:")
    print("      • 'See, edit, share, and permanently delete all the calendars you can access using Google Calendar'")
    print("      • 'View and edit events on all your calendars'")
    
    print("\n🚀 Once confirmed, restart your application and test the sync feature!")

if __name__ == "__main__":
    main()