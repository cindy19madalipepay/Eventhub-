import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaCalendarDays,
  FaClockRotateLeft,
  FaRightFromBracket,
  FaBars,
  FaXmark,
  FaChevronDown,
  FaUser,
  FaGear,
} from "react-icons/fa6";

import { useAuth } from "../context/AuthContext";

import "./Sidebar.css";

const Sidebar = () => {
  const { user, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  /* =========================================================
     USER INFORMATION
  ========================================================= */

  const firstName = user?.first_name || "User";
  const lastName = user?.last_name || "";

  const fullName = `${firstName} ${lastName}`.trim();

  const role = user?.role
    ? user.role.replace("_", " ")
    : "Student";

  const initials =
    `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /* =========================================================
     CLOSE MOBILE SIDEBAR
  ========================================================= */

  const handleNavigation = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(false);
    }
  };

  /* =========================================================
     ACTIVE MENU
  ========================================================= */

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* =====================================================
          MOBILE MENU BUTTON
      ===================================================== */}

      <button
        type="button"
        className="mobile-sidebar-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Open navigation"
      >
        {mobileOpen ? <FaXmark /> : <FaBars />}
      </button>


      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {mobileOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`
          sidebar
          ${collapsed ? "sidebar-collapsed" : ""}
          ${mobileOpen ? "mobile-open" : ""}
        `}
      >

        {/* ===================================================
            LOGO
        =================================================== */}

        <div className="sidebar-logo">

          <img
            src="/logo.png"
            alt="EventHub"
            className="sidebar-logo-img"
          />

          {!collapsed && (
            <span className="sidebar-logo-name">
              EventHub
            </span>
          )}

        </div>


        {/* ===================================================
            PROFILE
        =================================================== */}

        <div className="sidebar-user-wrapper">

          <button
            type="button"
            className="sidebar-user"
            onClick={() => {
              if (collapsed) {
                setCollapsed(false);
                return;
              }

              setProfileOpen(!profileOpen);
            }}
          >

            {/* AVATAR */}

            <div className="user-avatar">

              {user?.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={fullName}
                  className="user-avatar-img"
                />
              ) : (
                initials
              )}

            </div>


            {/* USER INFORMATION */}

            {!collapsed && (
              <div className="user-info">

                <p className="user-name">
                  {fullName}
                </p>

                <p className="user-role">
                  {role}
                </p>

              </div>
            )}


            {/* PROFILE ARROW */}

            {!collapsed && (
              <FaChevronDown
                className={`user-caret ${
                  profileOpen ? "open" : ""
                }`}
              />
            )}

          </button>


          {/* =================================================
              PROFILE POPOVER
          ================================================= */}

          {profileOpen && !collapsed && (
            <div className="profile-popover">

              <div className="profile-popover-header">

                <div className="user-avatar user-avatar-lg">

                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt={fullName}
                      className="user-avatar-img"
                    />
                  ) : (
                    initials
                  )}

                </div>

                <div>

                  <p className="profile-popover-name">
                    {fullName}
                  </p>

                  <p className="profile-popover-role">
                    {role}
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
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/profile");
                }}
              >
                <FaUser />
                <span>View Profile</span>
              </button>

            </div>
          )}

        </div>


        {/* ===================================================
            NAVIGATION
        =================================================== */}

        <nav className="sidebar-nav">

          {/* NOTIFICATIONS */}

          <Link
            to="/notifications"
            className={`nav-item ${
              isActive("/notifications") ? "active" : ""
            }`}
            onClick={handleNavigation}
            title={collapsed ? "Notifications" : ""}
          >

            <span className="nav-item-left">

              <FaBell className="nav-icon" />

              {!collapsed && (
                <span className="nav-label">
                  Notifications
                </span>
              )}

            </span>

            {!collapsed && (
              <span className="nav-badge">
                1
              </span>
            )}

          </Link>


          {/* MY EVENTS */}

          <Link
            to="/my-events"
            className={`nav-item ${
              isActive("/my-events") ? "active" : ""
            }`}
            onClick={handleNavigation}
            title={collapsed ? "My Events" : ""}
          >

            <span className="nav-item-left">

              <FaCalendarDays className="nav-icon" />

              {!collapsed && (
                <span className="nav-label">
                  My Events
                </span>
              )}

            </span>

          </Link>


          {/* HISTORY */}

          <Link
            to="/history"
            className={`nav-item ${
              isActive("/history") ? "active" : ""
            }`}
            onClick={handleNavigation}
            title={collapsed ? "History" : ""}
          >

            <span className="nav-item-left">

              <FaClockRotateLeft className="nav-icon" />

              {!collapsed && (
                <span className="nav-label">
                  History
                </span>
              )}

            </span>

          </Link>


          {/* PROFILE */}

          <Link
            to="/profile"
            className={`nav-item ${
              isActive("/profile") ? "active" : ""
            }`}
            onClick={handleNavigation}
            title={collapsed ? "Profile" : ""}
          >

            <span className="nav-item-left">

              <FaUser className="nav-icon" />

              {!collapsed && (
                <span className="nav-label">
                  Profile
                </span>
              )}

            </span>

          </Link>

        </nav>


        {/* ===================================================
            BOTTOM SECTION
        =================================================== */}

        <div className="sidebar-bottom">

          {/* COLLAPSE BUTTON */}

          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => {
              setCollapsed(!collapsed);
              setProfileOpen(false);
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >

            <FaBars className="collapse-icon" />

            {!collapsed && (
              <span>
                Collapse Menu
              </span>
            )}

          </button>


          {/* LOGOUT */}

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
            title={collapsed ? "Logout" : ""}
          >

            <FaRightFromBracket className="nav-icon" />

            {!collapsed && (
              <span>
                Logout
              </span>
            )}

          </button>

        </div>

      </aside>
    </>
  );
};

export default Sidebar;