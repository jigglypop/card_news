import os
import asyncio
import base64
from playwright.async_api import async_playwright
from datetime import datetime

# =============================================================================
# CONFIGURATION CONSTANTS (튜닝 가능한 설정값들)
# =============================================================================
# 페이지 디자인 설정
PAGE_CONFIG = {
    "width": "1080px",
    "height": "1080px",
    "margin": {'top': '0px', 'right': '0px', 'bottom': '0px', 'left': '0px'}
}
# 텍스트 내용 설정
TEXT_CONFIG = {
    "main_title": "시그소개",
    "sub_title": "멘사 시그를 알려주는 Q&A",
    "thank_you_message": "읽어주셔서<br>감사합니다!",
    "html_title": "시그니처 모임 Q&A"
}

# 파일 경로 설정
PATH_CONFIG = {
    "output_dir": "output",
    "template_dir": "templates",
    "style_file": "style.css",
    "font_dir": "fonts",
    "image_dir": "output/images"
}
# 출력 파일 설정
OUTPUT_CONFIG = {
    "html_file": "output.html",
    "pdf_file": "output.pdf"
}
# 표시 설정
DISPLAY_CONFIG = {
    "max_communities_per_page": 3,
    "date_format": "%Y-%m-%d"
}
# 폰트 설정
FONT_CONFIG = {
    "pretendard_regular": "Pretendard-Regular.otf",
    "pretendard_medium": "Pretendard-Medium.otf", 
    "pretendard_bold": "Pretendard-Bold.otf",
    "blackhan": "BlackHanSans-Regular.ttf"
}

# =============================================================================
# DATA CONFIGURATION
# =============================================================================
# --- 데이터 정의 ---
CATEGORIZED_DATA = [
  {
    "category_name": "게임 & 놀이",
    "communities": [
      { "name": "올콤보", "description": "리듬게임을 좋아하는 사람들이 모여서 신나게 즐기는 시그예요!" },
      { "name": "프사이", "description": "스팀이나 에픽게임즈 같은 PC 게임을 같이 즐기고 꿀팁도 공유해요." },
      { "name": "시그니처", "description": "실내부터 야외까지, 다양한 레저 활동을 함께 즐기는 모임이에요." }
    ]
  },
  {
    "category_name": "지적 탐구",
    "communities": [
      { "name": "SIGMA", "description": "수학, 논리, 철학, 물리 같은 주제로 재미있는 문제를 함께 풀어요." },
      { "name": "GHQ", "description": "역사와 지리에 대해 깊이 있는 정보를 나누고 토론하는 모임이에요." },
      { "name": "밀덕", "description": "군사, 전략, 밀리터리 역사에 푹 빠진 분들의 정보 교류 시그입니다." }
    ]
  },
  {
    "category_name": "성장과 기회",
    "communities": [
      { "name": "스타트업", "description": "스타트업 창업자와 예비 창업자들이 모여 정보를 나누는 커뮤니티랍니다." },
      { "name": "MIC", "description": "주식, 부동산, 암호화폐처럼 돈 이야기에 관심 많은 분들의 투자 모임이에요." },
      { "name": "모개인숲", "description": "개발자 또는 개발 입문자들을 위한 세미나, 스터디, 프로젝트를 함께 해요." }
    ]
  },
  {
    "category_name": "따뜻한 일상",
    "communities": [
      { "name": "부모시그", "description": "자녀 교육 정보나 육아 고민을 함께 나누는 모임이에요." },
      { "name": "냥시그냥", "description": "고양이를 사랑하는 집사님들이 모여서 친목을 다지는 곳이에요." },
      { "name": "개판5분전", "description": "강아지를 사랑하는 분들의 정보 공유는 물론, 유기견 기부도 함께 한답니다." }
    ]
  },
  {
    "category_name": "🎤 열정과 참여",
    "communities": [
      { "name": "사회이슈토론", "description": "요즘 뜨거운 사회 이슈에 대해 진지하게 토론해보는 시그입니다." },
      { "name": "블랙팝콘", "description": "노래하는 걸 좋아하는 보컬 아티스트들이 모여 음악 활동도 하고 공모전도 나가요." },
      { "name": "멋을UP", "description": "헬스랑 운동에 진심인 사람들이 모여서 같이 득근하는 곳이에요!" }
    ]
  }
]

def create_output_directory():
    os.makedirs(PATH_CONFIG["output_dir"], exist_ok=True)

def read_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print(f"오류: 파일 '{filepath}'을(를) 찾을 수 없습니다.")
        return None

def create_html_content(categorized_data):
    """Q&A 스타일의 HTML 페이지들을 생성합니다."""
    html_pages = ""
    # 캐릭터 이미지들을 base64로 인코딩
    character1_base64 = encode_image_to_base64("image/character/1.png")
    character2_base64 = encode_image_to_base64("image/character/2.png")
    
    # Cover Page
    html_pages += f"""
    <div class="page cover">
        <div class="card-container">
            <div class="cover-content">
                <div class="text-section">
                    <p class="title-sub">{TEXT_CONFIG["sub_title"]}</p>
                    <h1 class="title-main">{TEXT_CONFIG["main_title"]}</h1>
                </div>
                <div class="character-section">
                    {f'<img src="data:image/png;base64,{character1_base64}" class="character main-character" alt="캐릭터" />' if character1_base64 else ''}
                </div>
                <div class="decorative-elements">
                    <div class="speech-bubble">
                        💬
                        <span class="bubble-text">안-녕!</span>
                    </div>
                    <div class="lightbulb">💡</div>
                    <div class="star star1">⭐</div>
                    <div class="star star2">✨</div>
                    <div class="star star3">⭐</div>
                </div>
            </div>
        </div>
    </div>
    """
    # Category (Q&A) Pages
    for category in categorized_data:
        category_name = category['category_name']
        qa_html = ""
        # 한 페이지에 최대 3개의 Q&A를 표시
        for community in category['communities'][:DISPLAY_CONFIG["max_communities_per_page"]]:
            question = community['name']
            answer = community['description']
            qa_html += f"""
            <div class="qa-item">
                <div class="question-box">
                    <span class="q-label">Q.</span>
                    <div class="question-text">{question}</div>
                </div>
                <div class="answer-box">
                    <span class="a-label">A.</span>
                    <div class="answer-text">{answer}</div>
                </div>
            </div>
            """
        
        html_pages += f"""
        <div class="page news-page">
            <div class="card-container">
                <h2 class="category-title">{category_name}</h2>
                {qa_html}
            </div>
        </div>
        """
    html_pages += f"""
    <div class="page thank-you">
         <div class="card-container">
            <p class="message">{TEXT_CONFIG["thank_you_message"]}</p>
            <p class="date">{datetime.now().strftime(DISPLAY_CONFIG['date_format'])}</p>
        </div>
    </div>
    """
    return html_pages

