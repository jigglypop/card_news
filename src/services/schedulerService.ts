import cron from 'node-cron';
import { NewsService } from './newsService';
import { AIService } from './aiService';
import { PPTService } from './pptService';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

export class SchedulerService {
  private static instance: SchedulerService;
  private newsService: NewsService;
  private aiService: AIService;
  private pptService: PPTService;
  private dailyTask: cron.ScheduledTask | null = null;
  private monthlyTask: cron.ScheduledTask | null = null;
  private lastGeneratedFile: string | null = null;

  private constructor() {
    this.newsService = NewsService.getInstance();
    this.aiService = AIService.getInstance();
    this.pptService = PPTService.getInstance();
  }

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * 마지막으로 생성된 파일 경로를 반환합니다.
   */
  public getLastGeneratedFile(): string | null {
    return this.lastGeneratedFile;
  }

  /**
   * 일일 작업을 실행합니다.
   */
  public async runDailyTask(): Promise<string> {
    try {
      console.log('일일 카드뉴스 생성 작업 시작...');
      
      // 뉴스 서비스를 통해 뉴스 데이터 가져오기
      console.log('뉴스 데이터 수집 중...');
      const newsItems = await this.newsService.fetchAllNews();
      console.log(`뉴스 데이터 수집 완료: ${newsItems.length}개 항목`);
      
      // 뉴스 부족 시 처리
      if (!newsItems || newsItems.length === 0) {
        console.warn('수집된 뉴스가 없습니다.');
        // 임시 폴백 파일 생성
        const fallbackPath = this.createFallbackPPT('daily');
        this.lastGeneratedFile = fallbackPath;
        return fallbackPath;
      }
      
      // 뉴스 분석
      console.log('뉴스 분석 시작...');
      const analyzedNews = await this.aiService.analyzeNewsItems(newsItems);
      console.log(`${analyzedNews.length}개의 뉴스 분석 완료`);
      
      // 중요 뉴스 필터링 (상위 5개)
      console.log('중요 뉴스 필터링...');
      const importantNews = this.aiService.filterImportantNews(analyzedNews, 5);
      console.log(`${importantNews.length}개의 중요 뉴스 선택됨`);
      
      // 카드뉴스 콘텐츠 생성
      console.log('카드뉴스 콘텐츠 생성 중...');
      const cardNewsContent = await this.aiService.generateCardNewsContent(importantNews, 'daily');
      console.log('카드뉴스 콘텐츠 생성 완료');
      
      // JSON 파싱
      let cardNewsData;
      try {
        cardNewsData = JSON.parse(cardNewsContent);
      } catch (jsonError) {
        console.error('카드뉴스 콘텐츠 JSON 파싱 실패:', jsonError);
        cardNewsData = null;
      }
      
      // PPT 생성
      console.log('PPT 파일 생성 중...');
      const pptPath = await this.pptService.generateCardNewsPPT(cardNewsContent, 'daily');
      
      if (!pptPath || typeof pptPath !== 'string') {
        console.error('PPT 경로가 반환되지 않았습니다. 폴백 파일을 생성합니다.');
        const fallbackPath = this.createFallbackPPT('daily');
        this.lastGeneratedFile = fallbackPath;
        return fallbackPath;
      }
      
      console.log(`카드뉴스 PPT 생성 완료: ${pptPath}`);
      
      // 파일 존재 확인
      if (!fs.existsSync(pptPath)) {
        console.error(`생성된 PPT 파일이 존재하지 않습니다: ${pptPath}`);
        const fallbackPath = this.createFallbackPPT('daily');
        this.lastGeneratedFile = fallbackPath;
        return fallbackPath;
      }
      
      // 생성된 파일 경로 저장
      this.lastGeneratedFile = pptPath;
      
      // HTML 파일 생성 (PDF 대체)
      console.log('HTML 파일 생성 중...');
      const htmlPath = await this.pptService.convertToPDF(pptPath, cardNewsData);
      console.log(`HTML 파일 생성 완료: ${htmlPath}`);
      
      return pptPath;
    } catch (error) {
      console.error('일일 작업 실행 중 오류 발생:', error);
      // 오류 발생 시 폴백 파일 반환
      const fallbackPath = this.createFallbackPPT('daily');
      this.lastGeneratedFile = fallbackPath;
      return fallbackPath;
    }
  }

