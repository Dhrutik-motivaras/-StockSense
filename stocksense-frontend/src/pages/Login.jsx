import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Boxes, KeyRound, Mail, User, Lock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  
  // Login Form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Register Form
  const [regData, setRegData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
  });

  // OTP Reset Form
  const [otpStep, setOtpStep] = useState(1); // 1: request, 2: verify
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpUsername, setOtpUsername] = useState('');

  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Signed in successfully! Welcome to StockSense.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(regData);
      toast.success('Account created successfully! Welcome to StockSense.');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.username?.[0] || err.response?.data?.error || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('auth/request-otp/', { identifier: otpIdentifier });
      toast.success(res.data.message);
      setOtpUsername(res.data.username);
      if (res.data.otp_preview) {
        setOtpCode(res.data.otp_preview); // prefill preview for hackathon demo convenience
      }
      setOtpStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('auth/reset-password/', {
        username: otpUsername,
        otp: otpCode,
        new_password: newPassword,
      });
      toast.success('Password updated successfully! Please sign in with your new password.');
      setShowOtpModal(false);
      setOtpStep(1);
      setUsername(otpUsername);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #15223e 0%, #090d16 80%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'var(--bg-sidebar)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '36px 32px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 12px',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
          }}>
            <Boxes size={28} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff' }}>StockSense IMS</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {isRegister ? 'Create staff credentials' : 'Sign in to access centralized inventory operations'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-card)',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '24px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              background: !isRegister ? 'var(--accent-primary)' : 'transparent',
              color: !isRegister ? '#fff' : 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              background: isRegister ? 'var(--accent-primary)' : 'transparent',
              color: isRegister ? '#fff' : 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Create Staff Account
          </button>
        </div>

        {!isRegister ? (
          /* Sign In Form */
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Username or Email</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                  placeholder="admin or username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>Password</label>
                <button
                  type="button"
                  onClick={() => setShowOtpModal(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '11px', cursor: 'pointer' }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '10px' }}
            >
              <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={regData.first_name}
                  onChange={(e) => setRegData({ ...regData, first_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={regData.last_name}
                  onChange={(e) => setRegData({ ...regData, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                className="form-control"
                placeholder="staff_alex"
                value={regData.username}
                onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="alex@company.com"
                value={regData.email}
                onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Password (min 6 characters)</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={regData.password}
                onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '10px' }}
            >
              <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>

      {/* OTP Password Reset Modal */}
      {showOtpModal && (
        <div className="modal-backdrop" onClick={() => setShowOtpModal(false)}>
          <div className="modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>OTP Password Reset</h3>
              <button className="modal-close" onClick={() => setShowOtpModal(false)}>✕</button>
            </div>
            
            {otpStep === 1 ? (
              <form onSubmit={handleRequestOtp}>
                <div className="modal-body">
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Enter your username or email address. The system will dispatch a 6-digit verification code.
                  </p>
                  <div className="form-group">
                    <label>Username or Email</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="admin or registered email"
                      value={otpIdentifier}
                      onChange={(e) => setOtpIdentifier(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowOtpModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="modal-body">
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '10px', borderRadius: '8px', fontSize: '12px', color: '#6ee7b7' }}>
                    OTP sent for <strong>{otpUsername}</strong>. (Mock OTP logged in Django terminal).
                  </div>
                  <div className="form-group">
                    <label>6-Digit OTP Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="123456"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setOtpStep(1)}>Back</button>
                  <button type="submit" className="btn btn-success" disabled={loading}>
                    {loading ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
