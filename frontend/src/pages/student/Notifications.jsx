import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EvaluationModal from '../../components/EvaluationModal';
import './Notifications.css';
import '../student/MyEvents.css'; // reuse attendance-modal styles — adjust path if MyEvents.css lives elsewhere

// api.defaults.baseURL is 'http://localhost:5000/api' — strip the /api
// to get the root the /uploads static folder is served from.
const UPLOADS_BASE = api.defaults.baseURL.replace(/\/api\/?$/, '');

// A banner is either an uploaded image (banner_image, served from
// /uploads/banners/) or a pasted external link (banner_url) — whichever
// the event actually has set.
const getBannerSrc = (event) => {
  if (!event) return null;
  if (event.banner_image) return `${UPLOADS_BASE}/uploads/banners/${event.banner_image}`;
  if (event.banner_url) return event.banner_url;
  return null;
};

// rules_file is stored as a relative path like "rules/rules-12345.pdf"
// (see eventRoutes.js's /:id/rules-file handler), served straight from /uploads/.
const getRulesSrc = (event) => {
  if (!event?.rules_file) return null;
  return `${UPLOADS_BASE}/uploads/${event.rules_file}`;
};

const isPdfFile = (path) => !!path && path.toLowerCase().endsWith('.pdf');

const STATUS_CONFIG = {
  not_registered:      { label: 'NOT REGISTERED',     theme: 'blue',   button: 'Register Attendance' },
  upload_receipt:      { label: 'UPLOAD RECEIPT',     theme: 'orange', button: 'Upload Receipt' },
  register_attendance: { label: 'REGISTER ATTENDANCE',theme: 'blue',   button: 'Upload Attendance Proof' },
  pending_evaluation:  { label: 'PENDING EVALUATION', theme: 'orange', button: 'Evaluate Event' },
  completed:           { label: 'COMPLETED',          theme: 'green',  button: null },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  // File upload plumbing — one hidden input reused for the payment receipt
  const fileInputRef = useRef(null);
  const [pendingUpload, setPendingUpload] = useState(null); // { type: 'payment', ticketId }

  // Attendance proof modal
  const [attendanceModal, setAttendanceModal] = useState(null); // { event, ticket }
  const [attendancePhoto, setAttendancePhoto] = useState(null);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // Evaluation modal (shared rubric component)
  const [evalEvent, setEvalEvent] = useState(null);

  // Full-size viewer — shared by the banner and program-rules thumbnails.
  // { type: 'image' | 'pdf', src } — both render inside the same in-app
  // overlay, so nothing ever opens in a new browser tab.
  const [lightbox, setLightbox] = useState(null);

  const fetchAll = async () => {
    try {
      const [notifRes, eventsRes, ticketsRes, evalRes] = await Promise.all([
        api.get('/notifications/my'),
        api.get('/events'),
        api.get('/tickets/my'),
        api.get('/evaluations/my'),
      ]);
      setNotifications(notifRes.data.notifications || []);
      setEvents(eventsRes.data.events || []);
      setTickets(ticketsRes.data.tickets || []);
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
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const dismissNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
    } catch (e) {
      console.error(e);
      toast.error('Failed to dismiss notification.');
    }
  };

  const getTicketForEvent = (event_id) => tickets.find((t) => t.event_id === event_id);

  const isEvaluated = (event) =>
    evaluations.some((e) => e.event_name === event.event_name && e.date_start === event.date_start);

  const getStatus = (event) => {
    if (!event) return null;
    const ticket = getTicketForEvent(event.event_id);
    if (!ticket) return 'not_registered';
    if (event.requires_payment && (ticket.payment_status === 'pending' || ticket.payment_status === 'rejected')) {
      return 'upload_receipt';
    }
    if (ticket.status !== 'used') return 'register_attendance';
    return isEvaluated(event) ? 'completed' : 'pending_evaluation';
  };

  // Attach the matching full event + computed status to each notification
  const enriched = notifications.map((n) => {
    const event = n.event_id ? events.find((e) => e.event_id === n.event_id) : null;
    const status = getStatus(event);
    const ticket = event ? getTicketForEvent(event.event_id) : null;
    return { ...n, event, status, ticket };
  });

  const filtered = enriched.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'payment') return n.event?.requires_payment;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
    setBusyId(event.event_id);
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
      setBusyId(null);
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

    setBusyId(ticketId);
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
      setBusyId(null);
      setPendingUpload(null);
    }
  };

  // ─── Attendance proof modal ─────────────────────────────────────────────
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

      // New registration flow: create the ticket first, then upload the photo
      if (!ticketId) {
        try {
          const ticketRes = await api.post('/tickets', { event_id: attendanceModal.event.event_id });
          ticketId = ticketRes.data.ticket_id;
        } catch (ticketErr) {
          // 409 = a ticket already exists for this event — look it up instead of failing
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

  // ─── Action button dispatcher ────────────────────────────────────────────
  const handleAction = (n) => {
    if (!n.is_read) markAsRead(n.notification_id);
    if (!n.event || !n.status || n.status === 'completed') return;

    const { event, status, ticket } = n;

    if (status === 'not_registered') {
      return event.requires_payment ? handleRegister(event) : openAttendanceModal(event, null);
    }
    if (status === 'upload_receipt') return openFilePicker('payment', ticket);
    if (status === 'register_attendance') return openAttendanceModal(event, ticket);
    if (status === 'pending_evaluation') return setEvalEvent(event);
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <div className="page-header">
        <h2>Event Notifications</h2>
        <p>Updates from SSC (Admin) about events you can join.</p>
      </div>

      <div className="notif-filter-tabs">
        {[
          { key: 'all', label: `All${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}` },
          { key: 'unread', label: 'Unread' },
          { key: 'payment', label: 'Payment Required' },
        ].map((f) => (
          <button
            key={f.key}
            className={`notif-tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="card">
          <p style={{ color: '#aaa', textAlign: 'center', padding: 32 }}>No notifications found.</p>
        </div>
      ) : (
        <div className="notif-grid">
          {filtered.map((n) => {
            const cfg = n.status ? STATUS_CONFIG[n.status] : null;
            const isBusy = busyId === n.event?.event_id || busyId === n.ticket?.ticket_id;
            const bannerSrc = getBannerSrc(n.event);
            const rulesSrc = getRulesSrc(n.event);
            const rulesIsPdf = isPdfFile(n.event?.rules_file);

            return (
              <div
                key={n.notification_id}
                className={`notif-card theme-${cfg?.theme || 'gray'} ${!n.is_read ? 'unread' : ''}`}
              >
                <div className="notif-card-top">
                  <span className="notif-sender">SSC (ADMIN)</span>
                  {cfg && <span className={`notif-badge badge-${cfg.theme}`}>{cfg.icon} {cfg.label}</span>}
                  <button
                    className="notif-dismiss-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(n.notification_id);
                    }}
                    aria-label="Dismiss notification"
                    title="Dismiss"
                  >
                    ✕
                  </button>
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
                      <span className="notif-info-value">{formatTime(n.event.time_start)}</span>
                    </div>
                    <div className="notif-info-item">
                      <span className="notif-info-label"> VENUE</span>
                      <span className="notif-info-value">{n.event.venue || '—'}</span>
                    </div>
                    <div className="notif-info-item">
                      <span className="notif-info-label"> FOR</span>
                      <span className="notif-info-value">{n.event.allowed_departments || 'ALL'}</span>
                    </div>
                  </div>
                )}

                {(bannerSrc || rulesSrc) && (
                  <div className="notif-media-stack">
                    {bannerSrc && (
                      <div className="notif-media-row">
                        <span className="notif-info-label">EVENT BANNER</span>
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
                    )}
                  </div>
                )}


                {cfg?.button ? (
                  <button
                    className={`notif-action-btn btn-${cfg.theme}`}
                    onClick={() => handleAction(n)}
                    disabled={isBusy}
                  >
                    {isBusy ? 'Please wait...' : cfg.button}
                  </button>
                ) : n.status === 'completed' ? (
                  <div className="notif-completed-msg">All Done!</div>
                ) : (
                  <button className="notif-action-btn btn-gray" onClick={() => markAsRead(n.notification_id)}>
                    Mark as Read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {attendanceModal && (
        <div className="attendance-modal-overlay" onClick={() => setAttendanceModal(null)}>
          <div className="attendance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="attendance-modal-header">
              <h3>Event Attendance - {attendanceModal.event.event_name}</h3>
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

      <EvaluationModal
        event={evalEvent}
        onClose={() => setEvalEvent(null)}
        onSubmitted={fetchAll}
      />

      {/* Full-size viewer — shared by the banner and program-rules thumbnails.
          PDFs render in an inline iframe so nothing leaves the app. */}
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
    </>
  );
};

export default Notifications;