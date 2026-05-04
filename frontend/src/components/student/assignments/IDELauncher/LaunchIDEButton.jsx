import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, Download, Settings, Github, Terminal, Info, CheckCircle } from 'lucide-react';
import apiClient from '../../../../services/apiClient';
import './LaunchIDEButton.css';
import InstallGuide from './InstallGuide';

export default function LaunchIDEButton({ assignment }) {
  const [status, setStatus]     = useState('idle'); // idle | launching | running | error
  const [showGuide, setGuide]   = useState(false);
  const pingRef                 = useRef(null);

  async function launch() {
    setStatus('launching');
    try {
      // Get session token from backend
      const { data } = await apiClient.post('/assignments/ide/session', {
        assignmentId: assignment.id
      });

      // Trigger alphalearn:// protocol
      // This opens the launcher on student's machine
      const protocolUrl =
        `alphalearn://${assignment.id}?token=${data.token}`;

      window.location.href = protocolUrl;

      // Poll every 3s for up to 90s waiting for IDE container to start
      let attempts = 0;
      const maxAttempts = 30; // 30 × 3s = 90s
      const checkIDE = setInterval(async () => {
        attempts++;
        try {
          // mode: 'no-cors' means ANY response (even 404) = port is open = IDE is up
          await fetch('http://localhost/', { mode: 'no-cors' });
          clearInterval(checkIDE);
          setStatus('running');
          startPing();
        } catch (e) {
          // ERR_CONNECTION_REFUSED = container still starting
          if (attempts >= maxAttempts) {
            clearInterval(checkIDE);
            console.warn('IDE did not start within 90s. Showing install guide.');
            setStatus('idle');
            setGuide(true);
          }
          // else keep polling
        }
      }, 3000);

    } catch (err) {
      setStatus('error');
      console.error(err);
    }
  }

  function startPing() {
    if (pingRef.current) clearInterval(pingRef.current);
    // Keep-alive: check every 30s if IDE is still up; update status if it stops
    pingRef.current = setInterval(() => {
      fetch('http://localhost/', { mode: 'no-cors' })
        .then(() => setStatus('running'))
        .catch(() => setStatus('idle'));
    }, 30000);
  }

  useEffect(() => {
    return () => {
        if (pingRef.current) clearInterval(pingRef.current);
    };
  }, []);

  if (showGuide) return <InstallGuide onDone={() => { setGuide(false); launch(); }} />;

  return (
    <div className="ide-launcher-card">
      <div className="ide-info">
        <div className="ide-type-badge">
          {assignment.type === 'REACT' ? '⚛️ React' : assignment.type === 'NODE' ? '🟢 Node.js' : '🔷 Fullstack'} Assignment
        </div>
        <div className="init-steps">
           <h4>Initialization Process:</h4>
           <ul>
             <li><span>1</span> Secure Connection with AlphaLearn Server</li>
             <li><span>2</span> Clone Template Code from GitHub</li>
             <li><span>3</span> Pull & Mount Docker Containers</li>
             <li><span>4</span> Automatic dependency installation</li>
             <li><span>5</span> Remote Test Execution active</li>
           </ul>
        </div>
        {assignment.templateFiles?.githubUrl && (
          <div className="github-url-box">
             <span className="label">Template Repository:</span>
             <a href={assignment.templateFiles.githubUrl} target="_blank" rel="noreferrer" className="url text-primary-400">
                {assignment.templateFiles.githubUrl}
             </a>
          </div>
        )}
      </div>

      <div className="launch-controls">
        {status === 'idle' && (
            <button onClick={launch} className="btn-launch-primary">
            🚀 Launch Local IDE
            </button>
        )}

        {status === 'launching' && (
            <div className="ide-loading-state">
            <div className="spinner-glow" />
            <span>Initializing local environment...</span>
            <p className="sub-text">
                The AlphaLearn Launcher will start shortly. Please authorize any security prompts.
            </p>
            </div>
        )}

        {status === 'running' && (
            <div className="ide-ready-state">
            <div className="status-indicator">
                <div className="pulse-dot" />
                <span className="status-text">IDE Operational</span>
            </div>
            <div className="ide-action-links">
                <a href="http://localhost" target="_blank" rel="noreferrer"
                className="btn-ide-link main">
                Open Workspace ↗
                </a>
                <a href="http://localhost:3001" target="_blank" rel="noreferrer"
                className="btn-ide-link secondary">
                Live Preview ↗
                </a>
            </div>
            </div>
        )}

        {status === 'error' && (
            <div className="ide-error-state">
            <span className="error-icon">❌</span>
            <div className="error-content">
                <strong>Connection failed</strong>
                <p>Could not communicate with the local launcher.</p>
                <button onClick={launch} className="btn-retry">Retry Launch</button>
            </div>
            </div>
        )}
      </div>

      <div className="launcher-tips">
          <h4>Requirement:</h4>
          <ul>
              <li>Docker Desktop must be running</li>
              <li>AlphaLearn CLI installed</li>
          </ul>
          <button className="link-help" onClick={() => setGuide(true)}>Need help with setup?</button>
      </div>
    </div>
  );
}








