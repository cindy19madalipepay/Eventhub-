import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

const DeptDashboard = () => {
  const { user }        = useAuth();
  const [events, setEvents]     = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, statsRes] = await Promise.all([
          api.get('/events'),
          api.get('/users/department-stats'),
        ]);
        setEvents(eventsRes.data.events || []);
        setStats(statsRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalStudents = stats?.total_students || 0;
  const totalEvents    = events.length;
  const publishedCount = events.filter(e => e.status === 'published').length;
  const completedCount = events.filter(e => e.status === 'completed').length;

  const yearLevels = [1, 2, 3, 4];
  const yearLabels = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

  return (
    <>
      <div className="page-header">
        <h2>{user?.department_name || 'Department'} Head Dashboard</h2>
        <p>Overview of your department's events and students.</p>
      </div>

      {/* Stats — same narrower, fixed-width card grid as AdminDashboard,
          instead of stretch-to-fill */}
      <div
        className="stats-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 180px))',
          gap: 14,
        }}
      >
        <div className="stat-card">
          <span className="stat-label">Total Events</span>
          <span className="stat-value">{totalEvents}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Students</span>
          <span className="stat-value">{totalStudents}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Published</span>
          <span className="stat-value">{publishedCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value">{completedCount}</span>
        </div>
      </div>

      {/* Year Level Overview */}
      <h3 style={{ color: '#1f3329', margin: '28px 0 16px', fontSize: 18, fontWeight: 800 }}>
        Year Level Overview
      </h3>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 28 }}>
          {yearLevels.map((yr) => {
            const yearData = stats?.by_year?.[yr] || { total: 0, blocks: {} };
            const blockEntries = Object.entries(yearData.blocks || {});

            return (
              <div key={yr} className="card" style={{ margin: 0 }}>
                <h4 style={{ color: '#1f3329', fontSize: 16, fontWeight: 800, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
                  {yearLabels[yr]}
                </h4>

                <div style={{ textAlign: 'center', background: '#f8f9fb', borderRadius: 10, padding: '14px 0', marginBottom: 12 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#2f4a3d' }}>{yearData.total}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    Total Students
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  {blockEntries.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#aaa' }}>No students yet</div>
                  ) : (
                    blockEntries.map(([block, count]) => (
                      <div key={block} style={{ flex: 1, minWidth: 70, textAlign: 'center', background: '#f8f9fb', borderRadius: 8, padding: '8px 0' }}>
                        <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>Block {block}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#1f3329' }}>{count}</div>
                      </div>
                    ))
                  )}
                </div>

                <Link
                  to={`/dept/attendance?year=${yr}`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '10px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #6a8f78, #a8c9b5)',
                    color: '#1f3329',
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: 'none',
                  }}
                >
                  View Attendance →
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* My Events */}
      <div className="card">
        <h3 style={{ marginBottom: 16, color: '#1f3329' }}>My Events</h3>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Event Name</th><th>Date & Time</th><th>Venue</th><th>Payment</th><th>Status</th></tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#aaa', padding: 24 }}>No events yet.</td></tr>
                ) : (
                  events.map((e) => (
                    <tr key={e.event_id}>
                      <td><strong>{e.event_name}</strong></td>
                      <td>
                        {new Date(e.date_start).toLocaleDateString()} · {e.time_start?.slice(0, 5)}
                      </td>
                      <td>{e.venue || '—'}</td>
                      <td>{e.requires_payment ? `₱${Number(e.payment_amount).toFixed(2)}` : 'Free'}</td>
                      <td>
                        <span className={`badge ${
                          e.status === 'published' ? 'badge-green' :
                          e.status === 'completed' ? 'badge-blue'  :
                          e.status === 'cancelled' ? 'badge-red'   : 'badge-yellow'
                        }`}>{e.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default DeptDashboard;