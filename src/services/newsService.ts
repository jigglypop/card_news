import axios, { AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';
import { NewsItem } from '../types/news';

/**
 * NewsAPI를 사용하여 뉴스를 수집하는 서비스
 */
export class NewsService {
  private static instance: NewsService;
  private newsDataPath: string;
  private apiKey: string;
  private apiUrl: string = 'https://newsapi.org/v2';
  private keywords: string[];
  
  private constructor() {
    this.newsDataPath = path.join(process.cwd(), 'data', 'news');
    if (!fs.existsSync(this.newsDataPath)) {
      fs.mkdirSync(this.newsDataPath, { recursive: true });
    }
    
    // API 키 설정
    this.apiKey = process.env.NEWS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('NEWS_API_KEY가 환경 변수에 설정되지 않았습니다');
    }
    
    // 키워드 설정 - 일반적인 IT 트렌드 키워드 사용
    const keywordsStr = process.env.NEWS_KEYWORDS || '인공지능 트렌드,IT 기술 동향,소프트웨어 개발,보안 이슈,디지털 혁신';
    this.keywords = keywordsStr.split(',').map(k => k.trim());
    console.log(`뉴스 검색에 사용할 키워드: ${this.keywords.join(', ')}`);
  }

  public static getInstance(): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService();
    }
    return NewsService.instance;
  }

  /**
   * 에러 객체의 세부 정보를 추출하여 문자열로 반환합니다.
   */
  private getDetailedErrorInfo(error: any): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return `상태: ${axiosError.response?.status || 'N/A'}, 
              메시지: ${axiosError.message}, 
              URL: ${axiosError.config?.url || 'N/A'}, 
              응답 데이터: ${JSON.stringify(axiosError.response?.data || {})}`;
    }
    
    return `타입: ${error.name || typeof error}, 메시지: ${error.message || '알 수 없는 오류'}, 스택: ${error.stack || 'N/A'}`;
  }

  /**
   * NewsAPI에서 특정 키워드로 뉴스를 검색합니다.
   * @param keyword 검색 키워드
   */
  public async fetchNewsFromSource(keyword: string): Promise<NewsItem[]> {
    try {
      console.log(`NewsAPI에서 ${keyword} 관련 뉴스 검색 중...`);
      
      // API 키 확인
      if (!this.apiKey) {
        console.error('NewsAPI 키가 설정되지 않았습니다. API 요청이 실패할 수 있습니다.');
      }
      
      // 키워드 기반 검색은 everything 엔드포인트 사용
      const url = `${this.apiUrl}/everything`;
      
      // 오늘 날짜와 7일 전 날짜 계산 (최신 뉴스만)
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      
      const fromDate = weekAgo.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      const toDate = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      
      // 회사 보도자료 제외 쿼리 구성
      const excludeTerms = '-출시 -발표 -제품 -론칭 -판매 -구매 -할인';
      const searchQuery = `${keyword} ${excludeTerms}`;
      
      // API 파라미터 구성
      const params: Record<string, string> = {
        apiKey: this.apiKey,
        q: searchQuery,
        language: 'ko', // 한국어 뉴스
        from: fromDate,
        to: toDate,
        sortBy: 'relevancy', // 관련성 기준 정렬
        pageSize: '5' // 소수의 뉴스만 가져옴
      };
      
      console.log(`API 요청: ${url}, 키워드: ${searchQuery}, 기간: ${fromDate} ~ ${toDate}`);
      
      // NewsAPI 요청 (타임아웃 및 재시도 설정 추가)
      const response = await axios.get(url, { 
        params,
        timeout: 10000, // 10초 타임아웃
        validateStatus: (status) => status < 500 // 500 미만 상태 코드는 오류로 처리하지 않음
      });
      
      // 응답 확인
      if (response.status !== 200) {
        console.error(`NewsAPI 요청 오류: 상태 코드 ${response.status}, 응답: ${JSON.stringify(response.data)}`);
        return [];
      }
      
      // 응답 데이터 확인
      const data = response.data;
      if (data.status !== 'ok' || !data.articles || !Array.isArray(data.articles)) {
        console.error(`NewsAPI 잘못된 응답: 상태=${data.status}, 메시지=${data.message || '없음'}, 데이터 형식=${typeof data.articles}`);
        return [];
      }
      
      console.log(`키워드 '${keyword}' 검색 결과: 총 ${data.totalResults}개 중 ${data.articles.length}개 항목 반환`);
      
      // 뉴스 항목 변환 및 필터링 (제품 출시나 회사 홍보성 뉴스 제외)
      const newsItems: NewsItem[] = data.articles
        .filter((article: any) => {
          const title = article.title || '';
          const desc = article.description || '';
          // 제품 출시, 회사 홍보성 뉴스 필터링
          return !(
            title.includes('출시') || 
            title.includes('발표') || 
            title.includes('제품') || 
            title.includes('론칭') || 
            title.includes('판매') || 
            desc.includes('출시') || 
            desc.includes('제품') || 
            desc.includes('판매')
          );
        })
        .map((article: any) => ({
          title: article.title || '제목 없음',
          link: article.url || '',
          description: article.description || article.content || '내용 없음',
          pubDate: article.publishedAt || new Date().toISOString(),
          source: article.source?.name || keyword
        }));
      
      console.log(`키워드 '${keyword}'로 ${newsItems.length}개의 IT 트렌드 뉴스 항목 찾음 (필터링 후)`);
      return newsItems;
    } catch (error) {
      const errorDetails = this.getDetailedErrorInfo(error);
      console.error(`NewsAPI 요청 중 오류 (키워드: ${keyword}):\n${errorDetails}`);
      
      // 오류 로그 파일에 저장
      try {
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const logPath = path.join(logDir, `newsapi-error-${timestamp}.log`);
        fs.writeFileSync(logPath, `시간: ${new Date().toISOString()}\n키워드: ${keyword}\n오류 내용:\n${errorDetails}\n`);
        console.log(`오류 로그가 ${logPath}에 저장되었습니다.`);
      } catch (logError) {
        console.error('오류 로그 저장 실패:', logError);
      }
      
      return [];
    }
  }

  /**
   * 주요 IT 동향 뉴스를 가져옵니다.
   */
  private async fetchTopTrends(): Promise<NewsItem[]> {
    try {
      console.log('NewsAPI에서 주요 IT 동향 뉴스 가져오는 중...');
      
      // 동향 검색은 everything 엔드포인트 사용
      const url = `${this.apiUrl}/everything`;
      
      // 오늘 날짜와 14일 전 날짜 계산 (최신 뉴스만)
      const today = new Date();
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(today.getDate() - 14);
      
      const fromDate = twoWeeksAgo.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      const toDate = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      
      // IT 동향 검색어 구성 - 제품 출시 제외
      const searchQuery = '(AI 트렌드 OR 기술 동향 OR IT 동향 OR 디지털 트랜스포메이션) -출시 -발표 -제품';
      
      // API 파라미터 구성
      const params = {
        apiKey: this.apiKey,
        q: searchQuery,
        language: 'ko', // 한국어 뉴스
        from: fromDate,
        to: toDate,
        sortBy: 'relevancy', // 관련성 기준 정렬
        pageSize: '5' // 주요 뉴스 5개만
      };
      
      console.log('IT 동향 API 요청:', url);
      
      // NewsAPI 요청 (타임아웃 및 재시도 설정 추가)
      const response = await axios.get(url, { 
        params,
        timeout: 10000, // 10초 타임아웃
        validateStatus: (status) => status < 500 // 500 미만 상태 코드는 오류로 처리하지 않음
      });
      
      // 응답 확인
      if (response.status !== 200) {
        console.error(`IT 동향 요청 오류: 상태 코드 ${response.status}, 응답: ${JSON.stringify(response.data)}`);
        return [];
      }
      
      // 응답 데이터 확인
      const data = response.data;
      if (data.status !== 'ok' || !data.articles || !Array.isArray(data.articles)) {
        console.error(`IT 동향 잘못된 응답: 상태=${data.status}, 메시지=${data.message || '없음'}, 데이터 형식=${typeof data.articles}`);
        return [];
      }
      
      console.log(`IT 동향 API 응답: 총 ${data.totalResults}개 중 ${data.articles.length}개 항목 반환`);
      
      // 뉴스 항목 변환 
      const newsItems: NewsItem[] = data.articles
        .filter((article: any) => {
          const title = article.title || '';
          const desc = article.description || '';
          // 제품 출시, 회사 홍보성 뉴스 필터링
          return !(
            title.includes('출시') || 
            title.includes('발표') || 
            title.includes('제품') || 
            title.includes('론칭') || 
            title.includes('판매') || 
            desc.includes('출시') || 
            desc.includes('제품') || 
            desc.includes('판매')
          );
        })
        .map((article: any) => ({
          title: article.title || '제목 없음',
          link: article.url || '',
          description: article.description || article.content || '내용 없음',
          pubDate: article.publishedAt || new Date().toISOString(),
          source: article.source?.name || 'IT 동향'
        }));
      
      console.log(`${newsItems.length}개의 IT 동향 뉴스를 찾았습니다.`);
      return newsItems;
    } catch (error) {
      const errorDetails = this.getDetailedErrorInfo(error);
      console.error(`IT 동향 요청 중 오류:\n${errorDetails}`);
      
      // 오류 로그 파일에 저장
      try {
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const logPath = path.join(logDir, `trends-error-${timestamp}.log`);
        fs.writeFileSync(logPath, `시간: ${new Date().toISOString()}\n오류 내용:\n${errorDetails}\n`);
        console.log(`오류 로그가 ${logPath}에 저장되었습니다.`);
      } catch (logError) {
        console.error('오류 로그 저장 실패:', logError);
      }
      
      return [];
    }
  }

  /**
   * 모든 소스에서 뉴스를 수집합니다.
   */
  public async fetchAllNews(): Promise<NewsItem[]> {
    console.log('카드뉴스용 주요 IT 기술 동향 뉴스 수집 시작...');
    
    try {
      // 폴백 뉴스 데이터 준비 (API 요청이 모두 실패할 경우 사용)
      const fallbackNews: NewsItem[] = [
        {
          title: '[폴백] AI 기술 발전 동향과 미래',
          description: '인공지능 기술의 최신 동향과 앞으로의 발전 방향을 살펴봅니다.',
          link: 'https://example.com/ai-trends',
          pubDate: new Date().toISOString(),
          source: 'fallback'
        },
        {
          title: '[폴백] 사이버 보안 위협과 대응 방안',
          description: '급증하는 사이버 보안 위협과 기업의 효과적인 대응 전략을 분석합니다.',
          link: 'https://example.com/security-trends',
          pubDate: new Date().toISOString(),
          source: 'fallback'
        }
      ];
      
      // 1. IT 기술 동향 뉴스
      const trendNews = await this.fetchTopTrends().catch(err => {
        console.error('IT 동향 뉴스 수집 실패:', err);
        return [];
      });
      
      // 2. 키워드별 뉴스 
      const keywordNewsPromises = this.keywords.map(keyword => 
        this.fetchNewsFromSource(keyword).catch(err => {
          console.error(`'${keyword}' 키워드 뉴스 수집 실패:`, err);
          return [];
        })
      );
      
      const keywordNewsArrays = await Promise.all(keywordNewsPromises);
      const keywordNews = keywordNewsArrays.flat();
      
      // 모든 뉴스 결합
      let allNews = [...trendNews, ...keywordNews];
      
      // 결과가 없을 경우 폴백 뉴스 사용
      if (allNews.length === 0) {
        console.warn('뉴스 수집 실패. 폴백 뉴스를 사용합니다.');
        allNews = fallbackNews;
      }
      
      // 중복 제거 (URL 기준)
      const uniqueUrls = new Set<string>();
      const uniqueNews = allNews.filter(news => {
        if (uniqueUrls.has(news.link)) {
          return false;
        }
        uniqueUrls.add(news.link);
        return true;
      });
      
      // 최대 10개로 제한
      const limitedNews = uniqueNews.slice(0, 10);
      
      console.log(`카드뉴스용으로 ${limitedNews.length}개의 고품질 IT 동향 뉴스 항목 수집 완료`);
      
      // 수집 결과 로그 기록
      try {
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const logPath = path.join(logDir, `news-collection-${timestamp}.log`);
        fs.writeFileSync(logPath, `시간: ${new Date().toISOString()}\n수집된 뉴스 수: ${limitedNews.length}\n뉴스 목록:\n${JSON.stringify(limitedNews, null, 2)}\n`);
        console.log(`뉴스 수집 로그가 ${logPath}에 저장되었습니다.`);
      } catch (logError) {
        console.error('뉴스 수집 로그 저장 실패:', logError);
      }
      
      return limitedNews;
    } catch (error) {
      console.error('뉴스 수집 중 치명적 오류 발생:', error);
      
      // 오류 로그 파일에 저장
      try {
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const logPath = path.join(logDir, `fetch-all-error-${timestamp}.log`);
        fs.writeFileSync(logPath, `시간: ${new Date().toISOString()}\n오류 내용:\n${this.getDetailedErrorInfo(error)}\n`);
        console.log(`오류 로그가 ${logPath}에 저장되었습니다.`);
      } catch (logError) {
        console.error('오류 로그 저장 실패:', logError);
      }
      
      // 폴백 뉴스 반환
      return [
        {
          title: '[오류] 뉴스 수집 실패',
          description: '뉴스 수집 중 오류가 발생했습니다. 자세한 내용은 로그를 확인하세요.',
          link: 'https://example.com/error',
          pubDate: new Date().toISOString(),
          source: 'error'
        }
      ];
    }
  }

  /**
   * 수집된 뉴스를 저장합니다.
   */
  public saveNews(news: NewsItem[], frequency: 'daily' | 'monthly'): string {
    const date = new Date();
    let fileName: string;
    
    if (frequency === 'daily') {
      fileName = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.json`;
    } else {
      fileName = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}.json`;
    }

    try {
      const filePath = path.join(this.newsDataPath, fileName);
      fs.writeFileSync(filePath, JSON.stringify(news, null, 2));
      console.log(`${frequency === 'daily' ? '일일' : '월간'} 뉴스가 ${filePath}에 저장되었습니다.`);
      return filePath;
    } catch (error) {
      console.error(`뉴스 저장 중 오류 발생: ${error}`);
      
      // 오류 발생 시 대체 경로에 저장 시도
      const backupPath = path.join(process.cwd(), 'data', 'backup', fileName);
      try {
        const backupDir = path.join(process.cwd(), 'data', 'backup');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        fs.writeFileSync(backupPath, JSON.stringify(news, null, 2));
        console.log(`백업 위치에 뉴스가 저장되었습니다: ${backupPath}`);
        return backupPath;
      } catch (backupError) {
        console.error(`백업 저장 중 오류 발생: ${backupError}`);
        throw error; // 원래 오류 전파
      }
    }
  }
} 