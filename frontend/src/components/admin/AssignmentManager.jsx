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
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
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
    } catch (err) {
      alert('Delete failed: ' + err.message);
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
    <div className="admin-assignment-manager">
      <div className="manager-header">
        <div className="title-section">
          <h1>Assignment Lab Manager</h1>
          <p>Configure industry-grade practical projects with automated testing.</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Filter by title or type..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => navigate('/admin/assignments/new')}>
            <Plus size={18} /> New Assignment
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="admin-custom-table">
          <thead>
            <tr>
              <th>Title & Description</th>
              <th>Environment</th>
              <th>Difficulty</th>
              <th>Validation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id}>
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
                    <button className="btn-secondary p-2 hover:text-blue-500 border-transparent" onClick={() => window.open(`/assignments/${a.id}`, '_blank')} title="Student View">
                      <Eye size={16} />
                    </button>
                    <button className="btn-secondary p-2 hover:text-primary-500 border-transparent" onClick={() => navigate(`/admin/assignments/build/${a.id}`)} title="Open IDE Builder">
                      <Layers size={16} />
                    </button>
                    <button className="btn-secondary p-2 hover:text-red-500 border-transparent" onClick={() => handleDelete(a.id)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="empty-state">
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








