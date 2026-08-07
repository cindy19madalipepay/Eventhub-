import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './AdminDashboard.css';
import PosterModal from '../../components/PosterModal';

const AdminDashboard = () => {
  const { user } = useAuth();
  const isDeptHead = user?.role === 'department_head';

  const [stats, setStats] = useState({
    events: 0,
    total_students: 0,
    attendance_records: 0,
    my_events: 0,
    pending_receipts: 0,
  });
  const [events, setEvents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posterEvent, setPosterEvent] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const evRes = await api.get('/events');
        const evList = evRes.data.events || [];
        setEvents(evList);

        // For a dept head, ask the attendance report for just their own
        // department's records (getAttendanceReport already supports this
        // filter server-side). departments-overview and payments/pending
        // are auto-scoped on the backend when the requester's role is
        // department_head, so no extra params needed for those.
        const attendanceParams = isDeptHead && user?.department_id
          ? { params: { department_id: user.department_id } }
          : {};

        const [usersRes, attendanceRes, paymentsRes, deptRes] = await Promise.allSettled([
          api.get('/users'),
          api.get('/attendance/report', attendanceParams),
          api.get('/payments/pending'),
          api.get('/attendance/departments-overview'),
        ]);

        const usersData = usersRes.status === 'fulfilled' ? (usersRes.value.data.users || usersRes.value.data || []) : [];
        // Safety-net client-side filter too, in case /users isn't
        // department-scoped on the backend yet.
        const studentsCount = usersData.filter(u =>
          u.role === 'student' && (!isDeptHead || u.department_id === user?.department_id)
        ).length;

        // getAttendanceReport returns { success, count, report } — read `count`
        // directly (falling back to report.length) instead of a `records` key
        // that doesn't exist on the response.
        const attendanceCount = attendanceRes.status === 'fulfilled'
          ? (attendanceRes.value.data.count ?? (attendanceRes.value.data.report || []).length)
          : 0;

        const paymentsData = paymentsRes.status === 'fulfilled' ? (paymentsRes.value.data.payments || paymentsRes.value.data || []) : [];

        const deptData = deptRes.status === 'fulfilled' ? (deptRes.value.data.departments || []) : [];
        setDepartments(deptData);

        setStats({
          events: evList.length,
          total_students: studentsCount,
          attendance_records: attendanceCount,
          my_events: evList.length,
          pending_receipts: paymentsData.length,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isDeptHead, user?.department_id]);

  const handleDelete = async (eventId) => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    try {
      await api.delete(`/events/${eventId}`);
      setEvents(prev => prev.filter(e => e.event_id !== eventId));
      setStats(prev => ({ ...prev, events: prev.events - 1, my_events: prev.my_events - 1 }));
      toast.success('Event deleted.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete event.');
    }
  };

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <>
      <div className="page-header">
        <h2>{isDeptHead ? `${user?.department_name || 'Department'} Head Dashboard` : 'Admin Dashboard'}</h2>
        <p>{isDeptHead ? "Overview of your department's events and students." : "Welcome back! Here's what's happening with your events."}</p>
      </div>

      {/* Inline grid override: narrower, fixed-width cards instead of the
          shared .stats-row's stretch-to-fill behavior — scoped to just this
          page so DeptDashboard/DeptReports (which reuse .stat-card) are
          unaffected. */}
      <div
        className="stats-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 130px))',
          gap: 12,
        }}
      >
        <div className="stat-card">
          <span className="stat-label">Total Events</span>
          <span className="stat-value">{stats.events}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Students</span>
          <span className="stat-value">{stats.total_students}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Attendance Records</span>
          <span className="stat-value">{stats.attendance_records}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">My Events</span>
          <span className="stat-value">{stats.my_events}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Receipts</span>
          <span className="stat-value">{stats.pending_receipts}</span>
        </div>
      </div>

      {/* Departments overview — for a dept head this list is already
          auto-scoped to just their own department by the backend, so it
          naturally renders as a single card instead of a full grid. */}
      <div className="card">
        <h3 style={{ marginBottom: 20, color: '#1B0833' }}>{isDeptHead ? 'My Department' : 'All Departments'}</h3>

        {loading ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Loading departments...</p>
        ) : departments.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No departments found.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {departments.map((dept) => {
              const total = dept.total_invited || 0;
              const attended = dept.attended_count || 0;
              const pct = total > 0 ? parseFloat(((attended / total) * 100).toFixed(1)) : 0;

              return (
                <div
                  key={dept.department_id}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: 14,
                    padding: 20,
                    background: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 style={{ margin: 0, color: '#1B0833', fontSize: 18, fontWeight: 800 }}>
                      {dept.department_code}
                    </h4>
                    <span
                      style={{
                        background: 'rgba(114, 201, 45, 0.15)', color: '#44630e',
                        padding: '4px 12px', borderRadius: 999,
                        fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                      }}
                    >
                      {dept.student_count} student{dept.student_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ height: 8, background: '#e9e9ee', borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
                    <div
                      style={{
                        height: '100%', width: `${Math.min(pct, 100)}%`,
                        background: 'linear-gradient(90deg, #72C92D, #A8E63E)', borderRadius: 999,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  <p style={{ textAlign: 'center', margin: '0 0 16px', color: '#555', fontSize: 13.5 }}>
                    {pct}% engagement ({attended}/{total})
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#888', fontSize: 13 }}>
                      {dept.unique_attendees || 0} unique attendee{dept.unique_attendees !== 1 ? 's' : ''}
                    </span>
                    <Link
                      to={isDeptHead ? '/dept/attendance' : `/admin/attendance?dept=${dept.department_code}`}
                      style={{ color: '#1B0833', fontWeight: 700, fontSize: 13.5, textDecoration: 'none' }}
                    >
                      View Attendance →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, color: '#1B0833' }}>{isDeptHead ? 'My Events' : 'Recent Events'}</h3>
        {loading ? <p>Loading...</p> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Date & Time</th>
                  <th>Venue</th>
                  <th>Departments</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>No events found</td>
                  </tr>
                )}
                {events.map(e => (
                  <tr key={e.event_id}>
                    <td><strong>{e.event_name}</strong></td>
                    <td>
                      {new Date(e.date_start).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                      {e.time_start && (
                        <span style={{ color: '#888', marginLeft: 8 }}>· {formatTime(e.time_start)}</span>
                      )}
                    </td>
                    <td>{e.venue || '—'}</td>
                    <td>{e.departments || 'ALL'}</td>
                    <td>
                      {e.requires_payment
                        ? <span className="badge badge-yellow">₱{e.payment_amount}</span>
                        : <span className="badge badge-green">Free</span>
                      }
                    </td>
                    <td>
                      <span className={`badge ${
                        e.status === 'published' ? 'badge-green' :
                        e.status === 'completed' ? 'badge-blue' :
                        e.status === 'cancelled' ? 'badge-red' : 'badge-yellow'
                      }`}>{e.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          style={{
                            background: 'linear-gradient(135deg, #72C92D, #A8E63E)',
                            color: '#1B0833',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          onClick={() => setPosterEvent(e)}
                        >
                           Poster
                        </button>
                        {!isDeptHead && (
                          <button
                            className="badge badge-red"
                            style={{ border: 'none', cursor: 'pointer', padding: '6px 14px' }}
                            onClick={() => handleDelete(e.event_id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {posterEvent && (
        <PosterModal
          event={posterEvent}
          onClose={() => setPosterEvent(null)}
        />
      )}
    </>
  );
};

export default AdminDashboard;