import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import './Sidebar.css';

/* =========================================================
   SIMPLE FLATICON-STYLE SVG ICONS
   Black icon only — no colored background
========================================================= */

const Icon = ({ type, size = 23 }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
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
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
          <path d="M12 14v4M10 16h4" />
        </svg>
      );

    case 'building':
      return (
        <svg {...common}>
          <path d="M4 21V7l8-4 8 4v14" />
          <path d="M8 21v-4h8v4M8 10h1M12 10h1M16 10h1M8 13h1M12 13h1M16 13h1" />
        </svg>
      );

    case 'receipt':
      return (
        <svg {...common}>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      );

    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h17" />
          <path d="M7 15l4-4 3 2 5-7" />
          <path d="M17 6h2v2" />
        </svg>
      );

    case 'bell':
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
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
          <path d="M18 12H8" />
        </svg>
      );

    case 'menu':
      return (
        <svg {...common} strokeWidth="2.2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );

    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <path d="M16 5.5a3 3 0 0 1 0 5.8M17 14c2.3.7 4 2.8 4 5" />
        </svg>
      );

    case 'clipboard':
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
};


/* =========================================================
   SIDEBAR
========================================================= */

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);

  const [user, setUser] = useState({
    first_name: 'User',
    last_name: '',
    role: 'student',
    profile_picture: null,
  });

  /* -------------------------------------------------------
     GET USER
  ------------------------------------------------------- */

  useEffect(() => {
    try {
      const possibleKeys = [
        'user',
        'currentUser',
        'authUser',
      ];

      let storedUser = null;

      for (const key of possibleKeys) {
        const data = localStorage.getItem(key);

        if (data) {
          try {
            const parsed = JSON.parse(data);

            if (parsed && typeof parsed === 'object') {
              storedUser = parsed;
              break;
            }
          } catch {
            // Ignore invalid localStorage values
          }
        }
      }

      if (storedUser) {
        setUser((prev) => ({
          ...prev,
          ...storedUser,
        }));
      }
    } catch (error) {
      console.error('Sidebar user error:', error);
    }
  }, []);

  /* -------------------------------------------------------
     ROLE
  ------------------------------------------------------- */

  const role = String(user?.role || 'student').toLowerCase();

  const firstName = user?.first_name || 'User';
  const lastName = user?.last_name || '';

  const fullName = `${firstName} ${lastName}`.trim();

  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`
    .toUpperCase();

  /* -------------------------------------------------------
     ROLE LABEL
  ------------------------------------------------------- */

  const roleLabel =
    role === 'admin'
      ? 'Admin'
      : role === 'department_head'
      ? 'Department Head'
      : role === 'student_leader'
      ? 'Student Leader'
      : role === 'alumni'
      ? 'Alumni'
      : role === 'stakeholder'
      ? 'Stakeholder'
      : 'Student';

  /* -------------------------------------------------------
     MENU ITEMS
  ------------------------------------------------------- */

  let menuItems = [];

  if (role === 'admin') {
    menuItems = [
      {
        label: 'Overview',
        path: '/admin/dashboard',
        icon: 'grid',
      },
      {
        label: 'Create Event',
        path: '/admin/create-event',
        icon: 'calendar',
      },
      {
        label: 'Departments',
        path: '/admin/users',
        icon: 'building',
      },
      {
        label: 'Receipts',
        path: '/admin/receipts',
        icon: 'receipt',
      },
      {
        label: 'Evaluation Results',
        path: '/admin/evaluation',
        icon: 'chart',
      },
    ];
  } else if (role === 'department_head') {
    menuItems = [
      {
        label: 'Overview',
        path: '/dept/dashboard',
        icon: 'grid',
      },
      {
        label: 'Attendance',
        path: '/dept/attendance',
        icon: 'clipboard',
      },
      {
        label: 'Reports',
        path: '/dept/reports',
        icon: 'chart',
      },
      {
        label: 'Evaluation Results',
        path: '/dept/evaluation',
        icon: 'chart',
      },
    ];
  } else {
    menuItems = [
      {
        label: 'Notifications',
        path: '/student/notifications',
        icon: 'bell',
        badge: 1,
      },
      {
        label: 'My Events',
        path: '/student/my-events',
        icon: 'calendar',
      },
      {
        label: 'History',
        path: '/student/history',
        icon: 'history',
      },
    ];
  }

  /* -------------------------------------------------------
     LOGOUT
  ------------------------------------------------------- */

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authUser');
    localStorage.removeItem('token');

    navigate('/login');
  };

  /* -------------------------------------------------------
     CLOSE SIDEBAR AFTER CLICKING ON MOBILE
     ONLY WHEN COLLAPSED MODE IS BEING USED
  ------------------------------------------------------- */

  const handleNavigation = () => {
    // Do not automatically close.
    // User specifically wants the sidebar and content side-by-side.
  };

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}
    >

      {/* ===================================================
          TOP / LOGO
      =================================================== */}

      <div className="sidebar-top">

        <div className="brand-area">
          <div className="brand-logo">
            EH
          </div>

          {!collapsed && (
            <div className="brand-text">
              <span className="brand-name">EventHub</span>
            </div>
          )}
        </div>

        {/* HAMBURGER */}
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon type="menu" size={25} />
        </button>

      </div>


      {/* ===================================================
          USER PROFILE
      =================================================== */}

      <div className="sidebar-profile">

        <div className="profile-avatar">
          {user?.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={fullName}
            />
          ) : (
            initials || 'U'
          )}
        </div>

        {!collapsed && (
          <div className="profile-info">
            <div className="profile-name" title={fullName}>
              {fullName}
            </div>

            <div className="profile-role">
              {roleLabel}
            </div>
          </div>
        )}

      </div>


      {/* ===================================================
          NAVIGATION
      =================================================== */}

      <nav className="sidebar-navigation">

        {menuItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`sidebar-link ${
                isActive ? 'sidebar-link-active' : ''
              }`}
              onClick={handleNavigation}
              title={collapsed ? item.label : ''}
            >

              <span className="sidebar-icon">
                <Icon type={item.icon} size={23} />
              </span>

              {!collapsed && (
                <span className="sidebar-label">
                  {item.label}
                </span>
              )}

              {!collapsed && item.badge && (
                <span className="sidebar-badge">
                  {item.badge}
                </span>
              )}

            </NavLink>
          );
        })}

      </nav>


      {/* ===================================================
          LOGOUT
      =================================================== */}

      <div className="sidebar-bottom">

        <button
          type="button"
          className="sidebar-link sidebar-logout"
          onClick={handleLogout}
          title={collapsed ? 'Logout' : ''}
        >

          <span className="sidebar-icon">
            <Icon type="logout" size={23} />
          </span>

          {!collapsed && (
            <span className="sidebar-label">
              Logout
            </span>
          )}

        </button>

      </div>

    </aside>
  );
};

export default Sidebar;