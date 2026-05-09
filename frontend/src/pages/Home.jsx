import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Zap, Code, Shield, Users, 
    ChevronRight, Play, Globe, 
    BarChart3, MessageSquare, Award,
    CheckCircle2, Star, ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Home = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isDark } = useTheme();

    const features = [
        {
            icon: <Code className="w-6 h-6" />,
            title: "Smart IDE",
            desc: "Next-gen coding interface with multi-language support and real-time execution."
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: "AI Support",
            desc: "Intelligent coding assistant to help you debug and optimize your algorithms."
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: "Secure Contests",
            desc: "Enterprise-grade proctoring and plagiarism detection for fair competition."
        },
        {
            icon: <BarChart3 className="w-6 h-6" />,
            title: "Deep Analytics",
            desc: "Track your progress with detailed performance metrics and rank history."
        }
    ];

    return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0B0B0F] text-gray-900 dark:text-gray-100 selection:bg-blue-500/30">
            {/* Hero Section */}
            <section className="relative pt-40 pb-20 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-30 dark:opacity-20 pointer-events-none">
                    <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[128px]"></div>
                    <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[128px]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in">
                        <Star size={14} className="fill-current" />
                        Next Generation Learning Platform
                    </div>
                    
                    <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[1.1] mb-8 bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:to-gray-500 max-w-5xl mx-auto">
                        Master Coding with <br/> <span className="text-blue-600">AI-Powered</span> Precision.
                    </h1>

                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                        The world's most advanced platform for technical learning. AI assistants, integrated IDEs, and competitive contests—all in one place.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button 
                            onClick={() => navigate('/signup')}
                            className="group w-full sm:w-auto px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl text-lg font-bold hover:scale-105 transition-all shadow-2xl shadow-gray-900/20 dark:shadow-white/10 flex items-center justify-center gap-2"
                        >
                            Start Learning Free
                            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button 
                            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl text-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all flex items-center justify-center gap-2"
                        >
                            <Play className="fill-current" size={18} />
                            Watch Demo
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-24 pt-12 border-t border-gray-100 dark:border-gray-800/50">
                        <div>
                            <div className="text-3xl font-black mb-1">50K+</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Active Students</div>
                        </div>
                        <div>
                            <div className="text-3xl font-black mb-1">1M+</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Lines of Code</div>
                        </div>
                        <div>
                            <div className="text-3xl font-black mb-1">200+</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Premium Courses</div>
                        </div>
                        <div>
                            <div className="text-3xl font-black mb-1">24/7</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Expert Support</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-white dark:bg-[#08080A] relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-black mb-4">Engineered for Success</h2>
                        <p className="text-gray-500 dark:text-gray-400">Everything you need to go from zero to senior engineer.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((f, i) => (
                            <div key={i} className="p-8 rounded-[2rem] bg-[#FAFAFA] dark:bg-[#0B0B0F] border border-gray-100 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all group">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    {f.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="p-12 md:p-20 rounded-[3rem] bg-gradient-to-br from-blue-600 to-indigo-800 text-center relative overflow-hidden shadow-2xl shadow-blue-500/20">
                        {/* Abstract Background */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-[80px]"></div>
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full -ml-48 -mb-48 blur-[80px]"></div>

                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Ready to transform <br/> your career?</h2>
                            <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto font-medium">Join thousands of developers worldwide who are building the future with AlphaLearn.</p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <button 
                                    onClick={() => navigate('/signup')}
                                    className="px-8 py-4 bg-white text-blue-700 rounded-2xl text-lg font-bold hover:scale-105 transition-all shadow-xl"
                                >
                                    Create Free Account
                                </button>
                                <button 
                                    onClick={() => navigate('/catalog')}
                                    className="px-8 py-4 bg-blue-700/30 text-white border border-white/20 rounded-2xl text-lg font-bold hover:bg-blue-700/50 transition-all backdrop-blur-md"
                                >
                                    Browse Courses
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-100 dark:border-gray-800/50">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2 opacity-50">
                        <Zap className="text-gray-900 dark:text-white fill-current" size={20} />
                        <span className="text-xl font-black tracking-tighter uppercase">AlphaLearn</span>
                    </div>
                    
                    <div className="flex gap-8 text-sm font-medium text-gray-500 dark:text-gray-400">
                        <Link to="/about" className="hover:text-blue-600 transition-colors">About</Link>
                        <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
                        <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
                        <Link to="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
                    </div>

                    <div className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                        © 2026 AlphaLearn. Built with Antigravity.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
