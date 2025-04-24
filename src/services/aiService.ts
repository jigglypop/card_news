import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { AnalyzedNews, NewsItem } from '../types/news';
import path from 'path';
import fs from 'fs';

dotenv.config();

export class AIService {
  private static instance: AIService;
  private openai: OpenAI | null = null;
  private isOpenAIAvailable: boolean = false;

  private constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    // 로그 디렉토리 생성
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
        console.log(`로그 디렉토리 생성됨: ${logDir}`);
      } catch (error) {
        console.error('로그 디렉토리 생성 실패:', error);
      }
    }
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      console.warn('OpenAI API 키가 설정되지 않았거나 유효하지 않습니다.');
      this.isOpenAIAvailable = false;
    } else {
      try {
        this.openai = new OpenAI({
          apiKey: apiKey
        });
        this.isOpenAIAvailable = true;
        console.log('OpenAI API 클라이언트가 초기화되었습니다.');
      } catch (error) {
        console.error('OpenAI 클라이언트 초기화 오류:', error);
        this.isOpenAIAvailable = false;
      }
    }
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * 뉴스 기사를 분석하여 중요도, 카테고리, 태그 등을 추출합니다.
   */
  public async analyzeNewsItem(newsItem: NewsItem): Promise<AnalyzedNews | null> {
    // API 키가 없거나 유효하지 않은 경우
    if (!this.isOpenAIAvailable || !this.openai) {
      console.warn('OpenAI 기능을 사용할 수 없어 기본 분석 데이터를 반환합니다.');
      return this.createBasicAnalysis(newsItem);
    }

    try {
      const prompt = `
다음의 IT 뉴스 기사에 대한 분석을 JSON 형식으로 제공해주세요.

제목: ${newsItem.title}
내용: ${newsItem.description}
출처: ${newsItem.source}
링크: ${newsItem.link}

다음 정보를 포함한 JSON 형식으로 응답해주세요:
1. title: 기사 제목 (원본 그대로)
2. content: 기사 내용 (원본 그대로)
3. summary: 기사 주요 내용 요약 (100자 이내)
4. importance: 뉴스의 중요도 (1-10 척도, 10이 가장 중요)
5. category: 뉴스 카테고리 (AI, 클라우드, 보안, 모바일, 소프트웨어, 하드웨어, 블록체인 등 중에서 가장 적합한 것)
6. tags: 관련 키워드 (최대 5개, 배열 형식)
7. source: 뉴스 출처 (원본 그대로)
8. link: 뉴스 링크 (원본 그대로)

JSON 형식으로만 응답해주세요.
`;

      const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant that specializes in analyzing IT news articles and extracting key information. Respond only with the requested JSON format.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message.content;
      if (!content) {
        throw new Error('OpenAI 응답에 내용이 없습니다.');
      }

      return JSON.parse(content) as AnalyzedNews;
    } catch (error) {
      console.error('뉴스 분석 중 오류 발생:', error);
      return this.createBasicAnalysis(newsItem);
    }
  }

  /**
   * 여러 뉴스 기사를 분석합니다.
   */
  public async analyzeNewsItems(newsItems: NewsItem[]): Promise<AnalyzedNews[]> {
    // 뉴스가 없는 경우 빈 배열 반환
    if (!newsItems || newsItems.length === 0) {
      console.warn('분석할 뉴스가 없습니다.');
      return [];
    }
    
    console.log(`${newsItems.length}개의 뉴스 분석 시작...`);
    const analysisPromises = newsItems.map(item => this.analyzeNewsItem(item));
    
    try {
      const results = await Promise.all(analysisPromises);
      const filteredResults = results.filter((item): item is AnalyzedNews => item !== null);
      console.log(`${filteredResults.length}개의 뉴스 분석 완료`);
      return filteredResults;
    } catch (error) {
      console.error('뉴스 분석 중 오류 발생:', error);
      return [];
    }
  }

  /**
   * 분석된 뉴스를 중요도에 따라 정렬하고 필터링합니다.
   */
  public filterImportantNews(analyzedNews: AnalyzedNews[], limit: number = 10): AnalyzedNews[] {
    if (!analyzedNews || analyzedNews.length === 0) {
      console.warn('필터링할 뉴스가 없습니다.');
      return [];
    }
    
    const sortedNews = [...analyzedNews].sort((a, b) => b.importance - a.importance);
    const limitedNews = sortedNews.slice(0, limit);
    console.log(`${analyzedNews.length}개 중 중요한 뉴스 ${limitedNews.length}개 선택됨`);
    return limitedNews;
  }

  /**
   * 카드뉴스 콘텐츠를 생성합니다.
   */
  public async generateCardNewsContent(analyzedNews: AnalyzedNews[], frequency: 'daily' | 'monthly'): Promise<string> {
    // 분석된 뉴스가 없는 경우
    if (!analyzedNews || analyzedNews.length === 0) {
      console.warn('카드뉴스를 생성할 뉴스가 없습니다.');
      return JSON.stringify({ slides: this.createEmptySlides(frequency) });
    }
    
    // API 키가 없거나 유효하지 않은 경우
    if (!this.isOpenAIAvailable || !this.openai) {
      console.warn('OpenAI 기능을 사용할 수 없어 기본 카드뉴스를 생성합니다.');
      return JSON.stringify({ slides: this.createBasicSlides(analyzedNews, frequency) });
    }

    try {
      console.log(`OpenAI API를 사용하여 ${frequency} 카드뉴스 콘텐츠 생성 시작...`);
      console.log(`분석된 뉴스 ${analyzedNews.length}개를 사용하여 카드뉴스 생성 중`);
      
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
- 내용: 해당 뉴스의 핵심 내용 (1-2문장)
- 이미지 프롬프트: 해당 뉴스를 시각화할 수 있는 이미지 생성 프롬프트

3. 마무리 슬라이드:
- 제목: 핵심 요약
- 내용: 전체 트렌드의 핵심 내용 요약

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
      "imagePrompt": "이미지 생성 프롬프트",
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
}
`;

      const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
      console.log(`사용 모델: ${model}`);
      
      // API 요청 시작 시간 기록
      const startTime = Date.now();
      
      // o4-mini 모델은 temperature 매개변수를 지원하지 않으므로 제거
      const apiParams: any = {
        model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant that specializes in creating engaging card news content from IT news articles. Respond only with the requested JSON format.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      };
      
      // o4-mini 모델이 아닌 경우에만 temperature 설정
      if (!model.startsWith('o4-mini')) {
        apiParams.temperature = 0.7;
      }
      
      const response = await this.openai.chat.completions.create(apiParams);

      // API 요청 완료 시간 기록
      const endTime = Date.now();
      const timeTaken = (endTime - startTime) / 1000;
      console.log(`OpenAI API 응답 수신 완료 (소요시간: ${timeTaken}초)`);
      
      const content = response.choices[0]?.message.content;
      if (!content) {
        console.error('OpenAI API 응답에 내용이 없습니다.');
        throw new Error('OpenAI 응답에 내용이 없습니다.');
      }

      // JSON 유효성 검사
      try {
        const jsonContent = JSON.parse(content);
        console.log('OpenAI API 응답 JSON 파싱 성공');
        console.log(`슬라이드 수: ${jsonContent.slides.length}`);
        
        // JSON 구조 검증
        if (!jsonContent.slides || !Array.isArray(jsonContent.slides) || jsonContent.slides.length === 0) {
          console.error('OpenAI API 응답에 유효한 slides 배열이 없습니다.');
          throw new Error('slides 배열이 없거나 비어있습니다.');
        }
        
        // 카드뉴스 내용 로그 기록 (디버깅용)
        const logPath = path.join(process.cwd(), 'logs', `cardnews-content-${new Date().toISOString().replace(/:/g, '-')}.json`);
        try {
          fs.writeFileSync(logPath, content);
          console.log(`카드뉴스 내용이 ${logPath}에 저장되었습니다.`);
        } catch (logError) {
          console.error('카드뉴스 내용 저장 실패:', logError);
        }
        
        return content;
      } catch (jsonError) {
        console.error('OpenAI API 응답 JSON 파싱 실패:', jsonError);
        console.error('받은 응답:', content);
        throw new Error('API 응답을 JSON으로 파싱할 수 없습니다.');
      }
    } catch (error) {
      console.error('카드뉴스 생성 중 오류 발생:', error);
      console.error('오류 상세:', error instanceof Error ? error.stack : String(error));
      return JSON.stringify({ slides: this.createBasicSlides(analyzedNews, frequency) });
    }
  }

  /**
   * 기본적인 뉴스 분석 데이터를 생성합니다.
   */
  private createBasicAnalysis(newsItem: NewsItem): AnalyzedNews {
    // 제목에서 카테고리 추측
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
      importance: 7, // 중간 이상의 중요도로 설정
      category,
      tags: [category, 'IT', '기술'],
      source: newsItem.source,
      link: newsItem.link
    };
  }
  
  /**
   * 비어있는 카드뉴스 슬라이드를 생성합니다.
   */
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
  
  /**
   * 기본적인 카드뉴스 슬라이드를 생성합니다.
   */
  private createBasicSlides(analyzedNews: AnalyzedNews[], frequency: 'daily' | 'monthly'): any[] {
    const slides: any[] = [
      {
        type: "cover",
        title: `${frequency === 'daily' ? '오늘의' : '이번 달의'} IT 핫 뉴스`,
        subtitle: "최신 IT 트렌드"
      }
    ];
    
    // 뉴스 슬라이드 추가
    for (const news of analyzedNews) {
      slides.push({
        type: "news",
        title: news.title,
        content: news.summary,
        imagePrompt: `${news.category}와 관련된 기술 이미지`,
        sourceUrl: news.link,
        tags: news.tags
      });
    }
    
    // 마무리 슬라이드 추가
    slides.push({
      type: "summary",
      title: "주요 IT 트렌드 요약",
      content: "기술 혁신과 디지털 전환이 지속적으로 진행되고 있습니다."
    });
    
    return slides;
  }
} 