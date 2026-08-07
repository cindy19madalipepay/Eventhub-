import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EvaluationModal from '../../components/EvaluationModal';
import './MyEvents.css';

// api.defaults.baseURL is 'http://localhost:5000/api' — strip the /api
// to get the root the /uploads static folder is served from.
const UPLOADS_BASE = api.defaults.baseURL.replace(/\/api\/?$/, '');

// A banner is either an uploaded image (banner_image, served from
// /uploads/banners/) or a pasted external link (banner_url) — whichever
// the event actually has set.
const getBannerSrc = (event) => {
  if (event.banner_image) return `${UPLOADS_BASE}/uploads/banners/${event.banner_image}`;
  if (event.banner_url) return event.banner_url;
  return null;
};

// How long after an event's start time a student can still register/confirm
// attendance. After this, if they haven't completed registration, the event
// is marked as missed and the action is locked out entirely.
const REGISTRATION_GRACE_MINUTES = 60;

const STATUS_CONFIG = {
  not_started:         { label: 'NOT YET OPEN',        theme: 'blue',   button: null },
  not_registered:      { label: 'NOT REGISTERED',      theme: 'blue',   button: 'Register Attendance' },
  upload_receipt:      { label: 'UPLOAD RECEIPT',      theme: 'orange', button: 'Pay Now' },
  register_attendance: { label: 'REGISTER ATTENDANCE', theme: 'blue',   button: 'Upload Attendance Proof' },
  missed:               { label: 'MISSED',              theme: 'orange', button: null },
  pending_evaluation:  { label: 'PENDING EVALUATION',  theme: 'orange', button: 'Evaluate Event' },
  completed:           { label: 'COMPLETED',           theme: 'green',  button: null },
};

const MyEvents = () => {
  const [allEvents, setAllEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'upcoming' | 'completed'
  const [busyEventId, setBusyEventId] = useState(null);

  // File upload plumbing — one hidden input reused for both receipt + attendance photo
  const fileInputRef = useRef(null);
  const [pendingUpload, setPendingUpload] = useState(null); // { type: 'payment' | 'attendance', ticketId }

  // Evaluation modal (shared rubric component — matches the RSU evaluation sheet)
  const [evalEvent, setEvalEvent] = useState(null);

  // Attendance proof modal
  const [attendanceModal, setAttendanceModal] = useState(null); // { event, ticket }
  const [attendancePhoto, setAttendancePhoto] = useState(null);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [eventsRes, ticketsRes, evalRes] = await Promise.all([
        api.get('/events'),
        api.get('/tickets/my'),
        api.get('/evaluations/my'),
      ]);
      setAllEvents(eventsRes.data.events || []);
      setTickets(ticketsRes.data.tickets || []);
      setEvaluations(evalRes.data.evaluations || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const getTicketForEvent = (event_id) => tickets.find((t) => t.event_id === event_id);

  const isEvaluated = (event) =>
    evaluations.some((e) => e.event_name === event.event_name && e.date_start === event.date_start);

  const getEventStart = (event) => new Date(`${event.date_start}T${event.time_start || '00:00'}`);

  const hasEventStarted = (event) => new Date() >= getEventStart(event);

  // True once the 1-hour registration grace period from the event's start
  // time has fully elapsed — after this, registering/confirming attendance
  // is locked out for good.
  const isPastRegistrationWindow = (event) => {
    const deadline = new Date(getEventStart(event).getTime() + REGISTRATION_GRACE_MINUTES * 60000);
    return new Date() > deadline;
  };

  const hasEventEnded = (event) => {
    const endDateStr = event.date_end || event.date_start;
    const endTime = event.time_end || event.time_start || '23:59';
    const eventEnd = new Date(`${endDateStr}T${endTime}`);
    return new Date() > eventEnd;
  };

  const getStatus = (event) => {
    const ticket = getTicketForEvent(event.event_id);

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
          // 409 = a ticket already exists for this event (e.g. from earlier testing,
          // or the events/tickets lists were briefly out of sync). Look it up instead
          // of failing the whole flow.
          if (ticketErr.response?.status === 409) {
            const existing = await api.get('/tickets/my');
            const match = (existing.data.tickets || []).find(
              (t) => t.event_id === attendanceModal.event.event_id
            );
            if (!match) throw ticketErr; // genuinely couldn't find it — surface the original error
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

  // ─── Evaluation modal ───────────────────────────────────────────────────
  // Opens the in-app rubric form directly — no external Google Form link.
  // Stays available from the event's end time onward, same as before.
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

            return (
              <div key={event.event_id} className={`event-card theme-${cfg.theme}`}>
                {bannerSrc && (
                  <div className="event-banner">
                    <img
                      src={bannerSrc}
                      alt=""
                      onError={(e) => { e.target.closest('.event-banner').style.display = 'none'; }}
                    />
                  </div>
                )}

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
    </div>
  );
};

export default MyEvents;