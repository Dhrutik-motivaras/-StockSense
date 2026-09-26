import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Navigation Components
import Navbar from './components/Navbar';
import Header from './components/Header';
import ProfileModal from './components/ProfileModal';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Receipts from './pages/Receipts';
import Deliveries from './pages/Deliveries';
import Transfers from './pages/Transfers';
import Adjustments from './pages/Adjustments';
import MoveHistory from './pages/MoveHistory';
import Warehouses from './pages/Warehouses';
import Locations from './pages/Locations';
import Categories from './pages/Categories';

// Route Titles Mapping
const pageTitles = {
  '/': 'Inventory Operations Dashboard',
  '/products': 'Product Master Catalog & Stock',
  '/receipts': 'Incoming Goods Receipts (Vendor -> Warehouse)',
  '/deliveries': 'Outgoing Delivery Orders (Warehouse -> Customer)',
  '/transfers': 'Internal Transfers (Warehouse -> Rack)',
  '/adjustments': 'Physical Inventory Count & Adjustments',
  '/moves': 'Stock Ledger & Complete Move History',
  '/warehouses': 'Warehouse Facilities Setup',
  '/locations': 'Storage Locations & Virtual Zones',
  '/categories': 'Product Classification Categories',
};

// Protected App Layout Wrapper
function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  const currentTitle = pageTitles[location.pathname] || 'StockSense IMS';

  return (
    <div className="app-container">
      <Navbar 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
        onOpenProfile={() => setProfileOpen(true)}
      />

      <div className="main-wrapper">
        <Header 
          title={currentTitle} 
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onOpenProfile={() => setProfileOpen(true)}
          onRefreshData={() => window.location.reload()}
        />

        <main className="content-area">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/deliveries" element={<Deliveries />} />
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/adjustments" element={<Adjustments />} />
            <Route path="/moves" element={<MoveHistory />} />
            <Route path="/operations" element={<Navigate to="/moves" replace />} />
            <Route path="/warehouses" element={<Warehouses />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <ProfileModal 
        isOpen={profileOpen} 
        onClose={() => setProfileOpen(false)} 
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Login />} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}