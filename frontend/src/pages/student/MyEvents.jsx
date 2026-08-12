import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EvaluationModal from '../../components/EvaluationModal';
import './MyEvents.css';
import './Notifications.css'; // reuse lightbox + media-thumb styles for banner/rules viewer

// api.defaults.baseURL is 'http://localhost:5000/api' — strip the /api
// to get the root the /uploads static folder is served from. Only used
// as a fallback for any older records saved before the Cloudinary switch.
const UPLOADS_BASE = api.defaults.baseURL.replace(/\/api\/?$/, '');

// banner_image is now a full Cloudinary URL (stored that way since the
// uploadMiddleware Cloudinary migration) — falls back to the old
// local-path style for any records saved before that switch.
const getBannerSrc = (event) => {
  if (!event) return null;
  if (event.banner_image) {
    return event.banner_image.startsWith('http')
      ? event.banner_image
      : `${UPLOADS_BASE}/uploads/banners/${event.banner_image}`;
  }
  if (event.banner_url) return event.banner_url;
  return null;
};

// rules_file is now a full Cloudinary URL for the same reason — falls
// back to the old local-path style ("rules/rules-12345.pdf") for any
// records saved before the switch.
const getRulesSrc = (event) => {
  if (!event?.rules_file) return null;
  return event.rules_file.startsWith('http')
    ? event.rules_file
    : `${UPLOADS_BASE}/uploads/${event.rules_file}`;
};

const isPdfFile = (path) => !!path && path.toLowerCase().endsWith('.pdf');

