import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './Register.css';

// ── Terms & Conditions Content ────────────────────────────────
const TERMS = [
  {
    title: '1. Account Responsibility',
    body: 'You are solely responsible for maintaining the confidentiality of your account credentials. Any activity that occurs under your account is your responsibility. Do not share your password with anyone. Report any unauthorized use of your account to the EventHub administrator immediately.',
  },
  {
    title: '2. Accurate Information',
    body: 'You must provide truthful, accurate, and complete information during registration, including your real full name, correct department, year level, and block. Providing false information may result in immediate account suspension and disqualification from events.',
  },
  {
    title: '3. Event Attendance',
    body: 'By registering for an event, you commit to attending it. Repeated no-shows after registration may affect your standing in the system. Your attendance is recorded via QR code scanning and is used for official academic monitoring purposes.',
  },
  {
    title: '4. Payment Policy',
    body: 'For paid events, payment must be completed and validated by an administrator before your ticket is activated. Payments are non-refundable unless the event is officially cancelled by the administrator. Always upload a clear and authentic proof of payment.',
  },
  {
    title: '5. QR Code Usage',
    body: 'Your event QR code ticket is strictly personal and non-transferable. Sharing, selling, or duplicating your QR code is strictly prohibited. Any misuse will result in permanent account suspension and may be subject to disciplinary action.',
  },
  {
    title: '6. Data Privacy',
    body: 'EventHub collects and stores your personal information including name, department, attendance records, and event history solely for the purpose of academic event monitoring and management. Your data will not be shared with third parties outside of the institution.',
  },
  {
    title: '7. Code of Conduct',
    body: 'You agree to behave respectfully and follow all rules and regulations set for each event. Disruptive, disrespectful, or inappropriate behavior during events may result in removal from the event and suspension of your account.',
  },
  {
    title: '8. Violations & Sanctions',
    body: 'The EventHub administration reserves the right to suspend or permanently deactivate accounts found to be in violation of these Terms and Conditions without prior notice. Violations include but are not limited to: falsifying information, QR code misuse, and payment fraud.',
  },
];

