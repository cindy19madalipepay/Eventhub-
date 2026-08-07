// frontend/src/components/EvaluationModal.jsx
import { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { EVALUATION_CRITERIA, RATING_LEGEND } from '../utils/evaluationCriteria';
import './EvaluationModal.css';

// Props:
//   event      — the event object being evaluated (needs event_id, event_name, description)
//   onClose    — called when the modal should close (cancel or backdrop click)
//   onSubmitted — called after a successful submit, so the parent can refetch
const EvaluationModal = ({ event, onClose, onSubmitted }) => {
  const [ratings, setRatings] = useState({});
  const [mostHelpful, setMostHelpful] = useState('');
  const [leastHelpful, setLeastHelpful] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!event) return null;

  const setScore = (key, value) => setRatings((prev) => ({ ...prev, [key]: value }));

  const allAnswered = EVALUATION_CRITERIA.every((section) =>
    section.items.every((item) => ratings[item.key])
  );

  const handleSubmit = async () => {
    if (!allAnswered) {
      toast.error('Please rate every item before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/evaluations', {
        event_id: event.event_id,
        criteria_ratings: ratings,
        most_helpful: mostHelpful,
        least_helpful: leastHelpful,
        suggestions,
      });
      toast.success('Evaluation submitted. Thank you!');
      onSubmitted?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="eval-sheet-overlay" onClick={onClose}>
      <div className="eval-sheet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="eval-sheet-header">
          <div>
            <h2>Activity Evaluation Sheet</h2>
            <p className="eval-sheet-subtitle">{event.event_name}</p>
          </div>
          <button className="eval-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="eval-sheet-body">
          <div className="eval-sheet-instructions">
            <p>
              This evaluation sheet is intended to gather feedback which should serve as basis for
              improving the co – curricular activities conducted. Please encircle the number
              corresponding to your choice.
            </p>
            <div className="eval-sheet-legend">
              {RATING_LEGEND.map((l) => (
                <span key={l.value}><strong>{l.value}</strong> – {l.label}</span>
              ))}
            </div>
            <p className="eval-sheet-note">
              Please be candid with your response. The enrichment of our succeeding student
              activities is dependent on your responses.
            </p>
          </div>

          <div className="eval-sheet-table">
            <div className="eval-sheet-row eval-sheet-thead">
              <span className="eval-col-criteria">CRITERIA</span>
              <span className="eval-col-rating">RATING</span>
              <span className="eval-col-mean">WEIGHTED MEAN</span>
              <span className="eval-col-remarks">REMARKS</span>
            </div>

            {EVALUATION_CRITERIA.map((section) => (
              <div key={section.section}>
                <div className="eval-sheet-row eval-section-row">
                  <span className="eval-col-criteria">{section.section}</span>
                  <span className="eval-col-rating" />
                  <span className="eval-col-mean" />
                  <span className="eval-col-remarks" />
                </div>

                {section.items.map((item) => (
                  <div key={item.key} className="eval-sheet-row eval-item-row">
                    <span className="eval-col-criteria eval-item-label">{item.label}</span>
                    <span className="eval-col-rating eval-circles">
                      {[5, 4, 3, 2, 1].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`eval-circle ${ratings[item.key] === n ? 'selected' : ''}`}
                          onClick={() => setScore(item.key, n)}
                        >
                          {n}
                        </button>
                      ))}
                    </span>
                    <span className="eval-col-mean">–</span>
                    <span className="eval-col-remarks">–</span>
                  </div>
                ))}

                <div className="eval-sheet-row eval-summary-row">
                  <span className="eval-col-criteria">SECTION WEIGHTED MEAN</span>
                  <span className="eval-col-rating" />
                  <span className="eval-col-mean">–</span>
                  <span className="eval-col-remarks">–</span>
                </div>
              </div>
            ))}
          </div>

          <div className="eval-sheet-open-section">
            <h4>E. The Progress in General</h4>

            <label>What part of the activity is most helpful to you?</label>
            <textarea rows={2} value={mostHelpful} onChange={(e) => setMostHelpful(e.target.value)} />

            <label>What part of the activity is least helpful to you?</label>
            <textarea rows={2} value={leastHelpful} onChange={(e) => setLeastHelpful(e.target.value)} />

            <label>What are your suggestions to improve succeeding activities of the university/department?</label>
            <textarea rows={2} value={suggestions} onChange={(e) => setSuggestions(e.target.value)} />
          </div>
        </div>

        <div className="eval-sheet-footer">
          <button className="eval-sheet-cancel" onClick={onClose}>Cancel</button>
          <button
            className="eval-sheet-submit"
            onClick={handleSubmit}
            disabled={submitting || !allAnswered}
          >
            {submitting ? 'Submitting...' : 'Submit Evaluation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationModal;