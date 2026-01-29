
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
  ShieldCheck,
  Info,
  Settings
} from 'lucide-react';
import { GithubRepo, AIAnalysis, LocalProject, AnalysisContext, User, UserTier } from './types.ts';
import { analyzeProject } from './services/gemini.ts';
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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('gitlens_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
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
      if (!response.ok) throw new Error('Repositório não encontrado ou privado.');
      
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
      setError("Upload de ZIP requer Plano Pro.");
      scrollToSection('pricing');
      return;
    }

    setLoading(true);
    setError(null);
    setProjectData(null);
    setAnalysis(null);

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const filePaths = Object.keys(contents.files);
      const keyFileContents: Record<string, string> = {};
      let readme = "";

      for (const fileName of filePaths) {
        const base = fileName.split('/').pop()?.toLowerCase();
        if (base && ['package.json', 'readme.md', 'dockerfile'].includes(base)) {
          const content = await contents.files[fileName].async('string');
          keyFileContents[fileName] = content;
          if (base === 'readme.md') readme = content;
        }
      }

      const context: AnalysisContext = { 
        type: 'local', 
        data: { 
          name: file.name, 
          files: filePaths, 
          keyFiles: keyFileContents,
          description: readme.slice(0, 200)
        } 
      };
      setProjectData(context);
      triggerAnalysis(context);
    } catch (err) {
      setError("Erro ao processar ZIP.");
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async (context: AnalysisContext) => {
    setAnalyzing(true);
    try {
      const result = await analyzeProject(context);
      setAnalysis(result);
    } catch (err) {
      setError("A IA falhou em processar. Verifique se a API_KEY foi configurada no Netlify.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processZipFile(e.dataTransfer.files[0]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, upgrade, showAuthModal, setShowAuthModal }}>
      <div className="min-h-screen bg-slate-950 text-slate-200">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-[60]">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg">
                <Github className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">GitLens AI</h1>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
              <button onClick={() => scrollToSection('features')} className="hover:text-blue-400 transition-colors">Recursos</button>
              <button onClick={() => scrollToSection('pricing')} className="hover:text-blue-400 transition-colors">Preços</button>
              <button onClick={() => setShowConfigGuide(true)} className="flex items-center gap-1 hover:text-white transition-colors">
                <Settings size={14} /> Guia Deploy
              </button>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="relative">
                  <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-full pl-2 pr-4 hover:border-slate-600 transition-all">
                    <img src={user.avatarUrl} className="w-7 h-7 rounded-full" alt="" />
                    <span className="text-sm font-semibold hidden sm:inline">{user.name}</span>
                    <ChevronDown size={14} className={showUserMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-2 border-b border-slate-800 mb-2">
                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${user.tier === 'pro' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-500'} uppercase`}>
                           Conta {user.tier}
                         </span>
                         <p className="text-xs text-slate-500 mt-1 truncate">{user.email}</p>
                      </div>
                      <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2">
                        <LogOut size={16} /> Sair
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowAuthModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all">
                  Entrar
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-12">
          <section className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
              Sua Ponte para <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Produção</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-xl mb-12">
              Analise qualquer repositório GitHub ou arquivo local e obtenha estratégias de deploy instantâneas.
            </p>

            <div className="max-w-2xl mx-auto space-y-8">
              <form onSubmit={fetchRepoData} className="relative group">
                <input 
                  type="text" 
                  placeholder="facebook/react ou github.com/owner/repo"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-5 pl-14 pr-36 focus:ring-4 focus:ring-purple-500/20 outline-none text-lg transition-all"
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400" />
                <button disabled={loading} className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-all">
                  {loading ? <Loader2 className="animate-spin" /> : 'Analisar'}
                </button>
              </form>

              <div 
                onDragOver={handleDrag} onDragEnter={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                onClick={() => user?.tier === 'pro' ? fileInputRef.current?.click() : setError("Upload requer Plano Pro")}
                className={`border-2 border-dashed rounded-3xl p-10 cursor-pointer transition-all ${dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-slate-800 hover:border-slate-600 bg-slate-900/40'}`}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept=".zip" onChange={(e) => e.target.files && processZipFile(e.target.files[0])} />
                <Upload size={40} className={`mx-auto mb-4 ${dragActive ? 'text-purple-400 animate-bounce' : 'text-slate-600'}`} />
                <h3 className="font-bold text-lg">Solte seu Projeto ZIP</h3>
                <p className="text-slate-500 text-sm mt-2">Para deploys privados ou testes locais.</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center justify-center gap-2">
                  <AlertCircle size={18} /> {error}
                </div>
              )}
            </div>
          </section>

          {projectData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4">
              <aside className="lg:col-span-4 bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl">
                {projectData.type === 'github' ? (
                  <>
                    <img src={projectData.data.owner.avatar_url} className="w-16 h-16 rounded-2xl mb-6 shadow-lg" alt="" />
                    <h3 className="text-2xl font-black mb-2">{projectData.data.name}</h3>
                    <p className="text-slate-500 mb-8">{projectData.data.description || 'Sem descrição.'}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                        <Star className="mx-auto text-yellow-500 mb-1" size={18} />
                        <span className="block font-bold">{projectData.data.stargazers_count}</span>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                        <GitFork className="mx-auto text-blue-400 mb-1" size={18} />
                        <span className="block font-bold">{projectData.data.forks_count}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <FolderArchive size={48} className="mx-auto text-purple-400 mb-4" />
                    <h3 className="text-2xl font-black">{projectData.data.name}</h3>
                    <p className="text-slate-500 mt-2">Arquivos: {projectData.data.files.length}</p>
                  </div>
                )}
              </aside>

              <div className="lg:col-span-8 space-y-8">
                {analyzing ? (
                  <div className="bg-slate-900 p-20 rounded-[2rem] border-2 border-dashed border-slate-800 text-center">
                    <Loader2 className="animate-spin mx-auto text-purple-500 mb-6" size={40} />
                    <h4 className="text-2xl font-bold">Gerando Roadmap Gemini...</h4>
                  </div>
                ) : analysis ? (
                  <div className="space-y-8">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-[2rem] border border-slate-800">
                      <Zap className="text-purple-500 mb-4" />
                      <p className="text-lg leading-relaxed text-slate-300">{analysis.summary}</p>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-xl flex items-center gap-2"><Rocket className="text-purple-500" /> YAML de Deploy</h4>
                        <button onClick={() => copyToClipboard(analysis.githubActionsWorkflow)} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                          {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />} {copied ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <pre className="bg-slate-950 p-6 rounded-2xl overflow-x-auto text-blue-300 text-sm font-mono">
                        {analysis.githubActionsWorkflow}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <section id="pricing" className="mt-32">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black mb-4">Escolha sua Velocidade</h2>
              <p className="text-slate-500">Planos escaláveis para cada desenvolvedor.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-slate-900/40 border border-slate-800 p-10 rounded-[2.5rem] flex flex-col">
                <h3 className="text-2xl font-bold mb-4">Starter</h3>
                <span className="text-5xl font-black mb-6">R$ 0</span>
                <ul className="space-y-4 mb-10 flex-1 text-slate-400">
                  <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Repos Públicos</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Deploy Netlify/GitHub</li>
                </ul>
                <button className="w-full py-4 rounded-2xl border-2 border-slate-800 font-bold hover:bg-slate-800 transition-all">Plano Atual</button>
              </div>
              <div className="bg-slate-900 border-2 border-purple-500/40 p-10 rounded-[2.5rem] flex flex-col shadow-2xl shadow-purple-500/10 scale-105">
                <h3 className="text-2xl font-bold text-purple-400 mb-4">Pro Developer</h3>
                <span className="text-5xl font-black mb-6">R$ 10<span className="text-lg text-slate-500">/mês</span></span>
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-center gap-2"><Check size={16} className="text-purple-500" /> Upload de ZIP</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-purple-500" /> Repos Privados</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-purple-500" /> Prioridade Gemini</li>
                </ul>
                <button onClick={upgrade} className="w-full py-4 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-all">Assinar Agora</button>
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-40 border-t border-slate-900 bg-slate-950/50 py-10">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 text-xs font-bold text-slate-600 uppercase tracking-widest">
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                <div className={`w-2 h-2 rounded-full ${process.env.API_KEY ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                Gemini AI Status: {process.env.API_KEY ? 'Ativo' : 'Aguardando Chave'}
              </div>
            </div>
            <p className="text-slate-600 text-sm">© 2024 GitLens AI.</p>
          </div>
        </footer>

        {showConfigGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowConfigGuide(false)}></div>
             <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2.5rem] p-10 relative z-10">
               <button onClick={() => setShowConfigGuide(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X /></button>
               <h3 className="text-3xl font-black mb-6">Configuração Netlify</h3>
               <div className="space-y-6 text-slate-300">
                 <p>Para o site funcionar, siga estes passos no painel do Netlify:</p>
                 <ol className="list-decimal pl-6 space-y-4">
                   <li>Vá em <strong>Site configuration</strong> &gt; <strong>Environment variables</strong>.</li>
                   <li>Clique em <strong>Add a variable</strong>.</li>
                   <li>Key: <code>API_KEY</code> | Value: Sua chave do Gemini.</li>
                   <li>Recarregue o deploy ou faça um novo push.</li>
                 </ol>
               </div>
               <button onClick={() => setShowConfigGuide(false)} className="mt-10 w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-slate-200 transition-all">Entendi</button>
             </div>
          </div>
        )}

        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}></div>
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-10 relative z-10">
               <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X /></button>
               <div className="text-center mb-10">
                  <div className="bg-blue-600/10 p-4 rounded-3xl inline-block mb-6"><Github className="w-12 h-12 text-blue-500" /></div>
                  <h3 className="text-3xl font-black text-white">Bem-vindo</h3>
               </div>
               <input type="email" placeholder="seu@email.com" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 mb-6 text-white" />
               <button onClick={() => login('dev@test.com')} className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-slate-200 transition-all">Continuar</button>
            </div>
          </div>
        )}
      </div>
    </AuthContext.Provider>
  );
};

export default App;
