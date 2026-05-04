import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
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
        <button className="btn-cancel" onClick={() => navigate('/admin/assignments')}>Cancel</button>
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
          <div className="grid-2">
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="HTML_CSS_JS">Inline (HTML/CSS/JS)</option>
              <option value="REACT">Local IDE (React)</option>
              <option value="NODE">Local IDE (Node.js)</option>
              <option value="FULLSTACK">Local IDE (Fullstack)</option>
            </select>
            <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
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
            <select value={newTest.type} onChange={e => setNewTest({...newTest, type: e.target.value})}>
              {form.type === 'HTML_CSS_JS' ? (
                <>
                  <option value="element_exists">Element Exists</option>
                  <option value="element_text">Element Text Match</option>
                  <option value="css_property">CSS Property Check</option>
                </>
              ) : (
                <>
                  <option value="file_exists">File Exists</option>
                  <option value="file_contains">File Contains String</option>
                  <option value="package_installed">Package Installed</option>
                </>
              )}
            </select>
            {newTest.type === 'element_exists' || newTest.type === 'element_text' || newTest.type === 'css_property' ? (
              <input type="text" placeholder="CSS Selector" value={newTest.selector} onChange={e => setNewTest({...newTest, selector: e.target.value})} />
            ) : (
              <input type="text" placeholder="Filename (e.g. src/App.js)" value={newTest.filename} onChange={e => setNewTest({...newTest, filename: e.target.value})} />
            )}
            <input type="text" placeholder="Expected Value / Search String" value={newTest.expected || newTest.contains} onChange={e => setNewTest({...newTest, expected: e.target.value, contains: e.target.value})} />
            <button type="button" onClick={addTest}>Add Test</button>
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

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Saving...' : '🚀 Create Assignment & Sync to GitHub'}
        </button>
      </form>
    </div>
  );
}








