import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import sqlProblemService from '../../services/sqlProblemService';
import toast from 'react-hot-toast';
import {
    Plus, Search, Edit2, Trash2, Database, Code2, Link, FileText, X, AlertTriangle, Upload, Download
} from 'lucide-react';

const SqlProblemManager = () => {
    const { isDark } = useTheme();
    const [problems, setProblems] = useState([]);
    const [filteredProblems, setFilteredProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProblem, setEditingProblem] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        type: 'sql',
        difficulty: 'Easy',
        points: 50,
        description: '',
        section: '',
        sqlSchema: '',
        tutorial: '',
        supported_dbs: ['postgres'],
        articleLink: '',
        testCases: [{ input: '', output: '', isHidden: false, explanation: '' }]
    });

    useEffect(() => {
        fetchProblems();
    }, []);

    useEffect(() => {
        let result = problems.filter(p => p.type === 'sql');
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(p => p.title.toLowerCase().includes(lowerQuery));
        }
        setFilteredProblems(result);
    }, [problems, searchQuery]);

    const fetchProblems = async () => {
        setLoading(true);
        try {
            const data = await sqlProblemService.getAll();
            setProblems(data.problems || []);
        } catch (error) {
            toast.error('Failed to fetch SQL problems');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            type: 'sql',
            difficulty: 'Easy',
            points: 50,
            description: '',
            section: '',
            sqlSchema: '',
            tutorial: '',
            solutionCode: { sql: '' },
            supported_dbs: ['postgres'],
            articleLink: '',
            testCases: [{ input: '', output: '', isHidden: false, explanation: '' }]
        });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await sqlProblemService.create(formData);
            toast.success('SQL Problem created');
            setShowCreateModal(false);
            resetForm();
            fetchProblems();
        } catch (error) {
            toast.error(error.message || 'Failed to create');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { title, type, difficulty, points, description, section, sqlSchema, tutorial, supported_dbs, articleLink, testCases, solutionCode } = formData;
            const updatePayload = { title, type, difficulty, points, description, section, sqlSchema, tutorial, supported_dbs, articleLink, testCases, solutionCode };
            
            await sqlProblemService.update(editingProblem.id || editingProblem._id, updatePayload);
            toast.success('SQL Problem updated');
            setShowEditModal(false);
            setEditingProblem(null);
            resetForm();
            fetchProblems();
        } catch (error) {
            toast.error(error.message || 'Failed to update');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete SQL problem "${title}"?`)) return;
        try {
            await sqlProblemService.delete(id);
            toast.success('Deleted successfully');
            fetchProblems();
        } catch (error) {
            toast.error(error.message || 'Failed to delete');
        }
    };

    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const res = await sqlProblemService.bulkCreate(file);
            toast.success(res.message || 'Bulk upload successful');
            fetchProblems();
        } catch (error) {
            toast.error('Bulk upload failed: ' + (error.message || 'Invalid format'));
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    const downloadSample = () => {
        const sampleData = [
            {
                title: "Sample SQL Find Users",
                type: "sql",
                difficulty: "Easy",
                points: 20,
                description: "Write a query to find all users from `users` table where age > 18.",
                section: "Filtering",
                sqlSchema: "CREATE TABLE users (id INT, name VARCHAR, age INT);\nINSERT INTO users VALUES (1, 'Alice', 20), (2, 'Bob', 15);",
                solutionCode: { sql: "SELECT * FROM users WHERE age > 18;" },
                supported_dbs: ["postgres"],
                testCases: [
                    {
                        input: "INSERT INTO users VALUES (3, 'Charlie', 25), (4, 'David', 12);",
                        output: "| id | name | age |\n|----|------|-----|\n| 1  | Alice| 20  |\n| 3  | Charlie| 25 |",
                        isHidden: false,
                        explanation: "Finds users older than 18."
                    }
                ]
            }
        ];
        const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sql_problems_sample.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-[var(--color-bg-card)] p-6 rounded-2xl border border-gray-100 dark:border-[#23232e] shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <Database className="text-primary-500" />
                        SQL Problem Manager
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage database and SQL queries content</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={downloadSample} className="px-4 py-2 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#1c1c26] dark:hover:bg-[#23232e] text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium text-sm">
                        <Download size={16} />
                        Sample JSON
                    </button>
                    <label className={`px-4 py-2 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#1c1c26] dark:hover:bg-[#23232e] text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium text-sm cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {isUploading ? <div className="spinner border-2 !w-4 !h-4" /> : <Upload size={16} />}
                        Bulk Upload
                        <input type="file" accept=".json" onChange={handleBulkUpload} className="hidden" />
                    </label>
                    <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="px-4 py-2 flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-medium text-sm shadow-sm shadow-primary-500/20">
                        <Plus size={16} />
                        Create Problem
                    </button>
                </div>
            </div>

            <div className="flex gap-4 items-center bg-white dark:bg-[var(--color-bg-card)] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search SQL problems..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProblems.map(p => (
                        <div key={p._id} className="card group hover:border-primary-500/50 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    p.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : 
                                    p.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                }`}>
                                    {p.difficulty}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { 
                                        setEditingProblem(p); 
                                        setFormData({
                                            ...p,
                                            type: 'sql',
                                            solutionCode: p.solutionCode || { sql: '' },
                                            supported_dbs: p.supported_dbs || ['postgres'],
                                            testCases: p.testCases || [{ input: '', output: '', isHidden: false, explanation: '' }]
                                        }); 
                                        setShowEditModal(true); 
                                    }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(p._id, p.title)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 truncate">{p.title}</h3>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Database size={12} /> {p.section || 'General'}</span>
                                <span className="flex items-center gap-1"><FileText size={12} /> {p.points} Pts</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Simple Modal skeleton */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[var(--color-bg-card)] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold">{showCreateModal ? 'Create SQL Problem' : 'Edit SQL Problem'}</h2>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Title</label>
                                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Section/Topic</label>
                                    <input type="text" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" placeholder="e.g. Joins, Aggregation" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Description (Markdown)</label>
                                <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none resize-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Initial SQL Schema (DDL)</label>
                                <textarea rows={6} value={formData.sqlSchema} onChange={e => setFormData({...formData, sqlSchema: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none font-mono text-xs" placeholder="CREATE TABLE users (...);" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Article Link (GitHub URL for Markdown)</label>
                                <input 
                                    placeholder="https://github.com/user/repo/blob/main/sql-article.md" 
                                    type="text" 
                                    value={formData.articleLink || ''} 
                                    onChange={e => setFormData({...formData, articleLink: e.target.value})} 
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none font-mono text-sm" 
                                />
                                <p className="text-[10px] text-gray-500 italic">This will render as the "Article" tab explanation for this query problem.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Solution Query</label>
                                <textarea required rows={4} value={formData.solutionCode.sql} onChange={e => setFormData({...formData, solutionCode: { ...formData.solutionCode, sql: e.target.value }})} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none font-mono text-xs" placeholder="SELECT * FROM users WHERE ..." />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-[var(--color-border-interactive)]">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold flex items-center gap-2">
                                        <Code2 size={16} className="text-primary-500" />
                                        Test Cases (Examples)
                                    </label>
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData({ ...formData, testCases: [...formData.testCases, { input: '', output: '', isHidden: false, explanation: '' }] })}
                                        className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add Case
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    {formData.testCases.map((tc, idx) => (
                                        <div key={idx} className="p-4 bg-gray-50 dark:bg-[#1c1c26] rounded-xl border border-gray-100 dark:border-gray-800 relative group/tc">
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({ ...formData, testCases: formData.testCases.filter((_, i) => i !== idx) })}
                                                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover/tc:opacity-100 transition-opacity"
                                            >
                                                <X size={14} />
                                            </button>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Input Table SQL (Optional Overrides)</label>
                                                    <textarea 
                                                        value={tc.input} 
                                                        onChange={e => {
                                                            const newCases = [...formData.testCases];
                                                            newCases[idx].input = e.target.value;
                                                            setFormData({ ...formData, testCases: newCases });
                                                        }}
                                                        placeholder="-- Extra inserts or different state"
                                                        rows={3}
                                                        className="w-full p-2 text-xs font-mono bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Expected Output (Pipe Format)</label>
                                                    <textarea 
                                                        required
                                                        value={tc.output} 
                                                        onChange={e => {
                                                            const newCases = [...formData.testCases];
                                                            newCases[idx].output = e.target.value;
                                                            setFormData({ ...formData, testCases: newCases });
                                                        }}
                                                        placeholder="| col1 | col2 |\n| val1 | val2 |"
                                                        rows={3}
                                                        className="w-full p-2 text-xs font-mono bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between">
                                                <div className="flex-1 mr-4">
                                                    <textarea 
                                                        value={tc.explanation} 
                                                        onChange={e => {
                                                            const newCases = [...formData.testCases];
                                                            newCases[idx].explanation = e.target.value;
                                                            setFormData({ ...formData, testCases: newCases });
                                                        }}
                                                        placeholder="Explanation for this example..."
                                                        rows={2}
                                                        className="w-full px-2 py-1 text-xs bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded outline-none resize-none"
                                                    />
                                                </div>
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={tc.isHidden}
                                                        onChange={e => {
                                                            const newCases = [...formData.testCases];
                                                            newCases[idx].isHidden = e.target.checked;
                                                            setFormData({ ...formData, testCases: newCases });
                                                        }}
                                                        className="w-3 h-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Hidden</span>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="px-6 py-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-medium">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-8 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-200 dark:shadow-none transition-all font-bold flex items-center gap-2">
                                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (showCreateModal ? 'Create' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SqlProblemManager;








