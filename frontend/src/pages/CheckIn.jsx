import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Public traffic-cop page — the QR code on the poster points here.
// Always sends the scanner to Login first (no auto-skip), remembering
// to bring them to that specific event in My Events once they log in.
// If they don't have an account, the Login page already has a
// "Create Account" link for them to register first.
const CheckIn = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const destination = `/student/my-events?event=${eventId}`;
    navigate(`/login?redirect=${encodeURIComponent(destination)}`, { replace: true });
  }, [eventId, navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f4f7fb' }}>
      <p style={{ color: '#475569', fontSize: '16px' }}>Redirecting to login…</p>
    </div>
  );
};

export default CheckIn;