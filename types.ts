
export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  owner: {
    login: string;
    avatar_url: string;
  };
  topics: string[];
  updated_at: string;
}

export interface AIAnalysis {
  summary: string;
  keyFeatures: string[];
  targetAudience: string;
  techStackRating: string;
  suggestions: string[];
}

export interface LanguageData {
  name: string;
  value: number;
  fill: string;
}
