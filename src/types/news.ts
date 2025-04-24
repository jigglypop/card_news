export interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  imageUrl?: string;
}

export interface AnalyzedNews {
  title: string;
  content: string;
  summary: string;
  importance: number; // 1-10 scale
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