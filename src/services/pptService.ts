import pptxgen from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

interface Slide {
  type: 'cover' | 'news' | 'summary';
  title: string;
  content?: string;
  subtitle?: string;
  imagePrompt?: string;
  sourceUrl?: string;
  tags?: string[];
}

interface CardNewsData {
  slides: Slide[];
}

export class PPTService {
  private static instance: PPTService;
  private outputPath: string;
  private templatePath: string;

  private constructor() {
    this.outputPath = path.join(process.cwd(), 'data', 'output');
    this.templatePath = path.join(process.cwd(), 'src', 'templates');
    
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }
  }

  public static getInstance(): PPTService {
    if (!PPTService.instance) {
      PPTService.instance = new PPTService();
    }
    return PPTService.instance;
  }

  /**
   * 카드뉴스 내용으로 PPT를 생성합니다.
   */
  public async generateCardNewsPPT(cardNewsContent: string, frequency: 'daily' | 'monthly'): Promise<string> {
    try {
      const cardNewsData = JSON.parse(cardNewsContent) as CardNewsData;
      const pptx = new pptxgen();

      // 기본 슬라이드 마스터 및 레이아웃 설정
      pptx.defineLayout({
        name: 'CARD_NEWS',
        width: 10,
        height: 7.5
      });
      pptx.layout = 'CARD_NEWS';

      // 테마 설정 - 타입 문제를 해결하기 위해 any 타입으로 단언
      (pptx.theme as any) = {
        headFontFace: '맑은 고딕',
        bodyFontFace: '맑은 고딕',
        colorScheme: {
          accent1: '4472C4',
          accent2: 'ED7D31',
          accent3: 'A5A5A5',
          accent4: 'FFC000',
          accent5: '5B9BD5',
          accent6: '70AD47'
        }
      };
      
      // 모든 슬라이드의 배경색 설정
      pptx.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: { color: 'FFFFFF' }
      });
      
      // 각 슬라이드 생성
      for (const slide of cardNewsData.slides) {
        const pptSlide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
        
        switch (slide.type) {
          case 'cover':
            this.createCoverSlide(pptSlide, slide);
            break;
          
          case 'news':
            this.createNewsSlide(pptSlide, slide);
            break;
          
          case 'summary':
            this.createSummarySlide(pptSlide, slide);
            break;
        }
      }

      // 저장 및 경로 반환
      const date = new Date();
      let fileName: string;
      
      if (frequency === 'daily') {
        fileName = `IT_News_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.pptx`;
      } else {
        fileName = `IT_News_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}.pptx`;
      }

      const outputFilePath = path.join(this.outputPath, fileName);
      await pptx.writeFile({ fileName: outputFilePath });
      
      // PPT와 함께 텍스트 파일로도 저장
      const txtPath = outputFilePath.replace('.pptx', '.txt');
      this.createTextSummary(cardNewsData, txtPath);
      
      return outputFilePath;
    } catch (error) {
      console.error('Error generating PPT:', error);
      throw error;
    }
  }

  /**
   * 카드뉴스 데이터를 텍스트 파일로 저장합니다.
   * 한글 인코딩 문제 없이 내용을 보존합니다.
   */
  private createTextSummary(cardNewsData: CardNewsData, outputPath: string): void {
    try {
      let textContent = "===== IT 카드뉴스 =====\n\n";
      
      // 각 슬라이드 내용을 텍스트로 변환
      for (const slide of cardNewsData.slides) {
        switch (slide.type) {
          case 'cover':
            textContent += `[표지]\n${slide.title}\n`;
            if (slide.subtitle) {
              textContent += `${slide.subtitle}\n`;
            }
            textContent += `${new Date().toLocaleDateString('ko-KR')}\n\n`;
            break;
            
          case 'news':
            textContent += `[뉴스]\n${slide.title}\n`;
            if (slide.tags && slide.tags.length > 0) {
              textContent += `#${slide.tags.join(' #')}\n`;
            }
            if (slide.content) {
              textContent += `${slide.content}\n`;
            }
            if (slide.imagePrompt) {
              textContent += `이미지 프롬프트: ${slide.imagePrompt}\n`;
            }
            if (slide.sourceUrl) {
              textContent += `출처: ${slide.sourceUrl}\n`;
            }
            textContent += '\n';
            break;
            
          case 'summary':
            textContent += `[요약]\n${slide.title}\n`;
            if (slide.content) {
              textContent += `${slide.content}\n`;
            }
            textContent += '\n';
            break;
        }
      }
      
      // 텍스트 파일로 저장
      fs.writeFileSync(outputPath, textContent, 'utf8');
      console.log(`텍스트 파일 생성 완료: ${outputPath}`);
    } catch (error) {
      console.error('텍스트 파일 생성 중 오류 발생:', error);
    }
  }

  /**
   * PDF로 변환합니다.
   * 한글 폰트를 사용하여 인코딩 문제를 해결합니다.
   */
  public async convertToPDF(pptxPath: string, cardNewsData?: CardNewsData): Promise<string> {
    try {
      console.log(`PPT를 PDF로 변환 시작: ${pptxPath}`);
      const pdfPath = pptxPath.replace('.pptx', '.pdf');
      
      // 먼저 텍스트 파일 확인
      const txtPath = pptxPath.replace('.pptx', '.txt');
      
      if (!fs.existsSync(txtPath) && cardNewsData) {
        this.createTextSummary(cardNewsData, txtPath);
      }
      
      if (!fs.existsSync(txtPath)) {
        console.error('텍스트 파일이 존재하지 않습니다:', txtPath);
        return pptxPath;
      }
      
      // 텍스트 파일 내용을 기반으로 PDF 생성
      try {
        // 폰트 파일 경로
        const fontRegularPath = path.join(process.cwd(), 'src', 'assets', 'fonts', 'Pretendard-Regular.otf');
        const fontBoldPath = path.join(process.cwd(), 'src', 'assets', 'fonts', 'Pretendard-Bold.otf');
        const fontMediumPath = path.join(process.cwd(), 'src', 'assets', 'fonts', 'Pretendard-Medium.otf');
        
        // 폰트 파일 존재 확인
        if (!fs.existsSync(fontRegularPath)) {
          console.error('폰트 파일이 존재하지 않습니다:', fontRegularPath);
          throw new Error('필요한 폰트 파일을 찾을 수 없습니다.');
        }
        
        // PDF 문서 생성 (폰트 등록 포함)
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
        
        // 폰트 등록
        doc.registerFont('Pretendard-Regular', fontRegularPath);
        doc.registerFont('Pretendard-Bold', fontBoldPath);
        doc.registerFont('Pretendard-Medium', fontMediumPath);
        
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        
        // 텍스트 파일 내용 읽기
        const textContent = fs.readFileSync(txtPath, 'utf8');
        
        // PDF 제목 (Pretendard 폰트 사용)
        doc.font('Pretendard-Bold').fontSize(24).text('IT 카드뉴스', {
          align: 'center'
        });
        doc.moveDown();
        
        // 생성일
        const today = new Date();
        doc.font('Pretendard-Regular').fontSize(12)
          .text(`생성일: ${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`, {
            align: 'center'
          });
        doc.moveDown(2);
        
        // 텍스트 내용
        doc.font('Pretendard-Medium').fontSize(16).text('카드뉴스 내용', {
          align: 'left',
          underline: true
        });
        doc.moveDown();
        
        // 텍스트 파일의 내용을 라인별로 처리
        const lines = textContent.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('[표지]') || line.startsWith('[뉴스]') || line.startsWith('[요약]')) {
            // 섹션 제목은 볼드체로
            doc.font('Pretendard-Bold').fontSize(14).text(line);
          } else if (line.startsWith('#')) {
            // 태그는 기울임체로
            doc.font('Pretendard-Medium').fontSize(12).fillColor('#3498db').text(line);
            doc.fillColor('#000000'); // 색상 원래대로
          } else if (line.startsWith('출처:') || line.startsWith('이미지 프롬프트:')) {
            // 메타데이터는 작은 폰트로
            doc.font('Pretendard-Regular').fontSize(10).fillColor('#666666').text(line);
            doc.fillColor('#000000'); // 색상 원래대로
          } else if (line.trim() === '') {
            // 빈 줄
            doc.moveDown(0.5);
          } else {
            // 일반 텍스트
            doc.font('Pretendard-Regular').fontSize(12).text(line);
          }
        }
        
        // PDF 저장
        doc.end();
        
        await new Promise<void>((resolve, reject) => {
          stream.on('finish', resolve);
          stream.on('error', reject);
        });
        
        console.log(`PDF 파일 생성 완료: ${pdfPath}`);
        return pdfPath;
      } catch (pdfError) {
        console.error('PDF 생성 중 오류 발생:', pdfError);
        return pptxPath;
      }
    } catch (error) {
      console.error('PDF 변환 중 오류 발생:', error);
      return pptxPath;
    }
  }

  private createCoverSlide(slide: any, data: Slide): void {
    // 타이틀
    slide.addText(data.title, {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 1.5,
      fontSize: 44,
      fontFace: '맑은 고딕',
      bold: true,
      color: '363636',
      align: 'center'
    });

    // 부제목
    if (data.subtitle) {
      slide.addText(data.subtitle, {
        x: 1,
        y: 3.2,
        w: 8,
        h: 0.8,
        fontSize: 28,
        fontFace: '맑은 고딕',
        color: '5B9BD5',
        align: 'center'
      });
    }

    // 날짜
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    slide.addText(dateStr, {
      x: 0.5,
      y: 6,
      w: 9,
      h: 0.5,
      fontSize: 16,
      fontFace: '맑은 고딕',
      color: '7F7F7F',
      align: 'center'
    });
  }

  private createNewsSlide(slide: any, data: Slide): void {
    // 제목
    slide.addText(data.title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 32,
      fontFace: '맑은 고딕',
      bold: true,
      color: '363636',
      align: 'center'
    });

    // 태그 (있는 경우)
    if (data.tags && data.tags.length > 0) {
      slide.addText('#' + data.tags.join(' #'), {
        x: 0.5,
        y: 1.4,
        w: 9,
        h: 0.4,
        fontSize: 14,
        fontFace: '맑은 고딕',
        italic: true,
        color: '5B9BD5',
        align: 'center'
      });
    }

    // 내용
    if (data.content) {
      slide.addText(data.content, {
        x: 1,
        y: 2,
        w: 8,
        h: 3,
        fontSize: 20,
        fontFace: '맑은 고딕',
        color: '363636',
        align: 'center',
        valign: 'middle'
      });
    }

    // 이미지 프롬프트 표시 (실제 구현에서는 이미지를 생성)
    if (data.imagePrompt) {
      slide.addText('이미지 프롬프트: ' + data.imagePrompt, {
        x: 1,
        y: 5,
        w: 8,
        h: 0.5,
        fontSize: 12,
        fontFace: '맑은 고딕',
        color: '7F7F7F',
        align: 'center'
      });
    }

    // 출처 URL
    if (data.sourceUrl) {
      slide.addText('출처: ' + data.sourceUrl, {
        x: 0.5,
        y: 6.5,
        w: 9,
        h: 0.5,
        fontSize: 12,
        fontFace: '맑은 고딕',
        color: '7F7F7F',
        align: 'center'
      });
    }
  }

  private createSummarySlide(slide: any, data: Slide): void {
    // 제목
    slide.addText(data.title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 32,
      fontFace: '맑은 고딕',
      bold: true,
      color: '363636',
      align: 'center'
    });

    // 내용
    if (data.content) {
      slide.addText(data.content, {
        x: 1,
        y: 2,
        w: 8,
        h: 4,
        fontSize: 20,
        fontFace: '맑은 고딕',
        color: '363636',
        align: 'center',
        valign: 'middle'
      });
    }
  }
} 