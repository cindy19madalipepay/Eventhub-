import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './Login.css';

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Step 1 = enter email
  // Step 2 = enter verification code + new password
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);

  // ============================================================
  // SEND VERIFICATION CODE
  // ============================================================
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

  // ============================================================
  // RESET PASSWORD
  // ============================================================
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
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

        {/* =====================================================
            EVENTHUB LOGO
        ===================================================== */}
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

        {/* =====================================================
            STEP 1 - ENTER EMAIL
        ===================================================== */}
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
              {loading ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        )}

        {/* =====================================================
            STEP 2 - VERIFICATION CODE + PASSWORD
        ===================================================== */}
        {step === 2 && (
          <form
            onSubmit={handleResetPassword}
            className="login-form"
          >
            <p className="reset-message">
              Enter the 6-digit code sent to{' '}
              <strong>{email}</strong>
            </p>

            {/* Verification Code */}
            <div className="form-group">
              <label>Verification Code</label>

              <input
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  )
                }
                maxLength={6}
                required
              />
            </div>

            {/* New Password */}
            <div className="form-group">
              <label>New Password</label>

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

            {/* Confirm Password */}
            <div className="form-group">
              <label>Confirm New Password</label>

              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                required
              />
            </div>

            {/* Reset Password Button */}
            <button
              type="submit"
              className="btn-login"
              disabled={loading}
            >
              {loading
                ? 'Resetting...'
                : 'Reset Password'}
            </button>

            {/* Use Different Email */}
            <p className="register-link reset-back">
              <button
                type="button"
                className="different-email-btn"
                onClick={() => {
                  setStep(1);
                  setCode('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                ← Use a different email
              </button>
            </p>
          </form>
        )}

        {/* =====================================================
            LOGIN LINK
        ===================================================== */}
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