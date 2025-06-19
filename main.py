import os
import asyncio
import base64
from playwright.async_api import async_playwright
from datetime import datetime

# =============================================================================
# 📋 CONFIGURATION CONSTANTS (튜닝 가능한 설정값들)
# =============================================================================

# 🎨 페이지 디자인 설정
PAGE_CONFIG = {
    "width": "1080px",
    "height": "1080px",
    "margin": {'top': '0px', 'right': '0px', 'bottom': '0px', 'left': '0px'}
}

# 📝 텍스트 내용 설정
TEXT_CONFIG = {
    "main_title": "Q&A",
    "sub_title": "당신을 위한 시그니처 모임",
    "thank_you_message": "읽어주셔서<br>감사합니다!",
    "html_title": "시그니처 모임 Q&A"
}

# 📁 파일 경로 설정
PATH_CONFIG = {
    "output_dir": "output",
    "template_dir": "templates",
    "style_file": "style.css",
    "font_dir": "fonts"
}

# 📄 출력 파일 설정
OUTPUT_CONFIG = {
    "html_file": "output.html",
    "pdf_file": "output.pdf"
}

# 🎯 표시 설정
DISPLAY_CONFIG = {
    "max_communities_per_page": 3,
    "date_format": "%Y-%m-%d"
}

# 🔤 폰트 설정
FONT_CONFIG = {
    "pretendard_regular": "Pretendard-Regular.otf",
    "pretendard_medium": "Pretendard-Medium.otf", 
    "pretendard_bold": "Pretendard-Bold.otf",
    "blackhan": "BlackHanSans-Regular.ttf"
}

# =============================================================================
# 📊 DATA CONFIGURATION
# =============================================================================

# --- 데이터 정의 ---
CATEGORIZED_DATA = [
  {
    "category_name": "🎮 게임 & 놀이",
    "communities": [
      { "name": "올콤보", "description": "리듬게임을 좋아하는 사람들이 모여서 신나게 즐기는 시그예요!" },
      { "name": "프사이", "description": "스팀이나 에픽게임즈 같은 PC 게임을 같이 즐기고 꿀팁도 공유해요." },
      { "name": "시그니처", "description": "실내부터 야외까지, 다양한 레저 활동을 함께 즐기는 모임이에요." }
    ]
  },
  {
    "category_name": "🧠 지적 탐구",
    "communities": [
      { "name": "SIGMA", "description": "수학, 논리, 철학, 물리 같은 주제로 재미있는 문제를 함께 풀어요." },
      { "name": "GHQ", "description": "역사와 지리에 대해 깊이 있는 정보를 나누고 토론하는 모임이에요." },
      { "name": "밀덕", "description": "군사, 전략, 밀리터리 역사에 푹 빠진 분들의 정보 교류 시그입니다." }
    ]
  },
  {
    "category_name": "💻 성장과 기회",
    "communities": [
      { "name": "스타트업", "description": "스타트업 창업자와 예비 창업자들이 모여 정보를 나누는 커뮤니티랍니다." },
      { "name": "MIC", "description": "주식, 부동산, 암호화폐처럼 돈 이야기에 관심 많은 분들의 투자 모임이에요." },
      { "name": "모개인숲", "description": "개발자 또는 개발 입문자들을 위한 세미나, 스터디, 프로젝트를 함께 해요." }
    ]
  },
  {
    "category_name": "💖 따뜻한 일상",
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
    output_dir = PATH_CONFIG["output_dir"]
    
    # 출력 디렉토리가 존재하면 내용 삭제
    if os.path.exists(output_dir):
        import shutil
        shutil.rmtree(output_dir)
    
    # 새로 생성
    os.makedirs(output_dir, exist_ok=True)
    print(f"출력 디렉토리 '{output_dir}' 초기화 완료")

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

    # Cover Page
    html_pages += f"""
    <div class="page cover">
        <div class="card-container">
            <p class="title-sub">{TEXT_CONFIG["sub_title"]}</p>
            <h1 class="title-main">{TEXT_CONFIG["main_title"]}</h1>
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

    # Thank You Page
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

def generate_embedded_font_css():
    """폰트를 base64로 임베드한 CSS를 생성합니다."""
    font_css = ""
    
    # Pretendard 폰트들
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

async def generate_pdf_from_html(html_content, css_content):
    embedded_fonts = generate_embedded_font_css()
    
    # 캐시 방지를 위한 타임스탬프 추가
    import time
    timestamp = int(time.time() * 1000)
    
    final_html = f"""
    <html>
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
        <meta http-equiv="Pragma" content="no-cache">
        <meta http-equiv="Expires" content="0">
        <title>{TEXT_CONFIG['html_title']}</title>
        <style>
        /* Cache buster: {timestamp} */
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
    
    # 기존 파일들 삭제
    try:
        if os.path.exists(html_output_path):
            os.remove(html_output_path)
        if os.path.exists(pdf_output_path):
            os.remove(pdf_output_path)
    except:
        pass
    
    with open(html_output_path, "w", encoding="utf-8") as f:
        f.write(final_html)
    print(f"'{html_output_path}' 파일 생성 완료")

    html_path_url = f'file://{os.path.abspath(html_output_path)}?v={timestamp}'
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=[
            '--no-sandbox', 
            '--disable-web-security',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-features=VizDisplayCompositor'
        ])
        context = await browser.new_context(
            viewport={'width': 1080, 'height': 1080},
            device_scale_factor=1
        )
        page = await context.new_page()
        
        # 캐시 비활성화
        await page.set_extra_http_headers({"Cache-Control": "no-cache"})
        
        await page.goto(html_path_url, wait_until='networkidle')
        await page.wait_for_timeout(3000)  # 폰트 로딩 대기 시간 증가
        
        await page.pdf(
            path=pdf_output_path, 
            width=PAGE_CONFIG["width"], 
            height=PAGE_CONFIG["height"], 
            print_background=True,
            margin=PAGE_CONFIG["margin"],
            prefer_css_page_size=True,
            outline=False
        )
        await browser.close()

    print(f"'{pdf_output_path}' 파일 생성 완료")

def clear_system_caches():
    """시스템 캐시 클리어 시도"""
    import subprocess
    import platform
    
    try:
        if platform.system() == "Windows":
            # Windows DNS 캐시 클리어
            subprocess.run(["ipconfig", "/flushdns"], 
                         capture_output=True, 
                         creationflags=subprocess.CREATE_NO_WINDOW)
            print("Windows DNS 캐시 클리어 완료")
    except:
        pass

async def main():
    print("=== 카드뉴스 생성 시작 ===")
    
    # 캐시 클리어
    clear_system_caches()
    
    # 출력 디렉토리 초기화
    create_output_directory()

    style_content = read_file(os.path.join(PATH_CONFIG["template_dir"], PATH_CONFIG["style_file"]))
    if style_content is None:
        return
        
    html_body_content = create_html_content(CATEGORIZED_DATA)
    
    await generate_pdf_from_html(html_body_content, style_content)
    
    print("=== 카드뉴스 생성 완료 ===")

if __name__ == "__main__":
    asyncio.run(main()) 