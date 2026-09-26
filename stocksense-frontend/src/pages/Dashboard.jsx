import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  AlertTriangle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Filter, 
  RotateCcw,
  CheckCircle,
  Clock,
  PlusCircle,
  Eye
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function Dashboard() {
  const [kpis, setKpis] = useState({
    total_products: 0,
    in_stock_products: 0,
    out_of_stock_products: 0,
    low_stock_items: 0,
    pending_receipts: 0,
    pending_deliveries: 0,
    internal_transfers_scheduled: 0,
    recent_moves: [],
  });
  const [loading, setLoading] = useState(true);

  // Filter states
  const [docType, setDocType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // Dropdown options
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);

  const toast = useToast();
  const navigate = useNavigate();

  const fetchFiltersMetadata = async () => {
    try {
      const [whRes, locRes, catRes] = await Promise.all([
        api.get('warehouses/'),
        api.get('locations/'),
        api.get('categories/'),
      ]);
      setWarehouses(whRes.data);
      setLocations(locRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to load filter metadata', err);
    }
  };

  const fetchKpis = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (docType) params.append('doc_type', docType);
    if (statusFilter) params.append('status', statusFilter);
    if (warehouseId) params.append('warehouse', warehouseId);
    if (locationId) params.append('location', locationId);
    if (categoryId) params.append('category', categoryId);

    api.get(`kpis/?${params.toString()}`)
      .then((res) => setKpis(res.data))
      .catch((err) => {
        toast.error('Failed to load dashboard KPIs');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [docType, statusFilter, warehouseId, locationId, categoryId]);

  useEffect(() => {
    fetchFiltersMetadata();
  }, []);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  const resetFilters = () => {
    setDocType('');
    setStatusFilter('');
    setWarehouseId('');
    setLocationId('');
    setCategoryId('');
  };

  const handleValidateMove = async (moveId, reference) => {
    try {
      const res = await api.post(`moves/${moveId}/validate/`);
      toast.success(res.data.message || `Move ${reference} validated successfully!`);
      fetchKpis();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Validation failed');
    }
  };

  return (
    <div>
      {/* Global Dynamic Filter Bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
          <Filter size={16} />
          <span>Filters:</span>
        </div>

        <select 
          className="form-select" 
          value={docType} 
          onChange={(e) => setDocType(e.target.value)}
        >
          <option value="">All Document Types</option>
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
          <option value="waiting">Waiting</option>
          <option value="ready">Ready</option>
          <option value="done">Done</option>
          <option value="canceled">Canceled</option>
        </select>

        <select 
          className="form-select" 
          value={warehouseId} 
          onChange={(e) => setWarehouseId(e.target.value)}
        >
          <option value="">All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
          ))}
        </select>

        <select 
          className="form-select" 
          value={locationId} 
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name} [{l.type}]</option>
          ))}
        </select>

        <select 
          className="form-select" 
          value={categoryId} 
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <button 
          className="btn btn-secondary btn-sm" 
          onClick={resetFilters}
          title="Clear all filters"
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div 
          className="kpi-card" 
          onClick={() => navigate('/products')}
          title="Click to view all products"
        >
          <div className="kpi-icon-box" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Package size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Products</span>
            <div className="kpi-value">{loading ? '...' : kpis.total_products}</div>
          </div>
        </div>

        <div 
          className="kpi-card" 
          onClick={() => navigate('/products?filter=low_stock')}
          title="Click to view low stock products"
          style={{ borderColor: kpis.low_stock_items > 0 ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-color)' }}
        >
          <div className="kpi-icon-box" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Low / Out of Stock</span>
            <div className="kpi-value" style={{ color: kpis.low_stock_items > 0 ? '#ef4444' : '#fff' }}>
              {loading ? '...' : kpis.low_stock_items}
            </div>
          </div>
        </div>

        <div 
          className="kpi-card" 
          onClick={() => navigate('/receipts')}
          title="Click to view receipts"
        >
          <div className="kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <ArrowDownLeft size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Pending Receipts</span>
            <div className="kpi-value">{loading ? '...' : kpis.pending_receipts}</div>
          </div>
        </div>

        <div 
          className="kpi-card" 
          onClick={() => navigate('/deliveries')}
          title="Click to view deliveries"
        >
          <div className="kpi-icon-box" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <ArrowUpRight size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Pending Deliveries</span>
            <div className="kpi-value">{loading ? '...' : kpis.pending_deliveries}</div>
          </div>
        </div>

        <div 
          className="kpi-card" 
          onClick={() => navigate('/transfers')}
          title="Click to view internal transfers"
        >
          <div className="kpi-icon-box" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <ArrowLeftRight size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Transfers Scheduled</span>
            <div className="kpi-value">{loading ? '...' : kpis.internal_transfers_scheduled}</div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/receipts')}>
          <ArrowDownLeft size={16} color="#10b981" />
          <span>New Receipt (Incoming)</span>
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/deliveries')}>
          <ArrowUpRight size={16} color="#06b6d4" />
          <span>New Delivery (Outgoing)</span>
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/transfers')}>
          <ArrowLeftRight size={16} color="#8b5cf6" />
          <span>Internal Transfer</span>
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/adjustments')}>
          <AlertTriangle size={16} color="#f59e0b" />
          <span>Stock Adjustment</span>
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/products')}>
          <PlusCircle size={16} />
          <span>Create Product</span>
        </button>
      </div>

      {/* Recent Movements Ledger */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--accent-primary)" />
            <h3 className="card-title">Recent Inventory Activity Ledger</h3>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/moves')}>
            <Eye size={14} />
            <span>Full Ledger</span>
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Product</th>
                <th>From Location</th>
                <th>To Location</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {kpis.recent_moves.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No recent inventory transactions match the active filters.
                  </td>
                </tr>
              ) : (
                kpis.recent_moves.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong style={{ color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                        {m.reference}
                      </strong>
                    </td>
                    <td>
                      <span className="badge badge-waiting" style={{ textTransform: 'capitalize' }}>
                        {m.doc_type}
                      </span>
                    </td>
                    <td>
                      <strong>{m.product_name}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)' }}>
                        SKU: {m.product_sku}
                      </span>
                    </td>
                    <td>{m.from_location_name}</td>
                    <td>{m.to_location_name}</td>
                    <td><strong>{m.qty}</strong> {m.product_uom}</td>
                    <td>
                      <span className={`badge badge-${m.status}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      {m.status !== 'done' && m.status !== 'canceled' ? (
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => handleValidateMove(m.id, m.reference)}
                        >
                          <CheckCircle size={14} />
                          <span>Validate</span>
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Locked</span>
                      )}
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