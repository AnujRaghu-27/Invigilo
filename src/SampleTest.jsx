import { useState } from 'react';

const QUESTIONS = [
  {
    id: 1,
    question: 'Which data structure operates on a Last In, First Out (LIFO) basis?',
    options: [
      { key: 'A', text: 'Queue' },
      { key: 'B', text: 'Stack' },
      { key: 'C', text: 'Array' },
      { key: 'D', text: 'Linked List' },
    ],
  },
  {
    id: 2,
    question: 'What does CPU stand for?',
    options: [
      { key: 'A', text: 'Central Processing Unit' },
      { key: 'B', text: 'Central Performance Unit' },
      { key: 'C', text: 'Computer Power Unit' },
      { key: 'D', text: 'Control Process Utility' },
    ],
  },
  {
    id: 3,
    question: 'What is the time complexity of searching in a sorted array using Binary Search?',
    options: [
      { key: 'A', text: 'O(n)' },
      { key: 'B', text: 'O(n log n)' },
      { key: 'C', text: 'O(log n)' },
      { key: 'D', text: 'O(1)' },
    ],
  },
  {
    id: 4,
    question: 'Which of the following is NOT an operating system?',
    options: [
      { key: 'A', text: 'Linux' },
      { key: 'B', text: 'macOS' },
      { key: 'C', text: 'Python' },
      { key: 'D', text: 'Windows' },
    ],
  },
  {
    id: 5,
    question: 'What protocol is primarily used for secure communication over the Internet?',
    options: [
      { key: 'A', text: 'HTTP' },
      { key: 'B', text: 'HTTPS' },
      { key: 'C', text: 'FTP' },
      { key: 'D', text: 'SMTP' },
    ],
  },
];

function SampleTest({ onSubmit }) {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionChange = (questionId, optionKey) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (typeof onSubmit === 'function') {
      onSubmit(selectedAnswers);
    }
  };

  return (
    <div className="main-content">
      {/* Top Heading */}
      <div className="heading-section">
        <h2 className="heading-title">Sample Test</h2>
        <p className="heading-subtitle">
          Please answer the questions below. You may change your answers at any time before submitting.
        </p>
      </div>

      {/* Questions Card */}
      <div className="test-card">
        {QUESTIONS.map((q, index) => (
          <div key={q.id} className="question-block">
            <h3 className="question-title">
              {index + 1}. {q.question}
            </h3>
            <div className="options-list">
              {q.options.map((opt) => {
                const isSelected = selectedAnswers[q.id] === opt.key;
                return (
                  <label
                    key={opt.key}
                    className={`option-item ${isSelected ? 'option-item-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      value={opt.key}
                      checked={isSelected}
                      onChange={() => handleOptionChange(q.id, opt.key)}
                      className="option-radio"
                    />
                    <span className="option-badge">{opt.key}</span>
                    <span className="option-text">{opt.text}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Test Button */}
      <div className="action-area">
        <button
          type="button"
          className="btn-submit-test"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Test'}
        </button>
      </div>
    </div>
  );
}

export default SampleTest;
