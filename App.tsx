
import React, { useState, useCallback, useEffect } from 'react';
import { 
  Search, 
  Github, 
  Star, 
  GitFork, 
  Cpu, 
  Target, 
  Lightbulb, 
  Zap,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { GithubRepo, AIAnalysis } from './types';
import { analyzeRepo } from './services/gemini';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [repo, setRepo] = useState<GithubRepo | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepoData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError(null);
    setRepo(null);
    setAnalysis(null);

    // Basic regex to extract owner/repo from URL or handle direct owner/repo input
    let repoPath = query.replace('https://github.com/', '').trim();
    if (repoPath.endsWith('/')) repoPath = repoPath.slice(0, -1);

    try {
      const response = await fetch(`https://api.github.com/repos/${repoPath}`);
      if (!response.ok) throw new Error('Repository not found. Ensure it is public.');
      
      const data: GithubRepo = await response.json();
      setRepo(data);
      
      // Automatically trigger AI analysis
      triggerAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async (repository: GithubRepo) => {
    setAnalyzing(true);
    try {
      const result = await analyzeRepo(repository);
      setAnalysis(result);
    } catch (err) {
      setError("AI Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const chartData = repo ? [
    { name: 'Stars', value: repo.stargazers_count },
    { name: 'Forks', value: repo.forks_count },
  ] : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Github className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              GitLens AI
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-blue-400 transition-colors">Features</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Docs</a>
            <a href="https://github.com" target="_blank" className="hover:text-blue-400 transition-colors flex items-center gap-1">
              GitHub <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Search Hero */}
        <section className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">
            Unlock Repository <span className="text-blue-500">Intelligence</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto mb-8 text-lg">
            Paste a GitHub URL and let Gemini AI analyze the architecture, purpose, and tech stack of any public project.
          </p>
          
          <form onSubmit={fetchRepoData} className="max-w-2xl mx-auto relative group">
            <input 
              type="text"
              placeholder="facebook/react or github.com/owner/repo"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-12 pr-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-lg shadow-xl"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <button 
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-2 px-6 rounded-xl transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Analyze'}
            </button>
          </form>

          {error && (
            <div className="mt-4 flex items-center justify-center gap-2 text-red-400 animate-pulse">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}
        </section>

        {/* Dashboard Grid */}
        {repo && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Sidebar: Repo Info */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <img src={repo.owner.avatar_url} alt={repo.owner.login} className="w-16 h-16 rounded-2xl border-2 border-slate-700" />
                  <div>
                    <h3 className="text-xl font-bold text-white break-all leading-tight">{repo.name}</h3>
                    <p className="text-slate-500 text-sm">by {repo.owner.login}</p>
                  </div>
                </div>

                <p className="text-slate-300 text-sm mb-6 line-clamp-4">
                  {repo.description || "This repository has no description provided."}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center">
                    <Star className="text-yellow-500 mb-1" size={20} />
                    <span className="text-white font-bold">{repo.stargazers_count.toLocaleString()}</span>
                    <span className="text-xs text-slate-500">Stars</span>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col items-center">
                    <GitFork className="text-blue-400 mb-1" size={20} />
                    <span className="text-white font-bold">{repo.forks_count.toLocaleString()}</span>
                    <span className="text-xs text-slate-500">Forks</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Language</span>
                    <span className="px-2 py-0.5 bg-slate-800 rounded-full text-blue-400 font-medium">{repo.language || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Last Updated</span>
                    <span className="text-slate-300">{new Date(repo.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <a 
                  href={repo.html_url}
                  target="_blank"
                  className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-medium"
                >
                  <Github size={18} />
                  View Source
                </a>
              </div>

              {/* Stats Chart */}
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl h-64">
                <h4 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Metrics Overview</h4>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                      cursor={{ fill: '#334155', opacity: 0.4 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Main Content: AI Analysis */}
            <div className="lg:col-span-2 space-y-6">
              {analyzing ? (
                <div className="bg-slate-900 rounded-3xl p-12 border border-slate-800 shadow-2xl flex flex-col items-center justify-center min-h-[500px]">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Analyzing with Gemini AI</h3>
                  <p className="text-slate-400 animate-pulse">Reading code patterns and documentation...</p>
                </div>
              ) : analysis ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {/* Summary Card */}
                  <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Cpu size={120} />
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="text-blue-400" size={24} />
                      <h3 className="text-xl font-bold text-white">AI Technical Summary</h3>
                    </div>
                    <p className="text-lg text-slate-300 leading-relaxed relative z-10">
                      {analysis.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Key Features */}
                    <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
                      <div className="flex items-center gap-2 mb-4">
                        <Star className="text-yellow-500" size={20} />
                        <h4 className="font-bold text-white">Key Features</h4>
                      </div>
                      <ul className="space-y-3">
                        {analysis.keyFeatures.map((feature, i) => (
                          <li key={i} className="flex gap-3 text-sm text-slate-400">
                            <span className="text-blue-500 font-bold">•</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Target Audience */}
                    <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
                      <div className="flex items-center gap-2 mb-4">
                        <Target className="text-red-400" size={20} />
                        <h4 className="font-bold text-white">Target Audience</h4>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {analysis.targetAudience}
                      </p>
                    </div>

                    {/* Tech Stack */}
                    <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
                      <div className="flex items-center gap-2 mb-4">
                        <Cpu className="text-emerald-400" size={20} />
                        <h4 className="font-bold text-white">Stack Evaluation</h4>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {analysis.techStackRating}
                      </p>
                    </div>

                    {/* Suggestions */}
                    <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
                      <div className="flex items-center gap-2 mb-4">
                        <Lightbulb className="text-amber-400" size={20} />
                        <h4 className="font-bold text-white">Next Steps</h4>
                      </div>
                      <ul className="space-y-3">
                        {analysis.suggestions.map((suggestion, i) => (
                          <li key={i} className="flex gap-3 text-sm text-slate-400">
                            <span className="text-amber-500 font-bold">✓</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => triggerAnalysis(repo)}
                    className="flex items-center gap-2 mx-auto py-2 px-4 text-slate-500 hover:text-white transition-colors text-sm"
                  >
                    <RefreshCw size={16} />
                    Regenerate Analysis
                  </button>
                </div>
              ) : (
                <div className="bg-slate-900/50 rounded-3xl p-12 border-2 border-dashed border-slate-800 flex flex-col items-center justify-center min-h-[400px]">
                  <Github className="text-slate-700 w-16 h-16 mb-4" />
                  <p className="text-slate-500 text-center max-w-sm">
                    Information about the repository will appear here once you search.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {!repo && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {[
              { icon: <Zap />, title: "Real-time Processing", desc: "Live GitHub data fetching for the most accurate metrics." },
              { icon: <Cpu />, title: "Powered by Gemini 3.0", desc: "The latest LLM technology to parse complex technical documentation." },
              { icon: <Target />, title: "Actionable Insights", desc: "Don't just see code, understand the business and user impact." }
            ].map((feature, i) => (
              <div key={i} className="p-8 bg-slate-900/40 border border-slate-800 rounded-3xl hover:bg-slate-900/60 transition-all text-center">
                <div className="inline-block p-4 bg-blue-500/10 text-blue-400 rounded-2xl mb-4">
                  {React.cloneElement(feature.icon as React.ReactElement, { size: 28 })}
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{feature.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-slate-800 py-12 text-center text-slate-500 text-sm">
        <p>© 2024 GitLens AI Dashboard. Built with React and Gemini API.</p>
      </footer>
    </div>
  );
};

export default App;