// ── Terms Modal Component ─────────────────────────────────────
const TermsModal = ({ onAccept, onClose }) => {
  const [canAccept, setCanAccept] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
    if (atBottom) setCanAccept(true);
  };

  return (
    <div className="terms-overlay">
      <div className="terms-modal">
        <div className="terms-modal-header">
          <div className="terms-logo-row">
            <img src="/LG.png" alt="EventHub Logo" className="terms-logo-img" />
            <span>EventHub</span>
          </div>
          <h2>Terms & Conditions</h2>
          <p>Please scroll through the entire document to enable the Accept button.</p>
        </div>

        <div className="terms-scroll-body" ref={scrollRef} onScroll={handleScroll}>
          <p className="terms-intro">
            Welcome to EventHub — the Web-Based Attendance Monitoring and Management System.
            By creating an account, you agree to the following terms and conditions. Please read them carefully.
          </p>

          {TERMS.map((section, i) => (
            <div key={i} className="terms-section">
              <h4>{section.title}</h4>
              <p>{section.body}</p>
            </div>
          ))}

          <div className="terms-footer-note">
            By clicking "I Accept", you confirm that you have read, understood, and agreed to all
            of the Terms and Conditions stated above. These terms are effective immediately upon
            account creation.
          </div>
        </div>

        {!canAccept && (
          <p className="terms-scroll-hint">↓ Scroll to the bottom to enable the Accept button</p>
        )}

        <div className="terms-modal-actions">
          <button className="btn-terms-decline" onClick={onClose}>Decline</button>
          <button className="btn-terms-accept" onClick={onAccept} disabled={!canAccept}>
             I Accept
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Register Page ─────────────────────────────────────────────
const Register = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [showTerms, setShowTerms] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(null); // 'regular' | 'staff'

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', role: '',
    department_id: '', year_level: '', block: '', position: '', organization: ''
  });

  useEffect(() => {
    api.get('/auth/departments').catch(() => {
      setDepartments([
        { department_id: 1, department_name: 'Bachelor of Science in Information Technology',  department_code: 'BSIT' },
        { department_id: 2, department_name: 'Bachelor of Science in Business Administration', department_code: 'BSBA' },
        { department_id: 3, department_name: 'Bachelor of Elementary Education',    department_code: 'BEED' },
        { department_id: 4, department_name: 'Bachelor of Secondary Education',     department_code: 'BSED' },
      ]);
    }).then(res => {
      if (res?.data?.departments) setDepartments(res.data.departments);
    });
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const selectCategory = (cat) => {
    setCategory(cat);
    setForm({ ...form, role: '', department_id: '', year_level: '', block: '', position: '', organization: '' });
  };

  const selectRole = (role) => {
    setForm({ ...form, role, department_id: '', year_level: '', block: '', position: '', organization: '' });
  };

  const handleAcceptTerms = () => {
    setAccepted(true);
    setShowTerms(false);
    toast.success('Terms accepted! You can now create your account.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Must accept T&C before registering
    if (!accepted) {
      toast.error('Please read and accept the Terms & Conditions first.');
      setShowTerms(true);
      return;
    }

    if (!form.role) return toast.error('Please select your account type.');

    // Validation based on role
    if (form.role === 'student') {
      if (!form.department_id) return toast.error('Please select a department.');
      if (!form.year_level || !form.block) return toast.error('Please select your year level and block.');
      if (!form.first_name || !form.last_name) return toast.error('Please enter your full name.');
    }

    if (form.role === 'student_leader') {
      if (!form.department_id) return toast.error('Please select a department.');
      if (!form.year_level || !form.block) return toast.error('Please select your year level and block.');
      if (!form.first_name || !form.last_name) return toast.error('Please enter your full name.');
      if (!form.position) return toast.error('Please enter your position or designation.');
      if (!form.organization) return toast.error('Please enter your organization.');
    }

    if (form.role === 'alumni') {
      if (!form.department_id) return toast.error('Please select a department.');
      if (!form.first_name || !form.last_name) return toast.error('Please enter your full name.');
    }

    if (form.role === 'stakeholder') {
      if (!form.first_name || !form.last_name) return toast.error('Please enter your full name.');
    }

    if (form.role === 'department_head') {
      if (!form.department_id) return toast.error('Please select a department.');
    }

    setLoading(true);
    try {
      let payload = { ...form };

      if (form.role === 'admin') {
        payload = { ...payload, first_name: 'Admin', last_name: 'Account' };
      } else if (form.role === 'department_head') {
        const dept = departments.find(d => String(d.department_id) === String(form.department_id));
        payload = { ...payload, first_name: dept?.department_code || 'Dept', last_name: 'Head' };
      }

      // Clean up fields not needed for certain roles
      if (form.role === 'alumni') {
        payload.year_level = null;
        payload.block = null;
      }
      if (form.role === 'stakeholder') {
        payload.department_id = null;
        payload.year_level = null;
        payload.block = null;
      }
      if (form.role !== 'student_leader') {
        payload.position = null;
        payload.organization = null;
      }

      await api.post('/auth/register', payload);
      toast.success('Account created! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Role options
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
    <div className="register-wrapper">

      {/* Terms Modal */}
      {showTerms && (
        <TermsModal
          onAccept={handleAcceptTerms}
          onClose={() => setShowTerms(false)}
        />
      )}

      <div className="register-card">
        <div className="register-logo">
          <img src="/LG.png" alt="EventHub Logo" className="logo-img" />
          <h1>Create Account</h1>
        </div>

        <form onSubmit={handleSubmit} className="register-form">

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
                    key={r.key}
                    type="button"
                    className={`role-btn ${form.role === r.key ? 'active' : ''}`}
                    onClick={() => selectRole(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name — for student, student_leader, alumni, stakeholder */}
          {(form.role === 'student' || form.role === 'student_leader' || form.role === 'alumni' || form.role === 'stakeholder') && (
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input name="first_name" placeholder="First name" value={form.first_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input name="last_name" placeholder="Last name" value={form.last_name} onChange={handleChange} required />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" name="email" placeholder="your@email.com" value={form.email} onChange={handleChange} required />
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" placeholder="Create a password" value={form.password} onChange={handleChange} required />
          </div>

          {/* Department — for student, student_leader, alumni, department_head */}
          {(form.role === 'student' || form.role === 'student_leader' || form.role === 'alumni' || form.role === 'department_head') && (
            <div className="form-group">
              <label>Department</label>
              <select name="department_id" value={form.department_id} onChange={handleChange} required>
                <option value="">Select department</option>
                {departments.map(d => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.department_name} ({d.department_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Year & Block — for students and student leaders */}
          {(form.role === 'student' || form.role === 'student_leader') && (
            <div className="form-row">
              <div className="form-group">
                <label>Year Level</label>
                <select name="year_level" value={form.year_level} onChange={handleChange} required>
                  <option value="">Select year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              <div className="form-group">
                <label>Block</label>
                <select name="block" value={form.block} onChange={handleChange} required>
                  <option value="">Select block</option>
                  {['A','B','C','D','E'].map(b => (
                    <option key={b} value={b}>Block {b}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Position / Designation — only for student leaders */}
          {form.role === 'student_leader' && (
            <div className="form-group">
              <label>Position / Designation</label>
              <input
                name="position"
                placeholder="e.g. SSC President, Class Representative, Org Treasurer"
                value={form.position}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {/* Organization — only for student leaders */}
          {form.role === 'student_leader' && (
            <div className="form-group">
              <label>Organization</label>
              <input
                name="organization"
                placeholder="e.g. Supreme Student Council, CS Society"
                value={form.organization}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {/* Info note for department head */}
          {form.role === 'department_head' && (
            <p style={{ fontSize: 12, color: '#888', margin: '-4px 0 4px' }}>
              You'll only be able to view and manage data for the department you select above.
            </p>
          )}

          {/* Terms & Conditions */}
          <div className="terms-row">
            {accepted ? (
              <div className="terms-accepted-badge"> Terms & Conditions accepted</div>
            ) : (
              <button type="button" className="btn-view-terms" onClick={() => setShowTerms(true)}>
               Read & Accept Terms and Conditions
              </button>
            )}
          </div>

          <button type="submit" className="btn-register" disabled={loading || !form.role}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

        </form>

        <p className="login-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;