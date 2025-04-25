import pptxgen from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { PPT_CONSTANTS } from '../config/constants';
import { tryCatch } from '../utils/errorHandler';
import { generateHash } from '../utils/fileUtils';
import { getYesterdayDateString } from '../utils/dateUtils';
import crypto from 'crypto';

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

export class PPTService {
  private static instance: PPTService;
  private outputPath: string;

  private constructor() {
    this.outputPath = path.join(process.cwd(), 'data', 'output');
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }
  }

  public static getInstance(): PPTService {
    if (!PPTService.instance) PPTService.instance = new PPTService();
    return PPTService.instance;
  }

  public async generateCardNewsPPT(cardNewsContent: string, frequency: 'daily' | 'monthly', customDateStr?: string): Promise<string> {
    return tryCatch(async () => {
      const cardNewsData = JSON.parse(cardNewsContent) as CardNewsData;
      const pptx = new pptxgen();

      pptx.defineLayout({
        name: 'CARD_NEWS',
        width: PPT_CONSTANTS.SLIDE_WIDTH,
        height: PPT_CONSTANTS.SLIDE_HEIGHT
      });
      pptx.layout = 'CARD_NEWS';

      (pptx.theme as any) = {
        headFontFace: PPT_CONSTANTS.FONT_FAMILY,
        bodyFontFace: PPT_CONSTANTS.FONT_FAMILY,
        colorScheme: {
          accent1: '4472C4',
          accent2: 'ED7D31',
          accent3: 'A5A5A5',
          accent4: 'FFC000',
          accent5: '5B9BD5',
          accent6: '70AD47'
        }
      };
      
      pptx.defineSlideMaster({
        title: 'TECH_SLIDE',
        background: { 
          path: 'public/images/backgrounds/tech_background.png' 
        }
      });
      
      pptx.defineSlideMaster({
        title: 'BUSINESS_SLIDE',
        background: { 
          path: 'public/images/backgrounds/business_background.png' 
        }
      });
      
      pptx.defineSlideMaster({
        title: 'TREND_SLIDE',
        background: { 
          path: 'public/images/backgrounds/trend_background.png' 
        }
      });
      
      pptx.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: { color: PPT_CONSTANTS.COLOR_BACKGROUND }
      });
      
      for (const slide of cardNewsData.slides) {
        let masterName = 'MASTER_SLIDE';  // 기본 마스터
        
        // 태그에 따라 마스터 선택
        if (slide.tags) {
          if (slide.tags.some(tag => ['기술', '테크', 'IT', '소프트웨어'].includes(tag))) {
            masterName = 'TECH_SLIDE';
          } else if (slide.tags.some(tag => ['비즈니스', '경제', '투자'].includes(tag))) {
            masterName = 'BUSINESS_SLIDE';
          } else if (slide.tags.some(tag => ['트렌드', '소식', '최신'].includes(tag))) {
            masterName = 'TREND_SLIDE';
          }
        }
        
        const pptSlide = pptx.addSlide({ masterName });
        switch (slide.type) {
          case 'cover': this.createCoverSlide(pptSlide, slide); break;
          case 'news': this.createNewsSlide(pptSlide, slide); break;
          case 'summary': this.createSummarySlide(pptSlide, slide); break;
        }
      }

      const dateStr = customDateStr || getYesterdayDateString();
      const hash = crypto.createHash('md5').update(`${frequency}${dateStr}${Date.now()}`).digest('hex').substring(0, 6);
      const fileName = `${frequency === 'daily' ? 'Daily' : 'Monthly'}_IT_News_${dateStr}_${hash}.pptx`;

      const outputFilePath = path.join(this.outputPath, fileName);
      await pptx.writeFile({ fileName: outputFilePath });
      
      const txtPath = outputFilePath.replace('.pptx', '.txt');
      this.createTextSummary(cardNewsData, txtPath);
      
      return outputFilePath;
    }, 'PPT 생성 중 오류 발생');
  }
  private async createTextSummary(cardNewsData: CardNewsData, outputPath: string): Promise<void> {
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

  public async convertToPDF(pptxPath: string, cardNewsData?: CardNewsData): Promise<string> {
    return tryCatch(async () => {
      const pdfPath = pptxPath.replace('.pptx', '.pdf');
      const txtPath = pptxPath.replace('.pptx', '.txt');
      
      if (!fs.existsSync(txtPath) && cardNewsData) {
        this.createTextSummary(cardNewsData, txtPath);
      }
      
      if (!fs.existsSync(txtPath)) {
        return pptxPath;
      }
      
      return tryCatch(async () => {
        const fontRegularPath = path.join(process.cwd(), 'public', 'fonts', `${PPT_CONSTANTS.FONT_REGULAR}.otf`);
        const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', `${PPT_CONSTANTS.FONT_BOLD}.otf`);
        const fontMediumPath = path.join(process.cwd(), 'public', 'fonts', `${PPT_CONSTANTS.FONT_MEDIUM}.otf`);
        
        if (!fs.existsSync(fontRegularPath)) {
          throw new Error('필요한 폰트 파일을 찾을 수 없습니다.');
        }
        
        const doc = new PDFDocument({
          autoFirstPage: true,
          size: 'A4',
          margin: 50,
          info: {
            Title: path.basename(pptxPath, '.pptx'),
            Author: 'IT 카드뉴스 생성기',
            Subject: '자동 생성된 IT 카드뉴스',
            Keywords: 'IT, 카드뉴스, 기술 트렌드'
          }
        });
        
        doc.registerFont(PPT_CONSTANTS.FONT_REGULAR, fontRegularPath);
        doc.registerFont(PPT_CONSTANTS.FONT_BOLD, fontBoldPath);
        doc.registerFont(PPT_CONSTANTS.FONT_MEDIUM, fontMediumPath);
        
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        
        const textContent = fs.readFileSync(txtPath, 'utf8');
        
        doc.font(PPT_CONSTANTS.FONT_BOLD).fontSize(24).text('IT 카드뉴스', {
          align: 'center'
        });
        doc.moveDown();
        
        const today = new Date();
        doc.font(PPT_CONSTANTS.FONT_REGULAR).fontSize(12)
          .text(`생성일: ${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`, {
            align: 'center'
          });
        doc.moveDown(2);
        
        doc.font(PPT_CONSTANTS.FONT_MEDIUM).fontSize(16).text('카드뉴스 내용', {
          align: 'left',
          underline: true
        });
        doc.moveDown();
        
        const lines = textContent.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('[표지]') || line.startsWith('[뉴스]') || line.startsWith('[요약]')) {
            doc.font(PPT_CONSTANTS.FONT_BOLD).fontSize(14).text(line);
          } else if (line.startsWith('#')) {
            doc.font(PPT_CONSTANTS.FONT_MEDIUM).fontSize(12).fillColor('#1D1D1D').text(line);
            doc.fillColor('#000000');
          } else if (line.startsWith('출처:')) {
            doc.font(PPT_CONSTANTS.FONT_REGULAR).fontSize(10).fillColor('#666666').text(line);
            doc.fillColor('#000000');
          } else if (line.trim() === '') {
            doc.moveDown(0.5);
          } else {
            doc.font(PPT_CONSTANTS.FONT_REGULAR).fontSize(12).text(line);
          }
        }
        
        doc.end();
        
        await new Promise<void>((resolve, reject) => {
          stream.on('finish', resolve);
          stream.on('error', reject);
        });
        
        return pdfPath;
      }, 'PDF 생성 중 오류 발생', pptxPath);
    }, 'PDF 변환 중 오류 발생', pptxPath);
  }

  private createCoverSlide(slide: any, data: Slide): void {
    slide.addText(data.title, {
      x: 0.5, y: 1.5, w: 9, h: 1.5,
      fontSize: 44, fontFace: PPT_CONSTANTS.FONT_FAMILY,
      bold: true, color: PPT_CONSTANTS.COLOR_TITLE, align: 'center'
    });

    if (data.subtitle) {
      slide.addText(data.subtitle, {
        x: 1, y: 3.2, w: 8, h: 0.8,
        fontSize: 28, fontFace: PPT_CONSTANTS.FONT_FAMILY,
        color: PPT_CONSTANTS.COLOR_SUBTITLE, align: 'center'
      });
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    slide.addText(dateStr, {
      x: 0.5, y: 6, w: 9, h: 0.5,
      fontSize: 16, fontFace: PPT_CONSTANTS.FONT_FAMILY,
      color: PPT_CONSTANTS.COLOR_DATE, align: 'center'
    });
  }

  private createNewsSlide(slide: any, data: Slide): void {
    slide.addText(data.title, {
      x: 0.5, y: 0.5, w: 9, h: 0.8,
      fontSize: 32, fontFace: PPT_CONSTANTS.FONT_FAMILY,
      bold: true, color: PPT_CONSTANTS.COLOR_TITLE,
      align: 'center'
    });

    if (data.content) {
      slide.addText(data.content, {
        x: 0.5, y: 1.8, w: 9, h: 2.5,
        fontSize: 24, fontFace: PPT_CONSTANTS.FONT_FAMILY,
        color: PPT_CONSTANTS.COLOR_TEXT, align: 'center',
        valign: 'middle'
      });
    }

    if (data.tags && data.tags.length > 0) {
      const tagsText = '#' + data.tags.join(' #');
      slide.addText(tagsText, {
        x: 0.5, y: 4.5, w: 9, h: 0.5,
        fontSize: 16, fontFace: PPT_CONSTANTS.FONT_FAMILY,
        color: PPT_CONSTANTS.COLOR_TAGS, align: 'center'
      });
    }

    if (data.sourceUrl) {
      slide.addText(`출처: ${data.sourceUrl}`, {
        x: 0.5, y: 6.5, w: 9, h: 0.3,
        fontSize: 10, fontFace: PPT_CONSTANTS.FONT_FAMILY,
        color: PPT_CONSTANTS.COLOR_SOURCE, align: 'center'
      });
    }
  }

  private createSummarySlide(slide: any, data: Slide): void {
    slide.addText(data.title, {
      x: 0.5, y: 0.5, w: 9, h: 0.8,
      fontSize: 36, fontFace: PPT_CONSTANTS.FONT_FAMILY,
      bold: true, color: PPT_CONSTANTS.COLOR_TITLE,
      align: 'center'
    });

    if (data.content) {
      slide.addText(data.content, {
        x: 0.5, y: 2, w: 9, h: 4,
        fontSize: 24, fontFace: PPT_CONSTANTS.FONT_FAMILY,
        color: PPT_CONSTANTS.COLOR_TEXT, align: 'center',
        valign: 'middle'
      });
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    slide.addText(dateStr, {
      x: 0.5, y: 6.5, w: 9, h: 0.3,
      fontSize: 12, fontFace: PPT_CONSTANTS.FONT_FAMILY,
      color: PPT_CONSTANTS.COLOR_DATE, align: 'center'
    });
  }
} 