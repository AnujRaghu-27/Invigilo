function Instructions({ onStartTest }) {
  const handleStartTestClick = () => {
    if (typeof onStartTest === 'function') {
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
      </div>

      {/* Start Test Button (Centered Below Card) */}
      <div className="action-area">
        <button
          type="button"
          className="btn-start-test"
          onClick={handleStartTestClick}
        >
          Start Test
        </button>
      </div>
    </div>
  );
}

export default Instructions;
