import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';
import announcementService from '../../services/announcementService';
import {
    Plus,
    Trash2,
    Edit2,
    Bell,
    X,
    Type,
    Layout,
    Clock,
    CheckCircle,
    AlertCircle,
    Megaphone,
    Search
} from 'lucide-react';
import toast from 'react-hot-toast';

const AnnouncementManager = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'INFO', // INFO, WARNING, SUCCESS, IMPORTANT
        isGlobal: true
    });

    const { data: announcements, isLoading } = useQuery({
        queryKey: queryKeys.announcements.all(),
        queryFn: announcementService.getAnnouncements
    });

    const createMutation = useMutation({
        mutationFn: announcementService.createAnnouncement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all() });
            setShowModal(false);
            toast.success('Announcement broadcasted');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => announcementService.updateAnnouncement(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all() });
            setShowModal(false);
            toast.success('Announcement updated');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: announcementService.deleteAnnouncement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all() });
            toast.success('Announcement deleted');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingAnnouncement) {
            updateMutation.mutate({ id: editingAnnouncement.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const openCreate = () => {
        setEditingAnnouncement(null);
        setFormData({ title: '', content: '', type: 'INFO', isGlobal: true });
        setShowModal(true);
    };

    const openEdit = (announcement) => {
        setEditingAnnouncement(announcement);
        setFormData({
            title: announcement.title,
            content: announcement.content,
            type: announcement.type,
            isGlobal: announcement.isGlobal
        });
        setShowModal(true);
    };

    const filteredAnnouncements = announcements?.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

    const getTypeColor = (type) => {
        switch (type) {
            case 'WARNING': return 'bg-amber-500';
            case 'SUCCESS': return 'bg-green-500';
            case 'IMPORTANT': return 'bg-red-500';
            default: return 'bg-primary-500';
        }
    };

    return (
        <div className="admin-page-wrapper">
            <header className="page-header-container">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                        <h1 className="page-header-title">Announcements</h1>
                        <p className="page-header-desc">Keep your students updated with the latest news, alerts, and platform updates.</p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        New Broadcast
                    </button>
                </div>
            </header>

            <div className="page-controls-bar">
                <div className="page-search-wrapper w-full max-w-sm">
                    <Search size={18} className="page-search-icon" />
                    <input
                        type="text"
                        placeholder="Search announcements..."
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
                            <th>Announcement</th>
                            <th>Type</th>
                            <th>Broadcast Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAnnouncements?.map(announcement => (
                            <tr key={announcement.id}>
                                <td className="title-td">
                                    <div className="title-group">
                                        <span className="main-title">{announcement.title}</span>
                                        <span className="sub-description">{announcement.content?.slice(0, 80)}...</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${getTypeColor(announcement.type)}`} />
                                        <span className="text-xs font-bold text-gray-500 uppercase">{announcement.type}</span>
                                        {announcement.isGlobal && (
                                            <span className="text-[9px] font-black uppercase text-primary-500 bg-primary-50 dark:bg-primary-500/10 px-1.5 py-0.5 rounded ml-1">Global</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className="text-xs text-gray-400">
                                        {new Date(announcement.createdAt).toLocaleDateString()}
                                    </span>
                                </td>
                                <td className="actions-td">
                                    <div className="action-row">
                                        <button onClick={() => openEdit(announcement)} className="icon-btn build" title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => deleteMutation.mutate(announcement.id)} className="icon-btn delete" title="Delete">
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
                    <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingAnnouncement ? 'Modify Broadcast' : 'Create New Blast'}</h2>
                            <button onClick={() => setShowModal(false)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="modal-body space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Announcement Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter subject..."
                                        className="w-full bg-[var(--color-bg-primary)] border-none rounded-2xl p-4 dark:text-white"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Type / Priority</label>
                                    <div className="grid grid-cols-4 gap-3">
                                        {['INFO', 'SUCCESS', 'WARNING', 'IMPORTANT'].map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: t })}
                                                className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${formData.type === t ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-50 dark:border-gray-800 text-gray-400'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Core Content (Broadcast Message)</label>
                                    <textarea
                                        rows={5}
                                        required
                                        placeholder="What do you want to tell your students?..."
                                        className="w-full bg-[var(--color-bg-primary)] border-none rounded-2xl p-4 dark:text-white"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl">
                                    <div>
                                        <h5 className="text-sm font-bold dark:text-white">Global Broadcast</h5>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Visible to all registered students</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={formData.isGlobal}
                                        onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked })}
                                        className="w-6 h-6 rounded-lg text-primary-600 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Discard</button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={createMutation.isLoading || updateMutation.isLoading}
                                    >
                                        {editingAnnouncement ? 'Update Broadcast' : 'Fire Announcement'}
                                    </button>
                                </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};











export default AnnouncementManager;
