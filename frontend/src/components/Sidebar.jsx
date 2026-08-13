import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './Sidebar.css';

/* =========================================================
   MENU ITEMS
========================================================= */

const menuItems = {
  admin: [
    { path: '/admin/dashboard', label: 'Overview', icon: '▦' },
    { path: '/admin/create-event', label: 'Create Event', icon: '＋' },
    { path: '/admin/attendance', label: 'Departments', icon: '♧' },
    { path: '/admin/receipts', label: 'Receipts', icon: '▤' },
    { path: '/admin/evaluation', label: 'Evaluation Results', icon: '★' },
  ],

  department_head: [
    { path: '/dept/dashboard', label: 'Dashboard', icon: '▦' },
    { path: '/dept/attendance', label: 'Attendance', icon: '✓' },
    { path: '/dept/reports', label: 'Reports', icon: '▤' },
    { path: '/dept/evaluation', label: 'Evaluation Results', icon: '★' },
  ],

  student: [
    { path: '/student/notifications', label: 'Notifications', icon: '♧' },
    { path: '/student/my-events', label: 'My Events', icon: '▣' },
    { path: '/student/history', label: 'History', icon: '◷' },
  ],

  student_leader: [
    { path: '/student/notifications', label: 'Notifications', icon: '♧' },
    { path: '/student/my-events', label: 'My Events', icon: '▣' },
    { path: '/student/history', label: 'History', icon: '◷' },
  ],

  alumni: [
    { path: '/student/notifications', label: 'Notifications', icon: '♧' },
    { path: '/student/my-events', label: 'My Events', icon: '▣' },
    { path: '/student/history', label: 'History', icon: '◷' },
  ],

  stakeholder: [
    { path: '/student/notifications', label: 'Notifications', icon: '♧' },
    { path: '/student/my-events', label: 'My Events', icon: '▣' },
    { path: '/student/history', label: 'History', icon: '◷' },
  ],
};


/* =========================================================
   AVATAR
========================================================= */

const Avatar = ({ user, size = 'md', src }) => {
  const initials =
    `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`;

  const className = `
    user-avatar
    ${size === 'lg' ? 'user-avatar-lg' : ''}
  `;

  const photoUrl = src || user?.profile_picture || null;

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

const Sidebar = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);

  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const popoverRef = useRef(null);
  const fileInputRef = useRef(null);


  /* =========================================================
     CLOSE PROFILE WHEN CLICKING OUTSIDE
  ========================================================= */

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


  /* =========================================================
     ESCAPE KEY
  ========================================================= */

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setProfileOpen(false);
        setEditing(false);
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener(
        'keydown',
        handleEscape
      );
    };
  }, []);


  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

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

        const count = (
          res.data.notifications || []
        ).filter((n) => !n.is_read).length;

        setUnreadCount(count);
      } catch (error) {
        console.error(
          'Notification error:',
          error
        );
      }
    };

    fetchUnread();

    const interval = setInterval(
      fetchUnread,
      30000
    );

    return () => clearInterval(interval);
  }, [user]);


  /* =========================================================
     MOBILE SIDEBAR
  ========================================================= */

  const toggleMobileSidebar = () => {
    setMobileOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };


  /* =========================================================
     DESKTOP COLLAPSE
  ========================================================= */

  const toggleCollapsed = () => {
    setCollapsed((prev) => !prev);
  };


  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    logout();

    toast.success(
      'Logged out successfully.'
    );

    navigate('/login');
  };


  /* =========================================================
     PROFILE
  ========================================================= */

  const openProfile = () => {
    setProfileOpen((prev) => !prev);
    setEditing(false);
  };


  const startEditing = () => {
    setForm({
      first_name:
        user?.first_name || '',
      last_name:
        user?.last_name || '',
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


  /* =========================================================
     PROFILE PHOTO
  ========================================================= */

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


  /* =========================================================
     SAVE PROFILE
  ========================================================= */

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

      /*
       * IMPORTANT:
       * This updates React state AND localStorage.
       */
      updateUser(updatedUser);

      toast.success(
        'Profile updated successfully.'
      );

      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);

    } catch (error) {
      console.error(
        'Profile update error:',
        error
      );

      toast.error(
        error.response?.data?.message ||
        'Failed to update profile.'
      );

    } finally {
      setSaving(false);
    }
  };


  /* =========================================================
     ROLE DISPLAY
  ========================================================= */

  const getRoleDisplay = (role) => {
    if (!role) return '';

    return role
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        (char) => char.toUpperCase()
      );
  };


  const items =
    menuItems[user?.role] || [];


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      {/* =====================================================
          MOBILE HAMBURGER
      ===================================================== */}

      <button
        type="button"
        className="mobile-sidebar-toggle"
        onClick={toggleMobileSidebar}
        aria-label="Open sidebar"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>


      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {mobileOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={closeMobileSidebar}
        />
      )}


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`
          sidebar
          ${collapsed ? 'sidebar-collapsed' : ''}
          ${mobileOpen ? 'mobile-open' : ''}
        `}
      >

        {/* ===================================================
            LOGO
        =================================================== */}

        <div className="sidebar-logo">

          {/* Desktop collapse button */}
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <img
            src="/LG.png"
            alt="EventHub Logo"
            className="sidebar-logo-img"
          />

          <span className="sidebar-logo-text">
            EventHub
          </span>

        </div>


        {/* ===================================================
            USER
        =================================================== */}

        <div
          className="sidebar-user-wrapper"
          ref={popoverRef}
        >

          <button
            type="button"
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
                {getRoleDisplay(
                  user?.role
                )}
              </p>

            </div>

            <span
              className={`
                user-caret
                ${profileOpen ? 'open' : ''}
              `}
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
                        {getRoleDisplay(
                          user?.role
                        )}
                      </p>

                    </div>

                  </div>

                  {user?.email && (
                    <p className="profile-popover-email">
                      {user.email}
                    </p>
                  )}

                  <button
                    type="button"
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


        {/* ===================================================
            NAVIGATION
        =================================================== */}

        <nav className="sidebar-nav">

          {items.map((item) => (

            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMobileSidebar}
              className={({ isActive }) =>
                `nav-item ${
                  isActive
                    ? 'active'
                    : ''
                }`
              }
              title={item.label}
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


        {/* ===================================================
            LOGOUT
        =================================================== */}

        <button
          type="button"
          className="sidebar-logout"
          onClick={handleLogout}
          title="Logout"
        >

          <span className="logout-icon">
            ⇥
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