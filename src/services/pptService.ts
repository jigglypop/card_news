import pptxgen from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { PPT_CONSTANTS } from '../config/constants';
import { tryCatch } from '../utils/errorHandler';
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
  
  // 폰트 설정 변경 (다시 BlackHanSans 사용)
  private PRETENDARD_BOLD = 'Pretendard-Bold';
  private PRETENDARD_REGULAR = 'Pretendard-Regular';
  private BLACK_HAN_SANS = 'BlackHanSans';
  
  // 색상 설정
  private COLOR_TITLE = '1D1D1D';
  private COLOR_TAGS = '5A5A5A';  // 제목보다 연한 색상
  private COLOR_CONTENT = '1D1D1D';
  private COLOR_DATE = '1D1D1D';

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

      // 이미지 파일 경로 설정 (절대 경로 사용)
      const techBackgroundPath = path.join(process.cwd(), 'public', 'images', 'backgrounds', 'tech_background.png');
      const businessBackgroundPath = path.join(process.cwd(), 'public', 'images', 'backgrounds', 'business_background.png');
      
      // 이미지 존재 확인 로깅
      console.log('이미지 경로 정보:');
      console.log(`- 기술 배경: ${techBackgroundPath}, 존재: ${fs.existsSync(techBackgroundPath)}`);
      console.log(`- 비즈니스 배경: ${businessBackgroundPath}, 존재: ${fs.existsSync(businessBackgroundPath)}`);

      // 이미지 데이터 로드
      let techBackgroundData = null;
      let businessBackgroundData = null;
      
      try {
        if (fs.existsSync(techBackgroundPath)) {
          const techImageBuffer = fs.readFileSync(techBackgroundPath);
          techBackgroundData = `data:image/png;base64,${techImageBuffer.toString('base64')}`;
        }
        
        if (fs.existsSync(businessBackgroundPath)) {
          const businessImageBuffer = fs.readFileSync(businessBackgroundPath);
          businessBackgroundData = `data:image/png;base64,${businessImageBuffer.toString('base64')}`;
        }
      } catch (err) {
        console.warn('이미지 로딩 중 오류 발생:', err);
      }

      pptx.defineLayout({
        name: 'CARD_NEWS',
        width: PPT_CONSTANTS.SLIDE_WIDTH,
        height: PPT_CONSTANTS.SLIDE_HEIGHT
      });
      pptx.layout = 'CARD_NEWS';

      // 폰트 추가 (defineFonts 대신 직접 경로 지정)
      const blackHanSansPath = path.join(process.cwd(), 'public', 'fonts', 'BlackHanSans-Regular.ttf');
      const pretendardBoldPath = path.join(process.cwd(), 'public', 'fonts', 'Pretendard-Bold.otf');
      const pretendardRegularPath = path.join(process.cwd(), 'public', 'fonts', 'Pretendard-Regular.otf');
      
      // 로그 출력
      console.log(`폰트 경로:`);
      console.log(`- BlackHanSans: ${blackHanSansPath}, 존재: ${fs.existsSync(blackHanSansPath)}`);
      console.log(`- PretendardBold: ${pretendardBoldPath}, 존재: ${fs.existsSync(pretendardBoldPath)}`);
      console.log(`- PretendardRegular: ${pretendardRegularPath}, 존재: ${fs.existsSync(pretendardRegularPath)}`);

      for (const slide of cardNewsData.slides) {
        // 슬라이드 타입에 따른 처리
        if (slide.type === 'cover') {
          // 커버 슬라이드: 비즈니스 배경 사용
          const coverSlide = pptx.addSlide();
          
          // 비즈니스 배경 적용
          if (businessBackgroundData) {
            coverSlide.background = { data: businessBackgroundData };
          } else {
            // 배경 이미지가 없는 경우 백업 솔루션으로 직접 이미지 추가
            if (fs.existsSync(businessBackgroundPath)) {
              coverSlide.addImage({
                path: businessBackgroundPath,
                x: 0, y: 0, w: '100%', h: '100%'
              });
            }
          }
          
          // 커버 슬라이드에는 날짜만 표시
          const today = new Date();
          const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 생성`;
          coverSlide.addText(dateStr, {
            x: 0.5, y: 6.5, w: 9, h: 0.5,
            fontFace: this.PRETENDARD_BOLD,
            fontSize: 16,
            color: this.COLOR_DATE,
            align: 'center'
          });
          
        } else if (slide.type === 'news') {
          // 뉴스 슬라이드: 기술 배경 사용
          const newsSlide = pptx.addSlide();
          
          // 기술 배경 적용
          if (techBackgroundData) {
            newsSlide.background = { data: techBackgroundData };
          } else {
            // 배경 이미지가 없는 경우 백업 솔루션으로 직접 이미지 추가
            if (fs.existsSync(techBackgroundPath)) {
              newsSlide.addImage({
                path: techBackgroundPath,
                x: 0, y: 0, w: '100%', h: '100%'
              });
            }
          }
          
          // 제목 추가 (정중앙, 2배 크기로, 밑줄 추가)
          newsSlide.addText(slide.title, {
            x: 0.5, y: 1, w: 9, h: 1.5,
            fontFace: this.BLACK_HAN_SANS,
            fontSize: 80,  // 폰트 크기 2배로 증가
            color: this.COLOR_TITLE,
            align: 'center',
            underline: { style: 'sng' } // 단일 밑줄 스타일
          });
          
          // 내용 추가 (있는 경우)
          if (slide.content) {
            newsSlide.addText(slide.content, {
              x: 1, y: 2.5, w: 8, h: 3,
              fontFace: this.BLACK_HAN_SANS,
              fontSize: 24,
              color: this.COLOR_CONTENT,
              align: 'center',
              valign: 'middle'
            });
          }
          
          // 태그 추가 (있는 경우)
          if (slide.tags && slide.tags.length > 0) {
            const tagsText = '#' + slide.tags.join(' #');
            newsSlide.addText(tagsText, {
              x: 0.5, y: 5.5, w: 9, h: 0.7,
              fontFace: this.BLACK_HAN_SANS,
              
              fontSize: 20,
              color: this.COLOR_TAGS,
              align: 'center'
            });
          }
          
          // 출처 추가 (있는 경우, 작게)
          if (slide.sourceUrl) {
            newsSlide.addText(`출처: ${slide.sourceUrl}`, {
              x: 0.5, y: 6.5, w: 9, h: 0.5,
              fontFace: this.PRETENDARD_REGULAR,
              fontSize: 12,
              color: this.COLOR_TAGS,
              align: 'center'
            });
          }
          
        } else if (slide.type === 'summary') {
          // 요약 슬라이드: 기술 배경 사용
          const summarySlide = pptx.addSlide();
          
          // 기술 배경 적용
          if (techBackgroundData) {
            summarySlide.background = { data: techBackgroundData };
          } else {
            // 배경 이미지가 없는 경우 백업 솔루션으로 직접 이미지 추가
            if (fs.existsSync(techBackgroundPath)) {
              summarySlide.addImage({
                path: techBackgroundPath,
                x: 0, y: 0, w: '100%', h: '100%'
              });
            }
          }
          
          // 제목 추가
          summarySlide.addText(slide.title, {
            x: 0.5, y: 0.8, w: 9, h: 1.5,
            fontFace: this.PRETENDARD_BOLD,
            fontSize: 40,
            color: this.COLOR_TITLE,
            align: 'center'
          });
          
          // 내용 추가 (있는 경우)
          if (slide.content) {
            summarySlide.addText(slide.content, {
              x: 1, y: 2.3, w: 8, h: 3.5,
              fontFace: this.PRETENDARD_REGULAR,
              fontSize: 24,
              color: this.COLOR_CONTENT,
              align: 'center',
              valign: 'middle'
            });
          }
          
          // 생성 날짜 추가 (우측 하단)
          const today = new Date();
          const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
          summarySlide.addText(dateStr, {
            x: 5, y: 6.5, w: 4.5, h: 0.5,
            fontFace: this.PRETENDARD_BOLD,
            fontSize: 14,
            color: this.COLOR_DATE,
            align: 'right'
          });
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
        const fontRegularPath = path.join(process.cwd(), 'public', 'fonts', 'Pretendard-Regular.otf');
        const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'Pretendard-Bold.otf');
        const fontHanSansPath = path.join(process.cwd(), 'public', 'fonts', 'BlackHanSans-Regular.ttf');
        
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
        
        doc.registerFont('Pretendard-Regular', fontRegularPath);
        doc.registerFont('Pretendard-Bold', fontBoldPath);
        doc.registerFont('BlackHanSans', fontHanSansPath);
        
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        
        const textContent = fs.readFileSync(txtPath, 'utf8');
        
        doc.font('BlackHanSans').fontSize(28).text('IT 카드뉴스', {
          align: 'center'
        });
        doc.moveDown();
        
        const today = new Date();
        doc.font('Pretendard-Regular').fontSize(12)
          .text(`생성일: ${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`, {
            align: 'center'
          });
        doc.moveDown(2);
        
        doc.font('Pretendard-Bold').fontSize(16).text('카드뉴스 내용', {
          align: 'left',
          underline: true
        });
        doc.moveDown();
        
        const lines = textContent.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('[표지]') || line.startsWith('[뉴스]') || line.startsWith('[요약]')) {
            doc.font('Pretendard-Bold').fontSize(16).text(line);
          } else if (line.startsWith('#')) {
            doc.font('Pretendard-Regular').fontSize(14).fillColor('#5A5A5A').text(line);
            doc.fillColor('#000000');
          } else if (line.startsWith('출처:')) {
            doc.font('Pretendard-Regular').fontSize(10).fillColor('#666666').text(line);
            doc.fillColor('#000000');
          } else if (line.trim() === '') {
            doc.moveDown(0.5);
          } else {
            doc.font('Pretendard-Regular').fontSize(14).text(line);
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
} 