import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';

const Icon = ({ type, size = 23 }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  };

  switch (type) {
    case 'grid':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );

    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 9h18" />
          <path d="M12 13v4M10 15h4" />
        </svg>
      );

    case 'building':
      return (
        <svg {...common}>
          <path d="M4 21V5l8-3 8 3v16" />
          <path d="M8 9h1M15 9h1M8 13h1M15 13h1M8 17h1M15 17h1" />
          <path d="M10 21v-4h4v4" />
        </svg>
      );

    case 'receipt':
      return (
        <svg {...common}>
          <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );

    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h17" />
          <path d="M7 15l4-4 3 2 5-7" />
        </svg>
      );

    case 'bell':
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case 'history':
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case 'logout':
      return (
        <svg {...common}>
          <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
          <path d="M14 8l4 4-4 4" />
          <path d="M8 12h10" />
        </svg>
      );

    case 'menu':
      return (
        <svg {...common} strokeWidth="2.2">
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      );

    case 'camera':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="14" rx="2" />
          <path d="M8 6l1.5-3h5L16 6" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );

    default:
      return null;
  }
};

const Sidebar = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [user, setUser] = useState(null);

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhoto, setEditPhoto] = useState('');

  /* =========================================================
     LOAD USER
  ========================================================= */

  const loadUser = () => {
    try {
      const storedUser =
        localStorage.getItem('user') ||
        localStorage.getItem('currentUser');

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        setEditFirstName(parsedUser.first_name || '');
        setEditLastName(parsedUser.last_name || '');

        setEditPhoto(
          parsedUser.profile_photo ||
          parsedUser.profile_picture ||
          parsedUser.photo ||
          parsedUser.avatar ||
          ''
        );
      }
    } catch (error) {
      console.error('Unable to read user:', error);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  /* =========================================================
     USER INFORMATION
  ========================================================= */

  const firstName = user?.first_name || 'User';
  const lastName = user?.last_name || '';

  const fullName =
    `${firstName} ${lastName}`.trim();

  const role = user?.role || 'student';

  const initials =
    `${firstName?.charAt(0) || 'U'}`
      .toUpperCase();

  const profilePhoto =
    user?.profile_photo ||
    user?.profile_picture ||
    user?.photo ||
    user?.avatar ||
    '';

  const isAdmin = role === 'admin';

  const isDepartmentHead =
    role === 'department_head';

  const roleText = isAdmin
    ? 'Admin'
    : isDepartmentHead
      ? 'Department Head'
      : 'Student';

  /* =========================================================
     MENU
  ========================================================= */

  const adminItems = [
    {
      label: 'Overview',
      path: '/admin/dashboard',
      icon: 'grid'
    },
    {
      label: 'Create Event',
      path: '/admin/create-event',
      icon: 'calendar'
    },
    {
      label: 'Departments',
      path: '/admin/users',
      icon: 'building'
    },
    {
      label: 'Receipts',
      path: '/admin/receipts',
      icon: 'receipt'
    },
    {
      label: 'Evaluation Results',
      path: '/admin/evaluation',
      icon: 'chart'
    }
  ];

  const departmentItems = [
    {
      label: 'Overview',
      path: '/dept/dashboard',
      icon: 'grid'
    },
    {
      label: 'Attendance',
      path: '/dept/attendance',
      icon: 'calendar'
    },
    {
      label: 'Reports',
      path: '/dept/reports',
      icon: 'chart'
    },
    {
      label: 'Evaluation',
      path: '/dept/evaluation',
      icon: 'receipt'
    }
  ];

  const studentItems = [
    {
      label: 'Notifications',
      path: '/student/notifications',
      icon: 'bell',
      badge: 1
    },
    {
      label: 'My Events',
      path: '/student/my-events',
      icon: 'calendar'
    },
    {
      label: 'History',
      path: '/student/history',
      icon: 'history'
    }
  ];

  const menuItems = isAdmin
    ? adminItems
    : isDepartmentHead
      ? departmentItems
      : studentItems;

  /* =========================================================
     PHOTO UPLOAD
  ========================================================= */

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setEditPhoto(reader.result);
    };

    reader.readAsDataURL(file);
  };

  /* =========================================================
     SAVE PROFILE
  ========================================================= */

  const handleSaveProfile = () => {
    const updatedUser = {
      ...user,

      first_name:
        editFirstName.trim() || 'User',

      last_name:
        editLastName.trim(),

      profile_photo:
        editPhoto || ''
    };

    try {
      localStorage.setItem(
        'user',
        JSON.stringify(updatedUser)
      );

      localStorage.setItem(
        'currentUser',
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);
      setEditMode(false);

      window.dispatchEvent(
        new CustomEvent('profile-updated', {
          detail: updatedUser
        })
      );

    } catch (error) {
      console.error(
        'Unable to save profile:',
        error
      );

      alert(
        'Unable to save profile. The image may be too large.'
      );
    }
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');

    navigate('/login', {
      replace: true
    });
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <aside
      className={`sidebar ${
        collapsed
          ? 'sidebar-is-collapsed'
          : ''
      }`}
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="sidebar-header">

        <div className="eventhub-brand">

          <div className="eventhub-logo">
            EH
          </div>

          {!collapsed && (
            <span className="eventhub-name">
              EventHub
            </span>
          )}

        </div>

        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label="Toggle sidebar"
        >
          <Icon
            type="menu"
            size={27}
          />
        </button>

      </div>

      {/* =====================================================
          PROFILE
      ===================================================== */}

      <div className="sidebar-profile-area">

        <button
          type="button"
          className="profile-trigger"
          onClick={() => {
            if (!collapsed) {
              setProfileOpen(
                prev => !prev
              );
            }
          }}
        >

          <div className="profile-avatar">

            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
              />
            ) : (
              initials
            )}

          </div>

          {!collapsed && (
            <div className="profile-text">

              <strong>
                {fullName}
              </strong>

              <span>
                {roleText}
              </span>

            </div>
          )}

          {!collapsed && (
            <span className="profile-arrow">
              {profileOpen ? '⌃' : '⌄'}
            </span>
          )}

        </button>

        {/* =================================================
            SMALL PROFILE DROPDOWN
        ================================================= */}

        {profileOpen && !collapsed && (

          <div className="profile-dropdown">

            {!editMode ? (

              <>
                <div className="dropdown-user">

                  <div className="dropdown-avatar">

                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Profile"
                      />
                    ) : (
                      initials
                    )}

                  </div>

                  <div className="dropdown-user-info">

                    <strong>
                      {fullName}
                    </strong>

                    <span>
                      {roleText}
                    </span>

                  </div>

                </div>

                <div className="dropdown-email">
                  {user?.email ||
                    'No email available'}
                </div>

                <button
                  type="button"
                  className="edit-profile-button"
                  onClick={() =>
                    setEditMode(true)
                  }
                >
                  Edit Profile
                </button>

              </>

            ) : (

              <div className="profile-editor">

                <div className="editor-photo">

                  <div className="editor-avatar">

                    {editPhoto ? (
                      <img
                        src={editPhoto}
                        alt="Profile preview"
                      />
                    ) : (
                      initials
                    )}

                  </div>

                  <label
                    className="change-photo-button"
                  >
                    <Icon
                      type="camera"
                      size={15}
                    />

                    Change Photo

                    <input
                      type="file"
                      accept="image/*"
                      onChange={
                        handlePhotoChange
                      }
                      hidden
                    />
                  </label>

                </div>

                <label>
                  First Name
                </label>

                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) =>
                    setEditFirstName(
                      e.target.value
                    )
                  }
                  placeholder="First name"
                />

                <label>
                  Last Name
                </label>

                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) =>
                    setEditLastName(
                      e.target.value
                    )
                  }
                  placeholder="Last name"
                />

                <div className="editor-buttons">

                  <button
                    type="button"
                    className="cancel-profile-button"
                    onClick={() =>
                      setEditMode(false)
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="save-profile-button"
                    onClick={
                      handleSaveProfile
                    }
                  >
                    Save
                  </button>

                </div>

              </div>

            )}

          </div>

        )}

      </div>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav className="sidebar-navigation">

        {menuItems.map(item => (

          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${
                isActive
                  ? 'sidebar-link-active'
                  : ''
              }`
            }
            title={
              collapsed
                ? item.label
                : ''
            }
          >

            <span className="sidebar-icon">

              <Icon
                type={item.icon}
                size={23}
              />

            </span>

            {!collapsed && (
              <span className="sidebar-link-label">
                {item.label}
              </span>
            )}

            {!collapsed &&
              item.badge && (
                <span className="notification-badge">
                  {item.badge}
                </span>
              )}

          </NavLink>

        ))}

      </nav>

      {/* =====================================================
          LOGOUT
      ===================================================== */}

      <div className="sidebar-footer">

        <button
          type="button"
          className="sidebar-logout"
          onClick={handleLogout}
          title={
            collapsed
              ? 'Logout'
              : ''
          }
        >

          <span className="sidebar-icon">

            <Icon
              type="logout"
              size={23}
            />

          </span>

          {!collapsed && (
            <span>
              Logout
            </span>
          )}

        </button>

      </div>

    </aside>
  );
};

export default Sidebar;