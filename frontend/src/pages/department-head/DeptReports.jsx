import { useState, useEffect, Fragment } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const DeptReports = () => {
  const [rows, setRows]           = useState([]);
  const [deptStats, setDeptStats] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId] = useState(null);

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

              // Turnout is now based on attendance against the department's
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

  const toggleRow = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

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
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <th>Event</th><th>Date</th><th>Registered</th><th>Attended</th><th>Missed</th><th>Turnout</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isExpanded = expandedId === r.event_id;
                  return (
                    <Fragment key={r.event_id}>
                      <tr
                        onClick={() => toggleRow(r.event_id)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view more details"
                      >
                        <td style={{ textAlign: 'center', color: '#888', userSelect: 'none' }}>
                          {isExpanded ? '▾' : '▸'}
                        </td>
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

                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ background: '#f8faf9', padding: '16px 20px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: deptStats?.by_year ? 16 : 0 }}>
                              <div>
                                <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{r.status || '—'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Registered</div>
                                <div style={{ fontWeight: 600 }}>{r.registered} of {totalStudents} department students</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Attended</div>
                                <div style={{ fontWeight: 600 }}>{r.attended} of {totalStudents} department students</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Missed</div>
                                <div style={{ fontWeight: 600 }}>{r.missed} of {totalStudents} department students</div>
                              </div>
                            </div>

                            {deptStats?.by_year && Object.keys(deptStats.by_year).length > 0 && (
                              <div>
                                <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 6 }}>
                                  Department headcount by year level
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {Object.entries(deptStats.by_year).map(([year, data]) => (
                                    <span
                                      key={year}
                                      style={{
                                        background: '#e8f0ea',
                                        color: '#1f3329',
                                        padding: '4px 10px',
                                        borderRadius: 999,
                                        fontSize: 13,
                                        fontWeight: 600,
                                      }}
                                    >
                                      Year {year}: {data.total}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default DeptReports;