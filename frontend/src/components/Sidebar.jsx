import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './Sidebar.css';

/* =========================================================
   ICONS
   Built-in SVG icons — no package required
========================================================= */

const Icons = {
  menu: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),

  overview: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),

  create: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 9h18M12 13v5M9.5 15.5h5" />
    </svg>
  ),

  departments: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6M8 10h1M15 10h1M8 13h1M15 13h1" />
    </svg>
  ),

  receipts: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  ),

  evaluation: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19V5M4 19h16" />
      <path d="m7 15 3-4 3 2 5-7" />
    </svg>
  ),

  dashboard: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  ),

  attendance: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6 2.1 0 4 1.1 5.1 2.8M16 8l2 2 4-4" />
    </svg>
  ),

  reports: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  ),

  notifications: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
  ),

  events: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 9h18" />
    </svg>
  ),

  history: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6M12 7v5l3 2" />
    </svg>
  ),

  logout: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
      <path d="M14 8l4 4-4 4M18 12H8" />
    </svg>
  ),
};


/* =========================================================
   MENU ITEMS
========================================================= */

const menuItems = {
  admin: [
    {
      path: '/admin/dashboard',
      label: 'Overview',
      icon: Icons.overview,
    },
    {
      path: '/admin/create-event',
      label: 'Create Event',
      icon: Icons.create,
    },
    {
      path: '/admin/attendance',
      label: 'Departments',
      icon: Icons.departments,
    },
    {
      path: '/admin/receipts',
      label: 'Receipts',
      icon: Icons.receipts,
    },
    {
      path: '/admin/evaluation',
      label: 'Evaluation Results',
      icon: Icons.evaluation,
    },
  ],

  department_head: [
    {
      path: '/dept/dashboard',
      label: 'Dashboard',
      icon: Icons.dashboard,
    },
    {
      path: '/dept/attendance',
      label: 'Attendance',
      icon: Icons.attendance,
    },
    {
      path: '/dept/reports',
      label: 'Reports',
      icon: Icons.reports,
    },
    {
      path: '/dept/evaluation',
      label: 'Evaluation Results',
      icon: Icons.evaluation,
    },
  ],

  student: [
    {
      path: '/student/notifications',
      label: 'Notifications',
      icon: Icons.notifications,
    },
    {
      path: '/student/my-events',
      label: 'My Events',
      icon: Icons.events,
    },
    {
      path: '/student/history',
      label: 'History',
      icon: Icons.history,
    },
  ],

  student_leader: [
    {
      path: '/student/notifications',
      label: 'Notifications',
      icon: Icons.notifications,
    },
    {
      path: '/student/my-events',
      label: 'My Events',
      icon: Icons.events,
    },
    {
      path: '/student/history',
      label: 'History',
      icon: Icons.history,
    },
  ],

  alumni: [
    {
      path: '/student/notifications',
      label: 'Notifications',
      icon: Icons.notifications,
    },
    {
      path: '/student/my-events',
      label: 'My Events',
      icon: Icons.events,
    },
    {
      path: '/student/history',
      label: 'History',
      icon: Icons.history,
    },
  ],

  stakeholder: [
    {
      path: '/student/notifications',
      label: 'Notifications',
      icon: Icons.notifications,
    },
    {
      path: '/student/my-events',
      label: 'My Events',
      icon: Icons.events,
    },
    {
      path: '/student/history',
      label: 'History',
      icon: Icons.history,
    },
  ],
};


/* =========================================================
   AVATAR
========================================================= */

