import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const CheckIn = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [ticket, setTicket] = useState(null);

  const [photo, setPhoto] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // ==========================================================
  // LOAD EVENT + STUDENT TICKET
  // ==========================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        setMessage('');

        if (!eventId) {
          setError('Event ID is missing.');
          setLoading(false);
          return;
        }

        // ======================================================
        // CHECK LOGIN FIRST
        // ======================================================
        const token = localStorage.getItem('eventhub_token');

        if (!token) {
          const redirectPath = `/checkin/${eventId}`;

          navigate(
            `/login?redirect=${encodeURIComponent(redirectPath)}`,
            { replace: true }
          );

          return;
        }

        // ======================================================
        // LOAD EVENT
        // ======================================================
        const eventResponse = await api.get(
          `/events/${eventId}`
        );

        if (!eventResponse.data?.success) {
          setError(
            'Unable to load event information.'
          );
          return;
        }

        setEvent(eventResponse.data.event);

        // ======================================================
        // LOAD STUDENT TICKETS
        // ======================================================
        const ticketsResponse = await api.get(
          '/tickets/my'
        );

        const tickets =
          ticketsResponse.data?.tickets || [];

        const foundTicket = tickets.find(
          (item) =>
            Number(item.event_id) ===
            Number(eventId)
        );

        if (!foundTicket) {
          setError(
            'You do not have a ticket for this event.'
          );
          return;
        }

        setTicket(foundTicket);

      } catch (err) {
        console.error(
          'CheckIn load error:',
          err
        );

        // ======================================================
        // IF TOKEN IS INVALID / EXPIRED
        // ======================================================
        if (err.response?.status === 401) {
          localStorage.removeItem(
            'eventhub_token'
          );

          localStorage.removeItem(
            'eventhub_user'
          );

          const redirectPath =
            `/checkin/${eventId}`;

          navigate(
            `/login?redirect=${encodeURIComponent(
              redirectPath
            )}`,
            { replace: true }
          );

          return;
        }

        setError(
          err.response?.data?.message ||
            'Unable to load event information.'
        );

      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, navigate]);

  // ==========================================================
  // SELECT PHOTO
  // ==========================================================
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setPhoto(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError(
        'Please select a valid image file.'
      );

      e.target.value = '';
      setPhoto(null);
      return;
    }

    // Maximum 10MB
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        'The photo must be smaller than 10MB.'
      );

      e.target.value = '';
      setPhoto(null);
      return;
    }

    setError('');
    setMessage('');
    setPhoto(file);
  };

  // ==========================================================
  // SUBMIT CHECK-IN
  // ==========================================================
  const handleCheckIn = async (e) => {
    e.preventDefault();

    if (!ticket) {
      setError(
        'No ticket was found for this event.'
      );
      return;
    }

    if (!photo) {
      setError(
        'Please take or select a photo before checking in.'
      );
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');

      const formData = new FormData();

      formData.append(
        'ticket_id',
        String(ticket.ticket_id)
      );

      formData.append(
        'photo',
        photo
      );

      const response = await api.post(
        '/attendance/register',
        formData
      );

      if (response.data?.success) {
        setMessage(
          response.data.message ||
            'Attendance registered successfully!'
        );

        setPhoto(null);

        const fileInput =
          document.getElementById(
            'attendance-photo'
          );

        if (fileInput) {
          fileInput.value = '';
        }

        setTimeout(() => {
          navigate('/student');
        }, 1500);
      }

    } catch (err) {
      console.error(
        'Check-in error:',
        err
      );

      if (err.response?.status === 401) {
        localStorage.removeItem(
          'eventhub_token'
        );

        localStorage.removeItem(
          'eventhub_user'
        );

        navigate(
          `/login?redirect=${encodeURIComponent(
            `/checkin/${eventId}`
          )}`,
          { replace: true }
        );

        return;
      }

      setError(
        err.response?.data?.message ||
          'Unable to register attendance.'
      );

    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f4f7fb',
          fontSize: '18px',
          color: '#475569',
        }}
      >
        Loading...
      </div>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '30px 20px',
        background: '#f4f7fb',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          background: '#ffffff',
          padding: '30px',
          borderRadius: '16px',
          boxShadow:
            '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >

        {/* ====================================================
            TITLE
        ==================================================== */}
        <h1
          style={{
            marginTop: 0,
            marginBottom: '8px',
            color: '#1e293b',
          }}
        >
          Event Check-In
        </h1>

        <p
          style={{
            color: '#64748b',
            marginBottom: '25px',
          }}
        >
          Register your attendance for this event.
        </p>

        {/* ====================================================
            EVENT INFORMATION
        ==================================================== */}
        {event && (
          <div
            style={{
              marginBottom: '25px',
              padding: '18px',
              background: '#eff6ff',
              borderRadius: '12px',
              border: '1px solid #dbeafe',
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: '12px',
                color: '#1e3a8a',
              }}
            >
              {event.event_name}
            </h2>

            {event.date_start && (
              <p>
                <strong>Date:</strong>{' '}
                {event.date_start}
              </p>
            )}

            {event.time_start && (
              <p>
                <strong>Time:</strong>{' '}
                {event.time_start}
              </p>
            )}

            {event.venue && (
              <p>
                <strong> Venue:</strong>{' '}
                {event.venue}
              </p>
            )}
          </div>
        )}

        {/* ====================================================
            TICKET
        ==================================================== */}
        {ticket && (
          <div
            style={{
              padding: '15px',
              marginBottom: '20px',
              background: '#f1f5f9',
              borderRadius: '10px',
            }}
          >
            <strong>Ticket:</strong>{' '}
            {ticket.ticket_code}
          </div>
        )}

        {/* ====================================================
            ERROR
        ==================================================== */}
        {error && (
          <div
            style={{
              padding: '12px',
              marginBottom: '15px',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              border: '1px solid #fecaca',
            }}
          >
            {error}
          </div>
        )}

        {/* ====================================================
            SUCCESS
        ==================================================== */}
        {message && (
          <div
            style={{
              padding: '12px',
              marginBottom: '15px',
              background: '#dcfce7',
              color: '#166534',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
            }}
          >
            {message}
          </div>
        )}

        {/* ====================================================
            CHECK-IN FORM
        ==================================================== */}
        {ticket && (
          <form onSubmit={handleCheckIn}>

            <label
              htmlFor="attendance-photo"
              style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#334155',
              }}
            >
              Take / Upload Attendance Photo
            </label>

            <input
              id="attendance-photo"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              disabled={submitting}
              style={{
                width: '100%',
                marginBottom: '20px',
              }}
            />

            {/* =================================================
                PHOTO PREVIEW
            ================================================= */}
            {photo && (
              <div
                style={{
                  marginBottom: '20px',
                }}
              >
                <p>
                  <strong>Selected:</strong>{' '}
                  {photo.name}
                </p>

                <img
                  src={URL.createObjectURL(photo)}
                  alt="Attendance preview"
                  style={{
                    width: '100%',
                    maxHeight: '300px',
                    objectFit: 'cover',
                    borderRadius: '10px',
                  }}
                />
              </div>
            )}

            {/* =================================================
                CHECK-IN BUTTON
            ================================================= */}
            <button
              type="submit"
              disabled={
                submitting || !photo
              }
              style={{
                width: '100%',
                padding: '14px',
                border: 'none',
                borderRadius: '8px',
                background:
                  submitting || !photo
                    ? '#94a3b8'
                    : '#2563eb',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '16px',
                cursor:
                  submitting || !photo
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {submitting
                ? 'Registering...'
                : 'Check In'}
            </button>

          </form>
        )}

        {/* ====================================================
            NO TICKET
        ==================================================== */}
        {!ticket && !error && (
          <p
            style={{
              color: '#64748b',
            }}
          >
            No ticket was found for this event.
          </p>
        )}

      </div>
    </div>
  );
};

export default CheckIn;