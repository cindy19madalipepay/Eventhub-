import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './AttendanceReport.css';

// api.defaults.baseURL is 'http://localhost:5000/api' — strip the /api to
// get the root the old local /uploads folder was served from. Attendance
// photos are now full Cloudinary URLs (https://...) since the Cloudinary
// migration; this only matters as a fallback for records saved before that.
const UPLOADS_BASE = api.defaults.baseURL.replace(/\/api\/?$/, '');

const resolvePhotoSrc = (photo) => {
  if (!photo) return null;
  return photo.startsWith('http')
    ? photo
    : `${UPLOADS_BASE}/uploads/attendance/${photo}`;
};

const DEPARTMENTS = [
  { id: 'BSIT', name: 'BSIT', icon: '🏛️' },
  { id: 'BSBA', name: 'BSBA', icon: '🏛️' },
  { id: 'BSED', name: 'BSED', icon: '🏛️' },
  { id: 'BEED', name: 'BEED', icon: '🏛️' },
];

const YEAR_LEVELS = [1, 2, 3, 4];
const BLOCKS = ['A', 'B', 'C', 'D', 'E'];

// Human-readable label for a role/position pair — used in both the table
// badge and the CSV exports.
const roleLabel = (role, position) => {
  if (role === 'student_leader') return position ? `Student Leader — ${position}` : 'Student Leader';
  if (role === 'alumni') return 'Alumni';
  if (role === 'stakeholder') return 'Stakeholder';
  return 'Student';
};

// ── CSV helpers ──────────────────────────────────────────────────
const escapeCSVCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

// Builds a CSV string from headers + row arrays and triggers a browser
// download. Quotes every field and escapes embedded quotes.
const downloadCSV = (filename, headers, rows) => {
  const csvContent = [
    headers.map(escapeCSVCell).join(','),
    ...rows.map((row) => row.map(escapeCSVCell).join(',')),
  ].join('\n');

  downloadCSVRaw(filename, csvContent);
};

