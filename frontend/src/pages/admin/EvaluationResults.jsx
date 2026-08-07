import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './EvaluationResults.css';

const EvaluationResults = () => {
  const [events, setEvents] = useState([]);
  const [evalsByEvent, setEvalsByEvent] = useState({}); // { event_id: [evaluations] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailsEventId, setDetailsEventId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const eventsRes = await api.get('/events');
      const eventsData = eventsRes.data?.events || eventsRes.data || [];
      const eventsList = Array.isArray(eventsData) ? eventsData : [];
      setEvents(eventsList);

      // Fetch evaluations for every event in parallel
      const results = await Promise.all(
        eventsList.map((ev) =>
          api
            .get(`/evaluations/event/${ev.event_id}`)
            .then((res) => ({ id: ev.event_id, evaluations: res.data?.evaluations || res.data || [] }))
            .catch(() => ({ id: ev.event_id, evaluations: [] }))
        )
      );

      const map = {};
      results.forEach((r) => {
        map[r.id] = Array.isArray(r.evaluations) ? r.evaluations : [];
      });
      setEvalsByEvent(map);
    } catch (err) {
      console.error('Fetch events error:', err);
      setError(err.response?.status === 404 ? 'Events API not found (404)' : 'Failed to load events.');
      toast.error('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAverage = (evals) => {
    const rated = evals.filter((e) => e.rating != null);
    if (rated.length === 0) return 0;
    const sum = rated.reduce((acc, e) => acc + Number(e.rating), 0);
    return (sum / rated.length).toFixed(1);
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setDetailsEventId(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (loading) {
    return (
      <div className="eval-page">
        <div className="eval-card">
          <p className="loading-text">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="eval-page">
        <h1 className="eval-title">Student Event Evaluations</h1>
        <div className="eval-card error">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchAll}>Retry</button>
        </div>
      </div>
    );
  }

  const detailsEvent = events.find((e) => e.event_id === detailsEventId);
  const detailsEvals = detailsEventId ? evalsByEvent[detailsEventId] || [] : [];

  return (
    <div className="eval-page">
      <h1 className="eval-title">Student Event Evaluations</h1>

      {events.length === 0 ? (
        <div className="eval-card empty">
          <p>No events found.</p>
        </div>
      ) : (
        <div className="eval-grid">
          {events.map((event) => {
            const evaluations = evalsByEvent[event.event_id] || [];
            const avgRating = calculateAverage(evaluations);
            const hasRatings = evaluations.some((e) => e.rating != null);

            return (
              <div key={event.event_id} className="eval-card">
                <div className="eval-card-header">
                  <h2>{event.event_name}</h2>
                  <span className="event-date">
                    {event.date_start ? new Date(event.date_start).toISOString().split('T')[0] : '—'}
                  </span>
                </div>

                <div className="rating-summary">
                  <div className="rating-circle">
                    <span className="rating-number">{hasRatings ? avgRating : '—'}</span>
                    <span className="rating-total">/ 5</span>
                  </div>
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={`star ${hasRatings && s <= Math.round(Number(avgRating)) ? 'filled' : ''}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="eval-count">
                    {evaluations.length} evaluation{evaluations.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="rating-breakdown">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = evaluations.filter((e) => Number(e.rating) === star).length;
                    const pct = evaluations.length > 0 ? (count / evaluations.length) * 100 : 0;
                    return (
                      <div key={star} className="breakdown-row">
                        <span className="breakdown-label">{star}★</span>
                        <div className="breakdown-bar-bg">
                          <div className="breakdown-bar-fill" style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="breakdown-count">{count}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  className="btn-view-details"
                  onClick={() => setDetailsEventId(event.event_id)}
                  disabled={evaluations.length === 0}
                >
                  {evaluations.length === 0 ? 'No Reviews Available' : 'View All Details →'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {detailsEventId && (
        <div className="modal-overlay" onClick={() => setDetailsEventId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{detailsEvent?.event_name} - Reviews</h2>
              <button className="modal-close" onClick={() => setDetailsEventId(null)}>✕</button>
            </div>

            <div className="modal-body">
              {detailsEvals.length > 0 ? (
                <div className="reviews-list">
                  {detailsEvals.map((evalItem, idx) => (
                    <div key={idx} className="review-item">
                      <div className="review-header">
                        <div className="reviewer-info">
                          <div className="reviewer-avatar">
                            {evalItem.first_name?.[0] || '?'}{evalItem.last_name?.[0] || ''}
                          </div>
                          <div className="reviewer-details">
                            <span className="reviewer-name">
                              {evalItem.first_name || 'Anonymous'} {evalItem.last_name || ''}
                            </span>
                            <span className="review-date">
                              {evalItem.submitted_at
                                ? new Date(evalItem.submitted_at).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                  })
                                : '—'}
                            </span>
                          </div>
                        </div>
                        {evalItem.rating != null && (
                          <div className="review-stars">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span key={s} className={`star ${s <= Number(evalItem.rating) ? 'filled' : ''}`}>★</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {(evalItem.most_helpful || evalItem.least_helpful || evalItem.suggestions) ? (
                        <div className="review-feedback-block">
                          {evalItem.most_helpful && (
                            <p className="review-text"><strong>Most helpful:</strong> "{evalItem.most_helpful}"</p>
                          )}
                          {evalItem.least_helpful && (
                            <p className="review-text"><strong>Least helpful:</strong> "{evalItem.least_helpful}"</p>
                          )}
                          {evalItem.suggestions && (
                            <p className="review-text"><strong>Suggestions:</strong> "{evalItem.suggestions}"</p>
                          )}
                        </div>
                      ) : evalItem.feedback ? (
                        // Older evaluations submitted before the rubric form existed
                        <p className="review-text">"{evalItem.feedback}"</p>
                      ) : evalItem.rating == null ? (
                        <p className="review-text" style={{ fontStyle: 'italic', color: '#999' }}>
                          Submitted via external form.
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-reviews">
                  <p>No reviews available for this event.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationResults;