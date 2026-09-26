import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  SlidersHorizontal, 
  History, 
  Package, 
  Tags, 
  MapPin, 
  Warehouse as WarehouseIcon, 
  LogOut, 
  User, 
  X,
  Boxes
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ isOpen, onClose, onOpenProfile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {isOpen && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 35, display: 'block' }} 
          onClick={onClose} 
        />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand-icon">
            <Boxes size={22} />
          </div>
          <div className="sidebar-brand-text">
            <h1>StockSense</h1>
            <span>Odoo IMS Engine</span>
          </div>
          {isOpen && (
            <button 
              onClick={onClose} 
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Core</div>
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <div className="nav-section-title">Stock Operations</div>
          <NavLink to="/receipts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <ArrowDownLeft size={18} color="#10b981" />
            <span>Receipts (In)</span>
          </NavLink>
          <NavLink to="/deliveries" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <ArrowUpRight size={18} color="#3b82f6" />
            <span>Deliveries (Out)</span>
          </NavLink>
          <NavLink to="/transfers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <ArrowLeftRight size={18} color="#8b5cf6" />
            <span>Internal Transfers</span>
          </NavLink>
          <NavLink to="/adjustments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <SlidersHorizontal size={18} color="#f59e0b" />
            <span>Stock Adjustments</span>
          </NavLink>
          <NavLink to="/moves" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <History size={18} />
            <span>Move History (Ledger)</span>
          </NavLink>

          <div className="nav-section-title">Master Catalog</div>
          <NavLink to="/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Package size={18} />
            <span>Products & Stock</span>
          </NavLink>
          <NavLink to="/categories" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Tags size={18} />
            <span>Product Categories</span>
          </NavLink>
          <NavLink to="/locations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <MapPin size={18} />
            <span>Locations</span>
          </NavLink>
          <NavLink to="/warehouses" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <WarehouseIcon size={18} />
            <span>Warehouses</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-snippet" onClick={onOpenProfile} title="View Profile">
            <div className="user-avatar">
              {user?.username ? user.username.charAt(0).toUpperCase() : <User size={16} />}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.username || 'Guest Staff'}</span>
              <span className="user-role">{user?.is_staff ? 'Inventory Manager' : 'Warehouse Staff'}</span>
            </div>
          </div>
          {user ? (
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handleLogout} 
              title="Logout"
              style={{ padding: '6px' }}
            >
              <LogOut size={16} />
            </button>
          ) : (
            <NavLink to="/login" className="btn btn-primary btn-sm" style={{ padding: '6px 10px' }}>
              Login
            </NavLink>
          )}
        </div>
      </aside>
    </>
  );
}