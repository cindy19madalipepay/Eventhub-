import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EvaluationModal from '../../components/EvaluationModal';
import './Notifications.css';
import '../student/MyEvents.css';

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
  not_started:          { label: 'NOT YET OPEN',        theme: 'blue',   button: null },
  not_registered:       { label: 'NOT REGISTERED',      theme: 'blue',   button: 'Register Attendance' },
  upload_receipt:       { label: 'UPLOAD RECEIPT',      theme: 'orange', button: 'Upload your stub here' },
  register_attendance:  { label: 'REGISTER ATTENDANCE', theme: 'blue',   button: 'Upload Attendance Proof' },
  attending:             { label: 'EVENT ONGOING',       theme: 'blue',   button: null },
  checkout:             { label: 'CHECKOUT REQUIRED',   theme: 'orange', button: 'Checkout (Upload Proof)' },
  missed:                { label: 'MISSED',              theme: 'orange', button: null },
  pending_evaluation:   { label: 'PENDING EVALUATION',  theme: 'orange', button: 'Evaluate Event' },
  completed:            { label: 'COMPLETED',           theme: 'green',  button: null },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [readIds, setReadIds] = useState(new Set());

  const fileInputRef = useRef(null);
  const [pendingUpload, setPendingUpload] = useState(null);

  const [attendanceModal, setAttendanceModal] = useState(null);
  const [attendancePhoto, setAttendancePhoto] = useState(null);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  const [checkoutModal, setCheckoutModal] = useState(null);
  const [checkoutPhoto, setCheckoutPhoto] = useState(null);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  const [evalEvent, setEvalEvent] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

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

  const fetchAll = async () => {
    try {
      const [notifRes, eventsRes, ticketsRes, attendanceRes, evalRes] = await Promise.all([
        api.get('/notifications/my'),
        api.get('/events'),
        api.get('/tickets/my'),
        api.get('/attendance/my'),
        api.get('/evaluations/my'),
      ]);

      // NEWEST FIRST: sort events by date+time descending
      const sortedEvents = (eventsRes.data.events || []).sort((a, b) => {
        return getEventDateTime(b) - getEventDateTime(a);
      });

      setNotifications(notifRes.data.notifications || []);
      setEvents(sortedEvents);
      setTickets(ticketsRes.data.tickets || []);
      setAttendanceRecords(attendanceRes.data.attended || []);
      setEvaluations(evalRes.data.evaluations || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const markAsRead = async (id) => {
    if (!String(id).startsWith('evt-')) {
      try {
        await api.put(`/notifications/${id}/read`);
      } catch (e) {
        console.error(e);
      }
    }
    setReadIds((prev) => new Set(prev).add(id));
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: 1 } : n))
    );
  };

  const dismissNotification = async (e, id) => {
    e.stopPropagation();
    if (!String(id).startsWith('evt-')) {
      try {
        await api.delete(`/notifications/${id}`);
      } catch (e) {
        console.error(e);
        toast.error('Failed to dismiss notification.');
        return;
      }
    }
    setDismissedIds((prev) => new Set(prev).add(id));
    setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
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
    if (!event) return null;
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

  const enriched = useMemo(() => {
    const notifByEvent = new Map();
    notifications.forEach((n) => {
      if (n.event_id && !notifByEvent.has(n.event_id)) {
        notifByEvent.set(n.event_id, n);
      }
    });

    const eventCards = events.map((event) => {
      const n = notifByEvent.get(event.event_id);
      const status = getStatus(event);
      const ticket = getTicketForEvent(event.event_id);
      if (n) {
        return { ...n, event, status, ticket, isSynthetic: false };
      }
      return {
        notification_id: `evt-${event.event_id}`,
        event_id: event.event_id,
        event_name: event.event_name,
        title: event.event_name,
        message: event.description || 'A new event has been posted. Check it out!',
        is_read: 0,
        created_at: event.created_at,
        event,
        status,
        ticket,
        isSynthetic: true,
      };
    });

    const systemCards = notifications
      .filter((n) => !n.event_id)
      .map((n) => ({ ...n, event: null, status: null, ticket: null, isSynthetic: false }));

    return [...eventCards, ...systemCards];
  }, [events, notifications, tickets, attendanceRecords, evaluations]);

  const filtered = enriched.filter((n) => {
    if (dismissedIds.has(n.notification_id)) return false;
    const isRead = n.is_read || readIds.has(n.notification_id);
    if (filter === 'unread') return !isRead;
    if (filter === 'payment') return n.event?.requires_payment;
    return true;
  });

  const unreadCount = enriched.filter((n) => {
    const isRead = n.is_read || readIds.has(n.notification_id);
    return !isRead && !dismissedIds.has(n.notification_id);
  }).length;

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
    if (!event) return '—';
    const start = formatTime(event.time_start);
    const end = formatTime(event.time_end);
    if (!start) return '—';
    return end ? `${start} – ${end}` : start;
  };

  const handleRegister = async (event) => {
    setBusyId(event.event_id);
    try {
      await api.post('/tickets', { event_id: event.event_id });
      toast.success(
        event.requires_payment
          ? 'Registered! You may grab your STUB at SSC Office.'
          : 'Registered successfully!'
      );
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to register.');
    } finally {
      setBusyId(null);
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

    setBusyId(ticketId);
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
      setBusyId(null);
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

  const handleAction = (e, n) => {
    e.stopPropagation();
    if (!n.is_read && !readIds.has(n.notification_id)) markAsRead(n.notification_id);
    if (!n.event || !n.status || n.status === 'completed') return;

    const { event, status, ticket } = n;

    if (status === 'not_registered') {
      return event.requires_payment ? handleRegister(event) : openAttendanceModal(event, null);
    }
    if (status === 'upload_receipt') return openFilePicker('payment', ticket);
    if (status === 'register_attendance') return openAttendanceModal(event, ticket);
    if (status === 'checkout') return openCheckoutModal(event);
    if (status === 'pending_evaluation') return openEvalModal(event);
  };

  if (loading) return <div className="myevents-loading">Loading notifications...</div>;

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
        <h2 className="myevents-title">Event Notifications</h2>
        <span className="myevents-count">{filtered.length} updates</span>
      </div>

      <div className="notif-filter-tabs">
        <button className={`notif-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}
        </button>
        <button className={`notif-tab ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>Unread</button>
        <button className={`notif-tab ${filter === 'payment' ? 'active' : ''}`} onClick={() => setFilter('payment')}>Payment Required</button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <p style={{ color: '#aaa', textAlign: 'center', padding: 32 }}>No notifications found.</p>
        </div>
      ) : (
        <div className="notif-grid">
          {filtered.map((n) => {
            const cfg = n.status ? STATUS_CONFIG[n.status] : null;
            const isBusy = busyId === n.event?.event_id || busyId === n.ticket?.ticket_id;
            const evalReady = n.status === 'pending_evaluation' && n.event && hasEventEnded(n.event);
            const bannerSrc = getBannerSrc(n.event);
            const rulesSrc = getRulesSrc(n.event);
            const rulesIsPdf = isPdfFile(rulesSrc);
            const programFlow = getProgramFlow(n.event);
            const isRead = n.is_read || readIds.has(n.notification_id);

            return (
              <div
                key={n.notification_id}
                className={`notif-card theme-${cfg?.theme || 'gray'} ${!isRead ? 'unread' : ''}`}
                onClick={() => {
                  if (!isRead && !dismissedIds.has(n.notification_id)) {
                    markAsRead(n.notification_id);
                  }
                }}
              >
                <div className="notif-card-top">
                  <span className="notif-sender">SSC (ADMIN)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {!isRead && (
                      <span
                        className="unread-dot"
                        style={{ position: 'static', marginRight: 4, flexShrink: 0 }}
                        title="Unread"
                      />
                    )}
                    {cfg && <span className={`notif-badge badge-${cfg.theme}`}>{cfg.label}</span>}
                    <button
                      className="notif-dismiss-btn"
                      onClick={(e) => dismissNotification(e, n.notification_id)}
                      aria-label="Dismiss notification"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <h3 className="notif-event-name">{n.event_name || n.title}</h3>
                {n.event?.description && <p className="notif-event-desc">{n.event.description}</p>}
                {!n.event?.description && <p className="notif-event-desc">{n.message}</p>}

                {n.event && (
                  <div className="notif-info-grid">
                    <div className="notif-info-item">
                      <span className="notif-info-label">DATE</span>
                      <span className="notif-info-value">{formatDate(n.event.date_start)}</span>
                    </div>
                    <div className="notif-info-item">
                      <span className="notif-info-label">TIME</span>
                      <span className="notif-info-value">{formatTimeRange(n.event)}</span>
                    </div>
                    <div className="notif-info-item">
                      <span className="notif-info-label">VENUE</span>
                      <span className="notif-info-value">{n.event.venue || '—'}</span>
                    </div>
                    <div className="notif-info-item">
                      <span className="notif-info-label">FOR</span>
                      <span className="notif-info-value">{n.event.allowed_departments || 'ALL'}</span>
                    </div>
                  </div>
                )}

                {n.event?.requires_payment && n.event?.payment_amount > 0 && (
                  <div className="payment-info">
                    <span className="payment-amount">Payment: ₱{n.event.payment_amount}</span>
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
                  <div className="notif-media-stack" style={{ marginTop: 8, marginBottom: 8 }}>
                    {bannerSrc && (
                      <div className="notif-media-row">
                        <span className="notif-info-label">PROGRAM BANNER</span>
                        <div
                          className="notif-thumb"
                          onClick={() => setLightbox({ type: 'image', src: bannerSrc })}
                          role="button"
                          tabIndex={0}
                          title="Click to view full size"
                        >
                          <img
                            src={bannerSrc}
                            alt=""
                            onError={(e) => { e.target.closest('.notif-thumb').style.display = 'none'; }}
                          />
                        </div>
                      </div>
                    )}

                    {rulesSrc && (
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
                    )}
                  </div>
                )}

                {cfg?.button ? (
                  <button
                    className={`notif-action-btn btn-${cfg.theme} ${n.status === 'pending_evaluation' && !evalReady ? 'disabled' : ''}`}
                    onClick={(e) => handleAction(e, n)}
                    disabled={isBusy || (n.status === 'pending_evaluation' && !evalReady)}
                  >
                    {isBusy
                      ? 'Please wait...'
                      : n.status === 'pending_evaluation' && !evalReady
                      ? 'Available After Event'
                      : cfg.button}
                  </button>
                ) : n.status === 'completed' ? (
                  <div className="notif-completed-msg">All Done!</div>
                ) : n.status === 'not_started' ? (
                  <div className="notif-completed-msg" style={{ background: '#eef2ff', color: '#3949ab' }}>
                    Opens {formatDate(n.event?.date_start)} at {formatTime(n.event?.time_start)}
                  </div>
                ) : n.status === 'attending' ? (
                  <div className="notif-completed-msg" style={{ background: '#eef2ff', color: '#3949ab' }}>
                    Event in progress — checkout unlocks when it ends
                  </div>
                ) : n.status === 'missed' ? (
                  <div className="notif-completed-msg" style={{ background: '#fdecea', color: '#c0392b' }}>
                    You missed this event
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

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

export default Notifications;