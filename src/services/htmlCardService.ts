import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { getYesterdayDateString } from '../utils/dateUtils';
import { tryCatch } from '../utils/errorHandler';

interface Slide {
  type: 'cover' | 'news' | 'summary';
  title: string;
  content?: string;
  subtitle?: string;
  sourceUrl?: string;
  tags?: string[];
}

interface CardNewsData {
  slides: Slide[];
}

export class HtmlCardService {
  private static instance: HtmlCardService;
  private outputPath: string;
  
  // HTML 템플릿 경로
  private templatesPath: string;
  
  // 배경 이미지 경로
  private businessBgPath: string;
  private techBgPath: string;
  
  // 폰트 파일
  private blackHanSansPath: string;
  private pretendardBoldPath: string;
  private pretendardRegularPath: string;

  private constructor() {
    this.outputPath = path.join(process.cwd(), 'data', 'output');
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }
    
    // HTML 템플릿 폴더 (필요하면 생성)
    this.templatesPath = path.join(process.cwd(), 'data', 'templates');
    if (!fs.existsSync(this.templatesPath)) {
      fs.mkdirSync(this.templatesPath, { recursive: true });
    }
    
    // 배경 이미지 경로
    this.businessBgPath = path.join(process.cwd(), 'public', 'images', 'backgrounds', 'business_background.png');
    this.techBgPath = path.join(process.cwd(), 'public', 'images', 'backgrounds', 'tech_background.png');
    