  /**
   * 월간 작업을 실행합니다.
   */
  public async runMonthlyTask(): Promise<string> {
    try {
      console.log('월간 뉴스 요약 작업 시작...');
      
      // 이번 달의 모든 일일 뉴스 파일 읽기 (실제 구현에서는 파일 패턴 매칭)
      // 예시 코드로, 실제 구현 필요
      console.log('뉴스 데이터 수집 중...');
      const allMonthNews = await this.newsService.fetchAllNews();
      console.log(`뉴스 데이터 수집 완료: ${allMonthNews.length}개 항목`);
      
      // 뉴스 부족 시 처리
      if (allMonthNews.length === 0) {
        console.warn('수집된 뉴스가 없습니다.');
        // 임시 폴백 파일 생성
        const fallbackPath = this.createFallbackPPT('monthly');
        this.lastGeneratedFile = fallbackPath;
        return fallbackPath;
      }
      
      // 뉴스 분석
      console.log('뉴스 분석 시작...');
      const analyzedNews = await this.aiService.analyzeNewsItems(allMonthNews);
      console.log(`${analyzedNews.length}개의 뉴스 분석 완료`);
      
      // 중요 뉴스 필터링 (상위 10개)
      console.log('중요 뉴스 필터링...');
      const importantNews = this.aiService.filterImportantNews(analyzedNews, 10);
      console.log(`${importantNews.length}개의 중요 뉴스 선택됨`);
      
      // 카드뉴스 콘텐츠 생성
      console.log('카드뉴스 콘텐츠 생성 중...');
      const cardNewsContent = await this.aiService.generateCardNewsContent(importantNews, 'monthly');
      console.log('카드뉴스 콘텐츠 생성 완료');
      
      // JSON 파싱
      let cardNewsData;
      try {
        cardNewsData = JSON.parse(cardNewsContent);
      } catch (jsonError) {
        console.error('카드뉴스 콘텐츠 JSON 파싱 실패:', jsonError);
        cardNewsData = null;
      }
      
      // PPT 생성
      console.log('PPT 파일 생성 중...');
      const pptPath = await this.pptService.generateCardNewsPPT(cardNewsContent, 'monthly');
      
      if (!pptPath || typeof pptPath !== 'string') {
        console.error('PPT 경로가 반환되지 않았습니다. 폴백 파일을 생성합니다.');
        const fallbackPath = this.createFallbackPPT('monthly');
        this.lastGeneratedFile = fallbackPath;
        return fallbackPath;
      }
      
      console.log(`월간 카드뉴스 PPT 생성 완료: ${pptPath}`);
      
      // 파일 존재 확인
      if (!fs.existsSync(pptPath)) {
        console.error(`생성된 PPT 파일이 존재하지 않습니다: ${pptPath}`);
        const fallbackPath = this.createFallbackPPT('monthly');
        this.lastGeneratedFile = fallbackPath;
        return fallbackPath;
      }
      
      // 생성된 파일 경로 저장
      this.lastGeneratedFile = pptPath;
      
      // HTML 파일 생성 (PDF 대체)
      console.log('HTML 파일 생성 중...');
      const htmlPath = await this.pptService.convertToPDF(pptPath, cardNewsData);
      console.log(`HTML 파일 생성 완료: ${htmlPath}`);
      
      return pptPath;
    } catch (error) {
      console.error('월간 작업 실행 중 오류 발생:', error);
      // 오류 발생 시 폴백 파일 반환
      const fallbackPath = this.createFallbackPPT('monthly');
      this.lastGeneratedFile = fallbackPath;
      return fallbackPath;
    }
  }

