#!/usr/bin/env python3
"""
테스트용 이벤트 이미지 생성
"""
from PIL import Image, ImageDraw, ImageFont
import os
import datetime

def create_test_event_image():
    # 이미지 생성 (흰색 배경)
    width, height = 800, 600
    image = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(image)
    
    # 폰트 설정 (시스템 기본 폰트 사용)
    try:
        # macOS 기본 폰트
        title_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 48)
        body_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 32)
        small_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 24)
    except:
        # 폰트를 찾을 수 없을 경우 기본 폰트 사용
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # 색상 정의
    black = (0, 0, 0)
    blue = (0, 100, 200)
    gray = (100, 100, 100)
    
    # 이벤트 포스터 스타일로 텍스트 추가
    y_position = 50
    
    # 제목
    draw.text((width//2, y_position), "TECH CONFERENCE 2025", 
              font=title_font, fill=blue, anchor='mt')
    y_position += 80
    
    # 구분선
    draw.line([(100, y_position), (width-100, y_position)], fill=gray, width=2)
    y_position += 40
    
    # 날짜
    draw.text((width//2, y_position), "Date: December 15, 2025", 
              font=body_font, fill=black, anchor='mt')
    y_position += 50
    
    # 시간
    draw.text((width//2, y_position), "Time: 2:00 PM - 6:00 PM", 
              font=body_font, fill=black, anchor='mt')
    y_position += 50
    
    # 장소
    draw.text((width//2, y_position), "Location: COEX Convention Center", 
              font=body_font, fill=black, anchor='mt')
    y_position += 50
    
    # 주소
    draw.text((width//2, y_position), "Seoul, South Korea", 
              font=small_font, fill=gray, anchor='mt')
    y_position += 60
    
    # 구분선
    draw.line([(100, y_position), (width-100, y_position)], fill=gray, width=2)
    y_position += 40
    
    # 설명
    draw.text((width//2, y_position), "Join us for the biggest tech event of the year!", 
              font=small_font, fill=black, anchor='mt')
    y_position += 40
    
    draw.text((width//2, y_position), "• AI & Machine Learning", 
              font=small_font, fill=black, anchor='mt')
    y_position += 35
    
    draw.text((width//2, y_position), "• Cloud Computing", 
              font=small_font, fill=black, anchor='mt')
    y_position += 35
    
    draw.text((width//2, y_position), "• Web Development", 
              font=small_font, fill=black, anchor='mt')
    
    # 이미지 저장
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(output_dir, 'tech-conference-2025.png')
    image.save(output_path, 'PNG')
    print(f"Test event image created: {output_path}")
    return output_path

if __name__ == "__main__":
    create_test_event_image()