#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

def create_korean_poster():
    """Create an OCR-optimized Korean K-POP festival poster"""
    # Create canvas - Use white background for better OCR
    width, height = 800, 1200
    background_color = (255, 255, 255)  # White
    image = Image.new('RGB', (width, height), background_color)
    draw = ImageDraw.Draw(image)
    
    # Korean font setup - Try to find system fonts
    try:
        # Try common Korean font paths
        korean_font_paths = [
            "/System/Library/Fonts/AppleSDGothicNeo.ttc",  # macOS
            "/System/Library/Fonts/Helvetica.ttc",  # macOS fallback
            "/Windows/Fonts/malgun.ttf",  # Windows
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",  # Linux
        ]
        
        font_path = None
        for path in korean_font_paths:
            if os.path.exists(path):
                font_path = path
                break
        
        if font_path:
            print(f"Using font: {font_path}")
            title_font = ImageFont.truetype(font_path, 72)
            subtitle_font = ImageFont.truetype(font_path, 48)
            body_font = ImageFont.truetype(font_path, 36)
            small_font = ImageFont.truetype(font_path, 28)
        else:
            print("Using default font")
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
            body_font = ImageFont.load_default()
            small_font = ImageFont.load_default()
            
    except Exception as e:
        print(f"Font loading error: {e}")
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # Color scheme - High contrast for OCR
    title_color = (0, 0, 0)      # Black
    accent_color = (220, 20, 60)  # Crimson
    text_color = (40, 40, 40)     # Dark gray
    
    # Event text content
    event_title = "2025 K-POP 페스티벌"
    event_date = "2025년 9월 15일 (토)"
    event_time = "오후 7시 30분"
    event_location = "잠실 올림픽공원 KSPO돔"
    event_price = "VIP 150,000원 / 일반 80,000원"
    
    # Helper function to center text
    def get_centered_x(text, font):
        try:
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            return (width - text_width) // 2
        except:
            # Fallback for older PIL versions
            text_width = draw.textsize(text, font=font)[0]
            return (width - text_width) // 2
    
    # Title
    title_x = get_centered_x(event_title, title_font)
    title_y = 100
    
    draw.text(
        (title_x, title_y), 
        event_title, 
        font=title_font, 
        fill=title_color
    )
    
    # Decorative line under title
    line_y = title_y + 100
    draw.rectangle(
        [(50, line_y), (width-50, line_y+5)], 
        fill=accent_color
    )
    
    # Date
    date_y = line_y + 60
    date_x = get_centered_x(event_date, subtitle_font)
    
    draw.text(
        (date_x, date_y), 
        event_date, 
        font=subtitle_font, 
        fill=accent_color
    )
    
    # Time
    time_y = date_y + 70
    time_x = get_centered_x(event_time, body_font)
    
    draw.text(
        (time_x, time_y), 
        event_time, 
        font=body_font, 
        fill=text_color
    )
    
    # Location section with background box
    location_y = time_y + 120
    location_x = get_centered_x(event_location, body_font)
    
    # Background box for location
    box_padding = 20
    try:
        location_bbox = draw.textbbox((0, 0), event_location, font=body_font)
        location_width = location_bbox[2] - location_bbox[0]
    except:
        location_width = draw.textsize(event_location, font=body_font)[0]
    
    draw.rounded_rectangle(
        [
            (location_x - box_padding, location_y - box_padding),
            (location_x + location_width + box_padding, location_y + 50 + box_padding)
        ],
        radius=10,
        fill=(245, 245, 245),  # Light gray background
        outline=(200, 200, 200),
        width=2
    )
    
    draw.text(
        (location_x, location_y), 
        event_location, 
        font=body_font, 
        fill=text_color
    )
    
    # Price section
    price_y = location_y + 120
    price_x = get_centered_x(event_price, small_font)
    
    draw.text(
        (price_x, price_y), 
        event_price, 
        font=small_font, 
        fill=text_color
    )
    
    # Add decorative elements
    corner_size = 50
    for corner in [(50, 50), (width-50-corner_size, 50), 
                   (50, height-50-corner_size), (width-50-corner_size, height-50-corner_size)]:
        try:
            draw.arc(
                [corner, (corner[0]+corner_size, corner[1]+corner_size)],
                0, 90,
                fill=accent_color,
                width=3
            )
        except:
            # Simple rectangle for older PIL versions
            draw.rectangle([corner, (corner[0]+10, corner[1]+10)], fill=accent_color)
    
    # Bottom decorative line
    bottom_line_y = height - 100
    draw.rectangle(
        [(50, bottom_line_y), (width-50, bottom_line_y+3)], 
        fill=accent_color
    )
    
    return image

if __name__ == "__main__":
    print("Creating Korean K-POP festival poster...")
    poster = create_korean_poster()
    
    output_path = "korean_kpop_festival_poster.png"
    poster.save(output_path, "PNG", quality=95)
    
    print(f"Korean K-POP festival poster saved as '{output_path}'")
    print(f"Image size: {poster.size}")
    print("Ready for OCR testing!")