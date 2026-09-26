import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Operations() {
  const [moves, setMoves] = useState([]);

  const fetchMoves = () => {
    api.get('moves/').then((res) => setMoves(res.data)).catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchMoves();
  }, []);

  const handleValidate = (id) => {
    api.post(`moves/${id}/validate/`).then(() => {
      alert('Move validated successfully!');
      fetchMoves();
    }).catch((err) => alert(err.response?.data?.error || 'Validation failed'));
  };

  return (
    <div style={{ padding: '30px', flex: 1 }}>
      <h1>Operations Ledger</h1>
      <table border="1" cellPadding="10" style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th>Type</th>
            <th>Product ID</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {moves.map((m) => (
            <tr key={m.id}>
              <td style={{ textTransform: 'capitalize' }}>{m.doc_type}</td>
              <td>{m.product}</td>
              <td>{m.qty}</td>
              <td><strong>{m.status}</strong></td>
              <td>
                {m.status !== 'done' ? (
                  <button onClick={() => handleValidate(m.id)} style={{ padding: '6px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Validate
                  </button>
                ) : (
                  <span style={{ color: '#16a34a' }}>Completed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}