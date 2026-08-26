import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './History.css';

const UPLOADS_BASE = api.defaults.baseURL.replace(/\/api\/?$/, '');

const resolveImageUrl = (url) => {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `${UPLOADS_BASE}${url}`;
};

const History = () => {
  const [attendance, setAttendance] = useState([]);
  const [missedEvents, setMissedEvents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const [showAllMissed, setShowAllMissed] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [showAllEvaluations, setShowAllEvaluations] = useState(false);

  const VISIBLE_LIMIT = 3;

  const attendanceRef = useRef(null);
  const missedRef = useRef(null);
  const paymentsRef = useRef(null);
  const evaluationsRef = useRef(null);

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const [attRes, payRes, evalRes] = await Promise.all([
        api.get('/attendance/my'),
        api.get('/payments/my'),
        api.get('/evaluations/my'),
      ]);

      setAttendance(attRes.data.attended || []);
      setMissedEvents(attRes.data.missed || []);
      setPayments(payRes.data.payments || []);
      setEvaluations(evalRes.data.evaluations || []);
    } catch (e) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={`star ${star <= rating ? 'filled' : ''}`}>★</span>
        ))}
      </div>
    );
  };

  const paymentsValidatedCount = payments.filter((p) => p.payment_status === 'validated').length;

  if (loading) return <div className="history-loading">Loading history...</div>;

  return (
    <div className="history-page">
      <div className="history-header">
        <h2 className="history-title">My Activity History</h2>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────────
          4 small, uniformly-patterned cards ("Noun + past-tense verb"):
          Events Attended / Events Missed / Payments Validated /
          Evaluations Given — each clickable and scrolls to its section. */}
      <div className="stats-row">
        <div className="stat-card clickable" onClick={() => scrollToSection(attendanceRef)} role="button" tabIndex={0}>
          <div className="stat-number">{attendance.length}</div>
          <div className="stat-label">Events Attended</div>
        </div>
        <div className="stat-card clickable stat-card-missed" onClick={() => scrollToSection(missedRef)} role="button" tabIndex={0}>
          <div className="stat-number">{missedEvents.length}</div>
          <div className="stat-label">Events Missed</div>
        </div>
        <div className="stat-card clickable" onClick={() => scrollToSection(paymentsRef)} role="button" tabIndex={0}>
          <div className="stat-number">{paymentsValidatedCount}</div>
          <div className="stat-label">Payments Validated</div>
        </div>
        <div className="stat-card clickable" onClick={() => scrollToSection(evaluationsRef)} role="button" tabIndex={0}>
          <div className="stat-number">{evaluations.length}</div>
          <div className="stat-label">Evaluations Given</div>
        </div>
      </div>

      {/* ── ATTENDANCE HISTORY ───────────────────────────────── */}
      <h3 className="section-title" ref={attendanceRef}>Attendance History</h3>
      <div className="history-section">
        {attendance.length === 0 ? (
          <div className="empty-state">No attendance records yet.</div>
        ) : (
          <>
            {(showAllAttendance ? attendance : attendance.slice(0, VISIBLE_LIMIT)).map((record) => (
              <div key={record.attendance_id} className="history-row">
                <div className="row-body">
                  <h4 className="row-title">{record.event_name}</h4>
                  <span className="row-meta">{formatDate(record.checked_in_at)}</span>
                </div>
                {/* Both login (check-in) and logout (checkout) photos, same
                    naming pattern: "View Check-In Photo" / "View Check-Out
                    Photo". Checkout button only appears once a checkout
                    photo actually exists on the record. */}
                <div className="row-actions">
                  {record.photo_url && (
                    <button
                      className="view-btn"
                      onClick={() => setPreviewImage(resolveImageUrl(record.photo_url))}
                    >
                      View Check-In Photo
                    </button>
                  )}
                  {record.checkout_photo && (
                    <button
                      className="view-btn view-btn-secondary"
                      onClick={() => setPreviewImage(resolveImageUrl(record.checkout_photo))}
                    >
                      View Check-Out Photo
                    </button>
                  )}
                </div>
              </div>
            ))}
            {attendance.length > VISIBLE_LIMIT && (
              <button className="show-toggle-btn" onClick={() => setShowAllAttendance((prev) => !prev)}>
                {showAllAttendance ? 'Show Less' : `Show More (${attendance.length - VISIBLE_LIMIT})`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── MISSED EVENTS ─────────────────────────────────────── */}
      <h3 className="section-title" ref={missedRef}>Missed Events</h3>
      <div className="history-section">
        {missedEvents.length === 0 ? (
          <div className="empty-state">No missed events.</div>
        ) : (
          <>
            {(showAllMissed ? missedEvents : missedEvents.slice(0, VISIBLE_LIMIT)).map((event, idx) => (
              <div key={`${event.event_id}-${idx}`} className="history-row missed-row">
                <div className="row-body">
                  <h4 className="row-title">{event.event_name}</h4>
                  <span className="row-meta">
                    {formatDate(event.date_start)}{event.venue ? ` · ${event.venue}` : ''}
                  </span>
                </div>
                <span className="missed-badge">MISSED</span>
              </div>
            ))}
            {missedEvents.length > VISIBLE_LIMIT && (
              <button className="show-toggle-btn" onClick={() => setShowAllMissed((prev) => !prev)}>
                {showAllMissed ? 'Show Less' : `Show More (${missedEvents.length - VISIBLE_LIMIT})`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── PAYMENT RECEIPTS ─────────────────────────────────── */}
      <h3 className="section-title" ref={paymentsRef}>Payment Receipts</h3>
      <div className="history-section">
        {payments.length === 0 ? (
          <div className="empty-state">No receipt uploads yet</div>
        ) : (
          <>
            {(showAllPayments ? payments : payments.slice(0, VISIBLE_LIMIT)).map((payment) => (
              <div key={payment.ticket_id} className="history-row">
                <div className="row-body">
                  <h4 className="row-title">{payment.event_name}</h4>
                  <span className="row-meta">{formatDate(payment.submitted_at)}</span>
                  <div className="payment-details">
                    <span className="payment-amount">₱{payment.payment_amount}</span>
                    <span className={`payment-status-badge ${payment.payment_status}`}>
                      {payment.payment_status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                </div>
                {payment.proof_url && (
                  <button
                    className="view-btn"
                    onClick={() => setPreviewImage(resolveImageUrl(payment.proof_url))}
                  >
                    View Receipt
                  </button>
                )}
              </div>
            ))}
            {payments.length > VISIBLE_LIMIT && (
              <button className="show-toggle-btn" onClick={() => setShowAllPayments((prev) => !prev)}>
                {showAllPayments ? 'Show Less' : `Show More (${payments.length - VISIBLE_LIMIT})`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── EVALUATIONS ──────────────────────────────────────── */}
      <h3 className="section-title" ref={evaluationsRef}>Evaluations Given</h3>
      <div className="history-section">
        {evaluations.length === 0 ? (
          <div className="empty-state">No evaluations given yet.</div>
        ) : (
          <>
            {(showAllEvaluations ? evaluations : evaluations.slice(0, VISIBLE_LIMIT)).map((evaluation) => (
              <div key={evaluation.evaluation_id} className="history-row evaluation-row">
                <div className="row-body">
                  <h4 className="row-title">{evaluation.event_name}</h4>
                  <span className="row-meta">{formatDate(evaluation.submitted_at)}</span>
                  {renderStars(evaluation.rating)}
                  {evaluation.feedback && <p className="feedback-text">"{evaluation.feedback}"</p>}
                </div>
              </div>
            ))}
            {evaluations.length > VISIBLE_LIMIT && (
              <button className="show-toggle-btn" onClick={() => setShowAllEvaluations((prev) => !prev)}>
                {showAllEvaluations ? 'Show Less' : `Show More (${evaluations.length - VISIBLE_LIMIT})`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── PHOTO PREVIEW MODAL ──────────────────────────────── */}
      {previewImage && (
        <div className="preview-overlay" onClick={() => setPreviewImage(null)}>
          <div className="preview-box" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={() => setPreviewImage(null)}>✕</button>
            <img src={previewImage} alt="Preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default History;