import axios from 'axios';
import { NewsItem } from '../types/news';
import fs from 'fs';
import path from 'path';
import { NEWS_CONSTANTS } from '../config/constants';

export class NewsService {
  private static instance: NewsService;
  private newsApiKey: string | undefined;
  private cachePath: string;

  private constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY;
    this.cachePath = path.join(process.cwd(), 'data', 'news');
    if (!fs.existsSync(this.cachePath)) {
      fs.mkdirSync(this.cachePath, { recursive: true });
    }
  }

  public static getInstance(): NewsService {
    if (!NewsService.instance) NewsService.instance = new NewsService();
    return NewsService.instance;
  }

  public async fetchAllNews(): Promise<NewsItem[]> {
    console.log('News API에서 데이터 수집 시작...');
    
    const cachePath = path.join(this.cachePath, 'all_news.json');
    const cachedNews = this.loadFromCache(cachePath);
    
    if (cachedNews.length > 0) {
      return cachedNews;
    }
    
    if (!this.newsApiKey) {
      console.error('News API 키가 설정되지 않았습니다.');
      return [];
    }
    
    try {
      const apiUrl = `${NEWS_CONSTANTS.NEWS_API_URL}?country=${NEWS_CONSTANTS.NEWS_API_COUNTRY}&category=${NEWS_CONSTANTS.NEWS_API_CATEGORY}&apiKey=${this.newsApiKey}`;
      const response = await axios.get(apiUrl);
      
      if (response.data && response.data.articles) {
        const newsItems = this.parseNewsApi(response.data);
        this.saveToCache(cachePath, newsItems);
        return newsItems;
      }
      
      return [];
    } catch (error) {
      console.error('뉴스 데이터 수집 중 오류 발생:', error);
      return [];
    }
  }

  public async fetchNewsByKeyword(keyword: string): Promise<NewsItem[]> {
    if (!keyword) {
      console.error('키워드가 제공되지 않았습니다.');
      return [];
    }
    
    console.log(`"${keyword}" 키워드로 뉴스 검색 시작...`);
    
    const cachePath = path.join(this.cachePath, `${keyword.replace(/\s+/g, '_')}_news.json`);
    const cachedNews = this.loadFromCache(cachePath);
    
    if (cachedNews.length > 0) {
      return cachedNews;
    }
    
    if (!this.newsApiKey) {
      console.error('News API 키가 설정되지 않았습니다.');
      return [];
    }
    
    try {
      const apiUrl = `${NEWS_CONSTANTS.NEWS_API_SEARCH_URL}?q=${encodeURIComponent(keyword)}&language=${NEWS_CONSTANTS.NEWS_API_LANGUAGE}&apiKey=${this.newsApiKey}`;
      const response = await axios.get(apiUrl);
      
      if (response.data && response.data.articles) {
        const newsItems = this.parseNewsApi(response.data);
        this.saveToCache(cachePath, newsItems);
        return newsItems;
      }
      
      return [];
    } catch (error) {
      console.error('키워드 검색 중 오류 발생:', error);
      return [];
    }
  }

  private parseNewsApi(data: any): NewsItem[] {
    if (!data || !data.articles || !Array.isArray(data.articles)) {
      return [];
    }
    
    return data.articles
      .filter((article: any) => article.title && article.description)
      .map((article: any) => ({
        title: article.title,
        description: article.description || article.title,
        link: article.url,
        publishDate: new Date(article.publishedAt),
        source: article.source?.name || NEWS_CONSTANTS.NEWS_API_SOURCE_NAME
      }));
  }

  private loadFromCache(cachePath: string): NewsItem[] {
    if (!fs.existsSync(cachePath)) return [];
    
    const stats = fs.statSync(cachePath);
    const fileAge = Date.now() - stats.mtimeMs;
    
    if (fileAge > NEWS_CONSTANTS.CACHE_EXPIRY) {
      return [];
    }
    
    try {
      const data = fs.readFileSync(cachePath, 'utf8');
      return JSON.parse(data).map((item: any) => ({
        ...item,
        publishDate: new Date(item.publishDate)
      }));
    } catch {
      return [];
    }
  }

  private saveToCache(cachePath: string, newsItems: NewsItem[]): void {
    try {
      fs.writeFileSync(cachePath, JSON.stringify(newsItems), 'utf8');
      console.log(`${newsItems.length}개의 뉴스 항목이 캐시에 저장되었습니다.`);
    } catch (error) {
      console.error('캐시 저장 중 오류 발생:', error);
    }
  }

  public async testFetchNews(): Promise<{ success: boolean, count: number }> {
    try {
      const newsItems = await this.fetchAllNews();
      return { success: newsItems.length > 0, count: newsItems.length };
    } catch (error) {
      console.error('뉴스 테스트 실패:', error);
      return { success: false, count: 0 };
    }
  }

  public async testKeywordSearch(keyword: string): Promise<{ success: boolean, count: number }> {
    try {
      const newsItems = await this.fetchNewsByKeyword(keyword);
      return { success: newsItems.length > 0, count: newsItems.length };
    } catch (error) {
      console.error('키워드 검색 테스트 실패:', error);
      return { success: false, count: 0 };
    }
  }
} 