// program_flow is stored as a JSON string (or may already come back parsed
// as an array, depending on the API layer) — a list of steps like:
// [{ time: "9:00 AM", title: "Opening Program", description: "..." }, ...]
const getProgramFlow = (event) => {
  if (!event?.program_flow) return [];
  if (Array.isArray(event.program_flow)) return event.program_flow;
  try {
    const parsed = JSON.parse(event.program_flow);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// How long after an event's start time a student can still register/confirm
// attendance. After this, if they haven't completed check-in, the event is
// marked as missed and the action is locked out entirely. Matches the
// backend's 30-minute check-in window (see attendanceController.js).
const REGISTRATION_GRACE_MINUTES = 30;

const STATUS_CONFIG = {
  not_started:         { label: 'NOT YET OPEN',        theme: 'blue',   button: null },
  not_registered:      { label: 'NOT REGISTERED',      theme: 'blue',   button: 'Register Attendance' },
  upload_receipt:      { label: 'UPLOAD RECEIPT',      theme: 'orange', button: 'Pay Now' },
  register_attendance: { label: 'REGISTER ATTENDANCE', theme: 'blue',   button: 'Upload Attendance Proof' },
  attending:            { label: 'EVENT ONGOING',       theme: 'blue',   button: null },
  checkout:            { label: 'CHECKOUT REQUIRED',   theme: 'orange', button: 'Checkout (Upload Proof)' },
  missed:               { label: 'MISSED',              theme: 'orange', button: null },
  pending_evaluation:  { label: 'PENDING EVALUATION',  theme: 'orange', button: 'Evaluate Event' },
  completed:           { label: 'COMPLETED',           theme: 'green',  button: null },
};

const MyEvents = () => {
  const [allEvents, setAllEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'upcoming' | 'completed'
  const [busyEventId, setBusyEventId] = useState(null);

  // Coming from a QR scan (?event=123) — used to scroll to and highlight
  // that specific event card once the list has loaded.
  const [searchParams] = useSearchParams();
  const highlightedEventId = searchParams.get('event');

  // File upload plumbing — one hidden input reused for payment receipts
  const fileInputRef = useRef(null);
  const [pendingUpload, setPendingUpload] = useState(null); // { type: 'payment', ticketId }

  // Evaluation modal
  const [evalEvent, setEvalEvent] = useState(null);

  // Attendance check-in proof modal
  const [attendanceModal, setAttendanceModal] = useState(null); // { event, ticket }
  const [attendancePhoto, setAttendancePhoto] = useState(null);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // Checkout (logout) proof modal
  const [checkoutModal, setCheckoutModal] = useState(null); // { event }
  const [checkoutPhoto, setCheckoutPhoto] = useState(null);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  // Full-size viewer — shared by the banner and program-rules thumbnails.
  const [lightbox, setLightbox] = useState(null); // { type: 'image' | 'pdf', src }

  useEffect(() => {
    fetchAll();
  }, []);

  // Once events have loaded, if we arrived here from a QR scan, scroll to
  // that event's card so the student sees it immediately instead of having
  // to hunt for it in the list.
  useEffect(() => {
    if (!highlightedEventId || loading) return;
    const el = document.getElementById(`event-card-${highlightedEventId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedEventId, loading, allEvents]);

  const fetchAll = async () => {
    try {
      const [eventsRes, ticketsRes, attendanceRes, evalRes] = await Promise.all([
        api.get('/events'),
        api.get('/tickets/my'),
        api.get('/attendance/my'),
        api.get('/evaluations/my'),
      ]);
      setAllEvents(eventsRes.data.events || []);
      setTickets(ticketsRes.data.tickets || []);
      setAttendanceRecords(attendanceRes.data.attended || []);
      setEvaluations(evalRes.data.evaluations || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const getTicketForEvent = (event_id) => tickets.find((t) => t.event_id === event_id);
  const getAttendanceForEvent = (event_id) => attendanceRecords.find((a) => a.event_id === event_id);

  const isEvaluated = (event) =>
    evaluations.some((e) => e.event_name === event.event_name && e.date_start === event.date_start);

  // event.date_start may come back as a plain "2026-08-12" string, or as a
  // full ISO timestamp like "2026-08-12T00:00:00.000Z" depending on how the
  // backend/DB driver serializes date columns. Always take just the date
  // portion before appending time_start — otherwise concatenating produces
  // a malformed string (e.g. "...000ZT11:00") that parses as Invalid Date,
  // and any comparison against Invalid Date silently evaluates to false —
  // which is why events stayed stuck on "NOT YET OPEN" forever even after
  // their actual start time had passed.
  const getEventStart = (event) => {
    const datePart = String(event.date_start).split('T')[0];
    return new Date(`${datePart}T${event.time_start || '00:00'}`);
  };

  const hasEventStarted = (event) => new Date() >= getEventStart(event);

  // True once the 30-minute check-in window from the event's start time has
  // fully elapsed — after this, registering/confirming attendance is locked
  // out for good and the event counts as missed.
  const isPastRegistrationWindow = (event) => {
    const deadline = new Date(getEventStart(event).getTime() + REGISTRATION_GRACE_MINUTES * 60000);
    return new Date() > deadline;
  };

  const hasEventEnded = (event) => {
    const endDateStr = String(event.date_end || event.date_start).split('T')[0];
    const endTime = event.time_end || event.time_start || '23:59';
    const eventEnd = new Date(`${endDateStr}T${endTime}`);
    return new Date() > eventEnd;
  };

  const getStatus = (event) => {
    const ticket = getTicketForEvent(event.event_id);
    const attendance = getAttendanceForEvent(event.event_id);

    if (!ticket) {
      if (!hasEventStarted(event)) return 'not_started';
      if (isPastRegistrationWindow(event)) return 'missed';
      return 'not_registered';
    }

    if (event.requires_payment && (ticket.payment_status === 'pending' || ticket.payment_status === 'rejected')) {
      return 'upload_receipt';
    }

    if (ticket.status !== 'used') {
      // Registered (e.g. paid) but never confirmed attendance before the
      // window closed — counts as missed, same as never registering at all.
      if (isPastRegistrationWindow(event)) return 'missed';
      return 'register_attendance';
    }

    // Checked in but not checked out yet. Checkout only becomes available
    // once the event has ended — while it's still ongoing there's nothing
    // to do but attend.
    if (attendance && !attendance.checkout_at) {
      return hasEventEnded(event) ? 'checkout' : 'attending';
    }

    return isEvaluated(event) ? 'completed' : 'pending_evaluation';
  };

  const enrichedEvents = allEvents.map((event) => ({
    event,
    status: getStatus(event),
    ticket: getTicketForEvent(event.event_id),
  }));

  const filteredEvents = enrichedEvents.filter(({ status }) => {
    if (filter === 'upcoming') return status !== 'completed';
    if (filter === 'completed') return status === 'completed';
    return true;
  });

  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString('en-CA') : '—';

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  // ─── Register (create ticket) ──────────────────────────────────────────
  const handleRegister = async (event) => {
    setBusyEventId(event.event_id);
    try {
      await api.post('/tickets', { event_id: event.event_id });
      toast.success(
        event.requires_payment
          ? 'Registered! Please upload your payment receipt next.'
          : 'Registered successfully!'
      );
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to register.');
    } finally {
      setBusyEventId(null);
    }
  };

  // ─── Upload receipt (payment) ───────────────────────────────────────────
  const openFilePicker = (type, ticket) => {
    if (!ticket) return;
    setPendingUpload({ type, ticketId: ticket.ticket_id });
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file || !pendingUpload) return;

    const { type, ticketId } = pendingUpload;
    const formData = new FormData();
    formData.append('ticket_id', ticketId);

    setBusyEventId(ticketId);
    try {
      if (type === 'payment') {
        formData.append('payment_proof', file);
        await api.post('/payments/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Receipt uploaded! Waiting for admin validation.');
      }
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally {
      setBusyEventId(null);
      setPendingUpload(null);
    }
  };

  // ─── Attendance check-in proof modal ────────────────────────────────────
  // ticket === null means this is a brand-new registration (no ticket yet);
  // the ticket gets created at submit time, right before the photo upload.
  const openAttendanceModal = (event, ticket = null) => {
    setAttendanceModal({ event, ticket });
    setAttendancePhoto(null);
  };

  const submitAttendance = async () => {
    if (!attendanceModal) return;
    if (!attendancePhoto) {
      toast.error('Please choose a photo first.');
      return;
    }
    setSubmittingAttendance(true);
    try {
      let ticketId = attendanceModal.ticket?.ticket_id;

      if (!ticketId) {
        try {
          const ticketRes = await api.post('/tickets', { event_id: attendanceModal.event.event_id });
          ticketId = ticketRes.data.ticket_id;
        } catch (ticketErr) {
          if (ticketErr.response?.status === 409) {
            const existing = await api.get('/tickets/my');
            const match = (existing.data.tickets || []).find(
              (t) => t.event_id === attendanceModal.event.event_id
            );
            if (!match) throw ticketErr;
            ticketId = match.ticket_id;
          } else {
            throw ticketErr;
          }
        }
      }

      const formData = new FormData();
      formData.append('ticket_id', ticketId);
      formData.append('photo', attendancePhoto);
      await api.post('/attendance/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Registered and attendance recorded successfully!');
      setAttendanceModal(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit attendance.');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // ─── Checkout (logout) proof modal ──────────────────────────────────────
  const openCheckoutModal = (event) => {
    setCheckoutModal({ event });
    setCheckoutPhoto(null);
  };

  const submitCheckout = async () => {
    if (!checkoutModal) return;
    if (!checkoutPhoto) {
      toast.error('Please choose a photo first.');
      return;
    }
    setSubmittingCheckout(true);
    try {
      const formData = new FormData();
      formData.append('event_id', checkoutModal.event.event_id);
      formData.append('photo', checkoutPhoto);
      await api.post('/attendance/checkout', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Checked out successfully!');
      setCheckoutModal(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit checkout.');
    } finally {
      setSubmittingCheckout(false);
    }
  };

  // ─── Evaluation modal ───────────────────────────────────────────────────
  const openEvalModal = (event) => {
    if (!hasEventEnded(event)) {
      toast('You can evaluate this event after it ends.', { icon: '⏳' });
      return;
    }
    setEvalEvent(event);
  };

  // ─── Action button dispatcher ───────────────────────────────────────────
  const handleAction = ({ event, status, ticket }) => {
    if (status === 'not_registered') {
      return event.requires_payment ? handleRegister(event) : openAttendanceModal(event, null);
    }
    if (status === 'upload_receipt') return openFilePicker('payment', ticket);
    if (status === 'register_attendance') return openAttendanceModal(event, ticket);
    if (status === 'checkout') return openCheckoutModal(event);
    if (status === 'pending_evaluation') return openEvalModal(event);
  };

  if (loading) return <div className="myevents-loading">Loading events...</div>;

  return (
    <div className="myevents-page">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <div className="myevents-header">
        <h2 className="myevents-title">
          My Events
        </h2>
        <span className="myevents-count">{filteredEvents.length} events available</span>
      </div>

      <div className="filter-tabs">
        <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-tab ${filter === 'upcoming' ? 'active' : ''}`} onClick={() => setFilter('upcoming')}>Upcoming</button>
        <button className={`filter-tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
      </div>

      <div className="events-grid">
        {filteredEvents.length === 0 ? (
          <div className="no-events">
            <p>No events found.</p>
            <p className="no-events-sub">Check back later for upcoming events!</p>
          </div>
        ) : (
          filteredEvents.map(({ event, status, ticket }) => {
            const cfg = STATUS_CONFIG[status];
            const isBusy = busyEventId === event.event_id || busyEventId === ticket?.ticket_id;
            const evalReady = status === 'pending_evaluation' && hasEventEnded(event);
            const bannerSrc = getBannerSrc(event);
            const rulesSrc = getRulesSrc(event);
            const rulesIsPdf = isPdfFile(event.rules_file);
            const programFlow = getProgramFlow(event);
            const isHighlighted = highlightedEventId != null && String(event.event_id) === String(highlightedEventId);

            return (
              <div
                key={event.event_id}
                id={`event-card-${event.event_id}`}
                className={`event-card theme-${cfg.theme}`}
                style={isHighlighted ? {
                  outline: '3px solid #2563eb',
                  outlineOffset: '2px',
                  boxShadow: '0 0 0 6px rgba(37,99,235,0.15)',
                } : undefined}
              >
                <div className="event-card-header">
                  <span className="event-sender">SSC (ADMIN)</span>
                  <span className={`status-badge badge-${cfg.theme}`}>{cfg.icon} {cfg.label}</span>
                </div>

                <h3 className="event-name">{event.event_name}</h3>
                <p className="event-description">{event.description || 'No description'}</p>

                <div className="event-info-grid">
                  <div className="event-info-item">
                    <span className="event-info-label"> DATE</span>
                    <span className="event-info-value">{formatDate(event.date_start)}</span>
                  </div>
                  <div className="event-info-item">
                    <span className="event-info-label">TIME</span>
                    <span className="event-info-value">{formatTime(event.time_start)}</span>
                  </div>
                  <div className="event-info-item">
                    <span className="event-info-label"> VENUE</span>
                    <span className="event-info-value">{event.venue || '—'}</span>
                  </div>
                  <div className="event-info-item">
                    <span className="event-info-label">FOR</span>
                    <span className="event-info-value">{event.allowed_departments || 'ALL'}</span>
                  </div>
                </div>

                {event.requires_payment && event.payment_amount > 0 && (
                  <div className="payment-info">
                    <span className="payment-amount">₱{event.payment_amount}</span>
                  </div>
                )}

                {programFlow.length > 0 && (
                  <div className="program-flow">
                    <span className="notif-info-label">EVENT FLOW</span>
                    <div className="program-flow-timeline">
                      {programFlow.map((step, idx) => (
                        <div className="program-flow-step" key={idx}>
                          <div className="program-flow-marker">
                            <span className="program-flow-dot" />
                            {idx < programFlow.length - 1 && <span className="program-flow-line" />}
                          </div>
                          <div className="program-flow-content">
                            {step.time && <span className="program-flow-time">{step.time}</span>}
                            <span className="program-flow-title">{step.title}</span>
                            {step.description && (
                              <p className="program-flow-desc">{step.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── BANNER + RULES — bottom row (72×72, unchanged size) ── */}
                {(bannerSrc || rulesSrc) && (
                  <div className="event-media-row">
                    {bannerSrc && (
                      <div className="event-banner-group">
                        <span className="event-banner-label">PROGRAM BANNER</span>
                        <div
                          className="event-banner"
                          onClick={() => setLightbox({ type: 'image', src: bannerSrc })}
                          role="button"
                          tabIndex={0}
                          title="Click to view full size"
                          style={{ cursor: 'pointer' }}
                        >
                          <img
                            src={bannerSrc}
                            alt=""
                            onError={(e) => { e.target.closest('.event-banner').style.display = 'none'; }}
                          />
                        </div>
                      </div>
                    )}

                    {rulesSrc && (
                      <div className="notif-media-stack">
                        <div className="notif-media-row">
                          <span className="notif-info-label">PROGRAM RULES</span>
                          {rulesIsPdf ? (
                            <div
                              className="notif-thumb notif-thumb-pdf"
                              onClick={() => setLightbox({ type: 'pdf', src: rulesSrc })}
                              role="button"
                              tabIndex={0}
                              title="Click to view"
                            >
                              <span className="notif-thumb-pdf-icon">📄</span>
                            </div>
                          ) : (
                            <div
                              className="notif-thumb"
                              onClick={() => setLightbox({ type: 'image', src: rulesSrc })}
                              role="button"
                              tabIndex={0}
                              title="Click to view full size"
                            >
                              <img src={rulesSrc} alt="Program rules" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="event-actions">
                  {cfg.button ? (
                    <button
                      className={`action-btn btn-${cfg.theme} ${status === 'pending_evaluation' && !evalReady ? 'disabled' : ''}`}
                      onClick={() => handleAction({ event, status, ticket })}
                      disabled={isBusy || (status === 'pending_evaluation' && !evalReady)}
                    >
                      {isBusy
                        ? 'Please wait...'
                        : status === 'pending_evaluation' && !evalReady
                        ? 'Available After Event'
                        : cfg.button}
                    </button>
                  ) : status === 'completed' ? (
                    <div className="completed-msg"> All Done!</div>
                  ) : status === 'not_started' ? (
                    <div className="completed-msg" style={{ background: '#eef2ff', color: '#3949ab' }}>
                       Opens {formatDate(event.date_start)} at {formatTime(event.time_start)}
                    </div>
                  ) : status === 'attending' ? (
                    <div className="completed-msg" style={{ background: '#eef2ff', color: '#3949ab' }}>
                      Event in progress — checkout unlocks when it ends
                    </div>
                  ) : status === 'missed' ? (
                    <div className="completed-msg" style={{ background: '#fdecea', color: '#c0392b' }}>
                      You missed this event
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {attendanceModal && (
        <div className="attendance-modal-overlay" onClick={() => setAttendanceModal(null)}>
          <div className="attendance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="attendance-modal-header">
              <h3>Event Check-In - {attendanceModal.event.event_name}</h3>
              <button className="attendance-modal-close" onClick={() => setAttendanceModal(null)}>✕</button>
            </div>

            <div className="attendance-modal-info">
              <div className="attendance-info-row">
                <strong>Date:</strong>
                <span>{formatDate(attendanceModal.event.date_start)} at {formatTime(attendanceModal.event.time_start)}</span>
              </div>
              <div className="attendance-info-row">
                <strong>Venue:</strong>
                <span>{attendanceModal.event.venue || '—'}</span>
              </div>
            </div>

            <div className="attendance-modal-body">
              <label className="attendance-upload-label">Upload Photo Evidence</label>
              <div className="attendance-file-input-wrap">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAttendancePhoto(e.target.files[0] || null)}
                />
              </div>
              <p className="attendance-upload-hint">Upload a photo showing you at the event venue</p>
            </div>

            <div className="attendance-modal-actions">
              <button className="attendance-cancel-btn" onClick={() => setAttendanceModal(null)}>Cancel</button>
              <button className="attendance-submit-btn" onClick={submitAttendance} disabled={submittingAttendance}>
                {submittingAttendance ? 'Submitting...' : 'Submit Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutModal && (
        <div className="attendance-modal-overlay" onClick={() => setCheckoutModal(null)}>
          <div className="attendance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="attendance-modal-header">
              <h3>Event Checkout - {checkoutModal.event.event_name}</h3>
              <button className="attendance-modal-close" onClick={() => setCheckoutModal(null)}>✕</button>
            </div>

            <div className="attendance-modal-info">
              <div className="attendance-info-row">
                <strong>Date:</strong>
                <span>{formatDate(checkoutModal.event.date_start)} at {formatTime(checkoutModal.event.time_start)}</span>
              </div>
              <div className="attendance-info-row">
                <strong>Venue:</strong>
                <span>{checkoutModal.event.venue || '—'}</span>
              </div>
            </div>

            <div className="attendance-modal-body">
              <label className="attendance-upload-label">Upload Checkout Photo</label>
              <div className="attendance-file-input-wrap">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCheckoutPhoto(e.target.files[0] || null)}
                />
              </div>
              <p className="attendance-upload-hint">Upload a photo as proof you are leaving the event</p>
            </div>

            <div className="attendance-modal-actions">
              <button className="attendance-cancel-btn" onClick={() => setCheckoutModal(null)}>Cancel</button>
              <button className="attendance-submit-btn" onClick={submitCheckout} disabled={submittingCheckout}>
                {submittingCheckout ? 'Submitting...' : 'Submit Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}

      <EvaluationModal
        event={evalEvent}
        onClose={() => setEvalEvent(null)}
        onSubmitted={fetchAll}
      />

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setLightbox(null)}
            aria-label="Close preview"
          >
            ✕
          </button>
          {lightbox.type === 'pdf' ? (
            <iframe
              src={lightbox.src}
              title="Program rules"
              className="lightbox-pdf"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={lightbox.src}
              alt="Full size preview"
              className="lightbox-img"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MyEvents;