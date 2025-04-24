export interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  imageUrl?: string;
  publishDate: Date;
}

export interface AnalyzedNews {
  title: string;
  content: string;
  summary: string;
  importance: number; 
  category: string;
  tags: string[];
  source: string;
  link: string;
}

export interface CardNewsSlide {
  title: string;
  content: string;
  imagePrompt?: string;
  sourceUrl?: string;
  tags?: string[];
} 


export interface NewsSource {
  type: string;
  url: string;
  apiKey: string;
  category: string;
  parser: Function;
  selector: string;
}

export interface Slide {
  type: 'cover' | 'news' | 'summary';
  title: string;
  content?: string;
  subtitle?: string;
  sourceUrl?: string;
  tags?: string[];
}

export interface CardNewsData {
  slides: Slide[];
}