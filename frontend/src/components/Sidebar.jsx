import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './Sidebar.css';

const menuItems = {
  admin: [
    { path: '/admin/dashboard',       label: 'Overview' },
    { path: '/admin/create-event',    label: 'Create Event' },
    { path: '/admin/attendance',      label: 'Departments' },
    { path: '/admin/receipts',        label: 'Receipts' },
    { path: '/admin/evaluation',      label: 'Evaluation Results' },
  ],
  department_head: [
    { path: '/dept/dashboard',    label: 'Dashboard' },
    { path: '/dept/attendance',   label: 'Attendance' },
    { path: '/dept/reports',      label: 'Reports' },
    { path: '/dept/evaluation',   label: 'Evaluation Results' },
  ],
  student: [
    { path: '/student/notifications', label: 'Notifications' },
    { path: '/student/my-events',     label: 'My Events' },
    { path: '/student/history',       label: 'History' },
  ],
  student_leader: [
    { path: '/student/notifications', label: 'Notifications' },
    { path: '/student/my-events',     label: 'My Events' },
    { path: '/student/history',       label: 'History' },
  ],
  alumni: [
    { path: '/student/notifications', label: 'Notifications' },
    { path: '/student/my-events',     label: 'My Events' },
    { path: '/student/history',       label: 'History' },
  ],
  stakeholder: [
    { path: '/student/notifications', label: 'Notifications' },
    { path: '/student/my-events',     label: 'My Events' },
    { path: '/student/history',       label: 'History' },
  ],
};

// TODO: point this at wherever your backend actually serves uploaded profile photos
const UPLOADS_BASE_URL = 'http://localhost:5000/uploads/profiles';

// Renders the user's photo if they have one, otherwise falls back to initials
const Avatar = ({ user, size = 'md', src }) => {
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`;
  const className = `user-avatar ${size === 'lg' ? 'user-avatar-lg' : ''}`;

  const photoUrl = src || (user?.profile_picture ? `${UPLOADS_BASE_URL}/${user.profile_picture}` : null);

  if (photoUrl) {
    return <div className={className}><img src={photoUrl} alt="" className="user-avatar-img" /></div>;
  }
  return <div className={className}>{initials}</div>;
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // ─── Profile popover state ────────────────────────────────
  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localUser, setLocalUser] = useState(user);
  const [form, setForm] = useState({ first_name: '', last_name: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const popoverRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLocalUser(user);
  }, [user]);

  // Clean up the object URL we create for the preview so it doesn't leak
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  // Close popover when clicking outside it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setProfileOpen(false);
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const studentLikeRoles = ['student', 'student_leader', 'alumni', 'stakeholder'];
    if (!studentLikeRoles.includes(user?.role)) return;

    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications/my');
        const count = (res.data.notifications || []).filter((n) => !n.is_read).length;
        setUnreadCount(count);
      } catch (e) {
        console.error(e);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  const openProfile = () => {
    setProfileOpen((prev) => !prev);
    setEditing(false);
  };

  const startEditing = () => {
    setForm({
      first_name: localUser?.first_name || '',
      last_name: localUser?.last_name || '',
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

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // TODO: point this at your actual profile-update endpoint.
      // Using FormData so it works whether or not a new photo was picked.
      const payload = new FormData();
      payload.append('first_name', form.first_name);
      payload.append('last_name', form.last_name);
      if (avatarFile) payload.append('avatar', avatarFile);

      const res = await api.put('/users/profile', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Adjust this if your backend returns the updated user under a
      // different key (e.g. res.data.user vs res.data directly)
      const updatedUser = res.data?.user || res.data || {};

      setLocalUser((prev) => ({ ...prev, ...form, ...updatedUser }));
      toast.success('Profile updated.');
      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const items = menuItems[user?.role] || [];

  const getRoleDisplay = (role) => {
    if (role === 'department_head') return 'Dept. Head';
    if (role === 'student_leader') return 'Student Leader';
    return role;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/LG.png" alt="EventHub Logo" className="sidebar-logo-img" />
        <span>EventHub</span>
      </div>

      <div className="sidebar-user-wrapper" ref={popoverRef}>
        <button className="sidebar-user" onClick={openProfile}>
          <Avatar user={localUser} />
          <div className="user-info">
            <p className="user-name">{localUser?.first_name} {localUser?.last_name}</p>
            <p className="user-role">{getRoleDisplay(localUser?.role)}</p>
          </div>
          <span className={`user-caret ${profileOpen ? 'open' : ''}`}>▾</span>
        </button>

        {profileOpen && (
          <div className="profile-popover">
            {!editing ? (
              <>
                <div className="profile-popover-header">
                  <Avatar user={localUser} size="lg" />
                  <div>
                    <p className="profile-popover-name">{localUser?.first_name} {localUser?.last_name}</p>
                    <p className="profile-popover-role">{getRoleDisplay(localUser?.role)}</p>
                  </div>
                </div>
                {localUser?.email && (
                  <p className="profile-popover-email">{localUser.email}</p>
                )}
                <button className="profile-popover-btn" onClick={startEditing}>
                  Edit Profile
                </button>
              </>
            ) : (
              <form className="profile-popover-form" onSubmit={handleSave}>
                <div className="avatar-edit-row">
                  <Avatar user={localUser} size="lg" src={avatarPreview} />
                  <div className="avatar-edit-actions">
                    <button
                      type="button"
                      className="avatar-edit-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Photo
                    </button>
                    <span className="avatar-edit-hint">JPG or PNG, up to 5MB</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarPick}
                    hidden
                  />
                </div>

                <label>First Name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
                <label>Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
                <div className="profile-popover-actions">
                  <button type="button" className="profile-popover-cancel" onClick={cancelEditing}>
                    Cancel
                  </button>
                  <button type="submit" className="profile-popover-save" disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-label">{item.label}</span>
            {item.label === 'Notifications' && unreadCount > 0 && (
              <span className="nav-badge">{unreadCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <button className="sidebar-logout" onClick={handleLogout}>
        <span>Logout</span>
      </button>
    </aside>
  );
};

export default Sidebar;