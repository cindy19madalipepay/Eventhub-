import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const MY_EVENTS_ROUTE = '/student/my-events';

const CheckIn = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, token, loading } = useAuth();

  useEffect(() => {
    // AuthContext hasn't finished reading localStorage yet — wait for it,
    // otherwise we'd redirect to /login even for someone who IS logged in.
    if (loading) return;

    if (!user || !token) {
      // Not logged in on this device -> send to login, remember where to come back to
      navigate(`/login?redirect=/checkin/${eventId}`, { replace: true });
      return;
    }

    // Already logged in on this device -> record attendance, then go to My Events
    const markAttendance = async () => {
      try {
        await api.post(`/events/${eventId}/checkin`);
        toast.success('Checked in!');
      } catch (err) {
        // Don't block navigation on a failed check-in call — the user IS logged in,
        // just surface the error and still take them to My Events.
        toast.error(err.response?.data?.message || 'Check-in failed, but you are logged in.');
      } finally {
        navigate(MY_EVENTS_ROUTE, { replace: true });
      }
    };

    markAttendance();
  }, [loading, user, token, eventId, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p>Checking you in…</p>
    </div>
  );
};

export default CheckIn;