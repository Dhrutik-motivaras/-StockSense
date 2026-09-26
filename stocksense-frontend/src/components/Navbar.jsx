import React from 'react';
import { Link } from 'react{cite: 1, 2}-router-dom';

export default function Navbar() {
  return (
    <div style={{ width: '220px', background: '#1e293b', color: '#fff', minHeight: '100vh', padding: '20px' }}>
      <h2>StockSense</h2>
      <hr style={{ borderColor: '#334155', margin: '15px 0' }} />
      <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2.5' }}>
        <li><Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>📊 Dashboard</Link></li>
        <li><Link to="/products" style={{ color: '#fff', textDecoration: 'none' }}>📦 Products</Link></li>
        <li><Link to="/operations" style={{ color: '#fff', textDecoration: 'none' }}>⚙️ Operations</Link></li>
        <li><Link to="/moves" style={{ color: '#fff', textDecoration: 'none' }}>📜 Move History</Link></li>
      </ul>
    </div>
  );
}