import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './Login.css';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      await api.post('/auth/forgot-password', {
        email,
      });

      toast.success('Code sent! Check your email.');
      setStep(2);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        email,
        code,
        new_password: newPassword,
      });

      toast.success(
        'Password reset successfully! Please log in.'
      );

      navigate('/login');
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Invalid or expired code.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* EventHub Logo - ONLY CHANGE */}
        <div className="login-logo">
          <img
            src="/LG.png"
            alt="EventHub Logo"
            className="logo-img"
          />

          <h1 className="logo-text">
            EventHub
          </h1>
        </div>

        {step === 1 && (
          <form
            onSubmit={handleSendCode}
            className="login-form"
          >
            <div className="form-group">
              <label>Email Address</label>

              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />
            </div>

            <button
              type="submit"
              className="btn-login"
              disabled={loading}
            >
              {loading
                ? 'Sending...'
                : 'Send Code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={handleResetPassword}
            className="login-form"
          >
            <p
              style={{
                marginBottom: '1rem',
                fontSize: '0.9rem',
              }}
            >
              Enter the 6-digit code sent to{' '}
              <strong>{email}</strong>
            </p>

            <div className="form-group">
              <label>
                Verification Code
              </label>

              <input
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value)
                }
                maxLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label>
                New Password
              </label>

              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label>
                Confirm New Password
              </label>

              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                required
              />
            </div>

            <button
              type="submit"
              className="btn-login"
              disabled={loading}
            >
              {loading
                ? 'Resetting...'
                : 'Reset Password'}
            </button>

            <p
              className="register-link"
              style={{
                marginTop: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0f3460',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ← Use a different email
              </button>
            </p>
          </form>
        )}

        <p className="register-link">
          Remembered your password?{' '}
          <Link to="/login">
            Login
          </Link>
        </p>

      </div>
    </div>
  );
};

export default ForgotPassword;