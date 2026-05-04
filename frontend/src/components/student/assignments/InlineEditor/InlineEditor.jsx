import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import './InlineEditor.css';

const DEFAULT_HTML = `<div class="container">
  <h1>Hello World</h1>
  <p>Start coding here...</p>
</div>`;

const DEFAULT_CSS = `body {
  font-family: Arial, sans-serif;
  padding: 20px;
}
.container {
  max-width: 600px;
  margin: 0 auto;
}`;

const DEFAULT_JS = `// Your JavaScript here
console.log('Hello from AlphaLearn!');`;

export default function InlineEditor({ assignment }) {
  const starter   = assignment.templateFiles || {};
  const [tab, setTab]       = useState('html');
  const [html, setHtml]     = useState(starter.html || DEFAULT_HTML);
  const [css,  setCss]      = useState(starter.css  || DEFAULT_CSS);
  const [js,   setJs]       = useState(starter.js   || DEFAULT_JS);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const iframeRef = useRef();

  // Live preview — rebuild iframe on every change
  useEffect(() => { 
    const timeout = setTimeout(() => {
        updatePreview(); 
    }, 500);
    return () => clearTimeout(timeout);
  }, [html, css, js]);

  function updatePreview() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>
  ${html}
  <script>
    // Capture console.log
    const _log = console.log;
    console.log = (...args) => {
      window.parent.postMessage({ type: 'console', data: args.join(' ') }, '*');
      _log(...args);
    };
    try { ${js} } catch(e) {
      window.parent.postMessage({ type: 'error', data: e.message }, '*');
    }
  <\/script>
</body>
</html>`);
    doc.close();
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `/api/assignments/${assignment.id}/submit/inline`,
        { html, css, js }
      );
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const currentValue = tab === 'html' ? html : tab === 'css' ? css : js;
  const onChange = v => {
    if (tab === 'html') setHtml(v);
    else if (tab === 'css') setCss(v);
    else setJs(v);
  };
  const language = tab === 'js' ? 'javascript' : tab;

  return (
    <div className="inline-editor">
      {/* Left — Editor */}
      <div className="editor-pane">
        <div className="editor-tabs">
          {['html','css','js'].map(t => (
            <button
              key={t}
              className={`assignment-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="monaco-wrapper">
            <Editor
                height="100%"
                language={language}
                value={currentValue}
                onChange={onChange}
                theme="vs-dark"
                options={{
                    fontSize:        14,
                    minimap:        { enabled: false },
                    lineNumbers:    'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap:       'on',
                    tabSize:        2,
                    padding:        { top: 10 }
                }}
            />
        </div>
        <div className="editor-actions">
          <button onClick={updatePreview} className="btn-run">
            ▶ Run
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-submit">
            {submitting ? '⏳ Submitting...' : '🚀 Submit'}
          </button>
        </div>
      </div>

      {/* Right — Preview + Results */}
      <div className="preview-pane">
        <div className="preview-header">
          <span>🌐 Preview</span>
          <button onClick={updatePreview} className="btn-refresh">↻</button>
        </div>
        <iframe
          ref={iframeRef}
          className="preview-iframe"
          sandbox="allow-scripts allow-same-origin"
          title="preview"
        />

        {/* Test Results */}
        {result && !result.error && (
          <div className="test-results">
            <div className={`score ${result.passed ? 'passed' : 'failed'}`}>
              Score: {result.score}/100  {result.passed ? '✅ All Passed' : '❌ Some Failed'}
            </div>
            {result.testResults?.map((t, idx) => (
              <div key={idx} className={`test-case ${t.passed ? 'pass' : 'fail'}`}>
                <span className="test-icon">{t.passed ? '✅' : '❌'}</span>
                <span className="test-name">{t.name}</span>
                {!t.passed && <span className="test-msg">{t.message}</span>}
              </div>
            ))}
          </div>
        )}
        {result?.error && (
          <div className="test-results error-box">❌ {result.error}</div>
        )}
      </div>
    </div>
  );
}








