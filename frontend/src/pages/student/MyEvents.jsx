import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EvaluationModal from '../../components/EvaluationModal';
import './MyEvents.css';
import './Notifications.css';

const UPLOADS_BASE = api.defaults.baseURL.replace(/\/api\/?$/, '');

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

const getRulesSrc = (event) => {
  if (!event?.rules_file) return null;
  return event.rules_file.startsWith('http')
    ? event.rules_file
    : `${UPLOADS_BASE}/uploads/${event.rules_file}`;
};

const isPdfFile = (path) => {
  if (!path) return false;
  const clean = path.split('?')[0].split('#')[0];
  return clean.toLowerCase().endsWith('.pdf');
};

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

const getEventDateTime = (event) => {
  if (!event?.date_start) return new Date(0);
  const datePart = String(event.date_start).split('T')[0];
  return new Date(`${datePart}T${event.time_start || '00:00'}`);
};

const STATUS_CONFIG = {
  not_started:         { label: 'NOT YET OPEN',        theme: 'blue',   button: null },
  not_registered:      { label: 'NOT REGISTERED',      theme: 'blue',   button: 'Register Attendance' },
  upload_receipt:      { label: 'UPLOAD RECEIPT',      theme: 'orange', button: 'Upload your stub here' },
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
  const [filter, setFilter] = useState('all');
  const [busyEventId, setBusyEventId] = useState(null);

  const [searchParams] = useSearchParams();
  const highlightedEventId = searchParams.get('event');

  const fileInputRef = useRef(null);
  const [pendingUpload, setPendingUpload] = useState(null);

  const [evalEvent, setEvalEvent] = useState(null);

  const [attendanceModal, setAttendanceModal] = useState(null);
  const [attendancePhoto, setAttendancePhoto] = useState(null);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  const [checkoutModal, setCheckoutModal] = useState(null);
  const [checkoutPhoto, setCheckoutPhoto] = useState(null);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  const [lightbox, setLightbox] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  // Fetch PDF as blob so it renders inline without embedding blocks
  useEffect(() => {
    if (lightbox?.type === 'pdf') {
      fetch(lightbox.src)
        .then((res) => (res.ok ? res.blob() : Promise.reject()))
        .then((blob) => setPdfBlobUrl(URL.createObjectURL(blob)))
        .catch(() => setPdfBlobUrl(lightbox.src));
    } else {
      if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:')) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  useEffect(() => {
    fetchAll();
  }, []);

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

      // NEWEST FIRST: sort events by date+time descending
      const sortedEvents = (eventsRes.data.events || []).sort((a, b) => {
        return getEventDateTime(b) - getEventDateTime(a);
      });

      setAllEvents(sortedEvents);
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

  const hasEventStarted = (event) => new Date() >= getEventDateTime(event);

  // Attendance can be registered any time the event is live — from start
  // until it ends. An event is only "missed" once it has fully ended
  // (date_end/time_end, falling back to date_start/time_start when no end
  // is set) with no attendance recorded. Replaces the old 30-minute
  // registration grace window.
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
      // Paid events: registration + payment upload open immediately when
      // the event is created — no need to wait for the event to start.
      if (event.requires_payment) {
        return hasEventEnded(event) ? 'missed' : 'not_registered';
      }
      // Free events: registration still waits for the event to start,
      // since "registering" IS the attendance check-in for these.
      if (!hasEventStarted(event)) return 'not_started';
      if (hasEventEnded(event)) return 'missed';
      return 'not_registered';
    }

    if (event.requires_payment && (ticket.payment_status === 'pending' || ticket.payment_status === 'rejected')) {
      return hasEventEnded(event) ? 'missed' : 'upload_receipt';
    }

    // Ticket exists and payment (if any) is approved — this is the actual
    // attendance check-in step, which waits for the event to start.
    if (ticket.status !== 'used') {
      if (!hasEventStarted(event)) return 'not_started';
      if (hasEventEnded(event)) return 'missed';
      return 'register_attendance';
    }

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
    if (filter === 'upcoming') return status === 'not_started';
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

  // Combined "start – end" display, falling back to just start time when
  // no end time is set on the event.
  const formatTimeRange = (event) => {
    const start = formatTime(event.time_start);
    const end = formatTime(event.time_end);
    if (!start) return '—';
    return end ? `${start} – ${end}` : start;
  };

  const handleRegister = async (event) => {
    setBusyEventId(event.event_id);
    try {
      await api.post('/tickets', { event_id: event.event_id });
      toast.success(
        event.requires_payment
          ? 'You may grab your STUB at SSC Office'
          : 'Registered successfully!'
      );
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to register.');
    } finally {
      setBusyEventId(null);
    }
  };

  const openFilePicker = (type, ticket) => {
    if (!ticket) return;
    setPendingUpload({ type, ticketId: ticket.ticket_id });
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
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
        toast.success('Stub uploaded! Waiting for admin validation.');
      }
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally {
      setBusyEventId(null);
      setPendingUpload(null);
    }
  };

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

  const openEvalModal = (event) => {
    if (!hasEventEnded(event)) {
      toast('You can evaluate this event after it ends.', { icon: '⏳' });
      return;
    }
    setEvalEvent(event);
  };

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
        <h2 className="myevents-title">My Events</h2>
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
            const rulesIsPdf = isPdfFile(rulesSrc);
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
                  <span className={`status-badge badge-${cfg.theme}`}>{cfg.label}</span>
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
                    <span className="event-info-value">{formatTimeRange(event)}</span>
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
                    <span className="payment-amount">Payment: ₱{event.payment_amount}</span>
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
                              title="Click to view PDF"
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
                              <img
                                src={rulesSrc}
                                alt="Program rules"
                                onError={(e) => { e.target.closest('.notif-thumb').style.display = 'none'; }}
                              />
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
            <div className="lightbox-pdf-wrap" onClick={(e) => e.stopPropagation()}>
              {pdfBlobUrl ? (
                <iframe
                  src={`${pdfBlobUrl}#view=FitH&toolbar=1`}
                  title="Program rules"
                  className="lightbox-pdf"
                />
              ) : (
                <div className="lightbox-pdf-loading">Loading PDF…</div>
              )}
            </div>
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