import React, { useState } from 'react';
import { 
  Building2, 
  Briefcase, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Loader2,
  Info,
  Award,
  Zap,
  Layout,
  Globe,
  DollarSign
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import interviewExperienceService from '../../../services/interviewExperienceService';
import toast from 'react-hot-toast';
import CustomDropdown from '../../shared/CustomDropdown';

const ExperienceSubmissionWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    jobPosition: '',
    experienceLevel: '0-1 years',
    difficulty: 'Medium',
    timeline: '0-1 Weeks',
    applyMethod: 'Job Portal',
    interviewMode: 'Remote',
    salaryRange: '',
    outcome: 'Selected',
    preparationTips: '',
    additionalFeedback: '',
    isAnonymous: false,
    rounds: [{
      roundNumber: 1,
      roundName: 'Technical Round 1',
      roundType: 'Technical',
      difficulty: 'Medium',
      mode: 'Remote',
      duration: 60,
      summary: '',
      questions: []
    }]
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const addRound = () => {
    setFormData({
      ...formData,
      rounds: [...formData.rounds, {
        roundNumber: formData.rounds.length + 1,
        roundName: `Round ${formData.rounds.length + 1}`,
        roundType: 'Technical',
        difficulty: 'Medium',
        mode: 'Remote',
        duration: 60,
        summary: '',
        questions: []
      }]
    });
  };

  const removeRound = (index) => {
    const newRounds = formData.rounds.filter((_, i) => i !== index);
    setFormData({ ...formData, rounds: newRounds });
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await interviewExperienceService.create(formData);
      queryClient.invalidateQueries(['interview-experiences']);
      queryClient.invalidateQueries(['popular-companies']);
      toast.success('Interview Experience Shared Successfully!');
      navigate(location.pathname.includes('/admin') ? '/admin/interview-experience' : '/dashboard/interview/experience');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map(s => (
        <div 
          key={s} 
          className={`h-1 rounded-full transition-all duration-500 ${step >= s ? 'w-10 bg-primary-600' : 'w-6 bg-gray-200 dark:bg-white/10'}`}
        />
      ))}
    </div>
  );

  return (
    <div className="flex-1 bg-[var(--color-bg-primary)] text-gray-900 dark:text-white p-6 md:p-10 overflow-y-auto scrollbar-hide">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Share Your Journey</h1>
          <p className="text-gray-500 dark:text-slate-400 text-xs font-medium uppercase tracking-widest">Help others prepare for top tier roles</p>
        </header>

        {renderStepIndicator()}

        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 md:p-8 shadow-sm relative">
          {isSubmitting && (
            <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4 rounded-2xl">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="font-bold text-sm tracking-widest uppercase text-gray-500">Posting Story...</p>
            </div>
          )}

          {/* STEP 1: Privacy & Company Info */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Privacy Toggle at Start */}
              <div className="bg-gray-50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">Post Settings</label>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setFormData({...formData, isAnonymous: false})}
                    className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold transition-all border ${!formData.isAnonymous ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-600/20' : 'bg-transparent border-[var(--color-border-interactive)] text-gray-500 hover:border-primary-500/30'}`}
                  >
                    Public Profile
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, isAnonymous: true})}
                    className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold transition-all border ${formData.isAnonymous ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-600/20' : 'bg-transparent border-[var(--color-border-interactive)] text-gray-500 hover:border-primary-500/30'}`}
                  >
                    Post Anonymously
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company Name</label>
                  <input 
                    type="text" 
                    placeholder="Eg., Google"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="w-full bg-[var(--color-bg-input)] border border-gray-300 dark:border-gray-800 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</label>
                  <input 
                    type="text" 
                    placeholder="Eg., SDE-1"
                    value={formData.jobPosition}
                    onChange={(e) => setFormData({...formData, jobPosition: e.target.value})}
                    className="w-full bg-[var(--color-bg-input)] border border-gray-300 dark:border-gray-800 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Experience</label>
                  <CustomDropdown 
                    options={[
                      { value: '0-1 years', label: '0-1 years' },
                      { value: '1-3 years', label: '1-3 years' },
                      { value: '3-5 years', label: '3-5 years' },
                      { value: '5+ years', label: '5+ years' }
                    ]}
                    value={formData.experienceLevel}
                    onChange={(val) => setFormData({...formData, experienceLevel: val})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Difficulty</label>
                  <CustomDropdown 
                    options={[
                      { value: 'Easy', label: 'Easy' },
                      { value: 'Medium', label: 'Medium' },
                      { value: 'Hard', label: 'Hard' }
                    ]}
                    value={formData.difficulty}
                    onChange={(val) => setFormData({...formData, difficulty: val})}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Interview Rounds */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Rounds Breakdown</h2>
                <button 
                  onClick={addRound}
                  className="text-[10px] font-bold text-primary-600 bg-primary-500/10 px-3 py-1.5 rounded-lg hover:bg-primary-500/20 transition-all uppercase tracking-widest"
                >
                  + Add Round
                </button>
              </div>

              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
                {formData.rounds.map((round, index) => (
                  <div key={index} className="bg-[var(--color-bg-surface)] border border-gray-100 dark:border-gray-800 p-5 rounded-xl relative group">
                    <button 
                      onClick={() => removeRound(index)}
                      className="absolute top-4 right-4 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    <div className="flex items-center gap-3 mb-6">
                       <span className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center text-[10px] font-bold text-white">{index + 1}</span>
                       <input 
                        type="text" 
                        placeholder="Round Title (e.g., Technical Interview 1)"
                        value={round.roundName}
                        onChange={(e) => {
                          const newRounds = [...formData.rounds];
                          newRounds[index].roundName = e.target.value;
                          setFormData({...formData, rounds: newRounds});
                        }}
                        className="bg-transparent border-b border-gray-100 dark:border-gray-800 text-sm font-bold focus:outline-none focus:border-primary-500/50 w-full"
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Round Type</label>
                        <CustomDropdown 
                          options={[
                            { value: 'Technical', label: 'Technical' },
                            { value: 'HR', label: 'HR' },
                            { value: 'Managerial', label: 'Managerial' },
                            { value: 'Design', label: 'Design' }
                          ]}
                          value={round.roundType}
                          onChange={(val) => {
                            const newRounds = [...formData.rounds];
                            newRounds[index].roundType = val;
                            setFormData({...formData, rounds: newRounds});
                          }}
                          size="small"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Difficulty</label>
                        <CustomDropdown 
                          options={[
                            { value: 'Easy', label: 'Easy' },
                            { value: 'Medium', label: 'Medium' },
                            { value: 'Hard', label: 'Hard' }
                          ]}
                          value={round.difficulty}
                          onChange={(val) => {
                            const newRounds = [...formData.rounds];
                            newRounds[index].difficulty = val;
                            setFormData({...formData, rounds: newRounds});
                          }}
                          size="small"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Mode</label>
                        <CustomDropdown 
                          options={[
                            { value: 'Remote', label: 'Remote' },
                            { value: 'On-site', label: 'On-site' }
                          ]}
                          value={round.mode}
                          onChange={(val) => {
                            const newRounds = [...formData.rounds];
                            newRounds[index].mode = val;
                            setFormData({...formData, rounds: newRounds});
                          }}
                          size="small"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Duration (min)</label>
                        <input 
                          type="number" 
                          value={round.duration}
                          onChange={(e) => {
                            const newRounds = [...formData.rounds];
                            newRounds[index].duration = parseInt(e.target.value);
                            setFormData({...formData, rounds: newRounds});
                          }}
                          className="w-full bg-[var(--color-bg-input)] border border-gray-100 dark:border-gray-800 rounded-lg py-1.5 px-3 text-[11px] font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-4">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Round Experience</label>
                       <textarea 
                        placeholder="What happened in this round? Key moments, feedback..."
                        value={round.summary}
                        onChange={(e) => {
                          const newRounds = [...formData.rounds];
                          newRounds[index].summary = e.target.value;
                          setFormData({...formData, rounds: newRounds});
                        }}
                        className="w-full bg-[var(--color-bg-input)] border border-gray-100 dark:border-gray-800 rounded-lg py-3 px-4 text-sm min-h-[100px] resize-none focus:outline-none focus:border-primary-500/20 transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Outcomes & Feedback */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Final Outcome</label>
                  <CustomDropdown 
                    options={[
                      { value: 'Selected', label: 'Selected' },
                      { value: 'Rejected', label: 'Rejected' },
                      { value: 'Waitlisted', label: 'Waitlisted' }
                    ]}
                    value={formData.outcome}
                    onChange={(val) => setFormData({...formData, outcome: val})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Application Method</label>
                  <CustomDropdown 
                    options={[
                      { value: 'Job Portal', label: 'Job Portal' },
                      { value: 'Referral', label: 'Referral' },
                      { value: 'Campus', label: 'Campus' },
                      { value: 'LinkedIn', label: 'LinkedIn' }
                    ]}
                    value={formData.applyMethod}
                    onChange={(val) => setFormData({...formData, applyMethod: val})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preparation Tips</label>
                <textarea 
                  placeholder="Key topics, resources, or advice..."
                  value={formData.preparationTips}
                  onChange={(e) => setFormData({...formData, preparationTips: e.target.value})}
                  className="w-full bg-[var(--color-bg-input)] border border-gray-100 dark:border-gray-800 rounded-xl py-3 px-4 text-sm min-h-[120px] focus:outline-none focus:border-primary-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Additional Feedback (Optional)</label>
                <textarea 
                  placeholder="Culture, interviewers, or timeline..."
                  value={formData.additionalFeedback}
                  onChange={(e) => setFormData({...formData, additionalFeedback: e.target.value})}
                  className="w-full bg-[var(--color-bg-input)] border border-gray-100 dark:border-gray-800 rounded-xl py-3 px-4 text-sm min-h-[80px] focus:outline-none focus:border-primary-500/50 transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-10 pt-6 border-t border-gray-50 dark:border-gray-800/50">
            <button 
              onClick={step === 1 ? () => navigate(-1) : prevStep}
              className="btn-secondary !px-4 !py-1.5 !text-xs"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            <button 
              onClick={step === 3 ? handleSubmit : nextStep}
              disabled={isSubmitting}
              className="btn-primary !px-4 !py-1.5 !text-xs"
            >
              {step === 3 ? 'Publish Journey' : 'Continue'} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceSubmissionWizard;








