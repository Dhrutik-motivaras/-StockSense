import React, { useState } from 'react';
import { Menu, Database, User, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, onToggleMobileMenu, onOpenProfile, onRefreshData }) {
  const [seeding, setSeeding] = useState(false);
  const toast = useToast();
  const { user } = useAuth();

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const res = await api.post('seed/');
      toast.success(res.data.message || 'Demo data seeded successfully!');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      toast.error('Failed to seed demo data');
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header className="top-header">
      <div className="top-header-left">
        <button 
          className="mobile-menu-btn" 
          onClick={onToggleMobileMenu} 
          aria-label="Open Navigation Menu"
        >
          <Menu size={22} />
        </button>
        <div className="top-header-title">
          <h2>{title}</h2>
        </div>
      </div>

      <div className="top-header-actions">
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={handleSeedData} 
          disabled={seeding}
          title="Populate realistic Warehouses, Locations, Products, and Moves for Demo"
        >
          <Database size={15} />
          <span>{seeding ? 'Seeding...' : 'Seed Demo Data'}</span>
        </button>

        <button 
          className="btn btn-secondary btn-sm"
          onClick={onOpenProfile}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {user?.is_staff ? <ShieldCheck size={16} color="#10b981" /> : <User size={16} />}
          <span>{user?.username || 'Profile'}</span>
        </button>
      </div>
    </header>
  );
}
