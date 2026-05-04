import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  ChevronLeft, 
  ThumbsUp, 
  Share2, 
  Clock, Loader2, Target, Award,
  MapPin, 
  Briefcase, 
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Activity,
  User,
  ExternalLink
} from 'lucide-react';
import interviewExperienceService from '../../../services/interviewExperienceService';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useTheme } from '../../../contexts/ThemeContext';

const InterviewExperienceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [expandedRounds, setExpandedRounds] = useState([0]); 

  const { data: experience, isLoading } = useQuery({
    queryKey: ['interview-experience', id],
    queryFn: () => interviewExperienceService.getById(id)
  });

  const upvoteMutation = useMutation({
    mutationFn: () => interviewExperienceService.upvote(id),
    onSuccess: (updatedExp) => {
      queryClient.setQueryData(['interview-experience', id], updatedExp);
      queryClient.invalidateQueries(['interview-experiences']);
      toast.success(updatedExp.isUpvoted ? 'Upvoted!' : 'Upvote removed');
    }
  });

  const toggleRound = (index) => {
    setExpandedRounds(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  if (isLoading) {
    return (
      <div className={`flex-1 flex items-center justify-center transition-colors bg-[var(--color-bg-primary)]`}>
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className={`flex-1 flex items-center justify-center text-center p-8 transition-colors bg-[var(--color-bg-primary)]`}>
        <div className="max-w-md">
          <AlertCircle size={32} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-lg font-bold mb-4">Experience Not Found</h2>
          <button 
            onClick={() => navigate('/dashboard/interview/experience')} 
            className="bg-primary-600 text-white px-5 py-2 rounded-lg font-bold text-xs shadow-sm hover:bg-primary-700 transition-all"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto p-4 md:p-10 scrollbar-hide transition-colors bg-[var(--color-bg-primary)] ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="w-full max-w-5xl mx-auto">
        
        {/* TOP HERO */}
        <div className="mb-10">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-3 shadow-sm shrink-0 border border-gray-100">
                  <img 
                    src={
                      experience.companyName.toLowerCase().includes('google') ? 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Logo.png' :
                      experience.companyName.toLowerCase().includes('amazon') ? 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg' :
                      experience.companyName.toLowerCase().includes('microsoft') ? 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' :
                      'https://cdn-icons-png.flaticon.com/512/300/300221.png'
                    } 
                    className="w-full h-full object-contain" 
                    alt=""
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight mb-1.5 flex flex-wrap items-center gap-2">
                      <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{experience.companyName}</span> 
                      <span>{experience.jobPosition}</span>
                  </h1>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-primary-500" /> {experience.rounds?.length || 0} Rounds</span>
                    <span className="flex items-center gap-1.5"><Activity size={12} className="text-primary-500" /> {experience.rounds?.reduce((acc, r) => acc + (r.questions?.length || 0), 0)} Problems</span>
                    <span className={`px-2 py-0.5 rounded ${experience.outcome === 'Selected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{experience.outcome}</span>
                  </div>
                </div>
             </div>

             <div className="flex items-center gap-3">
                <button 
                  onClick={() => upvoteMutation.mutate()}
                  disabled={upvoteMutation.isLoading}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl border transition-all font-bold text-sm ${
                      experience.isUpvoted 
                        ? 'bg-primary-500/10 border-primary-500/30 text-primary-600' 
                        : isDark ? 'bg-[var(--color-bg-card)] border-gray-800 text-gray-500 hover:text-white' : 'bg-[var(--color-bg-card)] border-gray-200 text-gray-500 hover:border-primary-400'
                  }`}
                >
                  <ThumbsUp size={14} className={experience.isUpvoted ? 'fill-current' : ''} />
                  <span>{experience.upvotes}</span>
                </button>
                <button className={`p-2.5 rounded-xl border transition-all ${isDark ? 'bg-[var(--color-bg-card)] border-gray-800 text-gray-500 hover:text-white' : 'bg-[var(--color-bg-card)] border-gray-200 text-gray-400'}`}>
                  <Share2 size={16} />
                </button>
             </div>
           </div>

           {/* STATS STRIP */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { label: 'Difficulty', value: experience.difficulty, color: 'text-amber-500', icon: Target },
                { label: 'Apply Mode', value: experience.applyMethod, color: 'text-primary-600', icon: Briefcase },
                { label: 'Experience', value: experience.experienceLevel, color: 'text-emerald-500', icon: Award },
                { label: 'Timeline', value: experience.timeline || '2 Weeks', color: 'text-primary-500', icon: Clock }
              ].map((stat, i) => (
                <div key={i} className={`p-4 rounded-xl border flex flex-col gap-1 bg-[var(--color-bg-card)] border-[var(--color-border-interactive)] shadow-sm`}>
                    <div className="flex items-center gap-1.5 opacity-50">
                        <stat.icon size={11} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">{stat.label}</span>
                    </div>
                    <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
           </div>
        </div>

        {/* INTERVIEW BREAKDOWN */}
        {experience.rounds && experience.rounds.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold tracking-tight">Interview Breakdown</h2>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {experience.rounds.length} Rounds
                </div>
            </div>
            <div className="space-y-4">
                {experience.rounds.map((round, index) => (
                  <div key={index} className={`rounded-2xl overflow-hidden border transition-all bg-[var(--color-bg-card)] border-[var(--color-border-interactive)] hover:border-primary-300 dark:hover:border-primary-700`}>
                    <button 
                      onClick={() => toggleRound(index)}
                      className="w-full p-5 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-5">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border bg-[var(--color-bg-surface)] border-[var(--color-border-interactive)]`}>
                              <span className="text-sm font-bold">{index + 1}</span>
                          </div>
                          <div className="text-left">
                              <h3 className="text-sm font-bold mb-0.5">{round.roundName || `Round ${index + 1}`}</h3>
                              <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <span className={round.difficulty === 'Easy' ? 'text-emerald-500' : round.difficulty === 'Medium' ? 'text-amber-500' : 'text-rose-500'}>{round.difficulty}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                                <span>{round.duration} mins</span>
                                <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                                <span>{round.mode}</span>
                              </div>
                          </div>
                        </div>
                        <ChevronDown size={18} className={`transition-transform duration-300 ${expandedRounds.includes(index) ? 'rotate-180 text-primary-500' : 'text-gray-400'}`} />
                    </button>
                    {expandedRounds.includes(index) && (
                      <div className="px-5 pb-6 animate-in slide-in-from-top-2 duration-300">
                          <div className={`pt-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-50'} space-y-6`}>
                            {round.summary && (
                              <div>
                                <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest block mb-2">Round Details</span>
                                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {round.summary}
                                </p>
                              </div>
                            )}
                            {round.questions && round.questions.length > 0 && (
                              <div className="space-y-3">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Questions Asked</span>
                                  <div className="grid grid-cols-1 gap-3">
                                    {round.questions.map((q, qidx) => (
                                      <div key={qidx} className={`flex gap-3 p-3.5 rounded-xl border ${isDark ? 'bg-white/[0.02] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                          <ArrowRight size={12} className="text-primary-500 shrink-0 mt-1" />
                                          <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{q}</p>
                                      </div>
                                    ))}
                                  </div>
                              </div>
                            )}
                          </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* FEEDBACK & AUTHOR SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
            <div className="lg:col-span-2 space-y-8">
                {experience.preparationTips && (
                  <div className={`p-8 rounded-3xl border ${isDark ? 'bg-[var(--color-bg-card)] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                      <h3 className="text-sm font-bold text-primary-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Lightbulb size={16} /> Preparation Advice
                      </h3>
                      <div className={`text-sm leading-relaxed space-y-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {experience.preparationTips.split('\n').map((tip, i) => (
                          <p key={i} className="flex gap-3">
                              <span className="text-primary-500 font-bold">•</span>
                              {tip}
                          </p>
                        ))}
                      </div>
                  </div>
                )}
                {experience.additionalFeedback && (
                    <div className={`p-8 rounded-3xl border border-dashed ${isDark ? 'bg-white/[0.01] border-gray-800' : 'bg-gray-50/50 border-gray-200'}`}>
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Final Thoughts</h3>
                        <p className={`text-sm italic leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            "{experience.additionalFeedback}"
                        </p>
                    </div>
                )}
            </div>

            {/* AUTHOR CARD */}
            <div className="lg:col-span-1">
                <div className={`p-6 rounded-2xl border sticky top-10 ${isDark ? 'bg-[var(--color-bg-card)] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-primary-600/20">
                            {experience.author?.firstName?.[0] || 'U'}
                        </div>
                        <div>
                            <p className="text-sm font-bold">{experience.isAnonymous ? 'Anonymous' : `${experience.author?.firstName} ${experience.author?.lastName}`}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{experience.jobPosition}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-white/5">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Shared On</span>
                            <span className="text-xs font-bold">{new Date(experience.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-white/5">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${experience.outcome === 'Selected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {experience.outcome}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/dashboard/interview/experience')}
                        className={`w-full mt-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                            isDark ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <ArrowRight size={14} className="rotate-180" /> Back to Feed
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewExperienceDetail;








