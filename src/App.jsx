import './App.css';

function App() {
  return (
    <div className="app-container">
      {/* Top-left Application Name */}
      <div className="app-brand">Invigilo</div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Heading */}
        <div className="heading-section">
          <h2 className="heading-title">Hi User!</h2>
          <p className="heading-subtitle">
            Kindly Allow the following Permissions to Start the test:
          </p>
        </div>

        {/* Permissions Card */}
        <div className="permissions-card">
          {/* Configure Camera Section with Preview on Right */}
          <div className="permission-camera-row">
            <div className="permission-item-content">
              <span className="permission-icon">↗</span>
              <div className="permission-text-group">
                <h3 className="permission-heading">Configure Camera</h3>
                <p className="permission-description">
                  Kindly configure Camera to attempt quiz/contests.
                </p>
                <button type="button" className="btn-camera">
                  Get Camera Access
                </button>
              </div>
            </div>

            {/* Black Camera Preview Area */}
            <div className="camera-preview-container">
              <video className="camera-video" playsInline muted />
            </div>
          </div>

          {/* Divider Line */}
          <hr className="divider" />

          {/* Fullscreen Permission Section */}
          <div className="permission-fullscreen-row">
            <span className="permission-icon">⛶</span>
            <div className="permission-text-group">
              <h3 className="permission-heading">Switch to full screen</h3>
              <p className="permission-description">
                Kindly close all tabs and switch to full screen.
              </p>
              <button type="button" className="btn-fullscreen">
                Give Full Screen Permissions
              </button>
            </div>
          </div>
        </div>

        {/* Go To Test Button (Centered Below Card) */}
        <div className="action-area">
          <button type="button" className="btn-go-to-test">
            Go To Test
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;