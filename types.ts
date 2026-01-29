
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

export interface LocalProject {
  name: string;
  description?: string;
  files: string[];
  keyFiles: Record<string, string>; // filename: content
}

export type AnalysisContext = 
  | { type: 'github'; data: GithubRepo }
  | { type: 'local'; data: LocalProject };

export interface AIAnalysis {
  summary: string;
  keyFeatures: string[];
  targetAudience: string;
  techStackRating: string;
  suggestions: string[];
  projectType: string;
  githubActionsWorkflow: string;
}

export type UserTier = 'free' | 'pro';

export interface User {
  id: string;
  email: string;
  name: string;
  tier: UserTier;
  avatarUrl?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
