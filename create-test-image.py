#!/usr/bin/env python3

"""
Create test images with Korean event text for testing the Photo Calendar service
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_test_image(text, filename, size=(800, 600), bg_color='white', text_color='black'):
    """Create a test image with the given text"""
    
    # Create image
    img = Image.new('RGB', size, color=bg_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a Korean font, fall back to default if not available
    try:
        # Try common Korean font paths on macOS
        font_paths = [
            '/System/Library/Fonts/AppleSDGothicNeo.ttc',
            '/Library/Fonts/AppleGothicRegular.ttf',
            '/System/Library/Fonts/Helvetica.ttc'
        ]
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, 40)
                break
        if not font:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # Draw text
    y_position = 50
    for line in text.split('\n'):
        draw.text((50, y_position), line, fill=text_color, font=font)
        y_position += 60
    
    # Save image
    img.save(filename)
    print(f"✅ Created: {filename}")

# Test cases with Korean event information
test_cases = [
    {
        'text': """2024 연말 송년회

일시: 2024년 12월 20일 금요일
시간: 오후 7시 - 10시
장소: 강남역 5번 출구 파티홀
참가비: 3만원

드레스코드: 캐주얼
문의: 010-1234-5678""",
        'filename': 'test-images/year_end_party.png'
    },
    {
        'text': """K-POP 콘서트

2024년 11월 15일 (토)
오후 8시 시작
잠실 올림픽 주경기장

티켓 가격:
VIP석: 150,000원
R석: 120,000원
S석: 80,000원

예매: 인터파크 티켓""",
        'filename': 'test-images/concert.png'
    },
    {
        'text': """제5회 AI 컨퍼런스

주제: 생성형 AI의 미래
날짜: 2024년 10월 25일
시간: 09:00 - 18:00
장소: 코엑스 컨벤션센터 3층

등록 마감: 10월 20일
참가비: 무료 (사전등록 필수)
홈페이지: www.aiconference2024.kr""",
        'filename': 'test-images/conference.png'
    },
    {
        'text': """웨딩 초대장

김철수 ♥ 이영희

2024년 9월 28일 토요일
낮 12시 30분

더 라움 웨딩홀 2층
서울시 서초구 서초대로 123

축하화환 대신 축의금으로
마음을 전달해 주세요""",
        'filename': 'test-images/wedding_invitation.png'
    },
    {
        'text': """요가 클래스

매주 화요일, 목요일
오전 10시 - 11시

장소: 판교 테크노밸리 
      휘트니스센터 3층

수강료: 월 8만원
준비물: 요가매트, 수건

강사: 김요가 선생님
문의: 031-123-4567""",
        'filename': 'test-images/yoga_class.png'
    }
]

# Create test images
for test_case in test_cases:
    create_test_image(test_case['text'], test_case['filename'])

print("\n✨ All test images created successfully!")
print("📁 Test images saved in: ./test-images/")