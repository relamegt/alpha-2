import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import {
  Plus, Trash2, Edit3, Eye,
  ExternalLink, Layers, CheckSquare,
  Search, Filter
} from 'lucide-react';
import './AssignmentManager.css';

export default function AssignmentManager() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data } = await apiClient.get('/assignments');
      setAssignments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('This will permanently delete the assignment and all student submissions. Continue?')) return;
    try {
      await apiClient.delete(`/assignments/${id}`);
      setAssignments(assignments.filter(a => a.id !== id));
      setSelectedIds(prev => prev.filter(currId => currId !== id));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected assignments? This action cannot be undone.`)) return;
    try {
      await apiClient.delete('/assignments/bulk', { data: { ids: selectedIds } });
      setAssignments(assignments.filter(a => !selectedIds.includes(a.id)));
      setSelectedIds([]);
    } catch (err) {
      alert('Bulk delete failed: ' + err.message);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filtered) => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(a => a.id));
    }
  };

  const filtered = assignments.filter(a =>
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="admin-loader-container">
      <div className="spinner"></div>
      <span>Syncing assignments...</span>
    </div>
  );

  return (
    <div className="admin-page-wrapper transition-colors">
      <header className="page-header-container">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="page-header-title">Assignment Lab Manager</h1>
            <p className="page-header-desc">Configure industry-grade practical projects with automated testing.</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button className="btn-danger flex items-center gap-2" onClick={handleBulkDelete}>
                <Trash2 size={18} /> Delete Selected ({selectedIds.length})
              </button>
            )}
            <button className="btn-primary" onClick={() => navigate('/assignments/new')}>
              <Plus size={18} /> New Assignment
            </button>
          </div>
        </div>
      </header>

      <div className="page-tabs-container">
        <div className="page-search-wrapper w-full max-w-md">
          <Search className="page-search-icon" size={18} />
          <input
            type="text"
            placeholder="Filter by title or type..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="page-search-input"
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="admin-custom-table">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.length === filtered.length}
                  onChange={() => toggleSelectAll(filtered)}
                  className="rounded border-gray-300 dark:bg-gray-800"
                />
              </th>
              <th>Title & Description</th>
              <th>Environment</th>
              <th>Difficulty</th>
              <th>Validation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className={selectedIds.includes(a.id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(a.id)}
                    onChange={() => toggleSelect(a.id)}
                    className="rounded border-gray-300 dark:bg-gray-800"
                  />
                </td>
                <td className="title-td">
                  <div className="title-group">
                    <span className="main-title">{a.title}</span>
                    <span className="sub-description">{a.description?.slice(0, 70)}...</span>
                  </div>
                </td>
                <td>
                  <span className={`env-badge ${a.type.toLowerCase()}`}>
                    {a.type.replace('_', '/')}
                  </span>
                </td>
                <td>
                  <span className={`diff-badge ${a.difficulty}`}>
                    {a.difficulty}
                  </span>
                </td>
                <td>
                  {a.testCases?.length > 0 ? (
                    <div className="test-badge active">
                      <CheckSquare size={12} /> {a.testCases.length} Rules
                    </div>
                  ) : (
                    <div className="test-badge empty">
                      No Tests
                    </div>
                  )}
                </td>
                <td className="actions-td">
                  <div className="action-row">
                    <button className="icon-btn view" onClick={() => window.open(`/assignments/${a.id}`, '_blank')} title="Student View">
                      <Eye size={16} />
                    </button>
                    <button className="icon-btn build" onClick={() => navigate(`/assignments/build/${a.id}`)} title="Open IDE Builder">
                      <Layers size={16} />
                    </button>
                    <button className="icon-btn delete" onClick={() => handleDelete(a.id)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-state">
                  No assignments found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
