
import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';
import JSZip from 'jszip';
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
  AlertCircle,
  Rocket,
  Copy,
  Check,
  FileCode,
  Upload,
  FolderArchive,
  File,
  CheckCircle2,
  CreditCard,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Lock,
  X,
  ShieldCheck
} from 'lucide-react';
import { GithubRepo, AIAnalysis, LocalProject, AnalysisContext, User, UserTier } from './types';
import { analyzeProject } from './services/gemini';
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

// --- Auth Context Simulation ---
interface AuthContextType {
  user: User | null;
  login: (email: string) => void;
  logout: () => void;
  upgrade: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// --- App Component ---
const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gitlens_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

  // App State
  const [query, setQuery] = useState('');
  const [projectData, setProjectData] = useState<AnalysisContext | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('gitlens_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('gitlens_user');
    }
  }, [user]);

  // Verificar se a API KEY está configurada no Netlify
  useEffect(() => {
    if (!process.env.API_KEY) {
      console.warn("Aviso: API_KEY não encontrada. Certifique-se de configurá-la no painel do Netlify.");
    }
  }, []);

  const login = (email: string) => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name: email.split('@')[0],
      tier: 'free',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
    };
    setUser(newUser);
    setShowAuthModal(false);
  };

  const logout = () => {
    setUser(null);
    setProjectData(null);
    setAnalysis(null);
    setShowUserMenu(false);
  };

  const upgrade = () => {
    if (user) {
      setUser({ ...user, tier: 'pro' });
    }
  };

  const fetchRepoData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError(null);
    setProjectData(null);
    setAnalysis(null);
    setCopied(false);

    let repoPath = query.replace('https://github.com/', '').trim();
    if (repoPath.endsWith('/')) repoPath = repoPath.slice(0, -1);

    try {
      const response = await fetch(`https://api.github.com/repos/${repoPath}`);
      if (!response.ok) throw new Error('Repositório não encontrado. Verifique se ele é público.');
      
      const data: GithubRepo = await response.json();
      const context: AnalysisContext = { type: 'github', data };
      setProjectData(context);
      
      triggerAnalysis(context);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processZipFile = async (file: File) => {
    if (!user || user.tier !== 'pro') {
      setError("A análise de ZIP é um recurso Pro. Por favor, faça o upgrade da sua conta.");
      scrollToSection('pricing');
      return;
    }

    setLoading(true);
    setError(null);
    setProjectData(null);
    setAnalysis(null);

    try {
      if (!file.name.endsWith('.zip')) {
        throw new Error("Por favor, envie um arquivo .zip");
      }

      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const filePaths = Object.keys(contents.files);
      
      const keyFilesToRead = [
        'package.json', 'README.md', 'requirements.txt', 'pyproject.toml', 
        'Gemfile', 'composer.json', 'pom.xml', 'build.gradle', 
        'Dockerfile', 'docker-compose.yml', 'go.mod'
      ];
      
      const keyFileContents: Record<string, string> = {};
      let readmeContent = "";

      for (const fileName of filePaths) {
        const baseName = fileName.split('/').pop()?.toLowerCase();
        
        if (baseName && keyFilesToRead.includes(baseName) && !contents.files[fileName].dir) {
          const content = await contents.files[fileName].async('string');
          keyFileContents[fileName] = content;
          if (baseName === 'readme.md') readmeContent = content;
        }
      }

      const localProject: LocalProject = {
        name: file.name.replace('.zip', ''),
        description: readmeContent.slice(0, 300) + (readmeContent.length > 300 ? '...' : '') || "Projeto local carregado via ZIP",
        files: filePaths,
        keyFiles: keyFileContents
      };

      const context: AnalysisContext = { type: 'local', data: localProject };
      setProjectData(context);
      triggerAnalysis(context);

    } catch (err: any) {
      setError(err.message || "Falha ao processar arquivo ZIP");
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async (context: AnalysisContext) => {
    setAnalyzing(true);
    setCopied(false);
    try {
      const result = await analyzeProject(context);
      setAnalysis(result);
    } catch (err) {
      setError("A análise de IA falhou. Verifique se a API_KEY está configurada corretamente no Netlify.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processZipFile(e.dataTransfer.files[0]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, upgrade, showAuthModal, setShowAuthModal }}>
      <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-purple-500/30">
        
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-[60]">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
                <Github className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                GitLens AI
              </h1>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
              <button onClick={() => scrollToSection('features')} className="hover:text-blue-400 transition-colors">Recursos</button>
              <button onClick={() => scrollToSection('pricing')} className="hover:text-blue-400 transition-colors">Preços</button>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-full hover:border-slate-700 transition-all pl-2 pr-4"
                  >
                    <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full border border-slate-700" />
                    <span className="text-sm font-semibold text-slate-300 hidden sm:inline">{user.name}</span>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-2 border-b border-slate-800 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${user.tier === 'pro' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-500'} uppercase tracking-widest`}>
                            Conta {user.tier.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-1">{user.email}</p>
                      </div>
                      <button className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2">
                        <UserIcon size={16} /> Configurações
                      </button>
                      {user.tier === 'free' && (
                        <button onClick={() => { scrollToSection('pricing'); setShowUserMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors flex items-center gap-2">
                          <Rocket size={16} /> Upgrade para Pro
                        </button>
                      )}
                      <div className="border-t border-slate-800 mt-2 pt-2">
                        <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2">
                          <LogOut size={16} /> Sair
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
                >
                  Entrar
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-12">
          <section className="mb-16 text-center">
            <h2 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tight leading-tight">
              Analise, Otimize e <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Implemente</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-xl mb-12 leading-relaxed">
              A única plataforma de IA desenhada para traduzir seus repositórios em estratégias de deploy prontas para produção.
            </p>

            <div className="max-w-2xl mx-auto space-y-8">
              <form onSubmit={fetchRepoData} className="relative group">
                <input 
                  type="text"
                  placeholder="ex: facebook/react ou github.com/owner/repo"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-5 pl-14 pr-36 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-lg shadow-2xl placeholder:text-slate-600"
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <button 
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Analisar'}
                </button>
              </form>

              <div className="flex items-center gap-4 text-slate-500">
                <div className="flex-1 border-t border-slate-800"></div>
                <span className="text-xs font-bold uppercase tracking-widest">ou solte um zip</span>
                <div className="flex-1 border-t border-slate-800"></div>
              </div>

              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => {
                  if (user?.tier === 'pro') fileInputRef.current?.click();
                  else setError("Faça upgrade para Pro para analisar arquivos ZIP locais.");
                }}
                className={`group relative border-2 border-dashed rounded-3xl p-10 transition-all duration-500 text-center ${
                  dragActive 
                    ? 'border-purple-500 bg-purple-500/10 scale-[1.02]' 
                    : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900 hover:border-slate-600'
                } cursor-pointer overflow-hidden`}
              >
                {!user || user.tier !== 'pro' ? (
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2">
                      <Lock size={20} className="text-purple-400" />
                      <span className="text-sm font-bold text-white">Recurso Pro</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); scrollToSection('pricing'); }}
                      className="text-purple-400 font-bold hover:text-purple-300 transition-colors text-sm underline underline-offset-4"
                    >
                      Desbloquear Análise de ZIP
                    </button>
                  </div>
                ) : null}

                <input ref={fileInputRef} type="file" className="hidden" accept=".zip" onChange={(e) => e.target.files && processZipFile(e.target.files[0])} />
                <div className="flex flex-col items-center gap-4 relative z-0">
                  <div className={`p-5 rounded-2xl transition-all duration-500 ${dragActive ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/40' : 'bg-slate-800 text-purple-400 shadow-lg'}`}>
                    <Upload size={40} className={dragActive ? 'animate-bounce' : ''} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Deploy de Fonte Local</h3>
                    <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                      Analise projetos privados ou não-Git. Solte seu .zip aqui.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl flex items-center justify-center gap-3 animate-in fade-in zoom-in-95">
                  <AlertCircle size={20} />
                  <p className="font-medium">{error}</p>
                </div>
              )}
            </div>
          </section>

          {projectData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start animate-in fade-in slide-in-from-bottom-10 duration-1000">
              <aside className="lg:col-span-4 space-y-8">
                {projectData.type === 'github' ? (
                   <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden group">
                     <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl transition-all group-hover:scale-150"></div>
                     <div className="relative z-10">
                       <div className="flex items-center gap-5 mb-8">
                         <img src={projectData.data.owner.avatar_url} className="w-16 h-16 rounded-2xl border-2 border-slate-700 shadow-lg" alt="" />
                         <div>
                           <h3 className="text-2xl font-black text-white leading-tight">{projectData.data.name}</h3>
                           <p className="text-slate-500 font-medium">@{projectData.data.owner.login}</p>
                         </div>
                       </div>
                       <p className="text-slate-400 leading-relaxed mb-8">{projectData.data.description}</p>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 flex flex-col">
                            <Star className="text-yellow-500 mb-2" size={20} />
                            <span className="text-2xl font-bold text-white">{projectData.data.stargazers_count.toLocaleString()}</span>
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Stars</span>
                         </div>
                         <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 flex flex-col">
                            <GitFork className="text-blue-400 mb-2" size={20} />
                            <span className="text-2xl font-bold text-white">{projectData.data.forks_count.toLocaleString()}</span>
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Forks</span>
                         </div>
                       </div>
                       <a href={projectData.data.html_url} target="_blank" className="mt-8 flex items-center justify-center gap-3 w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all font-bold">
                         <Github size={20} /> Ver Repositório
                       </a>
                     </div>
                   </div>
                ) : (
                  <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10 text-center">
                      <div className="w-20 h-20 bg-purple-600/20 text-purple-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <FolderArchive size={40} />
                      </div>
                      <h3 className="text-2xl font-black text-white mb-2">{projectData.data.name}</h3>
                      <p className="text-slate-500 mb-8 italic">Análise de ZIP Local</p>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                          <span className="text-slate-400 font-medium">Arquivos</span>
                          <span className="text-white font-bold">{projectData.data.files.length}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                          <span className="text-slate-400 font-medium">Tier</span>
                          <span className="text-purple-400 font-bold uppercase text-xs tracking-widest flex items-center gap-1">
                            <ShieldCheck size={14} /> PRO
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </aside>

              <div className="lg:col-span-8 space-y-8">
                 {analyzing ? (
                   <div className="bg-slate-900/50 rounded-[2rem] p-16 border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
                      <div className="relative mb-10">
                        <div className="w-24 h-24 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                        <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-400 w-10 h-10 animate-pulse" />
                      </div>
                      <h3 className="text-3xl font-black text-white mb-4">Decodificando Arquitetura...</h3>
                      <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">
                        Nosso motor Gemini está analisando sua estrutura para gerar o melhor roadmap de deploy.
                      </p>
                   </div>
                 ) : analysis ? (
                   <div className="space-y-8">
                     <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                         <Rocket size={200} />
                       </div>
                       <div className="flex items-center gap-3 mb-6">
                         <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Zap className="text-purple-400" size={24} />
                         </div>
                         <h3 className="text-2xl font-bold text-white">Inteligência de Engenharia</h3>
                       </div>
                       <p className="text-xl text-slate-300 leading-relaxed font-medium">
                         {analysis.summary}
                       </p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl">
                           <div className="flex items-center gap-3 mb-6">
                             <CheckCircle2 className="text-emerald-400" size={24} />
                             <h4 className="text-lg font-bold text-white">Insights da Estrutura</h4>
                           </div>
                           <ul className="space-y-4">
                             {analysis.keyFeatures.map((f, i) => (
                               <li key={i} className="flex gap-4 items-start text-slate-400">
                                 <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0"></span>
                                 <span className="text-sm font-medium">{f}</span>
                               </li>
                             ))}
                           </ul>
                        </div>
                        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl">
                           <div className="flex items-center gap-3 mb-6">
                             <Target className="text-blue-400" size={24} />
                             <h4 className="text-lg font-bold text-white">Domínio Alvo</h4>
                           </div>
                           <p className="text-slate-400 leading-relaxed text-sm">{analysis.targetAudience}</p>
                           <div className="mt-8 pt-6 border-t border-slate-800">
                             <div className="flex items-center gap-3 mb-4">
                               <Cpu className="text-purple-400" size={20} />
                               <span className="text-sm font-bold text-slate-300">Stack Tecnológica</span>
                             </div>
                             <p className="text-sm text-slate-500 leading-relaxed">{analysis.techStackRating}</p>
                           </div>
                        </div>
                     </div>

                     <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl ring-1 ring-purple-500/20">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-purple-500/10 rounded-2xl">
                                <Rocket className="text-purple-400" size={32} />
                              </div>
                              <div>
                                <h4 className="text-xl font-bold text-white">Estratégia de Deploy</h4>
                                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 mt-1 inline-block">
                                  {analysis.projectType}
                                </span>
                              </div>
                           </div>
                           <button 
                             onClick={() => copyToClipboard(analysis.githubActionsWorkflow)}
                             className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-2xl transition-all"
                           >
                             {copied ? <Check className="text-emerald-400" size={18} /> : <Copy size={18} />}
                             {copied ? 'Copiado' : 'Copiar Workflow'}
                           </button>
                        </div>

                        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                           <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
                              <FileCode size={16} className="text-slate-500" />
                              <span className="text-xs font-mono text-slate-400">.github/workflows/deploy.yml</span>
                           </div>
                           <div className="p-8 overflow-x-auto">
                              <pre className="text-sm font-mono text-indigo-300 leading-relaxed whitespace-pre-wrap">
                                {analysis.githubActionsWorkflow}
                              </pre>
                           </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-6 text-center italic">
                          Estratégia recomendada para Netlify ou GitHub Actions.
                        </p>
                     </div>
                   </div>
                 ) : null}
              </div>
            </div>
          )}

          <section id="pricing" className="mt-32 scroll-mt-24">
            <div className="text-center mb-16">
              <span className="text-purple-500 font-bold uppercase tracking-[0.3em] text-sm mb-4 block">INVISTA NO SEU FLOW</span>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Planos Simples e Transparentes</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">Tenha acesso total às ferramentas do GitLens AI e impulsione seu pipeline de produção.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10 hover:border-slate-700 transition-all flex flex-col group">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-slate-200">Starter</h3>
                  <div className="flex items-baseline mt-4">
                    <span className="text-5xl font-black text-white">R$ 0</span>
                  </div>
                  <p className="text-slate-500 mt-4 leading-relaxed">Perfeito para contribuidores open-source e estudantes.</p>
                </div>
                <ul className="space-y-6 mb-12 flex-1">
                  {[
                    "Análise de Repositórios Públicos",
                    "Workflows de Deploy Básicos",
                    "Identificação de Stack",
                    "3 Análises por dia"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-slate-400 font-medium">
                      <div className="bg-slate-800 rounded-full p-1"><Check size={14} className="text-slate-500" /></div>
                      {item}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => !user && setShowAuthModal(true)}
                  className="w-full py-4 rounded-2xl border-2 border-slate-800 text-slate-400 font-bold hover:bg-slate-800 hover:text-white transition-all"
                >
                  {user ? 'Plano Ativo' : 'Começar Agora'}
                </button>
              </div>

              <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-purple-500/50 rounded-[2.5rem] p-10 relative overflow-hidden flex flex-col shadow-[0_0_80px_rgba(168,85,247,0.15)] group scale-105">
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-black px-6 py-2 rounded-bl-2xl tracking-widest uppercase shadow-lg">
                  MAIS POPULAR
                </div>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-purple-400">Pro Developer</h3>
                  <div className="flex items-baseline mt-4">
                    <span className="text-5xl font-black text-white">R$ 10</span>
                    <span className="text-slate-500 ml-2 font-bold">/mês</span>
                  </div>
                  <p className="text-slate-400 mt-4 leading-relaxed">Libere o poder total da automação DevOps e análise de fontes privadas.</p>
                </div>
                <ul className="space-y-6 mb-12 flex-1">
                  {[
                    "Tudo do plano Starter",
                    "Upload de ZIP (Sem necessidade de Git)",
                    "Arquiteturas de Deploy Premium",
                    "Análises Diárias Ilimitadas",
                    "Suporte Prioritário Gemini AI"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-slate-200 font-semibold animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i*100}ms` }}>
                      <div className="bg-purple-500/20 rounded-full p-1"><Check size={14} className="text-purple-400" /></div>
                      {item}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => {
                    if (!user) setShowAuthModal(true);
                    else if (user.tier === 'free') upgrade();
                  }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-purple-500/30 flex items-center justify-center gap-3"
                >
                  {user?.tier === 'pro' ? <CheckCircle2 size={20} /> : <CreditCard size={20} />}
                  {user?.tier === 'pro' ? 'Plano Pro Ativo' : 'Assinar Agora'}
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-40 border-t border-slate-900 bg-slate-950/50 py-20 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
            <div className="col-span-1 md:col-span-2">
               <div className="flex items-center justify-center md:justify-start gap-2 mb-6">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Github className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">GitLens AI</h1>
              </div>
              <p className="text-slate-500 max-w-sm mx-auto md:mx-0 leading-relaxed text-lg">
                A ponte inteligente entre código e produção. Empoderando desenvolvedores a fazerem deploy com confiança.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Produto</h4>
              <ul className="space-y-4 text-slate-500 font-medium">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-purple-400 transition-colors">Recursos</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-purple-400 transition-colors">Preços</button></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Documentação</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Conectar</h4>
              <ul className="space-y-4 text-slate-500 font-medium">
                <li><a href="https://github.com" target="_blank" className="hover:text-purple-400 transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Discord</a></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-900 text-center text-slate-600 text-sm">
            <p>© 2024 GitLens AI Platform. Deploy otimizado para Netlify.</p>
          </div>
        </footer>

        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-hidden">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowAuthModal(false)}></div>
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300">
               <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                  <X size={24} />
               </button>
               <div className="text-center mb-10">
                  <div className="bg-blue-600/10 p-4 rounded-3xl inline-block mb-6">
                     <Github className="w-12 h-12 text-blue-500" />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-2">Bem-vindo</h3>
                  <p className="text-slate-500">Entre para sincronizar seus repositórios e acessar recursos Pro.</p>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">E-mail</label>
                     <input 
                       type="email" 
                       placeholder="exemplo@dev.com"
                       className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white placeholder:text-slate-700"
                       onKeyDown={(e) => e.key === 'Enter' && login((e.target as HTMLInputElement).value)}
                     />
                  </div>
                  <button 
                    onClick={() => {
                      const input = document.querySelector('input[type="email"]') as HTMLInputElement;
                      if (input.value) login(input.value);
                    }}
                    className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-slate-200 active:scale-[0.98] transition-all shadow-xl shadow-white/10"
                  >
                    Continuar
                  </button>
               </div>
            </div>
          </div>
        )}

      </div>
    </AuthContext.Provider>
  );
};

export default App;
