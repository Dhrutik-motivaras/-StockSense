import React from 'react';
import { X, User, Mail, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>User Profile</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center', padding: '28px 24px' }}>
          <div 
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-primary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '24px',
              fontWeight: '700',
              margin: '0 auto 16px',
              boxShadow: '0 0 16px rgba(139, 92, 246, 0.4)'
            }}
          >
            {user?.username ? user.username.charAt(0).toUpperCase() : <User size={28} />}
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
            {user?.first_name ? `${user.first_name} ${user.last_name}` : (user?.username || 'Guest Staff')}
          </h3>
          <p style={{ color: 'var(--accent-primary)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
            {user?.is_staff ? 'Inventory Manager (Admin)' : 'Warehouse Staff (Operations)'}
          </p>

          <div style={{ marginTop: '24px', background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <User size={16} />
              <span>Username: <strong style={{ color: '#fff' }}>{user?.username || 'guest'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <Mail size={16} />
              <span>Email: <strong style={{ color: '#fff' }}>{user?.email || 'staff@stocksense.local'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <Shield size={16} />
              <span>Role: <strong style={{ color: '#fff' }}>{user?.is_staff ? 'Manager / Superuser' : 'Standard Staff'}</strong></span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {user ? (
            <button className="btn btn-danger" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
              <LogOut size={16} />
              <span>Sign Out of StockSense</span>
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => { onClose(); navigate('/login'); }} style={{ width: '100%', justifyContent: 'center' }}>
              Go to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
