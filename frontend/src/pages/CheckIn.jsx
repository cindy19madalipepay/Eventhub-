import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Public traffic-cop page — the QR code on the poster points here.
// It does NOT do any check-in itself (that already happens inside
// MyEvents.jsx via "Register Attendance"). Its only job is:
//   - not logged in on this device  -> send to Login, remember to come back
//   - already logged in             -> go straight to that event in My Events
const CheckIn = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const destination = `/student/my-events?event=${eventId}`;
    const token = localStorage.getItem('eventhub_token');

    if (!token) {
      navigate(`/login?redirect=${encodeURIComponent(destination)}`, { replace: true });
    } else {
      navigate(destination, { replace: true });
    }
  }, [eventId, navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f4f7fb' }}>
      <p style={{ color: '#475569', fontSize: '16px' }}>Redirecting…</p>
    </div>
  );
};

export default CheckIn;