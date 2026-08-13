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

    default:
      return null;
  }
};

const Sidebar = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const [user, setUser] = useState(null);

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhoto, setEditPhoto] = useState('');

  /* =========================================================
     LOAD USER
  ========================================================= */

  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem('user') ||
        localStorage.getItem('currentUser');

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Unable to read user:', error);
    }
  }, []);

  /* =========================================================
     USER DATA
  ========================================================= */

  const firstName = user?.first_name || user?.firstName || 'User';
  const lastName = user?.last_name || user?.lastName || '';

  const fullName = `${firstName} ${lastName}`.trim();

  const role = user?.role || 'student';

  const profilePhoto =
    user?.profile_photo ||
    user?.profilePhoto ||
    user?.photo ||
    user?.avatar ||
    '';

  const initials =
    firstName?.charAt(0)?.toUpperCase() || 'U';

  const isAdmin = role === 'admin';
  const isDepartmentHead = role === 'department_head';

  const roleText = isAdmin
    ? 'Admin'
    : isDepartmentHead
      ? 'Department Head'
      : 'Student';

  /* =========================================================
     ADMIN ITEMS
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

  /* =========================================================
     DEPARTMENT ITEMS
  ========================================================= */

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

  /* =========================================================
     STUDENT ITEMS
  ========================================================= */

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
     OPEN EDIT PROFILE
  ========================================================= */

  const openEditProfile = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditPhoto(profilePhoto);

    setProfileOpen(false);
    setEditProfileOpen(true);
  };

  /* =========================================================
     SELECT PROFILE PHOTO
  ========================================================= */

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setEditPhoto(reader.result);
    };

    reader.readAsDataURL(file);
  };

  /* =========================================================
     SAVE PROFILE
  ========================================================= */

  const handleSaveProfile = () => {
    const trimmedFirstName = editFirstName.trim();
    const trimmedLastName = editLastName.trim();

    if (!trimmedFirstName) {
      alert('First name is required.');
      return;
    }

    const updatedUser = {
      ...user,
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
      profile_photo: editPhoto
    };

    setUser(updatedUser);

    localStorage.setItem(
      'user',
      JSON.stringify(updatedUser)
    );

    localStorage.setItem(
      'currentUser',
      JSON.stringify(updatedUser)
    );

    setEditProfileOpen(false);
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
     AVATAR COMPONENT
  ========================================================= */

  const Avatar = ({ popup = false }) => {
    const className = popup
      ? 'popup-avatar'
      : 'profile-avatar';

    return (
      <div className={className}>
        {profilePhoto ? (
          <img
            src={profilePhoto}
            alt="Profile"
            className="profile-image"
          />
        ) : (
          initials
        )}
      </div>
    );
  };

  return (
    <>
      <aside
        className={`sidebar ${
          collapsed ? 'sidebar-is-collapsed' : ''
        }`}
      >

        {/* =================================================
            HEADER
        ================================================= */}

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
              size={28}
            />
          </button>

        </div>


        {/* =================================================
            PROFILE
        ================================================= */}

        <div className="sidebar-profile-area">

          <button
            type="button"
            className="profile-trigger"
            onClick={() =>
              setProfileOpen(prev => !prev)
            }
          >

            <Avatar />

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
              PROFILE POPUP
          ================================================= */}

          {profileOpen && !collapsed && (

            <div className="profile-popup">

              <div className="popup-user">

                <Avatar popup />

                <div>
                  <strong>
                    {fullName}
                  </strong>

                  <span>
                    {roleText}
                  </span>
                </div>

              </div>

              <div className="popup-email">
                {user?.email || 'No email available'}
              </div>

              <button
                type="button"
                className="edit-profile-button"
                onClick={openEditProfile}
              >
                Edit Profile
              </button>

            </div>

          )}

        </div>


        {/* =================================================
            NAVIGATION
        ================================================= */}

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
              title={collapsed ? item.label : ''}
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

              {!collapsed && item.badge && (
                <span className="notification-badge">
                  {item.badge}
                </span>
              )}

            </NavLink>

          ))}

        </nav>


        {/* =================================================
            LOGOUT
        ================================================= */}

        <div className="sidebar-footer">

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
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


      {/* =====================================================
          EDIT PROFILE MODAL
      ===================================================== */}

      {editProfileOpen && (

        <div
          className="edit-profile-overlay"
          onClick={() => setEditProfileOpen(false)}
        >

          <div
            className="edit-profile-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="edit-profile-header">

              <h2>
                Edit Profile
              </h2>

              <button
                type="button"
                className="close-profile-button"
                onClick={() => setEditProfileOpen(false)}
              >
                ×
              </button>

            </div>


            {/* PHOTO */}

            <div className="edit-photo-section">

              <div className="edit-photo-preview">

                {editPhoto ? (
                  <img
                    src={editPhoto}
                    alt="Profile preview"
                  />
                ) : (
                  initials
                )}

              </div>

              <label className="change-photo-button">

                Change Photo

                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  hidden
                />

              </label>

            </div>


            {/* FIRST NAME */}

            <div className="profile-form-group">

              <label>
                First Name
              </label>

              <input
                type="text"
                value={editFirstName}
                onChange={(e) =>
                  setEditFirstName(e.target.value)
                }
                placeholder="Enter first name"
              />

            </div>


            {/* LAST NAME */}

            <div className="profile-form-group">

              <label>
                Last Name
              </label>

              <input
                type="text"
                value={editLastName}
                onChange={(e) =>
                  setEditLastName(e.target.value)
                }
                placeholder="Enter last name"
              />

            </div>


            {/* EMAIL */}

            <div className="profile-form-group">

              <label>
                Email
              </label>

              <input
                type="email"
                value={user?.email || ''}
                disabled
              />

            </div>


            {/* BUTTONS */}

            <div className="edit-profile-actions">

              <button
                type="button"
                className="cancel-profile-button"
                onClick={() => setEditProfileOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="save-profile-button"
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

export default Sidebar;