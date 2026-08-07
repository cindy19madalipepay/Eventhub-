import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', role: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [category, setCategory] = useState(null); // 'regular' | 'staff'

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const selectCategory = (cat) => {
    setCategory(cat);
    setForm({ ...form, role: '' }); // reset role when switching category
  };

  const selectRole = (role) => setForm({ ...form, role });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.role) return toast.error('Please select your account type.');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.first_name}!`);

      // Redirect based on role
      if (res.data.user.role === 'admin') navigate('/admin/dashboard');
      else if (res.data.user.role === 'department_head') navigate('/dept/dashboard');
      else navigate('/student/notifications'); // student, student_leader, alumni, stakeholder

    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Role options per category
  const regularRoles = [
    { key: 'student', label: 'Student' },
    { key: 'student_leader', label: 'Student Leader' },
    { key: 'alumni', label: 'Alumni' },
    { key: 'stakeholder', label: 'Stakeholder' },
  ];

  const staffRoles = [
    { key: 'admin', label: 'Admin' },
    { key: 'department_head', label: 'Department Head' },
  ];

  return (
    <div className="login-wrapper">
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo">
          <img src="/LG.png" alt="EventHub Logo" className="logo-img" />
          <h1 className="logo-text">EventHub</h1>
        </div>

        <form onSubmit={handleSubmit} className="login-form">

          {/* Step 1: Choose Category */}
          <div className="form-group">
            <label>I am a...</label>
            <div className="category-selector">
              <button
                type="button"
                className={`category-btn ${category === 'regular' ? 'active' : ''}`}
                onClick={() => selectCategory('regular')}
              >
                <span className="cat-label">Regular User</span>
                <span className="cat-sub">Student / Student Leader / Alumni / Stakeholder</span>
              </button>
              <button
                type="button"
                className={`category-btn ${category === 'staff' ? 'active' : ''}`}
                onClick={() => selectCategory('staff')}
              >
                <span className="cat-label">Admin / Dept Head</span>
                <span className="cat-sub">System Staff</span>
              </button>
            </div>
          </div>

          {/* Step 2: Choose Specific Role */}
          {category && (
            <div className="form-group">
              <label>Select your role</label>
              <div className="role-selector">
                {(category === 'regular' ? regularRoles : staffRoles).map((r) => (
                  <button
                    type="button"
                    key={r.key}
                    className={`role-btn ${form.role === r.key ? 'active' : ''}`}
                    onClick={() => selectRole(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="forgot-row">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          {/* Submit */}
          <button type="submit" className="btn-login" disabled={loading || !form.role}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

        </form>

        {/* Register */}
        <p className="register-link">
          Don't have an account? <Link to="/register">Create Account</Link>
        </p>

      </div>
    </div>
  );
};

export default Login;