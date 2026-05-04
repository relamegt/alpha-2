import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';
import jobService from '../../services/jobService';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Building2, 
  MapPin, 
  Briefcase,
  X,
  ExternalLink,
  ChevronRight,
  Clock,
  Banknote,
  GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';

const JobManager = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingJob, setEditingJob] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        company: '',
        about_company: '',
        job_description: '',
        job_type: 'Full Time',
        location: '',
        experience: '',
        salary: 'Not disclosed',
        apply_link: '',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    const { data: jobs, isLoading } = useQuery({
        queryKey: queryKeys.jobs.all(),
        queryFn: jobService.getAllJobs
    });

    const createMutation = useMutation({
        mutationFn: jobService.createJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
            setShowModal(false);
            toast.success('Job posted successfully');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({id, data}) => jobService.updateJob(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
            setShowModal(false);
            toast.success('Job updated successfully');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: jobService.deleteJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
            toast.success('Job deleted');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = {
            ...formData,
            expiresAt: new Date(formData.expiresAt)
        };
        if (editingJob) {
            updateMutation.mutate({ id: editingJob.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const openCreate = () => {
        setEditingJob(null);
        setFormData({
            title: '',
            company: '',
            about_company: '',
            job_description: '',
            job_type: 'Full Time',
            location: '',
            experience: '',
            salary: 'Not disclosed',
            apply_link: '',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        setShowModal(true);
    };

    const openEdit = (job) => {
        setEditingJob(job);
        setFormData({
            ...job,
            expiresAt: new Date(job.expiresAt).toISOString().split('T')[0]
        });
        setShowModal(true);
    };

    const filteredJobs = jobs?.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-white dark:bg-[var(--color-bg-card)] p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-xl shadow-primary-500/5">
                <div>
                    <h1 className="text-4xl font-black dark:text-white tracking-tight flex items-center gap-4">
                        <div className="p-3 bg-primary-600 rounded-2xl text-white">
                            <Briefcase className="w-8 h-8" />
                        </div>
                        Job Manager
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Manage job listings and career opportunities for your students.</p>
                </div>
                <button 
                    onClick={openCreate}
                    className="bg-primary-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 font-black shadow-xl shadow-primary-600/30 hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus className="w-6 h-6" />
                    Post New Job
                </button>
            </div>

            <div className="relative max-w-xl">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Filter by title or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 border-none rounded-2xl bg-white dark:bg-[var(--color-bg-card)] text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 shadow-sm transition-all"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs?.map(job => (
                    <div key={job.id} className="group bg-white dark:bg-[var(--color-bg-card)] p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 hover:border-primary-500/50 transition-all duration-300 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary-50 transition-colors">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openEdit(job)} className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-all">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => deleteMutation.mutate(job.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xl font-bold dark:text-white line-clamp-1">{job.title}</h4>
                                <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">{job.company}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <MapPin className="w-3.5 h-3.5" />
                                {job.location || 'Remote'}
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center text-xs font-bold text-gray-400">
                             <span>Expires: {new Date(job.expiresAt).toLocaleDateString()}</span>
                             <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-[10px] uppercase">{job.job_type}</span>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-[var(--color-bg-card)] rounded-[2.5rem] p-10 max-w-3xl w-full shadow-2xl space-y-8 my-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-black dark:text-white tracking-tight">{editingJob ? 'Edit Job Posting' : 'Post New Opportunity'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X className="w-6 h-6 dark:text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Job Title</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="e.g. Software Engineer (L3)"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 dark:text-white"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Company Name</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Company Ltd."
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 dark:text-white"
                                    value={formData.company}
                                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Location</label>
                                <input 
                                    type="text" 
                                    placeholder="Bangalore / Remote"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 dark:text-white"
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Experience Level</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. 0-2 Years"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 dark:text-white"
                                    value={formData.experience}
                                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Apply Link</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="URL"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 dark:text-white"
                                    value={formData.apply_link}
                                    onChange={(e) => setFormData({...formData, apply_link: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Salary Package</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. 12-15 LPA"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 dark:text-white"
                                    value={formData.salary}
                                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Expiry Date</label>
                                <input 
                                    type="date" 
                                    required
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 dark:text-white"
                                    value={formData.expiresAt}
                                    onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Job Description</label>
                                <textarea 
                                    rows={4}
                                    placeholder="Briefly describe the role..."
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 dark:text-white"
                                    value={formData.job_description}
                                    onChange={(e) => setFormData({...formData, job_description: e.target.value})}
                                />
                            </div>

                            <div className="flex justify-end gap-4 pt-6 col-span-1 md:col-span-2 border-t border-[var(--color-border-interactive)]">
                                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3 font-bold text-gray-500 hover:text-gray-700 transition-colors">Discard</button>
                                <button 
                                    type="submit"
                                    className="bg-primary-600 text-white px-10 py-3 rounded-2xl font-black shadow-xl shadow-primary-600/30 active:scale-95 transition-all text-sm italic uppercase"
                                >
                                    {editingJob ? 'Update Posting' : 'Broadcast Opportunity'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobManager;








