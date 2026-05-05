import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import CustomDropdown from '../shared/CustomDropdown';
import { Layers, Zap, Code, FileText, CheckCircle2 } from 'lucide-react';
import './AssignmentCreator.css';

export default function AssignmentCreator() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'HTML_CSS_JS',
    difficulty: 'beginner',
    githubRepo: '',
    githubUrl: '',
    html: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <title>Lab Title</title>\n</head>\n<body>\n  <h1>Welcome to the Lab</h1>\n</body>\n</html>',
    css: 'body { color: red; }',
    js: 'console.log("Hi");',
    testCases: []
  });

  const [newTest, setNewTest] = useState({ name: '', type: 'element_exists', selector: '', expected: '', filename: '', contains: '' });

  const addTest = () => {
    if (!newTest.name) return;
    setForm({ ...form, testCases: [...form.testCases, { ...newTest, id: Date.now() }] });
    setNewTest({ name: '', type: 'element_exists', selector: '', expected: '', filename: '', contains: '' });
  };

  const removeTest = (id) => {
    setForm({ ...form, testCases: form.testCases.filter(t => t.id !== id) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        templateFiles: form.type === 'HTML_CSS_JS' 
          ? { 
              files: { 
                'index.html': form.html, 
                'style.css': form.css, 
                'script.js': form.js 
              } 
            }
          : { githubUrl: form.githubUrl }
      };
      
      const { data: assignment } = await apiClient.post('/assignments', payload);

      // Navigate straight to the IDE Builder to start coding
      navigate(`/admin/assignments/build/${assignment.id}`);
    } catch (err) {
      alert('Error creating assignment: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assignment-creator">
      <div className="creator-header">
        <h1>Create New Assignment</h1>
        <button className="btn-secondary px-6" onClick={() => navigate('/admin/assignments')}>Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="creator-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          <input 
            type="text" placeholder="Title" required 
            value={form.title} onChange={e => setForm({...form, title: e.target.value})} 
          />
          <textarea 
            placeholder="Description" required 
            value={form.description} onChange={e => setForm({...form, description: e.target.value})}
          />
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="dropdown-container">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Assignment Type</label>
              <CustomDropdown
                options={[
                  { value: 'HTML_CSS_JS', label: 'Inline (HTML/CSS/JS)' },
                  { value: 'REACT', label: 'Local IDE (React)' },
                  { value: 'NODE', label: 'Local IDE (Node.js)' },
                  { value: 'FULLSTACK', label: 'Local IDE (Fullstack)' }
                ]}
                value={form.type}
                onChange={(val) => setForm({...form, type: val})}
                icon={Layers}
              />
            </div>
            <div className="dropdown-container">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Difficulty Level</label>
              <CustomDropdown
                options={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' }
                ]}
                value={form.difficulty}
                onChange={(val) => setForm({...form, difficulty: val})}
                icon={Zap}
              />
            </div>
          </div>
        </div>

        {form.type === 'HTML_CSS_JS' ? (
          <div className="form-section">
            <h3>Starter Template (Inline)</h3>
            <textarea placeholder="HTML" value={form.html} onChange={e => setForm({...form, html: e.target.value})} />
            <textarea placeholder="CSS" value={form.css} onChange={e => setForm({...form, css: e.target.value})} />
            <textarea placeholder="JS" value={form.js} onChange={e => setForm({...form, js: e.target.value})} />
          </div>
        ) : (
          <div className="form-section">
            <h3>Local IDE Sync</h3>
            <p className="info">After creation, you will use the <strong>Build Files</strong> button in the manager to set up your project and sync it to GitHub.</p>
          </div>
        )}

        <div className="form-section">
          <h3>GitHub Repository Settings</h3>
          <p className="info">All assignments (static or IDE) will be published here.</p>
          <input 
            type="text" placeholder="Target Repo Name (e.g. lab-flexbox-basics)" 
            value={form.githubRepo} onChange={e => setForm({...form, githubRepo: e.target.value})}
          />
        </div>

        <div className="form-section">
          <h3>Automated Test Cases</h3>
          <div className="test-builder">
            <input type="text" placeholder="Test Name" value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} />
            <div className="flex-1">
              <CustomDropdown
                options={form.type === 'HTML_CSS_JS' ? [
                  { value: 'element_exists', label: 'Element Exists' },
                  { value: 'element_text', label: 'Element Text Match' },
                  { value: 'css_property', label: 'CSS Property Check' }
                ] : [
                  { value: 'file_exists', label: 'File Exists' },
                  { value: 'file_contains', label: 'File Contains String' },
                  { value: 'package_installed', label: 'Package Installed' }
                ]}
                value={newTest.type}
                onChange={(val) => setNewTest({...newTest, type: val})}
                placeholder="Select Test Type"
              />
            </div>
            {newTest.type === 'element_exists' || newTest.type === 'element_text' || newTest.type === 'css_property' ? (
              <input type="text" placeholder="CSS Selector" value={newTest.selector} onChange={e => setNewTest({...newTest, selector: e.target.value})} />
            ) : (
              <input type="text" placeholder="Filename (e.g. src/App.js)" value={newTest.filename} onChange={e => setNewTest({...newTest, filename: e.target.value})} />
            )}
            <input type="text" placeholder="Expected Value / Search String" value={newTest.expected || newTest.contains} onChange={e => setNewTest({...newTest, expected: e.target.value, contains: e.target.value})} />
            <button type="button" onClick={addTest} className="btn-primary py-2 text-sm">Add Test</button>
          </div>

          <div className="test-list">
            {form.testCases.map(t => (
              <div key={t.id} className="test-item">
                <span>{t.name} ({t.type})</span>
                <button type="button" onClick={() => removeTest(t.id)}>🗑️</button>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-4 text-lg" disabled={loading}>
          {loading ? 'Saving...' : '🚀 Create Assignment & Sync to GitHub'}
        </button>
      </form>
    </div>
  );
}








