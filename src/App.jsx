import { useState, useRef, useEffect } from 'react';
import Instructions from './Instructions';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('permissions'); // 'permissions' | 'instructions'
  const [cameraStatus, setCameraStatus] = useState('idle'); // 'idle' | 'requesting' | 'granted' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenErrorMessage, setFullscreenErrorMessage] = useState('');
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wasFullscreenRef = useRef(false);
  const currentScreenRef = useRef(currentScreen);
  const isFullscreenTransitioningRef = useRef(false);
  const transitionTimeoutRef = useRef(null);

  const markFullscreenTransition = (durationMs = 1500) => {
    isFullscreenTransitioningRef.current = true;
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      isFullscreenTransitioningRef.current = false;
    }, durationMs);
  };

  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  const restoreFullScreen = async () => {
    try {
      if (window.electronAPI && typeof window.electronAPI.checkFullScreen === 'function') {
        const isFs = await window.electronAPI.checkFullScreen();
        if (!isFs) {
          markFullscreenTransition(1500);
          await window.electronAPI.enterFullScreen();
        }
      } else if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        markFullscreenTransition(1500);
        await document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (err) {
      console.error('Failed to restore fullscreen:', err);
    }
  };

  // Tab visibility and app-focus detection
  useEffect(() => {
    let blurTimeout = null;

    const handleLeave = () => {
      setIsTabVisible(false);
      setShowWarning(true);
    };

    const handleReturn = () => {
      setIsTabVisible(true);
      if (!isFullscreenTransitioningRef.current && (currentScreenRef.current === 'instructions' || wasFullscreenRef.current)) {
        restoreFullScreen();
      }
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
    setShowWarning(false);
    if (currentScreen === 'instructions' || wasFullscreenRef.current) {
      restoreFullScreen();
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
    if (isFullscreen) {
      wasFullscreenRef.current = true;
    }
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

      {/* Tab-Switching Warning Modal */}
      {showWarning && (
        <div className="modal-overlay">
          <div className="warning-modal" role="dialog" aria-modal="true">
            <div className="warning-modal-icon">⚠️</div>
            <p className="warning-modal-message">
              Warning: You have left the test window. Please stay on Invigilo throughout the test.
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

      {currentScreen === 'instructions' ? (
        <Instructions />
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