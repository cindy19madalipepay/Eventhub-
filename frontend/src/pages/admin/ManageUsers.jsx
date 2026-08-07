import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './ManageUsers.css';

const ManageUsers = () => {
  const [users, setUsers]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [actioningId, setActioningId] = useState(null);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    first_name: '', last_name: '', email: '', role: '', department_id: '', year_level: '', block: '',
  });

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [createForm, setCreateForm] = useState({
    first_name: '', last_name: '', email: '', password: '',
    role: 'department_head', department_id: '', year_level: '', block: '',
  });

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  useEffect(() => {
    api.get('/auth/departments')
      .then(res => { if (res?.data?.departments) setDepartments(res.data.departments); })
      .catch(() => {});
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/users', { params });
      setUsers(res.data.users || []);
    } catch (err) {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    setActioningId(id);
    try {
      const res = await api.put(`/users/${id}/status`);
      toast.success(res.data.message);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === id ? { ...u, is_active: res.data.is_active ? 1 : 0 } : u))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setActioningId(id);
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted.');
      setUsers((prev) => prev.filter((u) => u.user_id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setActioningId(null);
    }
  };

  const openEdit = (user) => {
    setEditingUser(user.user_id);
    setEditForm({
      first_name:    user.first_name    || '',
      last_name:     user.last_name     || '',
      email:         user.email         || '',
      role:          user.role          || '',
      department_id: user.department_id || '',
      year_level:    user.year_level    || '',
      block:         user.block         || '',
    });
  };

  const closeEdit = () => setEditingUser(null);

  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/users/${editingUser}`, editForm);
      toast.success('User updated.');
      fetchUsers();
      closeEdit();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleCreateChange = (e) => setCreateForm({ ...createForm, [e.target.name]: e.target.value });

  const openCreate = () => {
    setCreateForm({
      first_name: '', last_name: '', email: '', password: '',
      role: 'department_head', department_id: '', year_level: '', block: '',
    });
    setShowCreate(true);
  };

  const closeCreate = () => setShowCreate(false);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      // Admin and Department Head accounts aren't tied to a personal name in this app —
      // auto-fill a placeholder so the required first_name/last_name columns stay satisfied.
      let payload = { ...createForm };
      if (createForm.role === 'admin') {
        payload = { ...payload, first_name: 'Admin', last_name: 'Account' };
      } else if (createForm.role === 'department_head') {
        const dept = departments.find(d => String(d.department_id) === String(createForm.department_id));
        payload = { ...payload, first_name: dept?.department_code || 'Dept', last_name: 'Head' };
      }

      await api.post('/users', payload);
      toast.success('User created successfully.');
      closeCreate();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2>Manage Users</h2>
          <p>View, edit, activate, or remove user accounts.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #72C92D, #A8E63E)',
            color: '#1B0833',
            border: 'none',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + Create User
        </button>
      </div>

      <div className="card filter-row">
        <div className="form-group">
          <label>Filter by Role</label>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
            <option value="department_head">Department Head</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card"><p>Loading users...</p></div>
      ) : users.length === 0 ? (
        <div className="card"><p style={{ color: '#777', textAlign: 'center' }}>No users found.</p></div>
      ) : (
        <div className="card table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td>{u.first_name} {u.last_name}</td>
                  <td>{u.email}</td>
                  <td><span className="role-badge">{u.role.replace('_', ' ')}</span></td>
                  <td>{u.department_name || '—'}</td>
                  <td>
                    <span className={`status-dot ${u.is_active ? 'active' : 'inactive'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="btn-edit" onClick={() => openEdit(u)}>Edit</button>
                    <button
                      className="btn-toggle"
                      disabled={actioningId === u.user_id}
                      onClick={() => handleToggleStatus(u.user_id)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn-delete"
                      disabled={actioningId === u.user_id}
                      onClick={() => handleDelete(u.user_id, `${u.first_name} ${u.last_name}`)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={closeCreate}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Create User</h3>
            <form onSubmit={handleCreateSubmit} className="edit-form">
              {createForm.role === 'student' && (
                <>
                  <div className="form-group">
                    <label>First Name</label>
                    <input name="first_name" value={createForm.first_name} onChange={handleCreateChange} required />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input name="last_name" value={createForm.last_name} onChange={handleCreateChange} required />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={createForm.email} onChange={handleCreateChange} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" value={createForm.password} onChange={handleCreateChange} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select name="role" value={createForm.role} onChange={handleCreateChange}>
                  <option value="department_head">Department Head</option>
                  <option value="admin">Admin</option>
                  <option value="student">Student</option>
                </select>
              </div>
              {(createForm.role === 'department_head' || createForm.role === 'student') && (
                <div className="form-group">
                  <label>Department</label>
                  <select name="department_id" value={createForm.department_id} onChange={handleCreateChange} required>
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.department_name} ({d.department_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {createForm.role === 'student' && (
                <>
                  <div className="form-group">
                    <label>Year Level</label>
                    <select name="year_level" value={createForm.year_level} onChange={handleCreateChange} required>
                      <option value="">Select year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Block</label>
                    <select name="block" value={createForm.block} onChange={handleCreateChange} required>
                      <option value="">Select block</option>
                      {['A','B','C','D','E'].map(b => (
                        <option key={b} value={b}>Block {b}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeCreate}>Cancel</button>
                <button type="submit" className="btn-save" disabled={creating}>
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Edit User</h3>
            <form onSubmit={handleSaveEdit} className="edit-form">
              <div className="form-group">
                <label>First Name</label>
                <input name="first_name" value={editForm.first_name} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input name="last_name" value={editForm.last_name} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={editForm.email} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select name="role" value={editForm.role} onChange={handleEditChange}>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                  <option value="department_head">Department Head</option>
                </select>
              </div>
              {(editForm.role === 'student' || editForm.role === 'department_head') && (
                <div className="form-group">
                  <label>Department</label>
                  <select name="department_id" value={editForm.department_id} onChange={handleEditChange} required>
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.department_name} ({d.department_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {editForm.role === 'student' && (
                <>
                  <div className="form-group">
                    <label>Year Level</label>
                    <input name="year_level" value={editForm.year_level} onChange={handleEditChange} />
                  </div>
                  <div className="form-group">
                    <label>Block</label>
                    <input name="block" value={editForm.block} onChange={handleEditChange} />
                  </div>
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeEdit}>Cancel</button>
                <button type="submit" className="btn-save">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManageUsers;
