import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import problemService from '../../services/problemService';
import toast from 'react-hot-toast';
import CustomDropdown from '../../components/shared/CustomDropdown';
import Editor from '@monaco-editor/react';
import {
    Plus,
    Upload,
    Download,
    Search,
    Filter,
    Edit2,
    Trash2,
    X,
    Code,
    Code2,
    CheckCircle,
    AlertTriangle,
    FileText,
    List,
    Clock,
    Award,
    Link,
    Youtube,
    Database,
    UploadCloud,
    CheckSquare,
    BookOpen,
    Layers
} from 'lucide-react';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const POINTS = {
    Easy: 20,
    Medium: 50,
    Hard: 100,
};

const ProblemManager = () => {
    const { isDark } = useTheme();
    const [problems, setProblems] = useState([]);
    const [filteredProblems, setFilteredProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedProblems, setSelectedProblems] = useState([]);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('all');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProblem, setEditingProblem] = useState(null);
    const [showSolutionModal, setShowSolutionModal] = useState(false);
    const [solutionProblem, setSolutionProblem] = useState(null);
    const [solutionLang, setSolutionLang] = useState('cpp');
    const [solutionCode, setSolutionCodeVal] = useState('');
    const [savingSolution, setSavingSolution] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        type: 'problem', // 'problem', 'quiz', 'material'
        difficulty: 'Easy',
        points: 20,
        description: '',
        constraints: [],
        examples: [{ input: '', output: '', explanation: '' }],
        testCases: [{ input: '', output: '', isHidden: false }],
        timeLimit: 2000,
        editorialLink: '',
        videoUrl: '',
        solutionCode: {},
        quizQuestions: []
    });

    const [bulkFile, setBulkFile] = useState(null);

    useEffect(() => {
        fetchProblems();
    }, []);

    // Filter logic
    useEffect(() => {
        let result = problems;

        if (activeTab !== 'all') {
            result = result.filter(p => p.type === activeTab);
        }

        if (difficultyFilter !== 'all') {
            result = result.filter(p => p.difficulty === difficultyFilter);
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(p =>
                (p.title && p.title.toLowerCase().includes(lowerQuery)) ||
                (p.description && p.description.toLowerCase().includes(lowerQuery))
            );
        }

        setFilteredProblems(result);
    }, [problems, difficultyFilter, searchQuery, activeTab]);

    const fetchProblems = async () => {
        setLoading(true);
        try {
            // Fetch all problems then filter locally for "instant" feel
            const data = await problemService.getAllProblems();
            setProblems(data.problems || []);
        } catch (error) {
            toast.error(error.message || 'Failed to fetch problems');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProblem = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await problemService.createProblem(formData);
            toast.success('Problem created successfully');
            setShowCreateModal(false);
            resetForm();
            fetchProblems();
        } catch (error) {
            toast.error(error.message || 'Failed to create problem');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkUploadDirect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsSubmitting(true);
        try {
            const response = await problemService.bulkCreateProblems(file);
            toast.success(response.message || 'Bulk upload successful');
            fetchProblems();
        } catch (error) {
            toast.error(error.message || 'Bulk upload failed');
        } finally {
            setIsSubmitting(false);
            e.target.value = null;
        }
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        if (!bulkFile) {
            toast.error('Please select a JSON file');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await problemService.bulkCreateProblems(bulkFile);
            toast.success(response.message);
            setShowBulkModal(false);
            setBulkFile(null);
            fetchProblems();
        } catch (error) {
            toast.error(error.message || 'Bulk upload failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateProblem = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { 
                title, type, difficulty, points, description, constraints, 
                examples, testCases, timeLimit, editorialLink, videoUrl, 
                solutionCode, quizQuestions, section 
            } = formData;
            const updatePayload = { 
                title, type, difficulty, points, description, constraints, 
                examples, testCases, timeLimit, editorialLink, videoUrl, 
                solutionCode, quizQuestions, section 
            };
            
            await problemService.updateProblem(editingProblem.id || editingProblem._id, updatePayload);
            toast.success('Problem updated successfully');
            setShowEditModal(false);
            setEditingProblem(null);
            resetForm();
            fetchProblems();
        } catch (error) {
            toast.error(error.message || 'Failed to update problem');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProblem = async (problemId, problemTitle) => {
        if (!window.confirm(`Delete problem "${problemTitle}"? This will also delete all related submissions. This action cannot be undone.`)) {
            return;
        }

        try {
            await problemService.deleteProblem(problemId);
            toast.success('Problem deleted successfully');
            setSelectedProblems(prev => prev.filter(id => id !== problemId));
            fetchProblems();
        } catch (error) {
            toast.error(error.message || 'Failed to delete problem');
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedProblems.length} selected problems? This will also delete all related submissions. This action cannot be undone.`)) {
            return;
        }

        try {
            await problemService.bulkDeleteProblems(selectedProblems);
            toast.success(`${selectedProblems.length} problems deleted successfully`);
            setSelectedProblems([]);
            fetchProblems();
        } catch (error) {
            toast.error(error.message || 'Failed to delete problems');
        }
    };

    const toggleProblemSelection = (problemId) => {
        setSelectedProblems(prev =>
            prev.includes(problemId)
                ? prev.filter(id => id !== problemId)
                : [...prev, problemId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedProblems.length === filteredProblems.length) {
            setSelectedProblems([]);
        } else {
            setSelectedProblems(filteredProblems.map(p => p._id));
        }
    };

    const openSolutionModal = async (problem) => {
        setSolutionProblem(problem);
        setSolutionLang('cpp');
        setSolutionCodeVal('');
        // Try to load existing solution code for this problem
        try {
            const data = await problemService.getProblemById(problem._id);
            const existing = data.problem?.solutionCode?.['cpp'] || '';
            setSolutionCodeVal(existing);
        } catch (error) { console.error('Error fetching solution code', error); }
        setShowSolutionModal(true);
    };

    const handleSaveSolution = async () => {
        if (!solutionCode.trim()) {
            toast.error('Solution code cannot be empty');
            return;
        }
        setSavingSolution(true);
        try {
            await problemService.setSolutionCode(solutionProblem._id, solutionLang, solutionCode);
            toast.success(`Reference solution saved for ${solutionLang.toUpperCase()}!`);
            setShowSolutionModal(false);
        } catch (err) {
            toast.error(err.message || 'Failed to save solution');
        } finally {
            setSavingSolution(false);
        }
    };


    const openEditModal = async (problem) => {
        try {
            const data = await problemService.getProblemById(problem._id);
            // Ensure data structure matches
            const p = data.problem;
            setEditingProblem(problem);
            setFormData({
                title: p.title,
                type: p.type || 'problem',
                difficulty: p.difficulty,
                points: p.points,
                description: p.description,
                constraints: p.constraints || [],
                examples: p.examples || [{ input: '', output: '', explanation: '' }],
                testCases: p.testCases || [{ input: '', output: '', isHidden: false }],
                timeLimit: p.timeLimit || 2000,
                editorialLink: p.editorialLink || '',
                videoUrl: p.videoUrl || '',
                solutionCode: p.solutionCode || {},
                quizQuestions: p.quizQuestions || []
            });
            setShowEditModal(true);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load problem details');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            type: 'problem',
            difficulty: 'Easy',
            points: 20,
            description: '',
            constraints: [],
            examples: [{ input: '', output: '', explanation: '' }],
            testCases: [{ input: '', output: '', isHidden: false }],
            timeLimit: 2000,
            editorialLink: '',
            videoUrl: '',
            quizQuestions: []
        });
    };

    const addExample = () => {
        setFormData({
            ...formData,
            examples: [...formData.examples, { input: '', output: '', explanation: '' }],
        });
    };

    const addTestCase = () => {
        setFormData({
            ...formData,
            testCases: [...formData.testCases, { input: '', output: '', isHidden: false }],
        });
    };

    const updateExample = (idx, field, val) => {
        const updated = [...formData.examples];
        updated[idx][field] = val;
        setFormData({ ...formData, examples: updated });
    };

    const updateTestCase = (idx, field, val) => {
        const updated = [...formData.testCases];
        updated[idx][field] = val;
        setFormData({ ...formData, testCases: updated });
    };

    const addQuizQuestion = () => {
        setFormData({
            ...formData,
            quizQuestions: [...formData.quizQuestions, { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, explanation: '' }]
        });
    };

    const updateQuizQuestion = (idx, field, val, optionIdx = null) => {
        const updated = [...formData.quizQuestions];
        if (field === 'options' && optionIdx !== null) {
            updated[idx].options[optionIdx] = val;
        } else {
            updated[idx][field] = val;
        }
        setFormData({ ...formData, quizQuestions: updated });
    };

    // Helper to remove items
    const removeItem = (type, idx) => {
        if (type === 'example') {
            const updated = formData.examples.filter((_, i) => i !== idx);
            setFormData({ ...formData, examples: updated });
        } else if (type === 'testCase') {
            const updated = formData.testCases.filter((_, i) => i !== idx);
            setFormData({ ...formData, testCases: updated });
        } else if (type === 'quizQuestion') {
            const updated = formData.quizQuestions.filter((_, i) => i !== idx);
            setFormData({ ...formData, quizQuestions: updated });
        }
    };

    const downloadSample = () => {
        const sample = [
            {
                title: 'Right-Angle Triangle Pattern',
                type: 'problem',
                difficulty: 'Easy',
                description: 'Given an integer N, print a right-angled triangle pattern of stars (`*`) with N rows. Each row must be printed on a new line.\n\n**Input Format:**\n- An integer N representing the number of rows.',
                constraints: ['1 <= N <= 1000'],
                examples: [
                    {
                        input: '3', // As a string
                        output: '*\n**\n***',
                        explanation: 'A right-angled triangle of height 3.',
                    },
                ],
                testCases: [
                    { input: '3', output: '*\n**\n***', isHidden: false },
                    { input: '5', output: '*\n**\n***\n****\n*****', isHidden: true },
                ],
                timeLimit: 2000,
                editorialLink: 'https://github.com/your-username/your-repo/blob/main/solutions/stars.md',
                videoUrl: '',
                solutionCode: {
                    "cpp": "#include <iostream>\nusing namespace std;\nint main() {\n  int n;\n  cin >> n;\n  for(int i=1; i<=n; i++) {\n    for(int j=1; j<=i; j++) cout << \"*\";\n    cout << endl;\n  }\n  return 0;\n}",
                    "python": "n = int(input())\nfor i in range(1, n+1):\n    print('*' * i)"
                }
            },
            {
                title: "Largest Element in Array",
                type: "problem",
                difficulty: "Easy",
                description: "Given an array of integers `arr` of size `N`, find and return the **largest element** in the array.\n\n**Input Format:**\n- First line: integer `N`.\n- Second line: `N` space-separated integers.\n\n**Output Format:**\n- Print a single integer — the largest element.",
                constraints: [
                    "1 <= N <= 10^6",
                    "-10^9 <= arr[i] <= 10^9"
                ],
                examples: [
                    {
                        input: "5\n3 1 4 1 5",
                        output: "5",
                        explanation: "Among [3,1,4,1,5], the largest element is 5."
                    }
                ],
                testCases: [
                    {
                        input: "5\n3 1 4 1 5",
                        output: "5",
                        isHidden: false
                    },
                    {
                        "_comment": "OPTION A (FASTEST ~1ms): Use jsGeneratorScript — runs natively in Node.js vm, zero subprocess",
                        "jsGeneratorScript": "const N = 1000000;\nconsole.log(N);\nconst a = new Array(N);\nfor (let i = 0; i < N - 1; i++) a[i] = 1;\na[N - 1] = 1000000000;\nconsole.log(a.join(' '));",
                        "jsOutputGenerator": "console.log(1000000000);",
                        isHidden: true,
                        note: "N=10^6, all 1s except last element is 10^9. Tests O(N) solution."
                    }
                ]
            },
            {
                title: "Two Sum",
                type: "problem",
                difficulty: "Easy",
                points: 20,
                description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
                constraints: ["2 <= nums.length <= 104", "-109 <= nums[i] <= 109", "-109 <= target <= 109"],
                examples: [
                    { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." }
                ],
                testCases: [
                    { "input": "4\n2 7 11 15\n9", "output": "0 1", "isHidden": false },
                    { "input": "3\n3 2 4\n6", "output": "1 2", "isHidden": false }
                ],
                timeLimit: 2000,
                expectedTimeComplexity: "O(n)",
                expectedSpaceComplexity: "O(n)",
                solutionCode: {
                    "python": "class Solution:\n    def twoSum(self, nums, target):\n        prevMap = {} # val : index\n        for i, n in enumerate(nums):\n            diff = target - n\n            if diff in prevMap:\n                return [prevMap[diff], i]\n            prevMap[n] = i",
                    "cpp": "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> prevMap;\n        for (int i = 0; i < nums.size(); i++) {\n            int diff = target - nums[i];\n            if (prevMap.find(diff) != prevMap.end()) return {prevMap[diff], i};\n            prevMap[nums[i]] = i;\n        }\n        return {};\n    }\n};"
                }
            }
        ];

        const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'coding_problems_sample.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const typeOptions = [
        { value: 'problem', label: 'Coding Problem' },
        { value: 'sql', label: 'SQL Problem' },
        { value: 'quiz', label: 'Quiz' },
        { value: 'material', label: 'Article' },
        { value: 'video', label: 'Video' }
    ];

    const difficultyOptions = [
        { value: 'all', label: 'All Difficulties' },
        ...DIFFICULTIES.map(d => ({ value: d, label: d }))
    ];

    const formDifficultyOptions = DIFFICULTIES.map(d => ({ value: d, label: d }));

    return (
        <div className="admin-page-wrapper">
            <div className="max-w-7xl mx-auto">
                <header className="page-header-container">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="page-header-title">Problem Manager</h1>
                            <p className="page-header-desc">Create and manage coding problems, quizzes, and videos.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={downloadSample} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                <Download size={18} />
                                <span>Sample JSON</span>
                            </button>
                            <label className={`px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
                                {isSubmitting ? <div className="spinner border-2 !w-4 !h-4" /> : <Upload size={18} />}
                                <span>Bulk Upload</span>
                                <input type="file" accept=".json" onChange={handleBulkUploadDirect} className="hidden" />
                            </label>
                            <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2">
                                <Plus size={18} />
                                <span>Create Problem</span>
                            </button>
                            {selectedProblems.length > 0 && (
                                <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2">
                                    <Trash2 size={18} />
                                    <span>Delete ({selectedProblems.length})</span>
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <div className="page-controls-bar">
                    <div className="page-tab-container overflow-x-auto">
                        {[
                            { id: 'all', label: 'All Content' },
                            { id: 'problem', label: 'Coding' },
                            { id: 'quiz', label: 'Quizzes' },
                            { id: 'video', label: 'Videos' },
                            { id: 'material', label: 'Articles' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`page-tab-item ${activeTab === tab.id ? 'active' : ''}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="page-search-wrapper flex-1 max-w-md">
                        <Search className="page-search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search content..."
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
                                        checked={filteredProblems.length > 0 && selectedProblems.length === filteredProblems.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 dark:bg-gray-800"
                                    />
                                </th>
                                <th>Title & Description</th>
                                <th>Type</th>
                                <th>Difficulty</th>
                                <th>Points</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProblems.map(p => (
                                    <tr key={p._id} className={selectedProblems.includes(p._id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}>
                                        <td>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedProblems.includes(p._id)}
                                                onChange={() => toggleProblemSelection(p._id)}
                                                className="rounded border-gray-300 dark:bg-gray-800"
                                            />
                                        </td>
                                        <td className="title-td">
                                            <div className="title-group">
                                                <span className="main-title">{p.title}</span>
                                                <span className="sub-description">{p.description?.slice(0, 100)}...</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                {p.type || 'problem'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${p.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
                                                p.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                {p.difficulty}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="text-xs font-bold text-gray-500">{p.points || 0} pts</span>
                                        </td>
                                        <td className="actions-td">
                                            <div className="action-row">
                                                <button onClick={() => openEditModal(p)} className="icon-btn build" title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                {p.type === 'problem' && (
                                                    <button onClick={() => openSolutionModal(p)} className="icon-btn build" title="Reference Solution">
                                                        <Code size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDeleteProblem(p._id, p.title)} className="icon-btn delete" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state-container">
                    <div className="empty-state-icon">
                        <Database size={32} />
                    </div>
                    <p className="empty-state-text">No content found</p>
                    <p className="empty-state-subtext">Start by adding your first educational material or problem</p>
                </div>
            )}
            
            {/* Modals follow the main content block */}
            {(showCreateModal || showEditModal) && (
                <div className="modal-backdrop" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
                    <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
                        {/* ... Modal Header ... */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    {showEditModal ? <Edit2 size={20} /> : <Plus size={20} />}
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {showEditModal ? 'Edit' : 'Create New'} {formData.type === 'material' ? 'Article' : formData.type === 'video' ? 'Video' : formData.type === 'quiz' ? 'Quiz' : 'Problem'}
                                </h2>
                            </div>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {/* Form content remains same as before but ensured clean */}
                            <form id="problemForm" onSubmit={showEditModal ? handleUpdateProblem : handleCreateProblem} className="space-y-6">
                                {/* Form groups here */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="input-field w-full"
                                            required
                                            placeholder="e.g. Valid Palindrome"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
                                        <CustomDropdown
                                            options={typeOptions}
                                            value={formData.type}
                                            onChange={(val) => setFormData({ ...formData, type: val })}
                                        />
                                    </div>
                                </div>

                                {formData.type !== 'video' && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Difficulty</label>
                                            <CustomDropdown
                                                options={formDifficultyOptions}
                                                value={formData.difficulty}
                                                onChange={(val) => setFormData({
                                                    ...formData,
                                                    difficulty: val,
                                                    points: POINTS[val]
                                                })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                                <Award size={16} className="text-gray-400" /> Coins
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.points}
                                                readOnly
                                                className="input-field w-full bg-gray-50 dark:bg-gray-800 text-gray-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                                <Clock size={16} className="text-gray-400" /> Time Limit (ms)
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.timeLimit}
                                                onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                                                className="input-field w-full"
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.type !== 'video' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Description (Markdown Supported) {(formData.type === 'problem' || formData.type === 'sql') && <span className="text-red-500">*</span>}
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="input-field w-full min-h-[150px]"
                                            placeholder="Supports Markdown... (Main content for articles)"
                                            required={formData.type === 'problem' || formData.type === 'sql'}
                                        />
                                    </div>
                                )}

                                {(formData.type === 'problem' || formData.type === 'sql') && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Constraints</label>
                                            <textarea
                                                value={formData.constraints.join(', ')}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    constraints: e.target.value.split(',').map(c => c.trim())
                                                })}
                                                className="input-field w-full font-mono text-sm"
                                                rows="2"
                                                placeholder="Comma separated, e.g. 1 <= n <= 100, 0 <= nums[i] <= 1000"
                                            />
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                    <List size={16} /> Examples
                                                </label>
                                                <button type="button" onClick={addExample} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                                    + Add Example
                                                </button>
                                            </div>
                                            {formData.examples.map((example, idx) => (
                                                <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 relative group">
                                                    <button type="button" onClick={() => removeItem('example', idx)} className="absolute right-2 top-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X size={16} />
                                                    </button>
                                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Input"
                                                            value={example.input}
                                                            onChange={(e) => updateExample(idx, 'input', e.target.value)}
                                                            className="input-field text-sm font-mono"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Output"
                                                            value={example.output}
                                                            onChange={(e) => updateExample(idx, 'output', e.target.value)}
                                                            className="input-field text-sm font-mono"
                                                        />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Explanation (Optional)"
                                                        value={example.explanation}
                                                        onChange={(e) => updateExample(idx, 'explanation', e.target.value)}
                                                        className="input-field w-full text-sm"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                    <CheckCircle size={16} /> Test Cases
                                                </label>
                                                <button type="button" onClick={addTestCase} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                                    + Add Test Case
                                                </button>
                                            </div>
                                            {formData.testCases.map((tc, idx) => (
                                                <div key={idx} className="bg-gray-900 rounded-xl p-4 border border-gray-800 relative group">
                                                    <button type="button" onClick={() => removeItem('testCase', idx)} className="absolute right-2 top-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X size={16} />
                                                    </button>
                                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                                        <textarea
                                                            placeholder="Input"
                                                            value={tc.input}
                                                            onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                                                            className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-sm font-mono text-white focus:ring-1 focus:ring-primary-500 focus:outline-none"
                                                            rows="2"
                                                        />
                                                        <textarea
                                                            placeholder="Expected Output"
                                                            value={tc.output}
                                                            onChange={(e) => updateTestCase(idx, 'output', e.target.value)}
                                                            className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-sm font-mono text-white focus:ring-1 focus:ring-primary-500 focus:outline-none"
                                                            rows="2"
                                                        />
                                                    </div>
                                                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={tc.isHidden}
                                                            onChange={(e) => updateTestCase(idx, 'isHidden', e.target.checked)}
                                                            className="rounded bg-gray-700 border-gray-600 text-primary-500"
                                                        />
                                                        <span className="text-xs font-medium text-gray-400">Hidden Test Case</span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {formData.type === 'quiz' && (
                                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                <List size={16} /> Quiz Questions
                                            </label>
                                            <button type="button" onClick={addQuizQuestion} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                                + Add Question
                                            </button>
                                        </div>
                                        {formData.quizQuestions.map((q, idx) => (
                                            <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 relative group">
                                                <button type="button" onClick={() => removeItem('quizQuestion', idx)} className="absolute right-2 top-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X size={16} />
                                                </button>
                                                <div className="mb-3">
                                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Question {idx + 1}</label>
                                                    <input
                                                        type="text"
                                                        value={q.questionText}
                                                        onChange={(e) => updateQuizQuestion(idx, 'questionText', e.target.value)}
                                                        className="input-field w-full text-sm"
                                                        placeholder="Enter question text here..."
                                                        required
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {q.options.map((opt, optIdx) => (
                                                        <div key={optIdx} className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name={`correct_opt_${idx}`}
                                                                checked={q.correctOptionIndex === optIdx}
                                                                onChange={() => updateQuizQuestion(idx, 'correctOptionIndex', optIdx)}
                                                            />
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={(e) => updateQuizQuestion(idx, 'options', e.target.value, optIdx)}
                                                                className="input-field w-full text-sm py-1.5"
                                                                placeholder={`Option ${optIdx + 1}`}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {formData.type === 'problem' && (
                                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                <Code2 size={16} /> Reference Solutions
                                            </label>
                                            <div className="flex gap-2">
                                                {['cpp', 'python', 'javascript', 'java', 'c'].map(lang => (
                                                    <button
                                                        key={lang}
                                                        type="button"
                                                        onClick={() => setSolutionLang(lang)}
                                                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                                            solutionLang === lang 
                                                                ? 'bg-primary-600 text-white' 
                                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                        }`}
                                                    >
                                                        {lang === 'cpp' ? 'C++' : lang.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="h-[300px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                            <Editor
                                                height="100%"
                                                language={solutionLang === 'cpp' || solutionLang === 'c' ? 'cpp' : solutionLang === 'python' ? 'python' : 'javascript'}
                                                theme={isDark ? "vs-dark" : "vs-light"}
                                                value={(formData.solutionCode && formData.solutionCode[solutionLang]) || ''}
                                                onChange={(val) => {
                                                    const updatedSolution = { ...formData.solutionCode, [solutionLang]: val || '' };
                                                    setFormData({ ...formData, solutionCode: updatedSolution });
                                                }}
                                                options={{
                                                    minimap: { enabled: false },
                                                    fontSize: 13,
                                                    lineNumbers: 'on',
                                                    scrollBeyondLastLine: false,
                                                    automaticLayout: true
                                                }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-500 italic">💡 Reference solutions are used for server-side verification and as hints for students.</p>
                                    </div>
                                )}

                                {(formData.type === 'problem' || formData.type === 'sql' || formData.type === 'material' || formData.type === 'video') && (
                                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                            <Link size={16} /> External Content
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">GitHub URL</label>
                                                <input
                                                    type="url"
                                                    value={formData.editorialLink}
                                                    onChange={(e) => setFormData({ ...formData, editorialLink: e.target.value })}
                                                    className="input-field w-full text-sm"
                                                    placeholder="https://github.com/..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">YouTube URL</label>
                                                <input
                                                    type="url"
                                                    value={formData.videoUrl}
                                                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                                                    className="input-field w-full text-sm"
                                                    placeholder="https://youtube.com/..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-800/30 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="btn-secondary">Cancel</button>
                            <button type="submit" form="problemForm" className="btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : showEditModal ? 'Update Problem' : 'Create Problem'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBulkModal && (
                <div className="modal-backdrop" onClick={() => setShowBulkModal(false)}>
                    <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/30">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Upload</h2>
                            <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleBulkUpload} className="space-y-4">
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer relative">
                                    <input type="file" accept=".json" onChange={(e) => setBulkFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{bulkFile ? bulkFile.name : 'Click to upload JSON file'}</p>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowBulkModal(false)} className="btn-secondary">Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Uploading...' : 'Upload'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showSolutionModal && (
                <div className="modal-backdrop" onClick={() => setShowSolutionModal(false)}>
                    <div className="modal-content max-w-4xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Reference Solution</h2>
                                <p className="text-xs text-primary-600 font-medium">{solutionProblem?.title}</p>
                            </div>
                            <button onClick={() => setShowSolutionModal(false)} className="modal-close"><X size={24} /></button>
                        </div>
                        <div className="modal-body p-0">

                        <div className="flex bg-gray-900 p-1 border-b border-gray-800 overflow-x-auto">
                            {['c', 'cpp', 'java', 'python', 'javascript'].map(id => (
                                <button
                                    key={id}
                                    onClick={async () => {
                                        setSolutionLang(id);
                                        try {
                                            const data = await problemService.getProblemById(solutionProblem.id || solutionProblem._id);
                                            setSolutionCodeVal(data.problem?.solutionCode?.[id] || '');
                                        } catch (error) { console.error(error); }
                                    }}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                                        solutionLang === id ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    {id === 'cpp' ? 'C++' : id.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 min-h-[400px]">
                            <Editor
                                height="100%"
                                language={solutionLang === 'cpp' ? 'cpp' : solutionLang === 'python' ? 'python' : 'javascript'}
                                value={solutionCode}
                                onChange={val => setSolutionCodeVal(val || '')}
                                theme="vs-dark"
                                options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
                            />
                        </div>

                        </div>
                        <div className="modal-footer">
                            <p className="text-[10px] text-gray-500 italic absolute left-8">💡 Used for comparing student output server-side.</p>
                            <button onClick={() => setShowSolutionModal(false)} className="btn-secondary">Cancel</button>
                            <button onClick={handleSaveSolution} disabled={savingSolution} className="btn-primary flex items-center gap-2">
                                {savingSolution ? 'Saving...' : <><CheckCircle size={16} /> Save Solution</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);
};

export default ProblemManager;
