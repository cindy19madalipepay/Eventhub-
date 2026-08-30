import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const INITIAL_VISIBLE = 3;

const DeptReports = () => {
  const [rows, setRows]           = useState([]);
  const [deptStats, setDeptStats] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showAll, setShowAll]     = useState(false);

  useEffect(() => {
    const buildReport = async () => {
      try {
        const [eventsRes, statsRes] = await Promise.all([
          api.get('/events'),
          api.get('/users/department-stats'),
        ]);

        const events = eventsRes.data.events || [];
        const stats = statsRes.data;
        setDeptStats(stats);

        // Total number of students in this department (department-wide
        // headcount) — used as the denominator for every fraction below,
        // NOT the per-event registration count.
        const totalStudents = stats.total_students || 0;

        // For each event, pull ticket count + attendance count for this department.
        // Small N (a department's own events), so sequential-ish Promise.all is fine.
        const results = await Promise.all(
          events.map(async (ev) => {
            try {
              const [ticketsRes, attendanceRes] = await Promise.all([
                api.get(`/tickets/event/${ev.event_id}`),
                api.get(`/attendance/event/${ev.event_id}`),
              ]);

              const registered = ticketsRes.data.count || 0;
              const attended    = attendanceRes.data.count || 0;
              const missed      = Math.max(registered - attended, 0);

              // Turnout is based on attendance against the department's
              // total student headcount, not against event registrations.
              const rate = totalStudents > 0 ? Math.round((attended / totalStudents) * 100) : 0;

              return {
                event_id:   ev.event_id,
                event_name: ev.event_name,
                date_start: ev.date_start,
                status:     ev.status,
                registered,
                attended,
                missed,
                rate,
              };
            } catch {
              return {
                event_id: ev.event_id, event_name: ev.event_name, date_start: ev.date_start,
                status: ev.status, registered: 0, attended: 0, missed: 0, rate: 0,
              };
            }
          })
        );

        setRows(results);
      } catch (err) {
        console.error(err);
        toast.error('Failed to build report.');
      } finally {
        setLoading(false);
      }
    };

    buildReport();
  }, []);

  const totalStudents   = deptStats?.total_students || 0;
  const totalRegistered = rows.reduce((sum, r) => sum + r.registered, 0);
  const totalAttended   = rows.reduce((sum, r) => sum + r.attended, 0);
  const overallRate     = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

  const visibleRows = showAll ? rows : rows.slice(0, INITIAL_VISIBLE);
  const hasMore = rows.length > INITIAL_VISIBLE;

  return (
    <>
      <div className="page-header">
        <h2>Department Reports</h2>
        <p>Turnout summary for your department, event by event.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Total Registrations</span>
          <span className="stat-value">{totalRegistered}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Attended</span>
          <span className="stat-value">{totalAttended}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Overall Turnout</span>
          <span className="stat-value">{overallRate}%</span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, color: '#1f3329' }}>Per-Event Breakdown</h3>
        {loading ? (
          <p>Building report...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>No events yet.</p>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Event</th><th>Date</th><th>Registered</th><th>Attended</th><th>Missed</th><th>Turnout</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => (
                    <tr key={r.event_id}>
                      <td><strong>{r.event_name}</strong></td>
                      <td>{new Date(r.date_start).toLocaleDateString()}</td>
                      <td>{r.registered}/{totalStudents}</td>
                      <td>{r.attended}/{totalStudents}</td>
                      <td>{r.missed}/{totalStudents}</td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: r.rate >= 75 ? '#27ae60' : r.rate >= 40 ? '#f39c12' : '#e94560',
                        }}>
                          {r.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <button
                  onClick={() => setShowAll((prev) => !prev)}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 999,
                    border: '1px solid #d7ded9',
                    background: '#fff',
                    color: '#1f3329',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {showAll ? 'Show less ▴' : `Show all ${rows.length} events ▾`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default DeptReports;