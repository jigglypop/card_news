import { OpenAI } from 'openai';
import path from 'path';
import fs from 'fs';
import { AnalyzedNews, NewsItem } from '../types/news';
import { Logger } from '../utils/logger';
import { tryCatch } from '../utils/errorHandler';

export class AIService {
  private static instance: AIService;
  private openai: OpenAI | null = null;
  private isOpenAIAvailable: boolean = false;

  private constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    const logDir = path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
        Logger.log(`로그 디렉토리 생성됨: ${logDir}`);
      } catch (error) {
        Logger.error('로그 디렉토리 생성 실패:', error);
      }
    }
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      Logger.warn('OpenAI API 키가 설정되지 않았거나 유효하지 않습니다.');
      this.isOpenAIAvailable = false;
      return;
    }
    
    try {
      this.openai = new OpenAI({ apiKey });
      this.isOpenAIAvailable = true;
      Logger.log('OpenAI API 클라이언트가 초기화되었습니다.');
    } catch (error) {
      Logger.error('OpenAI 클라이언트 초기화 오류:', error);
      this.isOpenAIAvailable = false;
    }
  }

  public static getInstance(): AIService {
    if (!AIService.instance) AIService.instance = new AIService();
    return AIService.instance;
  }

  public async analyzeNewsItem(newsItem: NewsItem): Promise<AnalyzedNews | null> {
    if (!this.isOpenAIAvailable || !this.openai) {
      Logger.warn('OpenAI 기능을 사용할 수 없어 기본 분석 데이터를 반환합니다.');
      return this.createBasicAnalysis(newsItem);
    }

    return tryCatch(async () => {
      const prompt = `
다음의 IT 뉴스 기사에 대한 분석을 JSON 형식으로 제공해주세요.
제목: ${newsItem.title}
내용: ${newsItem.description}
출처: ${newsItem.source}
링크: ${newsItem.link}
다음 정보를 포함한 JSON 형식으로 응답해주세요:
1. title: 기사 제목 (원본 그대로)
2. content: 기사 내용 (원본 그대로)
3. summary: 기사 주요 내용 요약 (50자 이내. 카드뉴스의 서머리 형식으로 요약해주세요)
4. importance: 뉴스의 중요도 (1-10 척도, 10이 가장 중요)
5. category: 뉴스 카테고리 (AI, 클라우드, 보안, 모바일, 소프트웨어, 하드웨어, 블록체인 등 중에서 가장 적합한 것)
6. tags: 관련 키워드 (최대 5개, 배열 형식)
7. source: 뉴스 출처 (원본 그대로)
8. link: 뉴스 링크 (원본 그대로)
JSON 형식으로만 응답해주세요.`;

      const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
      const response = await this.openai?.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant that specializes in analyzing IT news articles and extracting key information. Respond only with the requested JSON format.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const content = response?.choices[0]?.message.content;
      if (!content) throw new Error('OpenAI 응답에 내용이 없습니다.');

      return JSON.parse(content) as AnalyzedNews;
    }, '뉴스 분석 중 오류 발생', this.createBasicAnalysis(newsItem));
  }

  public async analyzeNewsItems(newsItems: NewsItem[]): Promise<AnalyzedNews[]> {
    if (!newsItems || newsItems.length === 0) {
      Logger.warn('분석할 뉴스가 없습니다.');
      return [];
    }
    Logger.log(`${newsItems.length}개의 뉴스 분석 시작...`);
    const analysisPromises = newsItems.map(item => this.analyzeNewsItem(item));
    return tryCatch(async () => {
      const results = await Promise.all(analysisPromises);
      const filteredResults = results.filter((item): item is AnalyzedNews => item !== null);
      Logger.log(`${filteredResults.length}개의 뉴스 분석 완료`);
      return filteredResults;
    }, '뉴스 분석 중 오류 발생', []);
  }

  public filterImportantNews(analyzedNews: AnalyzedNews[], limit: number = 5): AnalyzedNews[] {
    if (!analyzedNews || analyzedNews.length === 0) {
      Logger.warn('필터링할 뉴스가 없습니다.');
      return [];
    }
    
    const sortedNews = [...analyzedNews].sort((a, b) => b.importance - a.importance);
    const limitedNews = sortedNews.slice(0, limit);
    Logger.log(`${analyzedNews.length}개 중 중요한 뉴스 ${limitedNews.length}개 선택됨`);
    return limitedNews;
  }

  public async generateCardNewsContent(analyzedNews: AnalyzedNews[], frequency: 'daily' | 'monthly'): Promise<string> {
    if (!analyzedNews || analyzedNews.length === 0) {
      Logger.warn('카드뉴스를 생성할 뉴스가 없습니다.');
      return JSON.stringify({ slides: this.createEmptySlides(frequency) });
    }
    
    if (!this.isOpenAIAvailable || !this.openai) {
      Logger.warn('OpenAI 기능을 사용할 수 없어 기본 카드뉴스를 생성합니다.');
      return JSON.stringify({ slides: this.createBasicSlides(analyzedNews, frequency) });
    }

    return tryCatch(async () => {
      Logger.log(`OpenAI API를 사용하여 ${frequency} 카드뉴스 콘텐츠 생성 시작...`);
      
      const newsItems = analyzedNews.map(news => 
        `제목: ${news.title}\n요약: ${news.summary}\n중요도: ${news.importance}\n카테고리: ${news.category}\n태그: ${news.tags.join(', ')}\n출처: ${news.source}\n링크: ${news.link}\n`
      ).join('\n---\n\n');

      const prompt = `
다음은 ${frequency === 'daily' ? '오늘의' : '이번 달의'} 주요 IT 뉴스 목록입니다:
${newsItems}
위 뉴스들을 기반으로 ${frequency === 'daily' ? '일간' : '월간'} IT 트렌드 카드뉴스를 만들려고 합니다.
카드뉴스는 표지 슬라이드와 뉴스 항목별 슬라이드, 그리고 마무리 슬라이드로 구성됩니다.

다음 형식으로 각 슬라이드의 내용을 제공해주세요:
1. 표지 슬라이드:
- 제목: ${frequency === 'daily' ? '오늘의' : '이번 달의'} IT 핫 뉴스
- 부제목: 가장 중요한 트렌드나 키워드

2. 뉴스 슬라이드 (각 주요 뉴스마다):
- 제목: 간결하고 흥미로운 제목
- 내용: 해당 뉴스의 핵심 내용 (최대 50자 이내로 매우 간결하게)
- 태그: 관련 키워드 (최대 3개)

3. 마무리 슬라이드:
- 제목: 핵심 요약
- 내용: 전체 트렌드의 핵심 내용 요약 (50자 이내)

JSON 형식으로 응답해주세요. 각 슬라이드는 다음 구조를 가져야 합니다:
{
  "slides": [
    {
      "type": "cover",
      "title": "제목",
      "subtitle": "부제목"
    },
    {
      "type": "news",
      "title": "뉴스 제목",
      "content": "뉴스 내용",
      "sourceUrl": "원본 링크",
      "tags": ["태그1", "태그2"]
    },
    ...
    {
      "type": "summary",
      "title": "요약 제목",
      "content": "요약 내용"
    }
  ]
}`;

      const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
      Logger.log(`사용 모델: ${model}`);
      
      const startTime = Date.now();
      
      const apiParams: any = {
        model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant that specializes in creating engaging card news content from IT news articles. Respond only with the requested JSON format.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      };
      
      if (!model.startsWith('o4-mini')) {
        apiParams.temperature = 0.7;
      }
      
      const response = await this.openai?.chat.completions.create(apiParams);
      const timeTaken = (Date.now() - startTime) / 1000;
      Logger.log(`OpenAI API 응답 수신 완료 (소요시간: ${timeTaken}초)`);
      
      const content = response?.choices[0]?.message.content;
      if (!content) throw new Error('OpenAI 응답에 내용이 없습니다.');

      try {
        const jsonContent = JSON.parse(content);
        Logger.log('OpenAI API 응답 JSON 파싱 성공');
        Logger.log(`슬라이드 수: ${jsonContent.slides.length}`);
        
        if (!jsonContent.slides || !Array.isArray(jsonContent.slides) || jsonContent.slides.length === 0) {
          throw new Error('slides 배열이 없거나 비어있습니다.');
        }
        
        const logPath = path.join(process.cwd(), 'logs', `cardnews-content-${new Date().toISOString().replace(/:/g, '-')}.json`);
        fs.writeFileSync(logPath, content);
        
        return content;
      } catch (jsonError) {
        Logger.error(`OpenAI API 응답 JSON 파싱 실패: ${jsonError}`);
        throw new Error('API 응답을 JSON으로 파싱할 수 없습니다.');
      }
    }, '카드뉴스 생성 중 오류 발생', JSON.stringify({ slides: this.createBasicSlides(analyzedNews, frequency) }));
  }

  private createBasicAnalysis(newsItem: NewsItem): AnalyzedNews {
    let category = '기타';
    const title = newsItem.title.toLowerCase();
    
    if (title.includes('ai') || title.includes('인공지능') || title.includes('머신러닝') || title.includes('딥러닝')) {
      category = 'AI';
    } else if (title.includes('클라우드') || title.includes('cloud')) {
      category = '클라우드';
    } else if (title.includes('보안') || title.includes('해킹') || title.includes('security')) {
      category = '보안';
    } else if (title.includes('모바일') || title.includes('스마트폰') || title.includes('앱')) {
      category = '모바일';
    } else if (title.includes('소프트웨어') || title.includes('sw') || title.includes('개발')) {
      category = '소프트웨어';
    }
    
    return {
      title: newsItem.title,
      content: newsItem.description,
      summary: newsItem.description.length > 100 ? 
        newsItem.description.substring(0, 97) + '...' : 
        newsItem.description,
      importance: 7,
      category,
      tags: [category, 'IT', '기술'],
      source: newsItem.source,
      link: newsItem.link
    };
  }
  
  private createEmptySlides(frequency: 'daily' | 'monthly'): any[] {
    return [
      {
        type: "cover",
        title: `${frequency === 'daily' ? '오늘의' : '이번 달의'} IT 뉴스`,
        subtitle: "수집된 뉴스가 없습니다."
      },
      {
        type: "summary",
        title: "알림",
        content: "뉴스 수집 중 오류가 발생했습니다. 나중에 다시 시도해 주세요."
      }
    ];
  }
  
  private createBasicSlides(analyzedNews: AnalyzedNews[], frequency: 'daily' | 'monthly'): any[] {
    const slides: any[] = [
      {
        type: "cover",
        title: `${frequency === 'daily' ? '오늘의' : '이번 달의'} IT 핫 뉴스`,
        subtitle: "최신 IT 트렌드"
      }
    ];
    
    for (const news of analyzedNews) {
      slides.push({
        type: "news",
        title: news.title,
        content: news.summary,
        sourceUrl: news.link,
        tags: news.tags.slice(0, 3)
      });
    }
    
    slides.push({
      type: "summary",
      title: "주요 IT 트렌드 요약",
      content: "기술 혁신과 디지털 전환이 지속적으로 진행되고 있습니다."
    });
    
    return slides;
  }
} 