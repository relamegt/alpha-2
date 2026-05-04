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
        mutationFn: ({id, data}) => announcementService.updateAnnouncement(id, data),
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
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-white dark:bg-[var(--color-bg-card)] p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-xl shadow-primary-500/5">
                <div>
                    <h1 className="text-4xl font-black dark:text-white tracking-tight flex items-center gap-4">
                        <div className="p-3 bg-primary-600 rounded-2xl text-white">
                            <Megaphone className="w-8 h-8" />
                        </div>
                        Announcements
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Keep your students updated with the latest news and alerts.</p>
                </div>
                <button 
                    onClick={openCreate}
                    className="bg-primary-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 font-black shadow-xl shadow-primary-600/30 hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus className="w-6 h-6" />
                    New Blast
                </button>
            </div>

            <div className="relative max-w-xl">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search announcements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 border-none rounded-2xl bg-white dark:bg-[var(--color-bg-card)] text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 shadow-sm transition-all"
                />
            </div>

            <div className="space-y-4">
                {filteredAnnouncements?.map(announcement => (
                    <div key={announcement.id} className="bg-white dark:bg-[var(--color-bg-card)] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between group transition-all hover:bg-gray-50 dark:hover:bg-primary-500/5">
                        <div className="flex items-center gap-6">
                            <div className={`w-3 h-12 rounded-full ${getTypeColor(announcement.type)} shadow-lg shadow-black/10`} />
                            <div>
                                <h4 className="text-lg font-bold dark:text-white">{announcement.title}</h4>
                                <p className="text-sm text-gray-500 line-clamp-1 max-w-2xl">{announcement.content}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(announcement.createdAt).toLocaleString()}
                                    </span>
                                    {announcement.isGlobal && (
                                         <span className="text-[10px] font-black uppercase text-primary-500 bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 rounded">Global Broadcast</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openEdit(announcement)} className="p-3 text-gray-400 hover:text-primary-500 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm">
                                <Edit2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => deleteMutation.mutate(announcement.id)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[var(--color-bg-card)] rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-black dark:text-white tracking-tight">{editingAnnouncement ? 'Modify Broadcast' : 'Create New Blast'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X className="w-6 h-6 dark:text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Announcement Title</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Enter subject..."
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 dark:text-white"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Type / Priority</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {['INFO', 'SUCCESS', 'WARNING', 'IMPORTANT'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setFormData({...formData, type: t})}
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
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 dark:text-white"
                                    value={formData.content}
                                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                                <div>
                                    <h5 className="text-sm font-bold dark:text-white">Global Broadcast</h5>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Visible to all registered students</p>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={formData.isGlobal}
                                    onChange={(e) => setFormData({...formData, isGlobal: e.target.checked})}
                                    className="w-6 h-6 rounded-lg text-primary-600 focus:ring-primary-500"
                                />
                            </div>

                            <div className="flex justify-end gap-4 pt-6 border-t border-[var(--color-border-interactive)]">
                                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3 font-bold text-gray-500 hover:text-gray-700 transition-colors">Discard</button>
                                <button 
                                    type="submit"
                                    className="bg-primary-600 text-white px-10 py-3 rounded-2xl font-black shadow-xl shadow-primary-600/30 active:scale-95 transition-all text-sm italic uppercase"
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








