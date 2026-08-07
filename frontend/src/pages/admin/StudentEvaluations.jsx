import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './StudentEvaluations.css';

const StarInput = ({ rating, setRating }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-btn ${star <= (hover || rating) ? 'filled' : ''}`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => setRating(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
};

const StudentEvaluations = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state for selected event
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Get all events and my evaluations
      const [eventsRes, evalsRes] = await Promise.all([
        api.get('/events'),
        api.get('/evaluations/my'),
      ]);

      const allEvents = eventsRes.data.events || eventsRes.data || [];
      const myEvals = evalsRes.data.evaluations || evalsRes.data || [];

      // Filter to completed events that user attended
      const completedEvents = allEvents.filter(
        (e) => e.status === 'completed' || e.status === 'ongoing'
      );

      setEvents(completedEvents);
      setEvaluations(myEvals);
    } catch (err) {
      toast.error('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  const hasEvaluated = (eventId) => {
    return evaluations.some((e) => e.event_id === eventId);
  };

  const getMyEvaluation = (eventId) => {
    return evaluations.find((e) => e.event_id === eventId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;
    if (rating === 0) return toast.error('Please select a star rating.');

    setSubmitting(true);
    try {
      await api.post('/evaluations', {
        event_id: selectedEvent,
        rating,
        feedback,
      });
      toast.success('Evaluation submitted!');
      setSelectedEvent(null);
      setRating(0);
      setFeedback('');
      fetchData(); // refresh
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="student-eval-wrapper">
        <div className="eval-loading">Loading your events...</div>
      </div>
    );
  }

  return (
    <div className="student-eval-wrapper">
      <div className="eval-header">
        <h1>📝 Event Evaluations</h1>
        <p>Rate and review events you've attended</p>
      </div>

      {events.length === 0 ? (
        <div className="no-events">
          <span className="no-events-icon">📭</span>
          <p>No completed events available for evaluation.</p>
          <span className="no-events-hint">Attend an event and come back here to share your feedback!</span>
        </div>
      ) : (
        <div className="events-eval-list">
          {events.map((event) => {
            const evaluated = hasEvaluated(event.event_id);
            const myEval = getMyEvaluation(event.event_id);

            return (
              <div key={event.event_id} className="event-eval-card">
                <div className="event-eval-info">
                  <h3>{event.event_name}</h3>
                  <p className="event-meta">
                    📅 {new Date(event.date_start).toLocaleDateString()} • 
                    📍 {event.venue || 'No venue'}
                  </p>
                </div>

                {evaluated ? (
                  <div className="evaluated-badge">
                    <div className="submitted-stars">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={`star ${s <= myEval.rating ? 'filled' : ''}`}>★</span>
                      ))}
                    </div>
                    <span className="submitted-label">✅ Submitted</span>
                    {myEval.feedback && (
                      <p className="submitted-feedback">"{myEval.feedback}"</p>
                    )}
                  </div>
                ) : selectedEvent === event.event_id ? (
                  <form className="eval-form" onSubmit={handleSubmit}>
                    <label>Your Rating</label>
                    <StarInput rating={rating} setRating={setRating} />
                    <label>Your Feedback (optional)</label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Share your experience..."
                      rows={3}
                    />
                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => {
                          setSelectedEvent(null);
                          setRating(0);
                          setFeedback('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-submit"
                        disabled={submitting || rating === 0}
                      >
                        {submitting ? 'Submitting...' : 'Submit Evaluation'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="btn-evaluate"
                    onClick={() => setSelectedEvent(event.event_id)}
                  >
                    ⭐ Rate This Event
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentEvaluations;