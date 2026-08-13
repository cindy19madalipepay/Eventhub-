import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Get saved user information
  const savedUser =
    JSON.parse(localStorage.getItem('user')) ||
    JSON.parse(localStorage.getItem('authUser')) ||
    {};

  const [firstName, setFirstName] = useState(
    savedUser.first_name || savedUser.firstName || 'User'
  );

  const [lastName, setLastName] = useState(
    savedUser.last_name || savedUser.lastName || ''
  );

  const role = savedUser.role || 'student';

  const fullName = `${firstName} ${lastName}`.trim();

  const initials =
    `${firstName?.charAt(0) || 'U'}${lastName?.charAt(0) || ''}`.toUpperCase();

  const getBasePath = () => {
    if (role === 'admin') return '/admin';
    if (role === 'department_head') return '/dept';
    return '/student';
  };

  const basePath = getBasePath();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('authUser');

    navigate('/login');
  };

  const handleSaveProfile = () => {
    const updatedUser = {
      ...savedUser,
      first_name: firstName,
      last_name: lastName,
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));

    setEditProfileOpen(false);

    window.location.reload();
  };

  return (
    <>
      {/* SIDEBAR */}
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>

        {/* =========================
            HEADER
        ========================== */}
        <div className="sidebar-header">

          <div className="eventhub-brand">
            <div className="eventhub-logo">
              EH
            </div>

            {!collapsed && (
              <span className="eventhub-title">
                EventHub
              </span>
            )}
          </div>

          {/* HAMBURGER */}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

        </div>

        {/* =========================
            PROFILE
        ========================== */}
        <div className="sidebar-profile">

          <button
            type="button"
            className="profile-button"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className="profile-avatar">
              {initials}
            </div>

            {!collapsed && (
              <div className="profile-info">
                <strong>{fullName}</strong>

                <span>
                  {role === 'department_head'
                    ? 'Department Head'
                    : role === 'admin'
                    ? 'Admin'
                    : 'Student'}
                </span>
              </div>
            )}

            {!collapsed && (
              <span className="profile-arrow">
                {profileOpen ? '⌃' : '⌄'}
              </span>
            )}
          </button>

          {/* PROFILE DROPDOWN */}
          {!collapsed && profileOpen && (
            <div className="profile-dropdown">

              <button
                type="button"
                onClick={() => setEditProfileOpen(true)}
              >
                <span className="dropdown-icon">
                  <EditIcon />
                </span>
                Edit Profile
              </button>

              <button
                type="button"
                onClick={() => setProfileOpen(false)}
              >
                <span className="dropdown-icon">
                  <UserIcon />
                </span>
                My Account
              </button>

            </div>
          )}

        </div>

        {/* =========================
            NAVIGATION
        ========================== */}
        <nav className="sidebar-nav">

          {/* ADMIN */}
          {role === 'admin' && (
            <>
              <SidebarLink
                to={`${basePath}/dashboard`}
                label="Overview"
                collapsed={collapsed}
                icon={<DashboardIcon />}
              />

              <SidebarLink
                to={`${basePath}/create-event`}
                label="Create Event"
                collapsed={collapsed}
                icon={<CalendarAddIcon />}
              />

              <SidebarLink
                to={`${basePath}/events`}
                label="Events"
                collapsed={collapsed}
                icon={<CalendarIcon />}
              />

              <SidebarLink
                to={`${basePath}/users`}
                label="Users"
                collapsed={collapsed}
                icon={<UsersIcon />}
              />

              <SidebarLink
                to={`${basePath}/receipts`}
                label="Receipts"
                collapsed={collapsed}
                icon={<ReceiptIcon />}
              />

              <SidebarLink
                to={`${basePath}/attendance`}
                label="Attendance"
                collapsed={collapsed}
                icon={<AttendanceIcon />}
              />

              <SidebarLink
                to={`${basePath}/evaluation`}
                label="Evaluation Results"
                collapsed={collapsed}
                icon={<ChartIcon />}
              />
            </>
          )}

          {/* DEPARTMENT HEAD */}
          {role === 'department_head' && (
            <>
              <SidebarLink
                to={`${basePath}/dashboard`}
                label="Overview"
                collapsed={collapsed}
                icon={<DashboardIcon />}
              />

              <SidebarLink
                to={`${basePath}/attendance`}
                label="Attendance"
                collapsed={collapsed}
                icon={<AttendanceIcon />}
              />

              <SidebarLink
                to={`${basePath}/reports`}
                label="Reports"
                collapsed={collapsed}
                icon={<ChartIcon />}
              />

              <SidebarLink
                to={`${basePath}/evaluation`}
                label="Evaluation Results"
                collapsed={collapsed}
                icon={<ChartIcon />}
              />
            </>
          )}

          {/* STUDENT */}
          {role !== 'admin' && role !== 'department_head' && (
            <>
              <SidebarLink
                to={`${basePath}/notifications`}
                label="Notifications"
                collapsed={collapsed}
                icon={<BellIcon />}
                badge="1"
              />

              <SidebarLink
                to={`${basePath}/my-events`}
                label="My Events"
                collapsed={collapsed}
                icon={<CalendarIcon />}
              />

              <SidebarLink
                to={`${basePath}/history`}
                label="History"
                collapsed={collapsed}
                icon={<HistoryIcon />}
              />
            </>
          )}

        </nav>

        {/* =========================
            LOGOUT
        ========================== */}
        <div className="sidebar-bottom">

          <button
            type="button"
            className={`logout-button ${collapsed ? 'icon-only' : ''}`}
            onClick={handleLogout}
          >
            <LogoutIcon />

            {!collapsed && (
              <span>Logout</span>
            )}
          </button>

        </div>

      </aside>

      {/* =========================
          EDIT PROFILE MODAL
      ========================== */}
      {editProfileOpen && (
        <div
          className="profile-modal-overlay"
          onClick={() => setEditProfileOpen(false)}
        >
          <div
            className="profile-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="profile-modal-header">
              <div>
                <h2>Edit Profile</h2>
                <p>Update your account information.</p>
              </div>

              <button
                type="button"
                className="profile-modal-close"
                onClick={() => setEditProfileOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="profile-modal-avatar">
              {initials}
            </div>

            <div className="profile-form">

              <label>
                First Name
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>

              <label>
                Last Name
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={savedUser.email || ''}
                  disabled
                />
              </label>

              <label>
                Role
                <input
                  type="text"
                  value={
                    role === 'admin'
                      ? 'Admin'
                      : role === 'department_head'
                      ? 'Department Head'
                      : 'Student'
                  }
                  disabled
                />
              </label>

            </div>

            <div className="profile-modal-actions">

              <button
                type="button"
                className="cancel-profile-btn"
                onClick={() => setEditProfileOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="save-profile-btn"
                onClick={handleSaveProfile}
              >
                Save Changes
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  );
};


/* =====================================================
   SIDEBAR LINK
===================================================== */

const SidebarLink = ({
  to,
  label,
  icon,
  collapsed,
  badge,
}) => {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : ''}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'active' : ''} ${
          collapsed ? 'collapsed-link' : ''
        }`
      }
    >

      <span className="sidebar-icon">
        {icon}
      </span>

      {!collapsed && (
        <span className="sidebar-label">
          {label}
        </span>
      )}

      {!collapsed && badge && (
        <span className="notification-badge">
          {badge}
        </span>
      )}

    </NavLink>
  );
};


/* =====================================================
   ICONS
===================================================== */

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="12" y1="13" x2="12" y2="18" />
    <line x1="9.5" y1="15.5" x2="14.5" y2="15.5" />
  </svg>
);

const CalendarAddIcon = () => (
  <svg viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="12" y1="12" x2="12" y2="18" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M10 21h4" />
  </svg>
);

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <polyline points="3 4 3 9 8 9" />
    <line x1="12" y1="7" x2="12" y2="12" />
    <line x1="12" y1="12" x2="16" y2="14" />
  </svg>
);

const ReceiptIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3z" />
    <line x1="8" y1="8" x2="16" y2="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="13" y2="16" />
  </svg>
);

const ChartIcon = () => (
  <svg viewBox="0 0 24 24">
    <polyline points="3 20 3 4" />
    <polyline points="3 20 21 20" />
    <polyline points="6 16 10 12 13 14 19 7" />
  </svg>
);

const AttendanceIcon = () => (
  <svg viewBox="0 0 24 24">
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <line x1="8" y1="8" x2="16" y2="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <polyline points="8 16 10 18 15 14" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6" />
    <path d="M15 14c3 0 5 2 5 5" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M4 20h4L19 9l-4-4L4 16v4z" />
    <line x1="13" y1="6" x2="18" y2="11" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
    <polyline points="14 8 19 12 14 16" />
    <line x1="9" y1="12" x2="19" y2="12" />
  </svg>
);


export default Sidebar;