  /**
   * 폴백 PPT 파일을 생성합니다. (오류 발생 시 사용)
   */
  private createFallbackPPT(type: 'daily' | 'monthly'): string {
    try {
      console.log(`${type} 폴백 PPT 파일 생성 중...`);
      const outputDir = path.join(process.cwd(), 'data', 'output');
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      const fileName = `${type === 'daily' ? 'Daily' : 'Monthly'}_IT_News_${dateStr}.pptx`;
      const filePath = path.join(outputDir, fileName);
      
      // 이미 파일이 있으면 그대로 반환
      if (fs.existsSync(filePath)) {
        console.log(`기존 폴백 파일 사용: ${filePath}`);
        return filePath;
      }
      
      // 간단한 텍스트 파일을 생성하고 경로 즉시 반환
      try {
        // 빈 파일 생성 (실제 PPT는 비동기적으로 생성됨)
        fs.writeFileSync(filePath, 'Placeholder for PPT file');
        console.log(`임시 폴백 파일 생성 완료: ${filePath}`);
        
        // 비동기적으로 실제 PPT 생성 시작
        this.createRealFallbackPPT(type, filePath);
        
        return filePath;
      } catch (fsError) {
        console.error('파일 시스템 오류:', fsError);
        return filePath; // 오류가 발생해도 경로는 반환
      }
    } catch (error) {
      console.error('폴백 파일 생성 중 오류 발생:', error);
      // 오류 발생 시 기본 경로 반환 
      const defaultPath = path.join(process.cwd(), 'data', 'output', `${type === 'daily' ? 'Daily' : 'Monthly'}_Fallback.pptx`);
      return defaultPath;
    }
  }

  /**
   * 실제 폴백 PPT 파일을 비동기적으로 생성합니다.
   */
  private createRealFallbackPPT(type: 'daily' | 'monthly', filePath: string): void {
    // PPTService를 사용하여 기본 폴백 PPT 생성
    // 간단한 대체 콘텐츠 생성 - CardNewsData 형식으로
    const fallbackCardNewsContent = {
      slides: [
        {
          type: 'cover',
          title: `${type === 'daily' ? '일일' : '월간'} IT 기술 동향`,
          subtitle: `${new Date().toISOString().split('T')[0]} - 오류 복구 모드`
        },
        {
          type: 'news',
          title: '일시적인 오류가 발생했습니다',
          content: '뉴스 데이터를 가져오거나 처리하는 과정에서 문제가 발생했습니다. 인터넷 연결을 확인하거나 나중에 다시 시도해보세요.',
          tags: ['오류', '알림']
        },
        {
          type: 'summary',
          title: '안내',
          content: '이 카드뉴스는 오류가 발생하여 자동으로 생성된 대체 콘텐츠입니다. 다시 시도하시면 정상적인 콘텐츠를 볼 수 있습니다.'
        }
      ]
    };
    
    // JSON 문자열로 변환하여 PPTService에 전달
    const jsonContent = JSON.stringify(fallbackCardNewsContent);
    
    // PPTService를 통해 기본 PPT 생성
    this.pptService.generateCardNewsPPT(jsonContent, type)
      .then(generatedPath => {
        console.log(`실제 폴백 PPT 파일 생성 성공: ${generatedPath}`);
      })
      .catch(err => {
        console.error('폴백 PPT 생성 중 오류:', err);
      });
  }

  /**
   * 스케줄러를 시작합니다.
   */
  public start(): void {
    try {
      const dailyCronExpression = process.env.DAILY_CRON || '0 9 * * *'; // 기본값: 매일 오전 9시
      const monthlyCronExpression = process.env.MONTHLY_CRON || '0 9 1 * *'; // 기본값: 매월 1일 오전 9시
      
      // 일일 작업 스케줄링
      this.dailyTask = cron.schedule(dailyCronExpression, async () => {
        try {
          await this.runDailyTask();
        } catch (error) {
          console.error('일일 스케줄 작업 실행 중 오류 발생:', error);
        }
      });
      
      // 월간 작업 스케줄링
      this.monthlyTask = cron.schedule(monthlyCronExpression, async () => {
        try {
          await this.runMonthlyTask();
        } catch (error) {
          console.error('월간 스케줄 작업 실행 중 오류 발생:', error);
        }
      });
      
      console.log(`스케줄러 시작됨 - 일일: ${dailyCronExpression}, 월간: ${monthlyCronExpression}`);
    } catch (error) {
      console.error('스케줄러 시작 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 스케줄러를 중지합니다.
   */
  public stop(): void {
    if (this.dailyTask) {
      this.dailyTask.stop();
    }
    
    if (this.monthlyTask) {
      this.monthlyTask.stop();
    }
    
    console.log('스케줄러 중지됨');
  }
} 