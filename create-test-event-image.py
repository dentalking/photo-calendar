#!/usr/bin/env python3
"""
Test Event Image Generator
Creates test images with calendar event information in Korean
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_test_event_image(filename="test-event.png"):
    """Create a test image with event information"""
    
    # Create a white background image
    width = 800
    height = 600
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)
    
    # Try to use a system font, fallback to default if not available
    try:
        # Try different font paths for different systems
        font_paths = [
            '/System/Library/Fonts/AppleSDGothicNeo.ttc',  # macOS Korean font
            '/System/Library/Fonts/Helvetica.ttc',  # macOS fallback
            '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',  # Ubuntu Korean
            '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',  # Ubuntu fallback
            'C:\\Windows\\Fonts\\malgun.ttf',  # Windows Korean
            'C:\\Windows\\Fonts\\Arial.ttf',  # Windows fallback
        ]
        
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, 32)
                break
        
        if not font:
            font = ImageFont.load_default()
            
        title_font = font
        body_font = ImageFont.truetype(font.path, 24) if hasattr(font, 'path') else font
        
    except:
        # Use default font if no suitable font is found
        font = ImageFont.load_default()
        title_font = font
        body_font = font
    
    # Draw a border
    draw.rectangle([20, 20, width-20, height-20], outline='black', width=2)
    
    # Add title
    title = "2025 개발자 컨퍼런스"
    draw.text((50, 50), title, fill='black', font=title_font)
    
    # Add event details
    details = [
        "",
        "📅 날짜: 2025년 2월 15일 (토요일)",
        "⏰ 시간: 오후 2:00 - 6:00",
        "📍 장소: 코엑스 컨퍼런스홀 3층",
        "",
        "주요 내용:",
        "• Next.js 15의 새로운 기능",
        "• AI와 웹 개발의 미래",
        "• 실시간 협업 도구 구축",
        "",
        "참가비: 무료 (사전 등록 필수)",
        "문의: dev@conference.kr"
    ]
    
    y_position = 120
    for line in details:
        draw.text((50, y_position), line, fill='black', font=body_font)
        y_position += 35
    
    # Save the image
    image.save(filename)
    print(f"Test event image created: {filename}")
    
    return filename

def create_concert_poster(filename="test-concert.png"):
    """Create a concert poster test image"""
    
    # Create a gradient background
    width = 800
    height = 1000
    image = Image.new('RGB', (width, height), '#1a1a2e')
    draw = ImageDraw.Draw(image)
    
    # Try to use a system font
    try:
        font_paths = [
            '/System/Library/Fonts/AppleSDGothicNeo.ttc',
            '/System/Library/Fonts/Helvetica.ttc',
            '/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf',
            'C:\\Windows\\Fonts\\malgunbd.ttf',
        ]
        
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, 48)
                break
        
        if not font:
            font = ImageFont.load_default()
            
        title_font = font
        subtitle_font = ImageFont.truetype(font.path, 36) if hasattr(font, 'path') else font
        body_font = ImageFont.truetype(font.path, 28) if hasattr(font, 'path') else font
        
    except:
        font = ImageFont.load_default()
        title_font = font
        subtitle_font = font
        body_font = font
    
    # Draw decorative elements
    draw.rectangle([30, 30, width-30, height-30], outline='#f39c12', width=3)
    
    # Add concert title
    draw.text((width//2 - 150, 80), "SPRING", fill='#f39c12', font=title_font)
    draw.text((width//2 - 180, 140), "MUSIC FESTIVAL", fill='#f39c12', font=subtitle_font)
    draw.text((width//2 - 100, 200), "2025", fill='white', font=subtitle_font)
    
    # Add event details
    concert_info = [
        "",
        "2025년 3월 22일 토요일",
        "오후 6:00 - 11:00",
        "",
        "서울 올림픽공원",
        "올림픽홀",
        "",
        "출연 아티스트:",
        "• 아이유",
        "• BTS",
        "• NewJeans",
        "• 악뮤",
        "",
        "티켓 오픈:",
        "2025년 2월 1일 오후 2시",
        "",
        "가격: 99,000원 ~ 150,000원",
        "",
        "예매: www.springfest.kr"
    ]
    
    y_position = 300
    for line in concert_info:
        x_position = 50 if line.startswith('•') else width//2 - 150
        color = '#f39c12' if '티켓' in line or '가격' in line else 'white'
        draw.text((x_position, y_position), line, fill=color, font=body_font)
        y_position += 40
    
    # Save the image
    image.save(filename)
    print(f"Concert poster created: {filename}")
    
    return filename

def create_meeting_notice(filename="test-meeting.png"):
    """Create a meeting notice test image"""
    
    # Create a clean white background
    width = 600
    height = 400
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)
    
    # Try to use a system font
    try:
        font_paths = [
            '/System/Library/Fonts/AppleSDGothicNeo.ttc',
            '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
            'C:\\Windows\\Fonts\\malgun.ttf',
        ]
        
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, 24)
                break
        
        if not font:
            font = ImageFont.load_default()
            
        title_font = ImageFont.truetype(font.path, 28) if hasattr(font, 'path') else font
        body_font = font
        
    except:
        font = ImageFont.load_default()
        title_font = font
        body_font = font
    
    # Add header with blue background
    draw.rectangle([0, 0, width, 80], fill='#2c3e50')
    draw.text((width//2 - 80, 25), "회의 안내", fill='white', font=title_font)
    
    # Add meeting details
    meeting_info = [
        "프로젝트 킥오프 미팅",
        "",
        "일시: 2025년 1월 20일 월요일 오전 10:00",
        "장소: 본사 회의실 A (5층)",
        "참석자: 개발팀 전원",
        "",
        "안건:",
        "1. 프로젝트 목표 및 일정 공유",
        "2. 역할 분담",
        "3. 기술 스택 결정",
        "",
        "준비사항: 개인 노트북 지참"
    ]
    
    y_position = 100
    for line in meeting_info:
        color = '#2c3e50' if line and not line[0].isdigit() and '안건' not in line else '#555555'
        draw.text((30, y_position), line, fill=color, font=body_font)
        y_position += 25
    
    # Save the image
    image.save(filename)
    print(f"Meeting notice created: {filename}")
    
    return filename

if __name__ == "__main__":
    # Create test images directory if it doesn't exist
    os.makedirs("test-images", exist_ok=True)
    
    # Generate test images
    create_test_event_image("test-images/conference.png")
    create_concert_poster("test-images/concert.png")
    create_meeting_notice("test-images/meeting.png")
    
    print("\nAll test images created successfully!")
    print("You can now upload these images to test the calendar event extraction.")