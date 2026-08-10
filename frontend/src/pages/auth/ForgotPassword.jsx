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

  // ============================================================
  // USE DIFFERENT EMAIL
  // ============================================================
  const handleDifferentEmail = () => {
    setStep(1);
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <>
      <style>{`

        /* =====================================================
           FORGOT PASSWORD PAGE
        ===================================================== */

        .forgot-password-page {
          min-height: 100vh;
          width: 100%;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 30px 20px;

          box-sizing: border-box;

          background: linear-gradient(
            135deg,
            #dcefe4 0%,
            #a8d5ba 45%,
            #6f9f86 100%
          );
        }


        /* =====================================================
           FORGOT PASSWORD CARD
        ===================================================== */

        .forgot-password-card {
          width: 100%;
          max-width: 500px;

          background: #ffffff;

          padding: 42px 46px;

          box-sizing: border-box;

          border-radius: 24px;

          box-shadow:
            0 20px 50px rgba(27, 50, 39, 0.20);

          animation: forgotPasswordAppear 0.35s ease;
        }


        /* =====================================================
           EVENTHUB LOGO
        ===================================================== */

        .forgot-password-card .login-logo {
          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          margin-bottom: 34px;
        }

        .forgot-password-card .logo-img {
          width: 72px;
          height: 72px;

          object-fit: contain;

          display: block;

          margin-bottom: 12px;
        }

        .forgot-password-card .logo-text {
          margin: 0;

          font-size: 32px;
          font-weight: 800;

          line-height: 1.1;

          color: #16002f;

          text-align: center;
        }


        /* =====================================================
           FORM
        ===================================================== */

        .forgot-password-card .login-form {
          width: 100%;
        }

        .forgot-password-card .form-group {
          margin-bottom: 22px;
        }

        .forgot-password-card .form-group label {
          display: block;

          margin-bottom: 8px;

          color: #1f2937;

          font-size: 15px;
          font-weight: 700;
        }


        /* =====================================================
           INPUTS
        ===================================================== */

        .forgot-password-card .form-group input {
          width: 100%;
          height: 54px;

          padding: 0 16px;

          box-sizing: border-box;

          border: 1px solid #d9dfe5;

          border-radius: 12px;

          background: #ffffff;

          color: #1f2937;

          font-size: 15px;

          outline: none;

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .forgot-password-card .form-group input::placeholder {
          color: #9ca3af;
        }

        .forgot-password-card .form-group input:focus {
          border-color: #5c8f73;

          box-shadow:
            0 0 0 3px rgba(92, 143, 115, 0.15);
        }


        /* =====================================================
           VERIFICATION MESSAGE
        ===================================================== */

        .verification-message {
          margin: 0 0 24px;

          color: #374151;

          font-size: 15px;

          line-height: 1.5;
        }

        .verification-message strong {
          color: #172d22;

          font-weight: 700;

          word-break: break-word;
        }


        /* =====================================================
           RESET PASSWORD / SEND CODE BUTTON
        ===================================================== */

        .forgot-password-card .btn-login {
          width: 100%;
          height: 54px;

          border: none;

          border-radius: 12px;

          background: linear-gradient(
            135deg,
            #719c83,
            #315b48
          );

          color: #ffffff;

          font-size: 16px;
          font-weight: 700;

          cursor: pointer;

          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            opacity 0.2s ease;
        }

        .forgot-password-card .btn-login:hover:not(:disabled) {
          transform: translateY(-1px);

          box-shadow:
            0 8px 18px rgba(49, 91, 72, 0.25);
        }

        .forgot-password-card .btn-login:active {
          transform: translateY(0);
        }

        .forgot-password-card .btn-login:disabled {
          opacity: 0.65;

          cursor: not-allowed;

          transform: none;

          box-shadow: none;
        }


        /* =====================================================
           USE DIFFERENT EMAIL BUTTON
        ===================================================== */

        .forgot-password-card .different-email {
          margin-top: 14px;

          width: 100%;
        }

        .forgot-password-card .different-email button {
          width: 100%;
          height: 48px;

          border: 1px solid #315b48;

          border-radius: 12px;

          background: #eef6f1;

          color: #315b48;

          font-size: 14px;

          font-weight: 700;

          cursor: pointer;

          transition:
            background 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .forgot-password-card .different-email button:hover {
          background: linear-gradient(
            135deg,
            #719c83,
            #315b48
          );

          color: #ffffff;

          transform: translateY(-1px);

          box-shadow:
            0 7px 16px rgba(49, 91, 72, 0.20);
        }

        .forgot-password-card .different-email button:active {
          transform: translateY(0);
        }


        /* =====================================================
           LOGIN LINK
        ===================================================== */

        .forgot-password-card .register-link {
          margin: 22px 0 0;

          text-align: center;

          color: #6b7280;

          font-size: 14px;
        }

        .forgot-password-card .register-link a {
          color: #172d22;

          font-weight: 700;

          text-decoration: none;

          transition: color 0.2s ease;
        }

        .forgot-password-card .register-link a:hover {
          color: #315b48;

          text-decoration: underline;
        }


        /* =====================================================
           ANIMATION
        ===================================================== */

        @keyframes forgotPasswordAppear {
          from {
            opacity: 0;

            transform: translateY(12px);
          }

          to {
            opacity: 1;

            transform: translateY(0);
          }
        }


        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 600px) {

          .forgot-password-page {
            padding: 20px 14px;
          }

          .forgot-password-card {
            max-width: 100%;

            padding: 32px 24px;

            border-radius: 20px;
          }

          .forgot-password-card .logo-img {
            width: 64px;
            height: 64px;
          }

          .forgot-password-card .logo-text {
            font-size: 28px;
          }

          .forgot-password-card .form-group input {
            height: 52px;
          }

          .forgot-password-card .btn-login {
            height: 52px;
          }
        }

      `}</style>

      {/* =====================================================
          FORGOT PASSWORD PAGE
      ===================================================== */}

      <div className="forgot-password-page">

        <div className="forgot-password-card">

          {/* =================================================
              EVENTHUB LOGO
          ================================================= */}

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


          {/* =================================================
              STEP 1 - ENTER EMAIL
          ================================================= */}

          {step === 1 && (
            <form
              onSubmit={handleSendCode}
              className="login-form"
            >

              <div className="form-group">

                <label>
                  Email Address
                </label>

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


          {/* =================================================
              STEP 2 - VERIFICATION + PASSWORD
          ================================================= */}

          {step === 2 && (
            <form
              onSubmit={handleResetPassword}
              className="login-form"
            >

              {/* Verification message */}

              <p className="verification-message">
                Enter the 6-digit code sent to{' '}
                <strong>{email}</strong>
              </p>


              {/* Verification Code */}

              <div className="form-group">

                <label>
                  Verification Code
                </label>

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


              {/* New Password */}

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


              {/* Confirm Password */}

              <div className="form-group">

                <label>
                  Confirm New Password
                </label>

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


              {/* Reset Password */}

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

              <p className="different-email">

                <button
                  type="button"
                  onClick={handleDifferentEmail}
                >
                  ← Use a different email
                </button>

              </p>

            </form>
          )}


          {/* =================================================
              LOGIN LINK
          ================================================= */}

          <p className="register-link">

            Remembered your password?{' '}

            <Link to="/login">
              Login
            </Link>

          </p>

        </div>

      </div>
    </>
  );
};

export default ForgotPassword;