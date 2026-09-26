import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Dashboard() {
  const [kpis, setKpis] = useState({
    total_products: 0,
    low_stock_items: 0,
    pending_receipts: 0,
    pending_deliveries: 0,
    internal_transfers_scheduled: 0,
  });

  useEffect(() => {
    api.get('kpis/').then((res) => setKpis(res.data)).catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: '30px', flex: 1 }}>
      <h1>Inventory Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <Card title="Total Products" value={kpis.total_products} color="#3b82f6" />
        <Card title="Low / Out of Stock" value={kpis.low_stock_items} color="#ef4444" />
        <Card title="Pending Receipts" value={kpis.pending_receipts} color="#f59e0b" />
        <Card title="Pending Deliveries" value={kpis.pending_deliveries} color="#10b981" />
        <Card title="Internal Transfers" value={kpis.internal_transfers_scheduled} color="#8b5cf6" />
      </div>
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', borderLeft: `6px solid ${color}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>{title}</p>
      <h2 style={{ fontSize: '28px', margin: '10px 0 0 0' }}>{value}</h2>
    </div>
  );
}