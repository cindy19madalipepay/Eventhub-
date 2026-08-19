import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
          <path d="M12 13v5M9.5 15.5h5" />
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

    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </svg>
      );

    case 'camera':
      return (
        <svg {...common}>
          <path d="M4 7h4l2-2h4l2 2h4v11H4z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      );

    default:
      return null;
  }
};

const Sidebar = ({ collapsed, isMobile, onToggle }) => {
  const navigate = useNavigate();

  const { user, logout, updateUser } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhoto, setEditPhoto] = useState('');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const firstName = user?.first_name || 'User';
  const lastName = user?.last_name || '';

  const fullName = `${firstName} ${lastName}`.trim();

  const role = user?.role || 'student';

  const profilePhoto =
    user?.profile_photo ||
    user?.profile_image ||
    user?.photo ||
    user?.avatar ||
    '';

  const isAdmin = role === 'admin';
  const isDepartmentHead = role === 'department_head';

  const nameInitial =
    firstName.trim().charAt(0).toUpperCase() || 'U';

  const roleName = isAdmin
    ? 'Admin'
    : isDepartmentHead
      ? 'Department Head'
      : 'Student';

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
      path: '/admin/attendance',
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
      icon: 'bell'
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

  const menuItems =
    isAdmin
      ? adminItems
      : isDepartmentHead
        ? departmentItems
        : studentItems;

  const toggleProfileDropdown = () => {
    if (collapsed) return;

    setProfileOpen(prev => {
      const next = !prev;

      if (!next) {
        setEditOpen(false);
      }

      return next;
    });
  };

  const openEditProfile = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditPhoto(profilePhoto);

    setEditOpen(true);
  };

  const closeEditProfile = () => {
    setEditOpen(false);
  };

  /*
   * PROFILE PHOTO UPLOAD
   *
   * Cloudinary is only needed when the user changes
   * the profile photo.
   */
  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Optional file size limit: 5 MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5 MB.');
      return;
    }

    try {
      setUploading(true);

      const cloudName =
        import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

      const uploadPreset =
        import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      /*
       * These values MUST exist in Vercel:
       *
       * VITE_CLOUDINARY_CLOUD_NAME
       * VITE_CLOUDINARY_UPLOAD_PRESET
       */

      if (!cloudName) {
        alert(
          'Cloudinary cloud name is missing. Please check your Vercel environment variables.'
        );
        return;
      }

      if (!uploadPreset) {
        alert(
          'Cloudinary upload preset is missing. Please check your Vercel environment variables.'
        );
        return;
      }

      const formData = new FormData();

      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
          'Cloudinary upload failed.'
        );
      }

      if (!data?.secure_url) {
        throw new Error(
          'Cloudinary did not return an image URL.'
        );
      }

      // Put uploaded image URL into profile preview
      setEditPhoto(data.secure_url);

      alert('Profile photo uploaded successfully.');

    } catch (error) {
      console.error(
        'Cloudinary upload error:',
        error
      );

      alert(
        error?.message ||
        'Unable to upload profile photo.'
      );
    } finally {
      setUploading(false);

      // Allow selecting the same file again
      event.target.value = '';
    }
  };

  /*
   * SAVE PROFILE
   *
   * This saves the name and profile photo
   * through your existing AuthContext updateUser().
   */
  const handleSaveProfile = async () => {
    const trimmedFirstName =
      editFirstName.trim();

    const trimmedLastName =
      editLastName.trim();

    if (!trimmedFirstName) {
      alert('First name is required.');
      return;
    }

    try {
      setSaving(true);

      /*
       * Keep using your existing updateUser()
       * from AuthContext.
       */
      await updateUser({
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        profile_photo: editPhoto
      });

      /*
       * Close the edit window only after
       * updateUser() finishes.
       */
      setEditOpen(false);
      setProfileOpen(false);

      alert('Profile updated successfully.');

    } catch (error) {
      console.error(
        'Save profile error:',
        error
      );

      alert(
        error?.message ||
        'Unable to save profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();

    navigate('/login', {
      replace: true
    });
  };

  /*
   * On mobile, once a user taps a nav link,
   * auto-collapse the sidebar.
   */
  const handleNavClick = () => {
    if (isMobile && !collapsed) {
      onToggle();
    }
  };

  return (
    <aside
      className={`sidebar ${
        collapsed
          ? 'sidebar-is-collapsed'
          : ''
      }`}
    >

      {/* HEADER */}

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
            size={26}
          />
        </button>

      </div>


      {/* PROFILE */}

      <div className="sidebar-profile-area">

        <button
          type="button"
          className="profile-trigger"
          onClick={toggleProfileDropdown}
        >

          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt="Profile"
              className="profile-avatar profile-photo"
            />
          ) : (
            <div className="profile-avatar">
              {nameInitial}
            </div>
          )}

          {!collapsed && (
            <div className="profile-text">
              <strong>{fullName}</strong>
              <span>{roleName}</span>
            </div>
          )}

          {!collapsed && (
            <span className="profile-arrow">
              {profileOpen ? '⌃' : '⌄'}
            </span>
          )}

        </button>


        {profileOpen && !collapsed && (

          <div className="profile-dropdown">

            {!editOpen ? (

              <button
                type="button"
                className="dropdown-edit-button"
                onClick={openEditProfile}
              >
                Edit Profile
              </button>

            ) : (

              <div className="inline-edit-form">

                <div className="inline-edit-header">

                  <span>
                    Edit Profile
                  </span>

                  <button
                    type="button"
                    className="inline-edit-close"
                    onClick={closeEditProfile}
                    aria-label="Close edit form"
                  >
                    <Icon
                      type="close"
                      size={16}
                    />
                  </button>

                </div>


                {/* PROFILE PHOTO */}

                <div className="edit-photo-section">

                  <div className="edit-photo-wrapper">

                    {editPhoto ? (

                      <img
                        src={editPhoto}
                        alt="Profile preview"
                        className="edit-profile-photo"
                      />

                    ) : (

                      <div className="edit-profile-photo edit-photo-placeholder">
                        {nameInitial}
                      </div>

                    )}

                    <label
                      htmlFor="profile-photo-input"
                      className="photo-upload-button"
                      title="Change profile photo"
                    >
                      <Icon
                        type="camera"
                        size={16}
                      />
                    </label>

                  </div>


                  <input
                    id="profile-photo-input"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handlePhotoChange}
                    hidden
                  />


                  {uploading && (
                    <span className="uploading-text">
                      Uploading photo...
                    </span>
                  )}

                </div>


                {/* FIRST NAME */}

                <div className="edit-form-group">

                  <label>
                    First Name
                  </label>

                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(event) =>
                      setEditFirstName(
                        event.target.value
                      )
                    }
                    placeholder="First name"
                  />

                </div>


                {/* LAST NAME */}

                <div className="edit-form-group">

                  <label>
                    Last Name
                  </label>

                  <input
                    type="text"
                    value={editLastName}
                    onChange={(event) =>
                      setEditLastName(
                        event.target.value
                      )
                    }
                    placeholder="Last name"
                  />

                </div>


                {/* BUTTONS */}

                <div className="edit-profile-actions">

                  <button
                    type="button"
                    className="cancel-profile-button"
                    onClick={closeEditProfile}
                    disabled={saving || uploading}
                  >
                    Cancel
                  </button>


                  <button
                    type="button"
                    className="save-profile-button"
                    onClick={handleSaveProfile}
                    disabled={uploading || saving}
                  >
                    {saving
                      ? 'Saving...'
                      : 'Save'}
                  </button>

                </div>

              </div>

            )}

          </div>

        )}

      </div>


      {/* NAVIGATION */}

      <nav className="sidebar-navigation">

        {menuItems.map(item => (

          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleNavClick}
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

          </NavLink>

        ))}

      </nav>


      {/* LOGOUT */}

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
            <span className="sidebar-logout-label">
              Logout
            </span>
          )}

        </button>

      </div>

    </aside>
  );
};

export default Sidebar;