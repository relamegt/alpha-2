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
  X
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
        <div className="admin-page-wrapper transition-colors">
            <header className="page-header-container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="page-header-title">Job Manager</h1>
                        <p className="page-header-desc">Manage job listings and career opportunities for your students</p>
                    </div>
                    <button 
                        onClick={openCreate}
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Post New Job
                    </button>
                </div>
            </header>

            <div className="page-controls-bar">
                <div className="page-search-wrapper w-full max-w-sm">
                    <Search size={18} className="page-search-icon" />
                    <input
                        type="text"
                        placeholder="Filter by title or company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="page-search-input"
                    />
                </div>
            </div>

                <div className="table-wrapper">
                <table className="admin-custom-table">
                    <thead>
                        <tr>
                            <th>Job Title & Company</th>
                            <th>Location</th>
                            <th>Type</th>
                            <th>Expires</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredJobs.map(job => (
                            <tr key={job.id}>
                                <td className="title-td">
                                    <div className="title-group">
                                        <span className="main-title">{job.title}</span>
                                        <span className="sub-description text-primary-600 dark:text-primary-400 font-semibold">{job.company}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <MapPin size={14} />
                                        {job.location || 'Remote'}
                                    </div>
                                </td>
                                <td>
                                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-[10px] uppercase font-bold text-gray-500">
                                        {job.job_type}
                                    </span>
                                </td>
                                <td>
                                    <span className="text-xs text-gray-400">
                                        {new Date(job.expiresAt).toLocaleDateString()}
                                    </span>
                                </td>
                                <td className="actions-td">
                                    <div className="action-row">
                                        <button onClick={() => openEdit(job)} className="icon-btn build" title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => deleteMutation.mutate(job.id)} className="icon-btn delete" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingJob ? 'Edit Job Posting' : 'Post New Opportunity'}</h2>
                            <button onClick={() => setShowModal(false)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="modal-body space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Job Title</label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="e.g. Software Engineer (L3)"
                                            className="w-full bg-[var(--color-bg-primary)] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20"
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
                                            className="w-full bg-[var(--color-bg-primary)] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20"
                                            value={formData.company}
                                            onChange={(e) => setFormData({...formData, company: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Location</label>
                                        <input 
                                            type="text" 
                                            placeholder="Bangalore / Remote"
                                            className="w-full bg-[var(--color-bg-primary)] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20"
                                            value={formData.location}
                                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Experience Level</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. 0-2 Years"
                                            className="w-full bg-[var(--color-bg-primary)] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20"
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
                                            className="w-full bg-[var(--color-bg-primary)] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20"
                                            value={formData.apply_link}
                                            onChange={(e) => setFormData({...formData, apply_link: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Salary Package</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. 12-15 LPA"
                                            className="w-full bg-[var(--color-bg-primary)] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20"
                                            value={formData.salary}
                                            onChange={(e) => setFormData({...formData, salary: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Expiry Date</label>
                                        <input 
                                            type="date" 
                                            required
                                            className="w-full bg-[var(--color-bg-primary)] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20"
                                            value={formData.expiresAt}
                                            onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Job Description</label>
                                        <textarea 
                                            rows={4}
                                            placeholder="Briefly describe the role..."
                                            className="w-full bg-[var(--color-bg-primary)] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                                            value={formData.job_description}
                                            onChange={(e) => setFormData({...formData, job_description: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Discard</button>
                                <button 
                                    type="submit"
                                    className="btn-primary"
                                    disabled={createMutation.isLoading || updateMutation.isLoading}
                                >
                                    {createMutation.isLoading || updateMutation.isLoading ? 'Processing...' : editingJob ? 'Update Posting' : 'Broadcast Opportunity'}
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
