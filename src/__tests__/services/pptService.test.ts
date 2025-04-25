import { PPTService } from "../../services/pptService";
import fs from 'fs';

jest.mock('pptxgenjs', () => {
  return jest.fn().mockImplementation(() => ({
    defineLayout: jest.fn(),
    layout: '',
    theme: {},
    defineSlideMaster: jest.fn(),
    addSlide: jest.fn().mockReturnValue({
      addText: jest.fn()
    }),
    writeFile: jest.fn().mockResolvedValue(undefined)
  }));
});

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('테스트 텍스트'),
  createWriteStream: jest.fn().mockReturnValue({
    on: jest.fn((event, cb) => {
      if (event === 'finish') setTimeout(cb, 10);
    }),
    pipe: jest.fn()
  }),
  unlinkSync: jest.fn()
}));

// path 모듈 모킹
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  basename: jest.fn().mockReturnValue('test_file'),
}));

// PDFDocument 모킹
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    registerFont: jest.fn(),
    pipe: jest.fn(),
    font: jest.fn().mockReturnThis(),
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    fillColor: jest.fn().mockReturnThis(),
    end: jest.fn()
  }));
});

// crypto 모킹
jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue({
      substring: jest.fn().mockReturnValue('abc123')
    })
  })
}));

describe('PPTService 테스트', () => {
  const pptService = PPTService.getInstance();
  
  // 테스트용 카드뉴스 데이터
  const testCardNewsContent = JSON.stringify({
    slides: [
      {
        type: "cover",
        title: "오늘의 IT 핫 뉴스",
        subtitle: "테스트 부제목"
      },
      {
        type: "news",
        title: "AI 개발 혁신",
        content: "새로운 AI 기술 발표",
        tags: ["AI", "기술", "혁신"]
      },
      {
        type: "summary",
        title: "주요 요약",
        content: "IT 기술의 지속적인 발전"
      }
    ]
  });

  beforeEach(() => {
    // 각 테스트 전에 모킹된 함수 초기화
    jest.clearAllMocks();
  });

  describe('generateCardNewsPPT 메서드', () => {
    it('PPT 파일을 성공적으로 생성해야 합니다', async () => {
      const result = await pptService.generateCardNewsPPT(testCardNewsContent, 'daily');
      
      // 결과가 문자열(파일 경로)인지 확인
      expect(typeof result).toBe('string');
      expect(result).toContain('.pptx');
      
      // 필요한 메서드들이 호출되었는지 확인
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
    
    it('잘못된 JSON 형식이 주어졌을 때 오류를 처리해야 합니다', async () => {
      await expect(pptService.generateCardNewsPPT('잘못된 JSON', 'daily'))
        .rejects.toThrow();
    });
  });

  describe('convertToPDF 메서드', () => {
    it('PDF 파일로 성공적으로 변환해야 합니다', async () => {
      const pptxPath = 'test_path.pptx';
      const result = await pptService.convertToPDF(pptxPath);
      
      // 결과가 PDF 파일 경로인지 확인
      expect(typeof result).toBe('string');
      expect(result).toContain('.pdf');
    }, 10000);
  });
});