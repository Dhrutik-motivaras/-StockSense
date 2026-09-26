import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Operations from './pages/Operations';
import Products from './pages/Products';

// Left Navigation Sidebar Component
function Navbar() {
  return (
    <div style={{
      width: '240px',
      background: '#0f172a',
      color: '#ffffff',
      minHeight: '100vh',
      padding: '24px 16px',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ fontSize: '20px', margin: '0 0 20px 0', fontWeight: 'bold' }}>StockSense</h2>
      <hr style={{ borderColor: '#334155', margin: '0 0 20px 0' }} />
      <nav>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>
            <Link to="/" style={{ color: '#e2e8f0', textDecoration: 'none', display: 'block', padding: '10px', borderRadius: '6px' }}>
              📊 Dashboard
            </Link>
          </li>
          <li>
            <Link to="/products" style={{ color: '#e2e8f0', textDecoration: 'none', display: 'block', padding: '10px', borderRadius: '6px' }}>
              📦 Products
            </Link>
          </li>
          <li>
            <Link to="/operations" style={{ color: '#e2e8f0', textDecoration: 'none', display: 'block', padding: '10px', borderRadius: '6px' }}>
              ⚙️ Operations
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

// Root Routing App
export default function App() {
  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Navbar />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/operations" element={<Operations />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}