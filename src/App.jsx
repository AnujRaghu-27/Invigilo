import { useState } from 'react';
import './App.css';

function App() {
  const [cameraStatus, setCameraStatus] = useState('idle'); // 'idle' | 'requesting' | 'granted' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const handleGetCameraAccess = async () => {
    // If access is already granted, avoid requesting again
    if (cameraStatus === 'granted') {
      return;
    }

    setCameraStatus('requesting');
    setErrorMessage('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this device.');
      }

      // Request video access only (no audio)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      // Stop camera tracks immediately so the indicator light turns off
      // (Live camera preview is not connected yet)
      stream.getTracks().forEach((track) => track.stop());

      setCameraStatus('granted');
    } catch (error) {
      setCameraStatus('error');

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was denied. Please allow camera access to continue.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setErrorMessage('Camera is currently in use by another application.');
      } else {
        setErrorMessage(error.message || 'Unable to access camera. Please try again.');
      }
    }
  };

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
                <button
                  type="button"
                  className={`btn-camera ${cameraStatus === 'granted' ? 'btn-camera-granted' : ''}`}
                  onClick={handleGetCameraAccess}
                  disabled={cameraStatus === 'requesting' || cameraStatus === 'granted'}
                >
                  {cameraStatus === 'requesting'
                    ? 'Requesting access...'
                    : cameraStatus === 'granted'
                    ? 'Camera Access Granted'
                    : 'Get Camera Access'}
                </button>
                {cameraStatus === 'granted' && (
                  <p className="camera-status-msg status-success">Camera access granted</p>
                )}
                {cameraStatus === 'error' && (
                  <p className="camera-status-msg status-error">{errorMessage}</p>
                )}
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