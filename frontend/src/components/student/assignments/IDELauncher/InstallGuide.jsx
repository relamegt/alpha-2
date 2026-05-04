export default function InstallGuide({ onDone }) {
  const isWindows = navigator.userAgent.includes('Windows');

  return (
    <div className="install-guide-container">
      <div className="guide-header">
        <h3>🔧 Setup AlphaLearn Local Environment</h3>
        <p>Complete these steps to unlock professional development features.</p>
      </div>

      <div className="install-steps-grid">
        <div className="install-step">
          <div className="step-count">1</div>
          <div className="step-content">
            <h4>Install Docker</h4>
            <p>The engine that powers your isolated dev environments.</p>
            <a href="https://www.docker.com/products/docker-desktop"
               target="_blank" rel="noreferrer" className="guide-download-btn">
              Download Docker Desktop →
            </a>
          </div>
        </div>

        <div className="install-step">
          <div className="step-count">2</div>
          <div className="step-content">
            <h4>Install AlphaLearn CLI</h4>
            {isWindows ? (
              <>
                <p>Run the automated installer for Windows:</p>
                <div className="download-group">
                    <a href="/install.bat" download className="guide-download-btn secondary">
                    ⬇ Download .BAT Installer
                    </a>
                    <span className="info-text">Double-click after download</span>
                </div>
              </>
            ) : (
              <>
                <p>Run this command in your Terminal:</p>
                <div className="command-block">
                  <code id="bash-cmd">
                    curl -fsSL https://alphalearn.com/install.sh | bash
                  </code>
                  <button onClick={() => {
                    navigator.clipboard.writeText('curl -fsSL https://alphalearn.com/install.sh | bash');
                  }} className="copy-btn">
                    📋
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="install-step highlight">
          <div className="step-count">3</div>
          <div className="step-content">
            <h4>Ready to Go?</h4>
            <p>Ensure Docker is running, then return here to start coding.</p>
            <button onClick={onDone} className="guide-launch-btn">
              ✅ Setup Complete — Launch IDE
            </button>
          </div>
        </div>
      </div>

      <div className="guide-footer">
          <p>Having trouble? <a href="/docs/local-setup">Read the detailed setup guide</a></p>
      </div>
    </div>
  );
}








