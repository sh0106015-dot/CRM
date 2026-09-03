export interface NewsIndex {
  label: string;
  unit?: string;
  value: string;
}

export interface NewsItem {
  title: string;
  body?: string;
}

export interface NewsSection {
  title: string;
  items: NewsItem[];
}

export interface DailyNewsPayload {
  date: string; // YYYY-MM-DD
  quote?: { text: string; author?: string } | null;
  indices: NewsIndex[];
  sections: NewsSection[];
}
