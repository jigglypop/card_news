import cron from 'node-cron';
import { NewsService } from './newsService';
import { AIService } from './aiService';
import { PPTService } from './pptService';
import path from 'path';
import fs from 'fs';
import { tryCatch } from '../utils/errorHandler';
import { Logger } from '../utils/logger';
import { generateHash } from '../utils/fileUtils';
import { getYesterdayDateString, isFutureDate, getCurrentDateString, isDateValid } from '../utils/dateUtils';
import crypto from 'crypto';

export class SchedulerService {
  private static instance: SchedulerService;
  private newsService = NewsService.getInstance();
  private aiService = AIService.getInstance();
  private pptService = PPTService.getInstance();
  private dailyTask: cron.ScheduledTask | null = null;
  private monthlyTask: cron.ScheduledTask | null = null;
  private lastGeneratedFile: string | null = null;

  private constructor() {}

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) SchedulerService.instance = new SchedulerService();
    return SchedulerService.instance;
  }

  public getLastGeneratedFile(): string | null {
    return this.lastGeneratedFile;
  }

  public async runDailyTask(): Promise<string> {
    return tryCatch(async () => {
      Logger.log('일일 카드뉴스 생성 작업 시작...');
      
      Logger.log('뉴스 데이터 수집 중...');
      const newsItems = await this.newsService.fetchAllNews();
      Logger.log(`뉴스 데이터 수집 완료: ${newsItems.length}개 항목`);
      
      if (!newsItems || newsItems.length === 0) {
        Logger.warn('수집된 뉴스가 없습니다.');
        const fallbackPath = await this.createFallbackPPT('daily');
        this.lastGeneratedFile = await fallbackPath;
        return fallbackPath;
      }
      
      Logger.log('뉴스 분석 시작...');
      const analyzedNews = await this.aiService.analyzeNewsItems(newsItems);
      Logger.log(`${analyzedNews.length}개의 뉴스 분석 완료`);
      
      Logger.log('중요 뉴스 필터링...');
      const importantNews = this.aiService.filterImportantNews(analyzedNews, 5);
      Logger.log(`${importantNews.length}개의 중요 뉴스 선택됨`);
      
      Logger.log('카드뉴스 콘텐츠 생성 중...');
      const cardNewsContent = await this.aiService.generateCardNewsContent(importantNews, 'daily');
      Logger.log('카드뉴스 콘텐츠 생성 완료');
      
      let cardNewsData;
      try {
        cardNewsData = JSON.parse(cardNewsContent);
      } catch (jsonError) {
        Logger.error('카드뉴스 콘텐츠 JSON 파싱 실패:', jsonError);
      }
      
      Logger.log('PPT 파일 생성 중...');
      const pptPath = await this.pptService.generateCardNewsPPT(cardNewsContent, 'daily');
      
      if (!pptPath || typeof pptPath !== 'string') {
        Logger.error('PPT 경로가 반환되지 않았습니다. 폴백 파일을 생성합니다.');
        const fallbackPath = await this.createFallbackPPT('daily');
        this.lastGeneratedFile = await fallbackPath;
        return fallbackPath;
      }
      
      Logger.log(`카드뉴스 PPT 생성 완료: ${pptPath}`);
      
      if (!fs.existsSync(pptPath)) {
        Logger.error(`생성된 PPT 파일이 존재하지 않습니다: ${pptPath}`);
        const fallbackPath = await this.createFallbackPPT('daily');
        this.lastGeneratedFile = await fallbackPath;
        return fallbackPath;
      }
      
      this.lastGeneratedFile = pptPath;
      
      Logger.log('PDF 파일 변환 시작...');
      const pdfPath = await this.pptService.convertToPDF(pptPath, cardNewsData);
      Logger.log(`PDF 파일 생성 완료: ${pdfPath}`);
      this.lastGeneratedFile = pdfPath;
      
      return pdfPath;
    }, '일일 작업 실행 중 오류 발생', await this.createFallbackPPT('daily'));
  }

  public async runMonthlyTask(): Promise<string> {
    return tryCatch(async () => {
      Logger.log('월간 뉴스 요약 작업 시작...');
      
      Logger.log('뉴스 데이터 수집 중...');
      const allMonthNews = await this.newsService.fetchAllNews();
      Logger.log(`뉴스 데이터 수집 완료: ${allMonthNews.length}개 항목`);
      
      if (allMonthNews.length === 0) {
        Logger.warn('수집된 뉴스가 없습니다.');
        const fallbackPath = this.createFallbackPPT('monthly');
        this.lastGeneratedFile = await fallbackPath;
        return fallbackPath;
      }
      
      Logger.log('뉴스 분석 시작...');
      const analyzedNews = await this.aiService.analyzeNewsItems(allMonthNews);
      Logger.log(`${analyzedNews.length}개의 뉴스 분석 완료`);
      
      Logger.log('중요 뉴스 필터링...');
      const importantNews = this.aiService.filterImportantNews(analyzedNews, 5); // 5개로 수정
      Logger.log(`${importantNews.length}개의 중요 뉴스 선택됨`);
      
      Logger.log('카드뉴스 콘텐츠 생성 중...');
      const cardNewsContent = await this.aiService.generateCardNewsContent(importantNews, 'monthly');
      Logger.log('카드뉴스 콘텐츠 생성 완료');
      
      let cardNewsData;
      try {
        cardNewsData = JSON.parse(cardNewsContent);
      } catch (jsonError) {
        Logger.error('카드뉴스 콘텐츠 JSON 파싱 실패:', jsonError);
      }
      
      Logger.log('PPT 파일 생성 중...');
      const pptPath = await this.pptService.generateCardNewsPPT(cardNewsContent, 'monthly');
      
      if (!pptPath || typeof pptPath !== 'string') {
        Logger.error('PPT 경로가 반환되지 않았습니다. 폴백 파일을 생성합니다.');
        const fallbackPath = this.createFallbackPPT('monthly');
        this.lastGeneratedFile = await fallbackPath;
        return fallbackPath;
      }
      
      Logger.log(`월간 카드뉴스 PPT 생성 완료: ${pptPath}`);
      
      if (!fs.existsSync(pptPath)) {
        Logger.error(`생성된 PPT 파일이 존재하지 않습니다: ${pptPath}`);
        const fallbackPath = this.createFallbackPPT('monthly');
        this.lastGeneratedFile = await fallbackPath;
        return fallbackPath;
      }
      
      this.lastGeneratedFile = pptPath;
      
      Logger.log('PDF 파일 변환 시작...');
      const pdfPath = await this.pptService.convertToPDF(pptPath, cardNewsData);
      Logger.log(`PDF 파일 생성 완료: ${pdfPath}`);
      this.lastGeneratedFile = pdfPath;
      
      return pdfPath;
    }, '월간 작업 실행 중 오류 발생', await this.createFallbackPPT('monthly'));
  }
  private createFallbackPPT(type: 'daily' | 'monthly'): string {
    const outputDir = path.join(process.cwd(), 'data', 'output');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const dateStr = getCurrentDateString();
    
    const uniqueId = Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(-5);
    
    const fileName = `${type === 'daily' ? 'Daily' : 'Monthly'}_IT_News_${dateStr}_${uniqueId}.pptx`;
    const filePath = path.join(outputDir, fileName);
    
    try {
      const files = fs.readdirSync(outputDir);
      for (const file of files) {
        if (file.includes('2025-')) {
          try {
            fs.unlinkSync(path.join(outputDir, file));
            Logger.log(`미래 파일 삭제: ${file}`);
          } catch (e) {
            // 파일 삭제 실패 무시
          }
        }
      }
    } catch (e) {
      Logger.error('디렉토리 정리 중 오류:', e);
    }
    
    try {
      fs.writeFileSync(filePath, 'Placeholder');
      this.createRealFallbackPPT(type, filePath, dateStr);
      return filePath;
    } catch (e) {
      Logger.error('폴백 파일 생성 오류:', e);
      return path.join(outputDir, `${type}_Fallback_${uniqueId}.pptx`);
    }
  }

  private createRealFallbackPPT(type: 'daily' | 'monthly', filePath: string, dateStr: string): void {
    const fallbackCardNewsContent = {
      slides: [
        {
          type: "cover",
          title: `${type === 'daily' ? '일일' : '월간'} IT 기술 동향`,
          subtitle: `${dateStr} - 오류 복구 모드`
        },
        {
          type: "news",
          title: "일시적인 오류가 발생했습니다",
          content: "뉴스 데이터를 가져오거나 처리하는 과정에서 문제가 발생했습니다. 인터넷 연결을 확인하거나 나중에 다시 시도해보세요.",
          tags: ['오류', '알림']
        },
        {
          type: "summary",
          title: "안내",
          content: "이 카드뉴스는 오류가 발생하여 자동으로 생성된 대체 콘텐츠입니다. 다시 시도하시면 정상적인 콘텐츠를 볼 수 있습니다."
        }
      ]
    };
    
    const jsonContent = JSON.stringify(fallbackCardNewsContent);
    
    this.pptService.generateCardNewsPPT(jsonContent, type, dateStr)
      .then(generatedPath => Logger.log(`실제 폴백 PPT 파일 생성 성공: ${generatedPath}`))
      .catch(err => Logger.error('폴백 PPT 생성 중 오류:', err));
  }

  public start(): void {
    try {
      const dailyCronExpression = process.env.DAILY_CRON || '0 9 * * *';
      const monthlyCronExpression = process.env.MONTHLY_CRON || '0 9 1 * *';
      
      this.dailyTask = cron.schedule(dailyCronExpression, async () => {
        try {
          await this.runDailyTask();
        } catch (error) {
          Logger.error('일일 스케줄 작업 실행 중 오류 발생:', error);
        }
      });
      
      this.monthlyTask = cron.schedule(monthlyCronExpression, async () => {
        try {
          await this.runMonthlyTask();
        } catch (error) {
          Logger.error('월간 스케줄 작업 실행 중 오류 발생:', error);
        }
      });
      
      Logger.log(`스케줄러 시작됨 - 일일: ${dailyCronExpression}, 월간: ${monthlyCronExpression}`);
    } catch (error) {
      Logger.error('스케줄러 시작 중 오류 발생:', error);
      throw error;
    }
  }

  public stop(): void {
    if (this.dailyTask) this.dailyTask.stop();
    if (this.monthlyTask) this.monthlyTask.stop();
    Logger.log('스케줄러 중지됨');
  }
} 