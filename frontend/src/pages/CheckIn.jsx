import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const CheckIn = () => {
  const { eventId } = useParams();

  const navigate = useNavigate();

  const {
    user,
    token,
    loading,
  } = useAuth();

  const [checking, setChecking] = useState(true);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    if (loading) return;

    // ========================================================
    // NOT LOGGED IN
    // ========================================================

    if (!user || !token) {
      navigate(
        `/login?redirect=/checkin/${eventId}`,
        { replace: true }
      );

      return;
    }

    // ========================================================
    // GET EVENT
    // ========================================================

    const loadEvent = async () => {
      try {
        setChecking(true);

        const response = await api.get(
          `/events/${eventId}`
        );

        const eventData =
          response.data?.event ||
          response.data?.data ||
          response.data;

        setEvent(eventData);

      } catch (error) {
        console.error(
          'Load CheckIn Event error:',
          error
        );

        toast.error(
          error.response?.data?.message ||
          'Unable to find this event.'
        );

        navigate(
          '/student/my-events',
          { replace: true }
        );

      } finally {
        setChecking(false);
      }
    };

    loadEvent();

  }, [
    loading,
    user,
    token,
    eventId,
    navigate,
  ]);


  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading ||
    checking
  ) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h2>Checking event...</h2>

        <p>
          Please wait.
        </p>
      </div>
    );
  }


  // ==========================================================
  // EVENT NOT FOUND
  // ==========================================================

  if (!event) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h2>
          Event not found
        </h2>

        <button
          onClick={() =>
            navigate('/student/my-events')
          }
        >
          Go to My Events
        </button>
      </div>
    );
  }


  // ==========================================================
  // EVENT FOUND
  // ==========================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        background: '#f5f7fb',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '500px',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow:
            '0 10px 30px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}
      >

        <h1
          style={{
            marginBottom: '10px',
          }}
        >
          {event.event_name}
        </h1>

        <p
          style={{
            color: '#6b7280',
            marginBottom: '24px',
          }}
        >
          You scanned the QR code for this event.
        </p>


        {/* EVENT DATE */}

        {event.date_start && (
          <p>
            <strong>Date:</strong>{' '}
            {new Date(
              event.date_start
            ).toLocaleDateString()}
          </p>
        )}


        {/* EVENT VENUE */}

        {event.venue && (
          <p>
            <strong>Venue:</strong>{' '}
            {event.venue}
          </p>
        )}


        {/* CONTINUE */}

        <button
          onClick={() =>
            navigate('/student/my-events')
          }
          style={{
            marginTop: '20px',
            width: '100%',
            padding: '13px 18px',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            background: '#2563eb',
            color: '#ffffff',
          }}
        >
          Continue to My Events
        </button>

      </div>
    </div>
  );
};

export default CheckIn;