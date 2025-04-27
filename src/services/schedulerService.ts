import cron from 'node-cron';
import { NewsService } from './newsService';
import { AIService } from './aiService';
import { HtmlCardService } from './htmlCardService';
import path from 'path';
import fs from 'fs';
import { tryCatch } from '../utils/errorHandler';
import { Logger } from '../utils/logger';
import { getCurrentDateString, generateUniqueId } from '../utils/dateUtils';
import { NEWS_CONSTANTS } from '../config/constants';

export class SchedulerService {
  private static instance: SchedulerService;
  private newsService = NewsService.getInstance();
  private aiService = AIService.getInstance();
  private htmlCardService = HtmlCardService.getInstance();
  private dailyTask: cron.ScheduledTask | null = null;
  private monthlyTask: cron.ScheduledTask | null = null;
  private lastGeneratedFile: string | null = null;
  private dataPath: string;

  private constructor() {
    this.dataPath = path.join(process.cwd(), 'data');
    // 데이터 저장 디렉토리 생성
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    const directories = [
      path.join(this.dataPath, 'output'),
      path.join(this.dataPath, 'news'),
      path.join(this.dataPath, 'templates'),
      path.join(process.cwd(), 'logs')
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          Logger.log(`디렉토리 생성됨: ${dir}`);
        } catch (error) {
          Logger.error(`디렉토리 생성 실패: ${dir}`, error);
        }
      }
    }
  }

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

      // 1단계: 뉴스 데이터 수집
      Logger.log('뉴스 데이터 수집 중...');
      const newsItems = await this.collectNewsData();
      Logger.log(`뉴스 데이터 수집 완료: ${newsItems.length}개 항목`);

      if (!newsItems || newsItems.length === 0) {
        Logger.warn('수집된 뉴스가 없습니다.');
        const fallbackPath = await this.createFallbackPDF('daily');
        this.lastGeneratedFile = fallbackPath;
        return fallbackPath;
      }

      // 2단계: 뉴스 분석
      Logger.log('뉴스 분석 시작...');
      const analyzedNews = await this.aiService.analyzeNewsItems(newsItems);
      Logger.log(`${analyzedNews.length}개의 뉴스 분석 완료`);

      // 3단계: 중요 뉴스 필터링
      Logger.log('중요 뉴스 필터링...');
      const importantNews = this.aiService.filterImportantNews(analyzedNews, 5);
      Logger.log(`${importantNews.length}개의 중요 뉴스 선택됨`);

      // 4단계: 카드뉴스 콘텐츠 생성
      Logger.log('카드뉴스 콘텐츠 생성 중...');
      const cardNewsContent = await this.aiService.generateCardNewsContent(importantNews, 'daily');
      Logger.log('카드뉴스 콘텐츠 생성 완료');

      // 5단계: PDF 생성
      Logger.log('PDF 파일 생성 중...');
      const pdfPath = await this.htmlCardService.generateCardNewsPDF(cardNewsContent, 'daily');
      
      if (!pdfPath || typeof pdfPath !== 'string' || !fs.existsSync(pdfPath)) {
        Logger.error('PDF 파일 생성 실패');
        const fallbackPath = await this.createFallbackPDF('daily');
        this.lastGeneratedFile = fallbackPath;
        return fallbackPath;
      }

      Logger.log(`카드뉴스 PDF 생성 완료: ${pdfPath}`);
      this.lastGeneratedFile = pdfPath;

      // 6단계: 결과 저장 및 로깅
      this.saveGenerationResult({
        type: 'daily',
        date: getCurrentDateString(),
        path: pdfPath,
        newsCount: newsItems.length,
        analyzedCount: analyzedNews.length,
        selectedCount: importantNews.length
      });

      return pdfPath;
    }, '일일 작업 실행 중 오류 발생', await this.createFallbackPDF('daily'));
  }

  public async runMonthlyTask(): Promise<string> {
    return tryCatch(async () => {
      Logger.log('월간 뉴스 요약 작업 시작...');

      // 1단계: 한 달치 뉴스 데이터 수집
      Logger.log('뉴스 데이터 수집 중...');
      const allMonthNews = await this.collectMonthlyNewsData();
      Logger.log(`뉴스 데이터 수집 완료: ${allMonthNews.length}개 항목`);

      if (allMonthNews.length === 0) {
        Logger.warn('수집된 뉴스가 없습니다.');
        const fallbackPath = await this.createFallbackPDF('monthly');
        this.lastGeneratedFile = fallbackPath;
        return fallbackPath;
      }

      // 2단계: 뉴스 분석
      Logger.log('뉴스 분석 시작...');
      const analyzedNews = await this.aiService.analyzeNewsItems(allMonthNews);
      Logger.log(`${analyzedNews.length}개의 뉴스 분석 완료`);

      // 3단계: 중요 뉴스 필터링
      Logger.log('중요 뉴스 필터링...');
      const importantNews = this.aiService.filterImportantNews(analyzedNews, 7); // 월간은 더 많은 뉴스 포함
      Logger.log(`${importantNews.length}개의 중요 뉴스 선택됨`);

      // 4단계: 카드뉴스 콘텐츠 생성
      Logger.log('카드뉴스 콘텐츠 생성 중...');
      const cardNewsContent = await this.aiService.generateCardNewsContent(importantNews, 'monthly');
      Logger.log('카드뉴스 콘텐츠 생성 완료');

      // 5단계: PDF 생성
      Logger.log('PDF 파일 생성 중...');
      const pdfPath = await this.htmlCardService.generateCardNewsPDF(cardNewsContent, 'monthly');

      if (!pdfPath || typeof pdfPath !== 'string' || !fs.existsSync(pdfPath)) {
        Logger.error('PDF 파일 생성 실패');
        const fallbackPath = await this.createFallbackPDF('monthly');
        this.lastGeneratedFile = fallbackPath;
        return fallbackPath;
      }

      Logger.log(`월간 카드뉴스 PDF 생성 완료: ${pdfPath}`);
      this.lastGeneratedFile = pdfPath;

      // 6단계: 결과 저장 및 로깅
      this.saveGenerationResult({
        type: 'monthly',
        date: getCurrentDateString(),
        path: pdfPath,
        newsCount: allMonthNews.length,
        analyzedCount: analyzedNews.length,
        selectedCount: importantNews.length
      });

      return pdfPath;
    }, '월간 작업 실행 중 오류 발생', await this.createFallbackPDF('monthly'));
  }

  // 새로운 뉴스 데이터 수집 메서드
  private async collectNewsData(): Promise<any[]> {
    const newsItems = await this.newsService.fetchAllNews();
    
    // 키워드 기반 추가 뉴스 수집
    const keywords = NEWS_CONSTANTS.SEARCH_KEYWORDS;
    const keywordPromises = keywords.map(keyword => this.newsService.fetchNewsByKeyword(keyword));
    const keywordNewsResults = await Promise.all(keywordPromises);
    
    // 모든 뉴스 합치기 (중복 제거)
    const allNews = [...newsItems];
    keywordNewsResults.forEach(newsArray => {
      newsArray.forEach(news => {
        if (!allNews.find(item => item.link === news.link)) {
          allNews.push(news);
        }
      });
    });
    
    return allNews;
  }

  // 한 달치 뉴스 데이터 수집 메서드
  private async collectMonthlyNewsData(): Promise<any[]> {
    // 기본 뉴스 데이터 가져오기
    const newsItems = await this.collectNewsData();
    
    // 캐시된 뉴스 데이터도 가져오기
    const cachedNews = this.loadCachedMonthlyNews();
    
    // 모든 뉴스 합치기 (중복 제거)
    const allNews = [...newsItems];
    cachedNews.forEach(news => {
      if (!allNews.find(item => item.link === news.link)) {
        allNews.push(news);
      }
    });
    
    return allNews;
  }

  // 캐시된 뉴스 데이터 로드
  private loadCachedMonthlyNews(): any[] {
    const newsDir = path.join(this.dataPath, 'news');
    if (!fs.existsSync(newsDir)) return [];
    
    try {
      const files = fs.readdirSync(newsDir);
      const newsFiles = files.filter(file => file.endsWith('.json'));
      
      let cachedNews: any[] = [];
      
      for (const file of newsFiles) {
        try {
          const data = fs.readFileSync(path.join(newsDir, file), 'utf8');
          const newsItems = JSON.parse(data);
          cachedNews = cachedNews.concat(newsItems);
        } catch (e) {
          Logger.error(`캐시 파일 읽기 오류: ${file}`, e);
        }
      }
      
      return cachedNews;
    } catch (e) {
      Logger.error('캐시된 뉴스 데이터 로드 오류', e);
      return [];
    }
  }

  private async createFallbackPDF(type: 'daily' | 'monthly'): Promise<string> {
    const outputDir = path.join(this.dataPath, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const dateStr = getCurrentDateString();
    const uniqueId = generateUniqueId();
    const fileName = `${type === 'daily' ? 'Daily' : 'Monthly'}_IT_News_${dateStr}_${uniqueId}.pdf`;
    const filePath = path.join(outputDir, fileName);

    try {
      // 폴백 콘텐츠 생성
      const fallbackCardNewsContent = JSON.stringify({
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
      });

      // PDF 생성
      const pdfPath = await this.htmlCardService.generateCardNewsPDF(fallbackCardNewsContent, type);
      Logger.log(`폴백 PDF 파일 생성 성공: ${pdfPath}`);
      return pdfPath;
    } catch (err) {
      Logger.error('폴백 PDF 생성 중 오류:', err);
      // 최소한의 파일이라도 생성
      fs.writeFileSync(filePath, 'Error occurred');
      return filePath;
    }
  }

  // 결과 저장 메서드
  private saveGenerationResult(result: {
    type: 'daily' | 'monthly';
    date: string;
    path: string;
    newsCount: number;
    analyzedCount: number;
    selectedCount: number;
  }): void {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const logFile = path.join(logsDir, 'generation_results.json');
      let results: any[] = [];
      
      if (fs.existsSync(logFile)) {
        try {
          results = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        } catch (e) {
          Logger.error('기존 로그 파일 읽기 오류', e);
        }
      }
      
      results.push({
        ...result,
        timestamp: new Date().toISOString()
      });
      
      fs.writeFileSync(logFile, JSON.stringify(results, null, 2), 'utf8');
      Logger.log('생성 결과가 저장되었습니다.');
    } catch (error) {
      Logger.error('생성 결과 저장 중 오류 발생:', error);
    }
  }

  public start(): void {
    try {
      const dailyCronExpression = process.env.DAILY_CRON || NEWS_CONSTANTS.DAILY_CRON;
      const monthlyCronExpression = process.env.MONTHLY_CRON || NEWS_CONSTANTS.MONTHLY_CRON;

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
  
  // 수동으로 작업 실행할 수 있는 메서드 추가
  public async runTaskManually(type: 'daily' | 'monthly'): Promise<string> {
    Logger.log(`수동으로 ${type} 작업 실행...`);
    return type === 'daily' ? this.runDailyTask() : this.runMonthlyTask();
  }
}
