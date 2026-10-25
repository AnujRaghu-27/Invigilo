import { useState } from 'react';

function Instructions({ onStartTest }) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleStartTestClick = () => {
    if (isConfirmed && typeof onStartTest === 'function') {
      onStartTest();
    }
  };

  return (
    <div className="main-content">
      {/* Top Heading */}
      <div className="heading-section">
        <h2 className="heading-title">Test Instructions</h2>
      </div>

      {/* Instructions Card */}
      <div className="instructions-card">
        <ol className="instructions-list">
          <li className="instruction-item">
            Stay in fullscreen mode during the test.
          </li>
          <li className="instruction-item">
            Do not switch tabs or applications while taking the test.
          </li>
          <li className="instruction-item">
            Read each question carefully before answering.
          </li>
          <li className="instruction-item">
            Keep your camera connected and working throughout the test.
          </li>
          <li className="instruction-item">
            Submit your test when you have completed all questions.
          </li>
        </ol>

        {/* Instructions Confirmation Checkbox */}
        <div className="instructions-confirmation">
          <label className="confirmation-label">
            <input
              type="checkbox"
              id="instructions-confirmed"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="confirmation-checkbox"
            />
            <span>I have read and understood the instructions.</span>
          </label>
        </div>
      </div>

      {/* Start Test Button (Centered Below Card) */}
      <div className="action-area">
        <button
          type="button"
          className={`btn-start-test ${isConfirmed ? 'btn-start-test-enabled' : ''}`}
          onClick={handleStartTestClick}
          disabled={!isConfirmed}
        >
          Start Test
        </button>
      </div>
    </div>
  );
}

export default Instructions;
