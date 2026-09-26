import React, { useEffect, useState, useCallback } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  Search, 
  CheckCircle, 
  XCircle, 
  X, 
  MapPin, 
  ArrowRight 
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [availableStock, setAvailableStock] = useState(null);

  const [formData, setFormData] = useState({
    product: '',
    qty: '',
    from_location: '',
    to_location: '',
    notes: '',
    auto_validate: false,
  });

  const toast = useToast();

  const fetchMetadata = async () => {
    try {
      const [prodRes, internalLocRes] = await Promise.all([
        api.get('products/'),
        api.get('locations/?type=internal'),
      ]);
      setProducts(prodRes.data);
      setLocations(internalLocRes.data);

      if (prodRes.data.length > 0) setFormData((prev) => ({ ...prev, product: prodRes.data[0].id }));
      if (internalLocRes.data.length > 1) {
        setFormData((prev) => ({ 
          ...prev, 
          from_location: internalLocRes.data[0].id,
          to_location: internalLocRes.data[1].id
        }));
      }
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  const fetchTransfers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ doc_type: 'internal' });
    if (search) params.append('q', search);
    if (statusFilter) params.append('status', statusFilter);

    api.get(`moves/?${params.toString()}`)
      .then((res) => setTransfers(res.data))
      .catch((err) => {
        toast.error('Failed to load internal transfers');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  // Check available stock at source
  useEffect(() => {
    if (formData.product && formData.from_location) {
      api.get(`quants/?product=${formData.product}&location=${formData.from_location}`)
        .then((res) => {
          if (res.data.length > 0) {
            setAvailableStock(parseFloat(res.data[0].quantity));
          } else {
            setAvailableStock(0);
          }
        })
        .catch(() => setAvailableStock(0));
    }
  }, [formData.product, formData.from_location]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!formData.product || !formData.from_location || !formData.to_location) {
      toast.error('Product, Source, and Destination locations are required');
      return;
    }

    if (formData.from_location === formData.to_location) {
      toast.error('Source and Destination locations must be different');
      return;
    }

    if (formData.auto_validate && availableStock !== null && parseFloat(formData.qty) > availableStock) {
      toast.error(`Cannot validate immediately: Available stock at source (${availableStock}) is less than requested transfer (${formData.qty})`);
      return;
    }

    try {
      const payload = {
        doc_type: 'internal',
        product: formData.product,
        qty: formData.qty,
        from_location: formData.from_location,
        to_location: formData.to_location,
        partner_name: 'Internal Relocation',
        notes: formData.notes || 'Internal Warehouse Transfer',
        status: formData.auto_validate ? 'done' : 'ready',
        auto_validate: formData.auto_validate,
      };

      await api.post('moves/', payload);
      toast.success(formData.auto_validate ? 'Transfer completed and location quants updated!' : 'Transfer scheduled in Ready state!');
      setShowModal(false);
      setFormData({
        product: products[0]?.id || '',
        qty: '',
        from_location: locations[0]?.id || '',
        to_location: locations[1]?.id || '',
        notes: '',
        auto_validate: false,
      });
      fetchTransfers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create transfer');
    }
  };

  const handleValidate = async (id, ref) => {
    try {
      const res = await api.post(`moves/${id}/validate/`);
      toast.success(res.data.message || `Transfer ${ref} completed!`);
      fetchTransfers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Transfer failed due to insufficient stock');
    }
  };

  const handleCancel = async (id, ref) => {
    if (!window.confirm(`Are you sure you want to cancel transfer ${ref}?`)) return;
    try {
      await api.post(`moves/${id}/cancel/`);
      toast.info(`Transfer ${ref} canceled`);
      fetchTransfers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel transfer');
    }
  };

  return (
    <div>
      {/* Top Filter and Actions */}
      <div className="filter-bar">
        <div className="filter-input-group">
          <Search size={16} className="filter-input-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search reference, product, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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

        <button 
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
          style={{ marginLeft: 'auto' }}
        >
          <Plus size={16} />
          <span>New Internal Transfer</span>
        </button>
      </div>

      {/* Transfers Table */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeftRight size={18} color="#8b5cf6" />
            <h3 className="card-title">Internal Stock Transfers ({transfers.length})</h3>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Product</th>
                <th>Transfer Qty</th>
                <th>Source (From)</th>
                <th>Destination (To)</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading internal transfers...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No internal transfers recorded yet. Click "New Internal Transfer" to shift stock between locations.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <code style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                        {t.reference}
                      </code>
                    </td>
                    <td>
                      <strong>{t.product_name}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)' }}>
                        SKU: {t.product_sku}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '14px', color: '#8b5cf6' }}>{t.qty}</strong> {t.product_uom}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="var(--text-dim)" />
                        <span>{t.from_location_name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowRight size={13} color="#8b5cf6" />
                        <strong>{t.to_location_name}</strong>
                      </div>
                    </td>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-${t.status}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t.status !== 'done' && t.status !== 'canceled' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleValidate(t.id, t.reference)}
                              title="Complete Transfer"
                            >
                              <CheckCircle size={14} />
                              <span>Validate</span>
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleCancel(t.id, t.reference)}
                              title="Cancel Transfer"
                              style={{ color: '#ef4444' }}
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {t.status === 'done' && (
                          <span style={{ color: '#8b5cf6', fontSize: '12px', fontWeight: 600 }}>Moved</span>
                        )}
                        {t.status === 'canceled' && (
                          <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Canceled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Transfer Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Internal Stock Transfer</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTransfer}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Product *</label>
                  <select
                    className="form-control"
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    required
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Source Location (From) *</label>
                    <select
                      className="form-control"
                      value={formData.from_location}
                      onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
                      required
                    >
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Destination Location (To) *</label>
                    <select
                      className="form-control"
                      value={formData.to_location}
                      onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
                      required
                    >
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Available Stock Indicator */}
                <div style={{
                  background: 'var(--bg-input)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Available Stock at Source:</span>
                  <strong style={{ fontSize: '14px', color: (availableStock || 0) > 0 ? '#10b981' : '#ef4444' }}>
                    {availableStock !== null ? `${availableStock} units` : 'Checking...'}
                  </strong>
                </div>

                <div className="form-group">
                  <label>Transfer Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 20"
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    required
                    min="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Transfer Notes / Reason</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Replenishment to Production Floor"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '12px', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="auto_validate_transfer"
                    checked={formData.auto_validate}
                    onChange={(e) => setFormData({ ...formData, auto_validate: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="auto_validate_transfer" style={{ margin: 0, cursor: 'pointer', fontSize: '13px' }}>
                    <strong>Execute Immediately</strong> (Update location quants on save)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Schedule Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
