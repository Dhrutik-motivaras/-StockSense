import React, { useEffect, useState, useCallback } from 'react';
import { 
  History, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  SlidersHorizontal 
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function MoveHistory() {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const toast = useToast();

  const fetchMoves = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('q', search);
    if (docType) params.append('doc_type', docType);
    if (statusFilter) params.append('status', statusFilter);

    api.get(`moves/?${params.toString()}`)
      .then((res) => setMoves(res.data))
      .catch((err) => {
        toast.error('Failed to load move ledger history');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [search, docType, statusFilter]);

  useEffect(() => {
    fetchMoves();
  }, [fetchMoves]);

  const getDocTypeIcon = (type) => {
    switch (type) {
      case 'receipt':
        return <ArrowDownLeft size={14} color="#10b981" />;
      case 'delivery':
        return <ArrowUpRight size={14} color="#06b6d4" />;
      case 'internal':
        return <ArrowLeftRight size={14} color="#8b5cf6" />;
      case 'adjustment':
        return <SlidersHorizontal size={14} color="#f59e0b" />;
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-input-group">
          <Search size={16} className="filter-input-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search by reference, product, SKU, or partner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        >
          <option value="">All Movement Types</option>
          <option value="receipt">Receipts (Incoming)</option>
          <option value="delivery">Deliveries (Outgoing)</option>
          <option value="internal">Internal Transfers</option>
          <option value="adjustment">Stock Adjustments</option>
        </select>

        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="done">Done</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {/* Ledger Table */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="var(--accent-primary)" />
            <h3 className="card-title">Stock Ledger & Movement History ({moves.length})</h3>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Movement Type</th>
                <th>Product & SKU</th>
                <th>Quantity</th>
                <th>Source Location</th>
                <th>Destination Location</th>
                <th>Partner / Notes</th>
                <th>Date / Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading stock ledger...
                  </td>
                </tr>
              ) : moves.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No stock movements recorded matching the search criteria.
                  </td>
                </tr>
              ) : (
                moves.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <code style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                        {m.reference}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getDocTypeIcon(m.doc_type)}
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{m.doc_type}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{m.product_name}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)' }}>
                        SKU: {m.product_sku}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '14px' }}>{m.qty}</strong>{' '}
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{m.product_uom}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-muted)' }}>{m.from_location_name}</span>
                    </td>
                    <td>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{m.to_location_name}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px' }}>{m.partner_name || 'N/A'}</span>
                      {m.notes && (
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)' }}>
                          {m.notes}
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(m.created_at).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${m.status}`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