// Triggers a browser download for an already-built CSV string — used for
// the structured, multi-section department export below.
const downloadCSVRaw = (filename, csvContent) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const AttendanceReport = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // Supports links like /dept/attendance?year=3 (from DeptDashboard's
  // "View Attendance →" buttons) — jumps to and highlights that year's
  // row once the year-blocks view is showing.
  const linkedYear = Number(searchParams.get('year')) || null;
  // Supports links like /admin/attendance?dept=BSIT (from AdminDashboard's
  // "View Attendance →" buttons) — jumps straight into that department's
  // year-blocks view instead of showing the department picker first.
  const linkedDeptCode = searchParams.get('dept');
  // Guards against setSearchParams({}) not being reflected in the very next
  // render: once the person manually goes back to "All Departments", we
  // remember which dept code they dismissed so the auto-select effect below
  // doesn't immediately re-fire on the stale ?dept= value and bounce them
  // right back in (which needed a second click to actually work).
  const dismissedDeptRef = useRef(null);
  // Department heads are locked to their own department: no picker, no
  // browsing other departments. Everything else in this component is
  // identical for both roles.
  const isDeptHead = user?.role === 'department_head';

  // Skip the "Select Department" picker screen entirely — not just once the
  // auto-select effect fires, but from the very first render — whenever we
  // already know where we're headed: a dept head's own department, or an
  // admin arriving via a "View Attendance →" link with ?dept= in the URL.
  // Without this, the picker grid flashes on screen for a moment before the
  // effect below jumps away from it, which reads as "it sent me to pick
  // instead of going straight there."
  const [view, setView] = useState((isDeptHead || linkedDeptCode) ? 'year-blocks' : 'departments');
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);

  const [departmentsData, setDepartmentsData] = useState([]);
  const [deptSummary, setDeptSummary] = useState([]);
  const [yearBlockStats, setYearBlockStats] = useState({});
  const [orgBreakdown, setOrgBreakdown] = useState([]);

  // Block-level report: one row per event (with totals) + the raw attendee list
  const [blockEvents, setBlockEvents] = useState([]);
  const [blockAttendance, setBlockAttendance] = useState([]);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null); // Cloudinary URL (or legacy local filename) currently shown in the modal, or null
  const [showAllSummary, setShowAllSummary] = useState(false); // collapses the event summary list when it's long

  // Admins see every department's overview (for the picker + student counts).
  // Department heads don't need this endpoint at all — they go straight to
  // their own department's summary below.
  useEffect(() => {
    if (!isDeptHead) {
      fetchDepartmentsOverview();
    }
  }, [isDeptHead]);

  // Department heads: auto-select their own department and jump straight to
  // the year/block view, using what's already on their user profile.
  useEffect(() => {
    if (isDeptHead && user?.department_id && !selectedDept) {
      const code = user.department_code || user.department_name || 'MY DEPT';
      const deptObj = {
        id: code,
        name: code,
        icon: '🏛️',
        department_id: user.department_id,
      };
      setSelectedDept(deptObj);
      fetchDepartmentSummary(deptObj.department_id);
      setView('year-blocks');
    }
  }, [isDeptHead, user, selectedDept]);

  // Once the year-blocks view is showing the requested year's data, scroll
  // it into view so the person doesn't have to hunt for it.
  useEffect(() => {
    if (view === 'year-blocks' && linkedYear && !loading) {
      const el = document.getElementById(`year-${linkedYear}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [view, linkedYear, loading]);

  // Admins arriving via a "View Attendance →" link with ?dept=BSIT: once the
  // departments overview has loaded, auto-select that department and skip
  // straight to its year-blocks view instead of showing the picker.
  useEffect(() => {
    if (
      !isDeptHead &&
      linkedDeptCode &&
      linkedDeptCode !== dismissedDeptRef.current &&
      !selectedDept &&
      departmentsData.length > 0
    ) {
      const dept = DEPARTMENTS.find((d) => d.id === linkedDeptCode);
      if (dept) {
        handleSelectDepartment(dept);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeptHead, linkedDeptCode, selectedDept, departmentsData]);

  const fetchDepartmentsOverview = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/departments-overview');
      setDepartmentsData(res.data.departments || []);
    } catch (err) {
      toast.error('Failed to load departments overview.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentSummary = async (deptId) => {
    setLoading(true);
    setShowAllSummary(false);
    try {
      const [summaryRes, statsRes, orgRes] = await Promise.all([
        api.get(`/attendance/department-summary/${deptId}`),
        api.get(`/attendance/year-block-stats/${deptId}`),
        api.get(`/attendance/org-breakdown/${deptId}`),
      ]);
      setDeptSummary(summaryRes.data.summary || []);
      setYearBlockStats(statsRes.data.stats || {});
      setOrgBreakdown(orgRes.data.organizations || []);
    } catch (err) {
      toast.error('Failed to load department data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockReport = async (departmentId, year, block) => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/block-report', {
        params: { department_id: departmentId, year_level: year, block },
      });
      setBlockEvents(res.data.events || []);
      setBlockAttendance(res.data.attendance || []);
    } catch (err) {
      toast.error('Failed to load attendance report.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDepartment = (dept) => {
    // departmentsData was already loaded via departments-overview; look up
    // the numeric department_id that matches this department's code, since
    // the report endpoints filter on the numeric ID.
    const matched = departmentsData.find(d => d.department_code === dept.id);
    const enrichedDept = { ...dept, department_id: matched?.department_id ?? null };
    setSelectedDept(enrichedDept);
    fetchDepartmentSummary(enrichedDept.department_id);
    setView('year-blocks');
  };

  const handleSelectYearBlock = (year, block) => {
    setSelectedYear(year);
    setSelectedBlock(block);
    fetchBlockReport(selectedDept.department_id, year, block);
    setView('report');
  };

  const handleBack = () => {
    if (view === 'report') {
      setView('year-blocks');
      setSelectedYear(null);
      setSelectedBlock(null);
      setBlockEvents([]);
      setBlockAttendance([]);
    } else if (view === 'year-blocks' && !isDeptHead) {
      // Department heads have nowhere to go "back" to — they only have
      // the one department, so this step is skipped entirely for them.
      dismissedDeptRef.current = linkedDeptCode;
      setView('departments');
      setSelectedDept(null);
      setDeptSummary([]);
      setYearBlockStats({});
      setSearchParams({});
    }
  };

  // ── Exports ──────────────────────────────────────────────────

  // "Export All {dept} Attendance" — everything for the whole department,
  // across every year/block/event.
  const handleExportDepartment = async () => {
    if (!selectedDept?.department_id) {
      toast.error('Department ID not found.');
      return;
    }
    setExporting(true);
    try {
      const res = await api.get('/attendance/report', {
        params: { department_id: selectedDept.department_id },
      });
      const records = res.data.report || [];

      if (records.length === 0) {
        toast.error('No attendance records to export yet.');
        return;
      }

      // Build a structured, multi-section CSV: one header block per event,
      // and inside each event a separate mini-table per Year/Block group —
      // so opening the file shows clean, clearly separated sections instead
      // of one long mixed list.
      const byEvent = {};
      records.forEach((r) => {
        byEvent[r.event_name] ??= {};
        const blockKey = r.year_level && r.block ? `${r.year_level}-${r.block}` : 'Unassigned';
        byEvent[r.event_name][blockKey] ??= [];
        byEvent[r.event_name][blockKey].push(r);
      });

      const lines = [];
      Object.keys(byEvent).sort().forEach((eventName) => {
        lines.push([`EVENT: ${eventName}`].map(escapeCSVCell).join(','));
        lines.push('');

        Object.keys(byEvent[eventName]).sort().forEach((blockKey) => {
          const blockLabel = blockKey === 'Unassigned' ? 'Unassigned Year/Block' : `Year ${blockKey.split('-')[0]} — Block ${blockKey.split('-')[1]}`;
          lines.push([blockLabel].map(escapeCSVCell).join(','));
          lines.push(['#', 'Student Name', 'Role', 'Time In', 'Time Out', 'Date'].map(escapeCSVCell).join(','));

          const sorted = [...byEvent[eventName][blockKey]].sort((a, b) =>
            `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
          );
          sorted.forEach((r, i) => {
            lines.push([
              i + 1,
              `${r.first_name} ${r.last_name}`,
              roleLabel(r.role, r.position),
              formatTimeOnly(r.checked_in_at),
              formatTimeOnly(r.checkout_at),
              formatDateOnly(r.checked_in_at),
            ].map(escapeCSVCell).join(','));
          });
          lines.push('');
        });
        lines.push('');
      });

      downloadCSVRaw(`${selectedDept.name}_Attendance.csv`, lines.join('\n'));
      toast.success('CSV exported!');
    } catch (err) {
      toast.error('Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  };

  // "Export to CSV" on the block-level screen — just this year/block,
  // reusing data already loaded (no extra request needed).
  const handleExportBlock = () => {
    if (blockAttendance.length === 0) {
      toast.error('No attendance records to export.');
      return;
    }

    const eventNameById = {};
    blockEvents.forEach((ev) => { eventNameById[ev.event_id] = ev.event_name; });

    // Group by event so each event's attendees stay together in the sheet.
    const sortedAttendance = [...blockAttendance].sort((a, b) => {
      const nameA = eventNameById[a.event_id] || '';
      const nameB = eventNameById[b.event_id] || '';
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });

    const rows = sortedAttendance.map((a, i) => [
      i + 1,
      `${a.first_name} ${a.last_name}`,
      eventNameById[a.event_id] || '—',
      `${a.year_level}-${a.block}`,
      roleLabel(a.role, a.position),
      formatTimeOnly(a.scanned_at),
      formatTimeOnly(a.checkout_at),
      formatDateOnly(a.scanned_at),
    ]);

    downloadCSV(
      `${selectedDept?.name}_${selectedYear}Year_Block${selectedBlock}.csv`,
      ['#', 'Student Name', 'Event', 'Year/Block', 'Role', 'Time In', 'Time Out', 'Date'],
      rows
    );
    toast.success('CSV exported!');
  };

  // "Export to CSV" per event card on the block-level screen — just that
  // one event's attendees.
  const handleExportEvent = (ev) => {
    const attendees = blockAttendance.filter((a) => a.event_id === ev.event_id);

    if (attendees.length === 0) {
      toast.error('No attendees to export for this event.');
      return;
    }

    const sorted = [...attendees].sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );

    const rows = sorted.map((a, i) => [
      i + 1,
      `${a.first_name} ${a.last_name}`,
      `${a.year_level}-${a.block}`,
      roleLabel(a.role, a.position),
      formatTimeOnly(a.scanned_at),
      formatTimeOnly(a.checkout_at),
      formatDateOnly(a.scanned_at),
    ]);

    downloadCSV(
      `${ev.event_name}_${selectedDept?.name}_${selectedYear}Year_Block${selectedBlock}.csv`,
      ['#', 'Student Name', 'Year/Block', 'Role', 'Time In', 'Time Out', 'Date'],
      rows
    );
    toast.success('CSV exported!');
  };

  // Match on department_code, since dept.id (BSIT / BSBA / ...) is a code,
  // not the numeric department_id primary key.
  const getDeptStats = (deptCode) => {
    const dept = departmentsData.find(d => d.department_code === deptCode);
    if (!dept) return '0 students';
    const base = `${dept.student_count || 0} student${dept.student_count !== 1 ? 's' : ''}`;
    if (dept.student_leader_count > 0) {
      return `${base} · ${dept.student_leader_count} leader${dept.student_leader_count !== 1 ? 's' : ''}`;
    }
    return base;
  };

  const getEventProgress = (attended, total) => {
    if (!total || total === 0) return 0;
    return Math.min((attended / total) * 100, 100);
  };

  const getBlockStats = (year, block) => {
    const key = `${year}-${block}`;
    const data = yearBlockStats[key] || { attended: 0, total: 0 };
    const pct = data.total > 0 ? ((data.attended / data.total) * 100) : 0;
    return {
      attended: data.attended,
      total: data.total,
      percentage: parseFloat(pct.toFixed(1)),
      display: `${data.attended}/${data.total} attended`
    };
  };

  // Newest event first. Tries a few common date field names since the
  // department-summary endpoint's exact field wasn't confirmed — if your
  // backend uses a different name than date_start/event_date/created_at,
  // swap it in here.
  const getSortedSummary = () => {
    return [...deptSummary].sort((a, b) => {
      const dateA = new Date(a.date_start || a.event_date || a.created_at || 0);
      const dateB = new Date(b.date_start || b.event_date || b.created_at || 0);
      return dateB - dateA;
    });
  };

  const renderBreadcrumb = () => {
    if (view === 'departments') return null;

    return (
      <div className="breadcrumb">
        {!isDeptHead && (
          <button className="breadcrumb-link" onClick={() => { dismissedDeptRef.current = linkedDeptCode; setView('departments'); setSelectedDept(null); setSearchParams({}); }}>
            ← All Departments
          </button>
        )}
        {selectedDept && (
          <>
            {!isDeptHead && <span className="breadcrumb-separator">/</span>}
            {view === 'year-blocks' ? (
              <span className="breadcrumb-current">{selectedDept.name}</span>
            ) : (
              <button className="breadcrumb-link" onClick={handleBack}>
                {selectedDept.name}
              </button>
            )}
          </>
        )}
        {view === 'report' && selectedYear && (
          <>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{selectedYear}{getOrdinal(selectedYear)} Year — Block {selectedBlock}</span>
          </>
        )}
      </div>
    );
  };

  const renderDepartmentsView = () => (
    <div className="dashboard-container">
      <div className="page-header">
        <h2>Select Department</h2>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          background: 'linear-gradient(135deg, rgba(114, 201, 45, 0.08), rgba(50, 12, 91, 0.06))',
          border: '1px solid rgba(50, 12, 91, 0.1)',
          borderRadius: 14,
          padding: '16px 20px',
          margin: '0 0 24px',
        }}
      >
        <p style={{ margin: 0, color: '#4a4a5a', fontSize: 14, lineHeight: 1.6 }}>
          <strong style={{ color: '#1B0833' }}>Select a department</strong> to view its attendance
          records for each event — broken down by year level and block.
        </p>
      </div>
      
      <div className="departments-grid">
        {DEPARTMENTS.map((dept) => (
          <div 
            key={dept.id} 
            className="dept-card"
            onClick={() => handleSelectDepartment(dept)}
          >
            <div className="dept-icon">{dept.icon}</div>
            <h3 className="dept-name">{dept.name}</h3>
            <p className="dept-count">{getDeptStats(dept.id)}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderYearBlocksView = () => {
    const sortedSummary = getSortedSummary();

    return (
    <div className="dashboard-container">
      {renderBreadcrumb()}
      
      <div className="summary-section">
        <div className="export-btn-wrapper">
          <button className="export-btn" onClick={handleExportDepartment} disabled={exporting}>
            {exporting ? '⏳ Exporting...' : `📥 Export All ${selectedDept?.name} Attendance (CSV)`}
          </button>
        </div>

        <div className="summary-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <h3 className="summary-title" style={{ margin: 0 }}>{selectedDept?.name} Department Attendance Summary</h3>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>
              Number of Attendees
            </span>
          </div>
          <div className="summary-list">
            {sortedSummary.length === 0 ? (
              <p className="empty-text">No events found for this department.</p>
            ) : (
              (showAllSummary ? sortedSummary : sortedSummary.slice(0, 5)).map((event, idx) => {
                const progress = getEventProgress(event.attended_count, event.total_students);
                const isComplete = progress === 100;
                
                return (
                  <div key={idx} className="summary-row">
                    <span className="summary-label">{event.event_name}</span>
                    <div className="summary-bar-wrapper">
                      <div 
                        className={`summary-bar ${isComplete ? 'complete' : ''}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="summary-value">
                      {event.attended_count}/{event.total_students} ({progress.toFixed(1)}%)
                    </span>
                  </div>
                );
              })
            )}
          </div>
          {sortedSummary.length > 5 && (
            <button
              type="button"
              className="breadcrumb-link"
              style={{ marginTop: 12 }}
              onClick={() => setShowAllSummary((prev) => !prev)}
            >
              {showAllSummary ? '▲ Show less' : `▼ Show more (${sortedSummary.length - 5} more)`}
            </button>
          )}
        </div>

        {orgBreakdown.length > 0 && (
          <div className="summary-card" style={{ marginTop: 20 }}>
            <h3 className="summary-title">{selectedDept?.name} Student Leaders by Organization</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {orgBreakdown.map((org) => (
                <div
                  key={org.organization}
                  style={{
                    background: '#f8f9fb', border: '1px solid #eee', borderRadius: 12,
                    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1B0833' }}>{org.organization}</span>
                  <span
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)', color: '#b45309',
                      padding: '2px 9px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                    }}
                  >
                    {org.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <h3 className="section-title">{selectedDept?.name} — Select Year Level & Block</h3>
      
      <div className="years-grid">
        {YEAR_LEVELS.map((year) => (
          <div
            key={year}
            id={`year-${year}`}
            className="year-card"
            style={linkedYear === year ? { boxShadow: '0 0 0 3px #72C92D', borderRadius: 14 } : undefined}
          >
            <h4 className="year-title">{year}{getOrdinal(year)} Year</h4>
            <div className="blocks-row">
              {BLOCKS.map((block) => {
                const stats = getBlockStats(year, block);
                const isActive = stats.percentage > 0;
                
                return (
                  <div 
                    key={block} 
                    className={`block-card ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectYearBlock(year, block)}
                  >
                    <h5 className="block-name">Block {block}</h5>
                    <p className="block-attended">{stats.display}</p>
                    <div className="block-bar-wrapper">
                      <div 
                        className={`block-bar ${isActive ? 'active' : ''}`}
                        style={{ width: `${Math.min(stats.percentage, 100)}%` }}
                      />
                    </div>
                    <span className={`block-percentage ${isActive ? 'active' : ''}`}>
                      {stats.percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
    );
  };

  // ── Block-level report: one card per event, matching the reference design ──
  const renderReportView = () => (
    <div className="dashboard-container">
      {renderBreadcrumb()}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>
          {selectedDept?.name} {selectedYear}{getOrdinal(selectedYear)} Year Block {selectedBlock}
        </h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="export-btn" onClick={handleExportBlock}>
            📥 Export to CSV
          </button>
          <button className="btn-back" onClick={handleBack}>
            Change Selection
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card"><p>Loading attendance records...</p></div>
      ) : blockEvents.length === 0 ? (
        <div className="card">
          <p className="empty-text">No events found for this selection.</p>
        </div>
      ) : (
        blockEvents.map((ev) => {
          const attendees = blockAttendance.filter((a) => a.event_id === ev.event_id);
          const total = ev.total_students || 0;
          const attendedCount = attendees.length;
          const pct = total > 0 ? parseFloat(((attendedCount / total) * 100).toFixed(1)) : 0;

          return (
            <div key={ev.event_id} className="card" style={{ marginBottom: 20, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', color: '#1B0833' }}>{ev.event_name}</h3>
                  <p style={{ margin: 0, color: '#888', fontSize: 13 }}>
                    {formatDate(ev.date_start)}
                    {ev.time_start ? ` | ${ev.time_start}` : ''}
                    {ev.venue ? ` | ${ev.venue}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#1B0833' }}>
                    {attendedCount}<span style={{ fontSize: 14, fontWeight: 500, color: '#999' }}>/{total}</span>
                  </span>
                  <span style={{
                    background: '#e8f9e0', color: '#3a8f1f',
                    padding: '4px 12px', borderRadius: 999,
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {pct}%
                  </span>
                  <button
                    type="button"
                    className="export-btn"
                    onClick={() => handleExportEvent(ev)}
                    style={{ padding: '6px 14px', fontSize: 12.5 }}
                  >
                    📥 Export
                  </button>
                </div>
              </div>

              <div style={{ height: 6, background: '#eee', borderRadius: 999, margin: '16px 0', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.min(pct, 100)}%`,
                  background: pct === 100 ? '#4caf50' : 'linear-gradient(90deg, #72C92D, #A8E63E)',
                  borderRadius: 999, transition: 'width 0.3s ease',
                }} />
              </div>

              {attendees.length === 0 ? (
                <p className="empty-text">No attendees recorded yet.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="attendance-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student Name</th>
                        <th>Year/Block</th>
                        <th>Role</th>
                        <th>Time In</th>
                        <th>Time Out</th>
                        <th>Check-in Photo</th>
                        <th>Check-out Photo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.map((a, idx) => {
                        const isLeader = a.role === 'student_leader';
                        return (
                          <tr key={a.attendance_id}>
                            <td>{idx + 1}</td>
                            <td>{a.first_name} {a.last_name}</td>
                            <td>{a.year_level}-{a.block}</td>
                            <td>
                              {isLeader ? (
                                <span
                                  style={{
                                    background: 'rgba(245, 158, 11, 0.15)', color: '#b45309',
                                    padding: '3px 10px', borderRadius: 999,
                                    fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                                  }}
                                  title={a.position || 'Student Leader'}
                                >
                                  🎖️ Student Leader{a.position ? ` — ${a.position}` : ''}
                                </span>
                              ) : (
                                <span style={{ color: '#999', fontSize: 12.5 }}>Student</span>
                              )}
                            </td>
                            <td>{formatDate(a.scanned_at)}</td>
                            <td>{formatDate(a.checkout_at)}</td>
                            <td>
                              {a.checkin_photo ? (
                                <button
                                  type="button"
                                  onClick={() => setViewingPhoto(a.checkin_photo)}
                                  className="method-badge photo-badge"
                                  style={{ border: 'none', cursor: 'pointer' }}
                                >
                                  View Photo
                                </button>
                              ) : (
                                <span className="method-badge">{a.method === 'qr_scan' ? 'QR Scan' : (a.method || '—')}</span>
                              )}
                            </td>
                            <td>
                              {a.checkout_photo ? (
                                <button
                                  type="button"
                                  onClick={() => setViewingPhoto(a.checkout_photo)}
                                  className="method-badge photo-badge"
                                  style={{ border: 'none', cursor: 'pointer' }}
                                >
                                  View Photo
                                </button>
                              ) : (
                                <span className="method-badge method-badge-muted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // Date-only, no time — used in CSV exports where Date is its own column.
  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      dateStyle: 'medium',
    });
  };

  // Time-only, no date — used for the Time In / Time Out CSV columns.
  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-PH', {
      timeStyle: 'short',
    });
  };

  const getOrdinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  return (
    <div className="attendance-dashboard">
      {view === 'departments' && renderDepartmentsView()}
      {view === 'year-blocks' && renderYearBlocksView()}
      {view === 'report' && renderReportView()}

      {viewingPhoto && (
        <div
          onClick={() => setViewingPhoto(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative', background: '#fff', borderRadius: 16,
              padding: 16, maxWidth: '90vw', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => setViewingPhoto(null)}
              aria-label="Close"
              style={{
                position: 'absolute', top: -14, right: -14,
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', background: '#1B0833', color: '#fff',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              ✕
            </button>
            <img
              src={resolvePhotoSrc(viewingPhoto)}
              alt="Attendance proof"
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 10, display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;