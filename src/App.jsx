import { useState, useRef, useEffect } from 'react';
import Instructions from './Instructions';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('permissions'); // 'permissions' | 'instructions' | 'test' | 'completed'
  const [cameraStatus, setCameraStatus] = useState('idle'); // 'idle' | 'requesting' | 'granted' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenErrorMessage, setFullscreenErrorMessage] = useState('');
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [warningType, setWarningType] = useState(null); // null | 'tab-switch' | 'quit-attempt' | 'quit-confirm'

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isQuitConfirmedRef = useRef(false);
  const isFullscreenTransitioningRef = useRef(false);
  const transitionTimeoutRef = useRef(null);

  // Notify Electron main process that test is active
  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.setTestActive === 'function') {
      window.electronAPI.setTestActive(true);
    }
  }, []);

  // Listen for quit attempts forwarded from Electron main process
  useEffect(() => {
    const unsubscribe = window.electronAPI?.onQuitAttempt?.(() => {
      if (isQuitConfirmedRef.current) return;
      setWarningType((prev) => {
        if (prev === 'quit-attempt' || prev === 'quit-confirm') {
          return prev;
        }
        return 'quit-attempt';
      });
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const markFullscreenTransition = (durationMs = 1500) => {
    isFullscreenTransitioningRef.current = true;
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      isFullscreenTransitioningRef.current = false;
    }, durationMs);
  };

  // Tab visibility and app-focus detection
  useEffect(() => {
    let blurTimeout = null;

    const handleLeave = () => {
      if (isQuitConfirmedRef.current) return;
      setIsTabVisible(false);
      setWarningType((prev) => (prev ? prev : 'tab-switch'));
    };

    const handleReturn = () => {
      setIsTabVisible(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isFullscreenTransitioningRef.current) {
          console.log('Ignored visibilitychange during fullscreen transition');
          return;
        }
        console.log('Tab is hidden');
        handleLeave();
      } else {
        console.log('Tab is visible');
        handleReturn();
      }
    };

    const handleBlur = () => {
      if (isFullscreenTransitioningRef.current) {
        console.log('Ignored blur during fullscreen transition');
        return;
      }

      if (blurTimeout) {
        clearTimeout(blurTimeout);
      }

      // 150ms verification to ensure window genuinely lost focus (not a transient macOS transition flicker)
      blurTimeout = setTimeout(() => {
        if (!document.hasFocus() && !isFullscreenTransitioningRef.current) {
          console.log('App window lost focus');
          handleLeave();
        }
      }, 150);
    };

    const handleFocus = () => {
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
      console.log('App window gained focus');
      handleReturn();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (blurTimeout) {
        clearTimeout(blurTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleDismissWarning = () => {
    setWarningType(null);
  };

  const handleContinueTest = () => {
    setWarningType(null);
  };

  const handleQuitTest = () => {
    setWarningType('quit-confirm');
  };

  const handleGoBack = () => {
    setWarningType('quit-attempt');
  };

  const handleStartTest = async () => {
    const sessionId = `session_${Date.now()}`;
    setCurrentScreen('test');
    if (window.electronAPI && typeof window.electronAPI.startScreenCapture === 'function') {
      try {
        await window.electronAPI.startScreenCapture({ sessionId });
      } catch (err) {
        console.error('Failed to start screenshot capturing:', err);
      }
    }
  };

  const handleEndTest = async () => {
    if (window.electronAPI && typeof window.electronAPI.stopScreenCapture === 'function') {
      try {
        await window.electronAPI.stopScreenCapture();
      } catch (err) {
        console.error('Failed to stop screenshot capturing:', err);
      }
    }
    setCurrentScreen('completed');
  };

  const handleRestartTest = () => {
    setCurrentScreen('instructions');
  };

  const handleConfirmQuit = async () => {
    isQuitConfirmedRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      if (window.electronAPI && typeof window.electronAPI.stopScreenCapture === 'function') {
        await window.electronAPI.stopScreenCapture();
      }
      if (window.electronAPI && typeof window.electronAPI.confirmQuit === 'function') {
        await window.electronAPI.confirmQuit();
      }
    } catch (error) {
      console.error('Failed to confirm quit:', error);
    }
  };

  // Subscribe to native fullscreen changes and transitions from Electron
  useEffect(() => {
    const subscribe =
      window.electronAPI?.onFullScreenChange ||
      window.electronAPI?.onFullscreenChange;
    const subscribeTransition = window.electronAPI?.onFullScreenTransition;

    let unsubscribeTransition;
    if (typeof subscribeTransition === 'function') {
      unsubscribeTransition = subscribeTransition(() => {
        markFullscreenTransition(1500);
      });
    }

    if (typeof subscribe === 'function') {
      const unsubscribe = subscribe((fullscreen) => {
        console.log("Fullscreen state changed:", fullscreen);
        markFullscreenTransition(1500);
        setIsFullscreen(fullscreen);
        if (fullscreen) {
          setFullscreenErrorMessage('');
        }
      });
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
        if (typeof unsubscribeTransition === 'function') {
          unsubscribeTransition();
        }
      };
    } else {
      const handleBrowserFullscreenChange = () => {
        markFullscreenTransition(1500);
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleBrowserFullscreenChange);
      return () => {
        document.removeEventListener('fullscreenchange', handleBrowserFullscreenChange);
      };
    }
  }, []);

  useEffect(() => {
    window.__isFullscreen = isFullscreen;
  }, [isFullscreen]);

  // Clean up camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        try {
          if (typeof videoRef.current.load === 'function') {
            videoRef.current.load();
          }
        } catch {
          // Ignore load errors
        }
      }
    };
  }, []);

  const handleGetCameraAccess = async () => {
    // If access is already granted and stream is active, avoid requesting again
    if (cameraStatus === 'granted' && streamRef.current) {
      return;
    }

    // Stop any existing stream tracks before creating a new one
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      try {
        if (typeof videoRef.current.load === 'function') {
          videoRef.current.load();
        }
      } catch {
        // Ignore load errors
      }
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

      // Keep reference to stream for preview lifecycle management
      streamRef.current = stream;

      // Handle external track termination (e.g., unplugged or revoked permissions)
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setCameraStatus('error');
          setErrorMessage('Camera disconnected or access was revoked.');
          if (videoRef.current) {
            videoRef.current.srcObject = null;
            try {
              if (typeof videoRef.current.load === 'function') {
                videoRef.current.load();
              }
            } catch {
              // Ignore load errors
            }
          }
          streamRef.current = null;
        };
      });

      // Attach stream to the existing video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.error('Video play error:', playError);
        }
      }

      setCameraStatus('granted');
    } catch (error) {
      setCameraStatus('error');

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        try {
          if (typeof videoRef.current.load === 'function') {
            videoRef.current.load();
          }
        } catch {
          // Ignore load errors
        }
      }

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission denied. Please allow camera access in your system settings and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setErrorMessage('Camera is currently in use by another application.');
      } else {
        setErrorMessage(error.message || 'Unable to access camera. Please try again.');
      }
    }
  };

  const handleEnterFullScreen = async () => {
    if (isFullscreen || isFullscreenTransitioningRef.current) return;
    setFullscreenErrorMessage('');
    markFullscreenTransition(1500);
    try {
      if (window.electronAPI && typeof window.electronAPI.enterFullScreen === 'function') {
        await window.electronAPI.enterFullScreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  };

  const handleGoToTest = async () => {
    // 1. Verify that Electron window is currently in fullscreen mode
    let isCurrentlyFullscreen = false;
    try {
      if (window.electronAPI && typeof window.electronAPI.checkFullScreen === 'function') {
        isCurrentlyFullscreen = await window.electronAPI.checkFullScreen();
      } else if (window.electronAPI && typeof window.electronAPI.isFullScreen === 'function') {
        isCurrentlyFullscreen = await window.electronAPI.isFullScreen();
      } else {
        isCurrentlyFullscreen = !!document.fullscreenElement;
      }
    } catch (error) {
      console.error('Failed to check fullscreen state:', error);
      isCurrentlyFullscreen = false;
    }

    if (!isCurrentlyFullscreen) {
      setIsFullscreen(false);
      setFullscreenErrorMessage('Please enable fullscreen mode before proceeding.');
      return;
    }

    setFullscreenErrorMessage('');

    // 2. Camera stream validation
    const stream = streamRef.current;

    // Check that the camera stream exists
    if (!stream) {
      setCameraStatus('error');
      setErrorMessage('Camera is no longer active. Please reconnect your camera and try again.');
      return;
    }

    // Check that the stream is active using stream.active
    if (!stream.active) {
      setCameraStatus('error');
      setErrorMessage('Camera is no longer active. Please reconnect your camera and try again.');
      return;
    }

    // Check that at least one video track exists
    const videoTracks = stream.getVideoTracks();
    if (!videoTracks || videoTracks.length === 0) {
      setCameraStatus('error');
      setErrorMessage('Camera is no longer active. Please reconnect your camera and try again.');
      return;
    }

    // Check that the video track is still enabled and its readyState is "live"
    const videoTrack = videoTracks[0];
    if (!videoTrack.enabled || videoTrack.readyState !== 'live') {
      setCameraStatus('error');
      setErrorMessage('Camera is no longer active. Please reconnect your camera and try again.');
      return;
    }

    // Validation succeeded: navigate to Instructions screen
    console.log('Camera and fullscreen validation successful. Ready for test.');
    setCurrentScreen('instructions');
  };

  const isGoToTestDisabled = !(cameraStatus === 'granted' && isFullscreen && streamRef.current);

  return (
    <div className="app-container">
      {/* Top-left Application Name */}
      <div className="app-brand">Invigilo</div>

      {/* Warning Modal (Tab-Switching) */}
      {warningType === 'tab-switch' && (
        <div className="modal-overlay">
          <div className="warning-modal" role="alertdialog" aria-modal="true">
            <h3 className="warning-modal-title">Test Rule Violation</h3>
            <p className="warning-modal-message">
              You have switched away from Invigilo. Leaving the test window violates the test rules. Please remain in Invigilo until you complete the test.
            </p>
            <button
              type="button"
              className="btn-warning-dismiss"
              onClick={handleDismissWarning}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Quit Warning Modal - Step 1 */}
      {warningType === 'quit-attempt' && (
        <div className="modal-overlay">
          <div className="warning-modal" role="alertdialog" aria-modal="true">
            <h3 className="warning-modal-title">Leaving the Test?</h3>
            <p className="warning-modal-message">
              Leaving the test may violate examination rules. If you're experiencing a technical issue, you can exit and contact your invigilator.
            </p>
            <div className="modal-button-group">
              <button
                type="button"
                className="btn-modal-primary"
                onClick={handleContinueTest}
              >
                Continue Test
              </button>
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={handleQuitTest}
              >
                Quit Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quit Confirmation Modal - Step 2 */}
      {warningType === 'quit-confirm' && (
        <div className="modal-overlay">
          <div className="warning-modal" role="alertdialog" aria-modal="true">
            <h3 className="warning-modal-title">Before You Quit</h3>
            <p className="warning-modal-message">
              Please inform your invigilator before leaving the test. You may quit only when your invigilator is present and watching you. If you quit without informing the invigilator, you will be marked as UFM (Unfair Means). Only the invigilator has the authority to review the situation and mark your exit as a safe quit.
            </p>
            <div className="modal-button-group">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={handleGoBack}
              >
                Go Back
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={handleConfirmQuit}
              >
                Confirm Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {currentScreen === 'test' ? (
        <div className="main-content">
          <div className="heading-section">
            <h2 className="heading-title">Test In Progress</h2>
            <p className="heading-subtitle">
              Your test session is active. Periodic screenshot capturing and proctoring are currently running.
            </p>
          </div>
          <div className="test-active-card">
            <div className="test-active-info">
              <div className="proctoring-status-badge">
                <span className="proctoring-status-dot"></span>
                <span>Proctoring Active (Screenshots captured every 10s)</span>
              </div>
              <p className="test-active-desc">
                Please remain in Invigilo and answer all test questions. Leaving this window or closing the application violates examination rules.
              </p>
            </div>
            <div className="action-area">
              <button
                type="button"
                className="btn-end-test"
                onClick={handleEndTest}
              >
                End Test
              </button>
            </div>
          </div>
        </div>
      ) : currentScreen === 'completed' ? (
        <div className="main-content">
          <div className="heading-section">
            <h2 className="heading-title">Test Completed</h2>
            <p className="heading-subtitle">
              Your test has been completed and submitted. Screenshot capturing has stopped.
            </p>
          </div>
          <div className="test-active-card">
            <div className="test-active-info">
              <p className="test-active-desc">
                Thank you for taking your exam with Invigilo. You may now safely exit the application, or start another session if needed.
              </p>
            </div>
            <div className="action-area">
              <button
                type="button"
                className="btn-restart-test"
                onClick={handleRestartTest}
              >
                Start Another Test
              </button>
            </div>
          </div>
        </div>
      ) : currentScreen === 'instructions' ? (
        <Instructions onStartTest={handleStartTest} />
      ) : (
        /* Main Content Area */
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
              <video
                ref={videoRef}
                className="camera-video"
                autoPlay
                playsInline
                muted
              />
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
              <button
                type="button"
                className={`btn-fullscreen ${isFullscreen ? 'btn-fullscreen-granted' : ''}`}
                onClick={handleEnterFullScreen}
              >
                Give Full Screen Permissions
              </button>
              {isFullscreen && (
                <p className="camera-status-msg status-success">Fullscreen access granted</p>
              )}
              {fullscreenErrorMessage && (
                <p className="camera-status-msg status-error">{fullscreenErrorMessage}</p>
              )}
            </div>
          </div>
        </div>

        {/* Go To Test Button (Centered Below Card) */}
        <div className="action-area">
          <button
            type="button"
            className={`btn-go-to-test ${!isGoToTestDisabled ? 'btn-go-to-test-enabled' : ''}`}
            onClick={handleGoToTest}
            disabled={isGoToTestDisabled}
          >
            Go To Test
          </button>
          {fullscreenErrorMessage && (
            <p className="camera-status-msg status-error">{fullscreenErrorMessage}</p>
          )}
        </div>
      </div>
    )}
  </div>
);
}

export default App;