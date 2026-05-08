import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import sqlProblemService from '../../services/sqlProblemService';
import toast from 'react-hot-toast';
import {
    Plus, Search, Edit2, Trash2, Database, Code2, Link, FileText, X, AlertTriangle, Upload, Download, CheckCircle
} from 'lucide-react';
import Editor from '@monaco-editor/react';

const SqlProblemManager = () => {
    const { isDark } = useTheme();
    const [problems, setProblems] = useState([]);
    const [filteredProblems, setFilteredProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    
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
            setSelectedIds(prev => prev.filter(currId => currId !== id));
            fetchProblems();
        } catch (error) {
            toast.error(error.message || 'Failed to delete');
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} selected SQL problems? This action cannot be undone.`)) return;
        try {
            await sqlProblemService.bulkDelete(selectedIds);
            toast.success(`${selectedIds.length} SQL problems deleted successfully`);
            setSelectedIds([]);
            fetchProblems();
        } catch (error) {
            toast.error(error.message || 'Failed to delete');
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredProblems.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProblems.map(p => p._id));
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
        <div className="admin-page-wrapper transition-colors">
            <header className="page-header-container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="page-header-title">SQL Problem Manager</h1>
                        <p className="page-header-desc">Manage database and SQL queries content</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={downloadSample} className="btn-secondary flex items-center gap-2 py-2">
                            <Download size={16} />
                            Sample JSON
                        </button>
                        <label className={`btn-secondary flex items-center gap-2 py-2 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {isUploading ? <div className="spinner border-2 !w-4 !h-4" /> : <Upload size={16} />}
                            Bulk Upload
                            <input type="file" accept=".json" onChange={handleBulkUpload} className="hidden" />
                        </label>
                        <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2 py-2">
                            <Plus size={16} />
                            Create Problem
                        </button>
                        {selectedIds.length > 0 && (
                            <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2">
                                <Trash2 size={16} />
                                Delete ({selectedIds.length})
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="page-tabs-container">
                <div className="page-search-wrapper w-full max-w-md">
                    <Search className="page-search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search SQL problems..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="page-search-input"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner"></div></div>
            ) : filteredProblems.length > 0 ? (
                <div className="table-wrapper">
                    <table className="admin-custom-table">
                        <thead>
                            <tr>
                                <th className="w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={filteredProblems.length > 0 && selectedIds.length === filteredProblems.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 dark:bg-gray-800"
                                    />
                                </th>
                                <th>Problem Title</th>
                                <th>Difficulty</th>
                                <th>Points</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProblems.map(p => (
                                <tr key={p._id} className={selectedIds.includes(p._id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}>
                                    <td>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(p._id)}
                                            onChange={() => toggleSelect(p._id)}
                                            className="rounded border-gray-300 dark:bg-gray-800"
                                        />
                                    </td>
                                    <td className="title-td">
                                        <div className="title-group">
                                            <span className="main-title">{p.title}</span>
                                            <span className="sub-description">{p.description?.slice(0, 80)}...</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`diff-badge ${p.difficulty || 'Easy'}`}>
                                            {p.difficulty || 'Easy'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-xs font-bold text-gray-400">{p.points || 0} PTS</span>
                                    </td>
                                    <td className="actions-td">
                                        <div className="action-row">
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
                                            }} className="icon-btn build" title="Edit">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(p._id, p.title)} className="icon-btn delete" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state-container">
                    <div className="empty-state-icon">
                        <Database size={32} />
                    </div>
                    <p className="empty-state-text">No SQL problems found</p>
                    <p className="empty-state-subtext">Start by creating your first SQL query challenge</p>
                </div>
            )}

            {/* Simple Modal skeleton */}
            {(showCreateModal || showEditModal) && (
                <div className="modal-backdrop" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
                    <div className="modal-content max-w-4xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{showCreateModal ? 'Create SQL Problem' : 'Edit SQL Problem'}</h2>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="modal-body space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Title</label>
                                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Section/Topic</label>
                                    <input type="text" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none" placeholder="e.g. Joins, Aggregation" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Description (Markdown)</label>
                                <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none resize-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Initial SQL Schema (DDL)</label>
                                <textarea rows={6} value={formData.sqlSchema} onChange={e => setFormData({...formData, sqlSchema: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none font-mono text-xs" placeholder="CREATE TABLE users (...);" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Article Link (GitHub URL for Markdown)</label>
                                <input 
                                    placeholder="https://github.com/user/repo/blob/main/sql-article.md" 
                                    type="text" 
                                    value={formData.articleLink || ''} 
                                    onChange={e => setFormData({...formData, articleLink: e.target.value})} 
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none font-mono text-sm" 
                                />
                                <p className="text-[10px] text-gray-500 italic">This will render as the "Article" tab explanation for this query problem.</p>
                            </div>
                            <div className="space-y-4">
                                <label className="text-sm font-bold flex items-center gap-2">
                                    <CheckCircle size={16} className="text-green-500" />
                                    Solution Query
                                </label>
                                <div className="h-[200px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                    <Editor
                                        height="100%"
                                        language="sql"
                                        theme={isDark ? "vs-dark" : "vs-light"}
                                        value={formData.solutionCode.sql || ''}
                                        onChange={(val) => setFormData({ ...formData, solutionCode: { ...formData.solutionCode, sql: val || '' } })}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 13,
                                            lineNumbers: 'on',
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true
                                        }}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 italic">💡 This query will be executed against the test case state to verify correctness.</p>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
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
                                                        className="w-full p-2 text-xs font-mono bg-white dark:bg-[#111117] border border-gray-200 dark:border-gray-700 rounded outline-none"
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
                                                        className="w-full p-2 text-xs font-mono bg-white dark:bg-[#111117] border border-gray-200 dark:border-gray-700 rounded outline-none"
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
                                                        className="w-full px-2 py-1 text-xs bg-white dark:bg-[#111117] border border-gray-200 dark:border-gray-700 rounded outline-none resize-none"
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
                            <div className="modal-footer">
                                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary">
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