const Avatar = ({ user, size = 'md', src }) => {
  const initials =
    `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`;

  const className =
    `user-avatar ${size === 'lg' ? 'user-avatar-lg' : ''}`;

  const photoUrl =
    src || user?.profile_picture || null;

  if (photoUrl) {
    return (
      <div className={className}>
        <img
          src={photoUrl}
          alt=""
          className="user-avatar-img"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {initials}
    </div>
  );
};


/* =========================================================
   SIDEBAR
========================================================= */

const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {

  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);

  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const popoverRef = useRef(null);
  const fileInputRef = useRef(null);


  /* =====================================================
     CLOSE PROFILE WHEN CLICKING OUTSIDE
  ===================================================== */

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setProfileOpen(false);
        setEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);


  /* =====================================================
     UNREAD NOTIFICATIONS
  ===================================================== */

  useEffect(() => {

    const studentLikeRoles = [
      'student',
      'student_leader',
      'alumni',
      'stakeholder',
    ];

    if (!studentLikeRoles.includes(user?.role)) {
      return;
    }

    const fetchUnread = async () => {
      try {

        const res = await api.get('/notifications/my');

        const count =
          (res.data.notifications || [])
            .filter((n) => !n.is_read)
            .length;

        setUnreadCount(count);

      } catch (error) {
        console.error(error);
      }
    };

    fetchUnread();

    const interval =
      setInterval(fetchUnread, 30000);

    return () => clearInterval(interval);

  }, [user]);


  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = () => {

    logout();

    toast.success(
      'Logged out successfully.'
    );

    navigate('/login');

  };


  /* =====================================================
     PROFILE
  ===================================================== */

  const openProfile = () => {

    setProfileOpen((prev) => !prev);

    setEditing(false);

  };


  const startEditing = () => {

    setForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
    });

    setAvatarFile(null);
    setAvatarPreview(null);

    setEditing(true);

  };


  const cancelEditing = () => {

    setAvatarFile(null);
    setAvatarPreview(null);

    setEditing(false);

  };


  /* =====================================================
     PHOTO
  ===================================================== */

  const handleAvatarPick = (e) => {

    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {

      toast.error(
        'Please choose an image file.'
      );

      return;
    }

    if (file.size > 5 * 1024 * 1024) {

      toast.error(
        'Image must be under 5MB.'
      );

      return;
    }

    setAvatarFile(file);

    setAvatarPreview(
      URL.createObjectURL(file)
    );

  };


  /* =====================================================
     SAVE PROFILE
  ===================================================== */

  const handleSave = async (e) => {

    e.preventDefault();

    setSaving(true);

    try {

      const payload = new FormData();

      payload.append(
        'first_name',
        form.first_name.trim()
      );

      payload.append(
        'last_name',
        form.last_name.trim()
      );

      if (avatarFile) {
        payload.append(
          'avatar',
          avatarFile
        );
      }

      const res = await api.put(
        '/users/profile',
        payload,
        {
          headers: {
            'Content-Type':
              'multipart/form-data',
          },
        }
      );

      const updatedUser =
        res.data?.user ||
        res.data ||
        {};

      updateUser(updatedUser);

      toast.success(
        'Profile updated successfully.'
      );

      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);

    } catch (err) {

      console.error(
        'Profile update error:',
        err
      );

      toast.error(
        err.response?.data?.message ||
        'Failed to update profile.'
      );

    } finally {

      setSaving(false);

    }

  };


  const items =
    menuItems[user?.role] || [];


  const getRoleDisplay = (role) => {

    if (!role) return '';

    return role
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) =>
        char.toUpperCase()
      );

  };


  /* =====================================================
     NAVIGATION
  ===================================================== */

  const handleNavigation = () => {

    /* On mobile close drawer after selecting */
    if (window.innerWidth <= 768) {
      setMobileOpen(false);
    }

  };


  return (
    <>
      {/* =================================================
          MOBILE / DESKTOP 3-LINE BUTTON
      ================================================= */}

      <button
        className="sidebar-menu-toggle"
        onClick={() => {

          if (window.innerWidth <= 768) {

            setMobileOpen(!mobileOpen);

          } else {

            setCollapsed(!collapsed);

          }

        }}
        aria-label="Toggle sidebar"
      >
        {Icons.menu}
      </button>


      {/* =================================================
          MOBILE BACKDROP
      ================================================= */}

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}


      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`
          sidebar
          ${collapsed ? 'sidebar-collapsed' : ''}
          ${mobileOpen ? 'sidebar-mobile-open' : ''}
        `}
      >

        {/* =================================================
            LOGO
        ================================================= */}

        <div className="sidebar-logo">

          <img
            src="/LG.png"
            alt="EventHub Logo"
            className="sidebar-logo-img"
          />

          <span className="sidebar-logo-text">
            EventHub
          </span>

        </div>


        {/* =================================================
            USER
        ================================================= */}

        <div
          className="sidebar-user-wrapper"
          ref={popoverRef}
        >

          <button
            className="sidebar-user"
            onClick={openProfile}
          >

            <Avatar user={user} />

            <div className="user-info">

              <p className="user-name">
                {user?.first_name}{' '}
                {user?.last_name}
              </p>

              <p className="user-role">
                {getRoleDisplay(user?.role)}
              </p>

            </div>

            <span
              className={`user-caret ${
                profileOpen ? 'open' : ''
              }`}
            >
              ▾
            </span>

          </button>


          {/* =================================================
              PROFILE POPOVER
          ================================================= */}

          {profileOpen && (

            <div className="profile-popover">

              {!editing ? (

                <>
                  <div className="profile-popover-header">

                    <Avatar
                      user={user}
                      size="lg"
                    />

                    <div>

                      <p className="profile-popover-name">
                        {user?.first_name}{' '}
                        {user?.last_name}
                      </p>

                      <p className="profile-popover-role">
                        {getRoleDisplay(user?.role)}
                      </p>

                    </div>

                  </div>


                  {user?.email && (
                    <p className="profile-popover-email">
                      {user.email}
                    </p>
                  )}


                  <button
                    className="profile-popover-btn"
                    onClick={startEditing}
                  >
                    Edit Profile
                  </button>

                </>

              ) : (

                <form
                  className="profile-popover-form"
                  onSubmit={handleSave}
                >

                  <div className="avatar-edit-row">

                    <Avatar
                      user={user}
                      size="lg"
                      src={avatarPreview}
                    />

                    <div className="avatar-edit-actions">

                      <button
                        type="button"
                        className="avatar-edit-btn"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                      >
                        Change Photo
                      </button>

                      <span className="avatar-edit-hint">
                        JPG or PNG, up to 5MB
                      </span>

                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarPick}
                      hidden
                    />

                  </div>


                  <label>
                    First Name
                  </label>

                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        first_name:
                          e.target.value,
                      })
                    }
                    required
                  />


                  <label>
                    Last Name
                  </label>

                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        last_name:
                          e.target.value,
                      })
                    }
                    required
                  />


                  <div className="profile-popover-actions">

                    <button
                      type="button"
                      className="profile-popover-cancel"
                      onClick={cancelEditing}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="profile-popover-save"
                      disabled={saving}
                    >
                      {saving
                        ? 'Saving...'
                        : 'Save'}
                    </button>

                  </div>

                </form>

              )}

            </div>

          )}

        </div>


        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav className="sidebar-nav">

          {items.map((item) => (

            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavigation}
              title={
                collapsed
                  ? item.label
                  : undefined
              }
              className={({ isActive }) =>
                `nav-item ${
                  isActive ? 'active' : ''
                }`
              }
            >

              <span className="nav-icon">
                {item.icon}
              </span>

              <span className="nav-label">
                {item.label}
              </span>

              {item.label ===
                'Notifications' &&
                unreadCount > 0 && (

                  <span className="nav-badge">
                    {unreadCount}
                  </span>

                )}

            </NavLink>

          ))}

        </nav>


        {/* =================================================
            LOGOUT
        ================================================= */}

        <button
          className="sidebar-logout"
          onClick={handleLogout}
          title={
            collapsed
              ? 'Logout'
              : undefined
          }
        >

          <span className="nav-icon">
            {Icons.logout}
          </span>

          <span className="logout-label">
            Logout
          </span>

        </button>

      </aside>
    </>
  );
};

export default Sidebar;