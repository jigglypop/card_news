import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { getYesterdayDateString } from '../utils/dateUtils';
import { tryCatch } from '../utils/errorHandler';
import { CardNewsData, Slide } from '../types/news';

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
    this.businessBgPath = path.join(process.cwd(), 'public', 'images', 'backgrounds', 'front.png');
    this.techBgPath = path.join(process.cwd(), 'public', 'images', 'backgrounds', 'news_item.png');
    // 폰트 파일 경로
    this.blackHanSansPath = path.join(process.cwd(), 'public', 'fonts', 'BlackHanSans-Regular.ttf');
    this.pretendardRegularPath = path.join(
      process.cwd(),
      'public',
      'fonts',
      'Pretendard-Regular.otf'
    );
  }

  public static getInstance(): HtmlCardService {
    if (!HtmlCardService.instance) HtmlCardService.instance = new HtmlCardService();
    return HtmlCardService.instance;
  }

  public async generateCardNewsPDF(
    cardNewsContent: string,
    frequency: 'daily' | 'monthly',
    customDateStr?: string
  ): Promise<string> {
    return tryCatch(async () => {
      const cardNewsData = JSON.parse(cardNewsContent) as CardNewsData;
      const dateStr = customDateStr || getYesterdayDateString();
      const hash = crypto
        .createHash('md5')
        .update(`${frequency}${dateStr}${Date.now()}`)
        .digest('hex')
        .substring(0, 6);
      const pdfFileName = `${
        frequency === 'daily' ? 'Daily' : 'Monthly'
      }_IT_News_${dateStr}_${hash}.pdf`;
      const pdfFilePath = path.join(this.outputPath, pdfFileName);
      const htmlFiles = await this.createHtmlSlides(cardNewsData);
      await this.mergeHtmlToPdf(htmlFiles, pdfFilePath);
      const txtPath = pdfFilePath.replace('.pdf', '.txt');
      this.createTextSummary(cardNewsData, txtPath);
      return pdfFilePath;
    }, 'PDF 생성 중 오류 발생');
  }

  private async createHtmlSlides(cardNewsData: CardNewsData): Promise<string[]> {
    const htmlFiles: string[] = [];
    // 각 슬라이드마다 HTML 파일 생성
    for (let i = 0; i < cardNewsData.slides.length - 1; i++) {
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
    const businessBgRelPath = path
      .relative(this.templatesPath, this.businessBgPath)
      .replace(/\\/g, '/');
    const techBgRelPath = path.relative(this.templatesPath, this.techBgPath).replace(/\\/g, '/');
    // 폰트 파일 경로 (상대 경로로 변환)
    const blackHanSansPath = path
      .relative(this.templatesPath, this.blackHanSansPath)
      .replace(/\\/g, '/');
    const pretendardRegularPath = path
      .relative(this.templatesPath, this.pretendardRegularPath)
      .replace(/\\/g, '/');
    // 공통 CSS 스타일

    const commonStyles = `
      @font-face {
        font-family: 'BlackHanSans';
        src: url('${blackHanSansPath}') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      
      @font-face {
        font-family: 'Pretendard-Regular';
        src: url('${pretendardRegularPath}') format('opentype');
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
              bottom: 100px;
              left: 160px;
              width: 50%;
              text-align: left;
              font-family: 'Pretendard-Regular', sans-serif;
              font-size: 60px;
              color: #1D1D1D;
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="slide">
            <div class="date">
              ${new Date().getFullYear()}.${new Date().getMonth() + 1}.${new Date().getDate()}
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (slide.type === 'news') {
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
         
            .index {
              position: fixed;
              top: 0;
              left: 50px;
              font-family: 'BlackHanSans', sans-serif;
              font-size: 200px;
              color: #1a1a1a;
              text-decoration: underline;
            }

            .title {
              top: 220px;
              font-family: 'BlackHanSans', sans-serif;
              font-size: 120px;
              color: #1D1D1D;
              text-decoration: underline;
            }
            
            .tags {
              position: fixed;
              top: 45%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-family: 'BlackHanSans', sans-serif;
              font-size: 70px;
              color:rgb(40, 40, 40);
            }
            
            .body-content {
              position: fixed;
              bottom: 0;
              left: 0;
              width: 1500px;
              height: 460px;
              display: flex;
              justify-content: left;
              align-items: center;
              font-family: 'Pretendard-Regular', sans-serif;
              font-size: 50px;
              white-space: normal;
              overflow-wrap: break-word;
              color: #1D1D1D;
              line-height: 1.6;
              margin: 70px 190px;
              padding: 20px;
            }
            
            .source {
              position: fixed;
              bottom: 10%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-family: 'Pretendard-Regular', sans-serif;
              font-size: 40px;
              color: #1D1D1D;
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="slide">
            <div class="index">0${index.toString()}</div>
            <div class="content title">${slide.title}</div>
            ${slide.tags ? `<div class="content tags">#${slide.tags.join(' #')}</div>` : ''}
            ${slide.content ? `<div class="content body-content">${slide.content}</div>` : ''}
            ${slide.sourceUrl ? `<div class="content source" >출처 : ${slide.sourceUrl}</div>` : ''}
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
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
      const pdfOptions = {
        width: '1920px',
        height: '1080px',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      };
      const pdfPaths: string[] = [];
      for (let i = 0; i < htmlFiles.length - 1; i++) {
        const htmlFile = htmlFiles[i];
        const tempPdfPath = htmlFile.replace('.html', '.pdf');
        await page.goto(`file://${htmlFile}`, { waitUntil: 'networkidle0' });
        await page.pdf({ path: tempPdfPath, ...pdfOptions });
        pdfPaths.push(tempPdfPath);
      }
      await this.mergePdfFiles(pdfPaths, outputPdfPath);
      pdfPaths.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    } finally {
      await browser.close();
      htmlFiles.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    }
  }

  private async mergePdfFiles(pdfPaths: string[], outputPath: string): Promise<void> {
    const mergedPdf = await PDFDocument.create();

    for (const pdfPath of pdfPaths) {
      if (fs.existsSync(pdfPath)) {
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => {
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
      let textContent = '===== IT 카드뉴스 =====\n\n';

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