    // 폰트 파일 경로
    this.blackHanSansPath = path.join(process.cwd(), 'public', 'fonts', 'BlackHanSans-Regular.ttf');
    this.pretendardBoldPath = path.join(process.cwd(), 'public', 'fonts', 'Pretendard-Bold.otf');
    this.pretendardRegularPath = path.join(process.cwd(), 'public', 'fonts', 'Pretendard-Regular.otf');
  }

  public static getInstance(): HtmlCardService {
    if (!HtmlCardService.instance) HtmlCardService.instance = new HtmlCardService();
    return HtmlCardService.instance;
  }

  public async generateCardNewsPDF(cardNewsContent: string, frequency: 'daily' | 'monthly', customDateStr?: string): Promise<string> {
    return tryCatch(async () => {
      const cardNewsData = JSON.parse(cardNewsContent) as CardNewsData;
      const dateStr = customDateStr || getYesterdayDateString();
      
      // 출력 파일명 생성
      const hash = crypto.createHash('md5').update(`${frequency}${dateStr}${Date.now()}`).digest('hex').substring(0, 6);
      const pdfFileName = `${frequency === 'daily' ? 'Daily' : 'Monthly'}_IT_News_${dateStr}_${hash}.pdf`;
      const pdfFilePath = path.join(this.outputPath, pdfFileName);
      
      // HTML 파일 생성 및 PDF 변환 처리
      const htmlFiles = await this.createHtmlSlides(cardNewsData);
      await this.mergeHtmlToPdf(htmlFiles, pdfFilePath);
      
      // 텍스트 요약 파일 생성
      const txtPath = pdfFilePath.replace('.pdf', '.txt');
      this.createTextSummary(cardNewsData, txtPath);
      
      return pdfFilePath;
    }, 'PDF 생성 중 오류 발생');
  }

  private async createHtmlSlides(cardNewsData: CardNewsData): Promise<string[]> {
    const htmlFiles: string[] = [];
    
    // 각 슬라이드마다 HTML 파일 생성
    for (let i = 0; i < cardNewsData.slides.length; i++) {
      const slide = cardNewsData.slides[i];
      const slideHtml = this.generateSlideHtml(slide, i);
      
      const tempHtmlPath = path.join(this.templatesPath, `slide_${i}.html`);
      fs.writeFileSync(tempHtmlPath, slideHtml);
      htmlFiles.push(tempHtmlPath);
    }
    
    return htmlFiles;
  }

  private generateSlideHtml(slide: Slide, index: number): string {
    // 배경 이미지 경로 (상대 경로로 변환)
    const businessBgRelPath = path.relative(this.templatesPath, this.businessBgPath).replace(/\\/g, '/');
    const techBgRelPath = path.relative(this.templatesPath, this.techBgPath).replace(/\\/g, '/');
    
    // 폰트 파일 경로 (상대 경로로 변환)
    const blackHanSansRelPath = path.relative(this.templatesPath, this.blackHanSansPath).replace(/\\/g, '/');
    const pretendardBoldRelPath = path.relative(this.templatesPath, this.pretendardBoldPath).replace(/\\/g, '/');
    const pretendardRegularRelPath = path.relative(this.templatesPath, this.pretendardRegularPath).replace(/\\/g, '/');
    
    // 공통 CSS 스타일
    const commonStyles = `
      @font-face {
        font-family: 'BlackHanSans';
        src: url('${blackHanSansRelPath}') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      
      @font-face {
        font-family: 'Pretendard-Bold';
        src: url('${pretendardBoldRelPath}') format('opentype');
        font-weight: bold;
        font-style: normal;
      }
      
      @font-face {
        font-family: 'Pretendard-Regular';
        src: url('${pretendardRegularRelPath}') format('opentype');
        font-weight: normal;
        font-style: normal;
      }
      
      body, html {
        margin: 0;
        padding: 0;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
      }
      
      .slide {
        width: 100%;
        height: 100%;
        position: relative;
        background-size: cover;
        background-position: center;
      }
      
      .content {
        position: absolute;
        width: 90%;
        left: 5%;
        text-align: center;
      }
    `;
    
    let slideHtml = '';
    
    if (slide.type === 'cover') {
      // 커버 슬라이드: 비즈니스 배경 + 날짜만 표시
      slideHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            ${commonStyles}
            
            .slide {
              background-image: url('${businessBgRelPath}');
            }
            
            .date {
              position: absolute;
              bottom: 80px;
              left: 80px;
              width: 50%;
              text-align: left;
              font-family: 'Pretendard-Bold', sans-serif;
              font-size: 36px;
              color: #1D1D1D;
            }
          </style>
        </head>
        <body>
          <div class="slide">
            <div class="date">
              ${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (slide.type === 'news') {
      // 뉴스 슬라이드: 기술 배경 + 제목(밑줄) + 내용 + 태그
      slideHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            ${commonStyles}
            
            .slide {
              background-image: url('${techBgRelPath}');
            }
            
            .title {
              top: 120px;
              font-family: 'BlackHanSans', sans-serif;
              font-size: 150px;
              color: #1D1D1D;
              text-decoration: underline;
            }
            
            .tags {
              top: 320px;
              font-family: 'BlackHanSans', sans-serif;
              font-size: 36px;
              color: #5A5A5A;
            }
            
            .body-content {
              top: 440px;
              font-family: 'Pretendard-Regular', sans-serif;
              font-size: 36px;
              color: #1D1D1D;
              line-height: 1.6;
              max-width: 80%;
              margin: 0 auto;
            }
            
            .source {
              position: absolute;
              bottom: 50px;
              width: 100%;
              text-align: center;
              font-family: 'Pretendard-Regular', sans-serif;
              font-size: 20px;
              color: #5A5A5A;
            }
          </style>
        </head>
        <body>
          <div class="slide">
            <div class="content title">${slide.title}</div>
            ${slide.tags ? `<div class="content tags">#${slide.tags.join(' #')}</div>` : ''}
            ${slide.content ? `<div class="content body-content">${slide.content}</div>` : ''}
            ${slide.sourceUrl ? `<div class="source">출처: ${slide.sourceUrl}</div>` : ''}
          </div>
        </body>
        </html>
      `;
    } else if (slide.type === 'summary') {
      // 요약 슬라이드: 기술 배경 + 제목 + 내용 + 날짜
      slideHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            ${commonStyles}
            
            .slide {
              background-image: url('${techBgRelPath}');
            }
            
            .title {
              top: 120px;
              font-family: 'BlackHanSans', sans-serif;
              font-size: 72px;
              color: #1D1D1D;
            }
            
            .body-content {
              top: 300px;
              font-family: 'Pretendard-Regular', sans-serif;
              font-size: 36px;
              color: #1D1D1D;
              line-height: 1.5;
            }
            
            .date {
              position: absolute;
              bottom: 80px;
              right: 100px;
              text-align: right;
              font-family: 'Pretendard-Bold', sans-serif;
              font-size: 24px;
              color: #1D1D1D;
            }
          </style>
        </head>
        <body>
          <div class="slide">
            <div class="content title">${slide.title}</div>
            ${slide.content ? `<div class="content body-content">${slide.content}</div>` : ''}
            <div class="date">
              ${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일
            </div>
          </div>
        </body>
        </html>
      `;
    }
    
    return slideHtml;
  }

  private async mergeHtmlToPdf(htmlFiles: string[], outputPdfPath: string): Promise<void> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // 뷰포트 크기 설정
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
      
      // PDF 옵션 설정
      const pdfOptions = {
        width: '1920px',
        height: '1080px',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      };
      
      // 각 HTML 파일마다 PDF 생성
      const pdfPaths: string[] = [];
      
      for (let i = 0; i < htmlFiles.length; i++) {
        const htmlFile = htmlFiles[i];
        const tempPdfPath = htmlFile.replace('.html', '.pdf');
        
        // HTML 파일 로드 및 PDF 생성
        await page.goto(`file://${htmlFile}`, { waitUntil: 'networkidle0' });
        await page.pdf({ path: tempPdfPath, ...pdfOptions });
        
        pdfPaths.push(tempPdfPath);
      }
      
      // PDF 병합 (pdf-lib 라이브러리 사용)
      await this.mergePdfFiles(pdfPaths, outputPdfPath);
      
      // 임시 PDF 파일 정리
      pdfPaths.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    } finally {
      await browser.close();
      
      // 임시 HTML 파일 정리
      htmlFiles.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    }
  }

  private async mergePdfFiles(pdfPaths: string[], outputPath: string): Promise<void> {
    // 새 PDF 문서 생성
    const mergedPdf = await PDFDocument.create();
    
    // 각 PDF 파일 읽어서 병합
    for (const pdfPath of pdfPaths) {
      if (fs.existsSync(pdfPath)) {
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdf = await PDFDocument.load(pdfBytes);
        
        // 모든 페이지 복사
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }
    }
    
    // 병합된 PDF 저장
    const mergedPdfBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, mergedPdfBytes);
  }

  private createTextSummary(cardNewsData: CardNewsData, outputPath: string): void {
    tryCatch(async () => {
      let textContent = "===== IT 카드뉴스 =====\n\n";
      
      for (const slide of cardNewsData.slides) {
        switch (slide.type) {
          case 'cover':
            textContent += `[표지]\n${slide.title}\n`;
            if (slide.subtitle) textContent += `${slide.subtitle}\n`;
            textContent += `${new Date().toLocaleDateString('ko-KR')}\n\n`;
            break;
          case 'news':
            textContent += `[뉴스]\n${slide.title}\n`;
            if (slide.tags && slide.tags.length > 0) textContent += `#${slide.tags.join(' #')}\n`;
            if (slide.content) textContent += `${slide.content}\n`;
            if (slide.sourceUrl) textContent += `출처: ${slide.sourceUrl}\n`;
            textContent += '\n';
            break;
          case 'summary':
            textContent += `[요약]\n${slide.title}\n`;
            if (slide.content) textContent += `${slide.content}\n`;
            textContent += '\n';
            break;
        }
      }
      
      fs.writeFileSync(outputPath, textContent, 'utf8');
    }, '텍스트 파일 생성 중 오류 발생');
  }
} 