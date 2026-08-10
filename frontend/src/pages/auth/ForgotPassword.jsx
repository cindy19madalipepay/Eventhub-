import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

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
      await api.post('/auth/forgot-password', { email });

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

  const handleDifferentEmail = () => {
    setStep(1);
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <>
      <style>{`
        .forgot-password-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
          background: #f5f7fb;
        }

        .forgot-password-card {
          width: 100%;
          max-width: 500px;
          background: #ffffff;
          padding: 42px 48px 34px;
          border-radius: 24px;
          box-sizing: border-box;
          box-shadow:
            0 20px 45px rgba(26, 46, 34, 0.14),
            0 5px 15px rgba(26, 46, 34, 0.06);
        }

        .forgot-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 34px;
        }

        .forgot-logo-img {
          width: 70px;
          height: 70px;
          object-fit: contain;
          display: block;
          margin-bottom: 12px;
        }

        .forgot-logo h1 {
          margin: 0;
          color: #17002f;
          font-size: 34px;
          font-weight: 800;
          line-height: 1.1;
          text-align: center;
        }

        .forgot-form {
          width: 100%;
        }

        .forgot-form-group {
          margin-bottom: 21px;
        }

        .forgot-form-group label {
          display: block;
          margin-bottom: 8px;
          color: #1f2937;
          font-size: 15px;
          font-weight: 600;
        }

        .forgot-form-group input {
          width: 100%;
          height: 54px;
          padding: 0 16px;
          box-sizing: border-box;
          border: 1px solid #d9dee7;
          border-radius: 12px;
          background: #ffffff;
          color: #1f2937;
          font-size: 15px;
          outline: none;
          transition: 0.2s ease;
        }

        .forgot-form-group input::placeholder {
          color: #9ca3af;
        }

        .forgot-form-group input:focus {
          border-color: #72c92d;
          box-shadow: 0 0 0 3px rgba(114, 201, 45, 0.14);
        }

        .forgot-description {
          margin: 0 0 24px;
          color: #4b5563;
          font-size: 15px;
          line-height: 1.5;
        }

        .forgot-description strong {
          color: #1f2937;
          font-weight: 700;
          word-break: break-word;
        }

        .forgot-submit-btn {
          width: 100%;
          height: 54px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #78a98c,
            #294d3d
          );
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .forgot-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 8px 18px rgba(41, 77, 61, 0.22);
        }

        .forgot-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .forgot-different-email {
          display: block;
          margin: 20px auto 0;
          padding: 0;
          border: none;
          background: transparent;
          color: #294d3d;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .forgot-different-email:hover {
          color: #72c92d;
          text-decoration: underline;
        }

        .forgot-login-link {
          margin: 26px 0 0;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }

        .forgot-login-link a {
          color: #1f2937;
          font-weight: 700;
          text-decoration: none;
        }

        .forgot-login-link a:hover {
          color: #72c92d;
          text-decoration: underline;
        }

        @media (max-width: 600px) {
          .forgot-password-page {
            padding: 16px;
          }

          .forgot-password-card {
            max-width: 100%;
            padding: 32px 24px 28px;
            border-radius: 20px;
          }

          .forgot-logo-img {
            width: 62px;
            height: 62px;
          }

          .forgot-logo h1 {
            font-size: 30px;
          }
        }
      `}</style>

      <div className="forgot-password-page">
        <div className="forgot-password-card">

          {/* EventHub Logo */}
          <div className="forgot-logo">
            <img
              src="/LG.png"
              alt="EventHub Logo"
              className="forgot-logo-img"
            />

            <h1>EventHub</h1>
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <form
              onSubmit={handleSendCode}
              className="forgot-form"
            >
              <div className="forgot-form-group">
                <label>Email Address</label>

                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="forgot-submit-btn"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>
            </form>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <form
              onSubmit={handleResetPassword}
              className="forgot-form"
            >
              <p className="forgot-description">
                Enter the 6-digit code sent to{' '}
                <strong>{email}</strong>
              </p>

              <div className="forgot-form-group">
                <label>Verification Code</label>

                <input
                  type="text"
                  inputMode="numeric"
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

              <div className="forgot-form-group">
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

              <div className="forgot-form-group">
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

              <button
                type="submit"
                className="forgot-submit-btn"
                disabled={loading}
              >
                {loading
                  ? 'Resetting...'
                  : 'Reset Password'}
              </button>

              <button
                type="button"
                className="forgot-different-email"
                onClick={handleDifferentEmail}
              >
                ← Use a different email
              </button>
            </form>
          )}

          {/* Login */}
          <p className="forgot-login-link">
            Remembered your password?{' '}
            <Link to="/login">Login</Link>
          </p>

        </div>
      </div>
    </>
  );
};

export default ForgotPassword;