def encode_font_to_base64(font_path):
    """폰트 파일을 base64로 인코딩합니다."""
    try:
        with open(font_path, "rb") as font_file:
            return base64.b64encode(font_file.read()).decode('utf-8')
    except FileNotFoundError:
        print(f"폰트 파일을 찾을 수 없습니다: {font_path}")
        return None

def encode_image_to_base64(image_path):
    """이미지 파일을 base64로 인코딩합니다."""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except FileNotFoundError:
        print(f"이미지 파일을 찾을 수 없습니다: {image_path}")
        return None

def generate_embedded_font_css():
    """폰트를 base64로 임베드한 CSS를 생성합니다."""
    font_css = ""
    pretendard_regular = encode_font_to_base64(os.path.join(PATH_CONFIG["font_dir"], FONT_CONFIG["pretendard_regular"]))
    pretendard_medium = encode_font_to_base64(os.path.join(PATH_CONFIG["font_dir"], FONT_CONFIG["pretendard_medium"]))
    pretendard_bold = encode_font_to_base64(os.path.join(PATH_CONFIG["font_dir"], FONT_CONFIG["pretendard_bold"]))
    if pretendard_regular:
        font_css += f"""
@font-face {{
    font-family: 'Pretendard';
    font-weight: normal;
    src: url(data:font/otf;base64,{pretendard_regular}) format('opentype');
    font-display: swap;
}}"""
    if pretendard_medium:
        font_css += f"""
@font-face {{
    font-family: 'Pretendard';
    font-weight: 500;
    src: url(data:font/otf;base64,{pretendard_medium}) format('opentype');
    font-display: swap;
}}"""
    
    if pretendard_bold:
        font_css += f"""
@font-face {{
    font-family: 'Pretendard';
    font-weight: 700;
    src: url(data:font/otf;base64,{pretendard_bold}) format('opentype');
    font-display: swap;
}}"""
    # Black Han Sans 폰트
    blackhan = encode_font_to_base64(os.path.join(PATH_CONFIG["font_dir"], FONT_CONFIG["blackhan"]))
    if blackhan:
        font_css += f"""
@font-face {{
    font-family: 'Black Han Sans';
    font-weight: normal;
    src: url(data:font/ttf;base64,{blackhan}) format('truetype');
    font-display: swap;
}}"""
    return font_css

async def generate_pdf_and_png_from_html(html_content, css_content):
    embedded_fonts = generate_embedded_font_css()
    final_html = f"""
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{TEXT_CONFIG['html_title']}</title>
        <style>
        {embedded_fonts}
        {css_content}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    html_output_path = os.path.join(PATH_CONFIG["output_dir"], OUTPUT_CONFIG["html_file"])
    pdf_output_path = os.path.join(PATH_CONFIG["output_dir"], OUTPUT_CONFIG["pdf_file"])
    with open(html_output_path, "w", encoding="utf-8") as f:
        f.write(final_html)
    print(f"'{html_output_path}' 파일 생성 완료")
    html_path_url = f'file://{os.path.abspath(html_output_path)}'
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_viewport_size({"width": 1080, "height": 1080})
        await page.goto(html_path_url, wait_until='networkidle')
        await page.wait_for_timeout(2000)
        await page.pdf(
            path=pdf_output_path, 
            width=PAGE_CONFIG["width"], 
            height=PAGE_CONFIG["height"], 
            print_background=True,
            margin=PAGE_CONFIG["margin"]
        )
        print(f"'{pdf_output_path}' 파일 생성 완료")
        # 각 페이지를 PNG로 저장
        pages = await page.query_selector_all('.page')
        print(f"총 {len(pages)} 페이지 PNG 생성 중...")
        for i, page_element in enumerate(pages, 1):
            png_filename = f"page_{i:02d}.png"
            png_output_path = os.path.join(PATH_CONFIG["image_dir"], png_filename)
            await page_element.screenshot(
                path=png_output_path,
                type='png',
                omit_background=False
            )
            print(f"'{png_filename}' 생성 완료")
        await browser.close()

async def main():
    print("=== 카드뉴스 생성 시작 ===")
    create_output_directory()
    style_content = read_file(os.path.join(PATH_CONFIG["template_dir"], PATH_CONFIG["style_file"]))
    if style_content is None:
        return
    html_body_content = create_html_content(CATEGORIZED_DATA)
    await generate_pdf_and_png_from_html(html_body_content, style_content)
    print("=== 카드뉴스 생성 완료 ===")

if __name__ == "__main__":
    asyncio.run(main()) 