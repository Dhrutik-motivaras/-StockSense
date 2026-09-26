import React, { useEffect, useState, useCallback } from 'react';
import { 
  ArrowDownLeft, 
  Plus, 
  Search, 
  CheckCircle, 
  XCircle, 
  X, 
  Building
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [vendorLocations, setVendorLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    product: '',
    qty: '',
    to_location: '',
    from_location: '',
    partner_name: '',
    notes: '',
    auto_validate: false,
  });

  const toast = useToast();

  const fetchMetadata = async () => {
    try {
      const [prodRes, internalLocRes, vendorLocRes] = await Promise.all([
        api.get('products/'),
        api.get('locations/?type=internal'),
        api.get('locations/?type=vendor'),
      ]);
      setProducts(prodRes.data);
      setLocations(internalLocRes.data);
      setVendorLocations(vendorLocRes.data);

      if (prodRes.data.length > 0) setFormData((prev) => ({ ...prev, product: prodRes.data[0].id }));
      if (internalLocRes.data.length > 0) setFormData((prev) => ({ ...prev, to_location: internalLocRes.data[0].id }));
      if (vendorLocRes.data.length > 0) setFormData((prev) => ({ ...prev, from_location: vendorLocRes.data[0].id }));
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  const fetchReceipts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ doc_type: 'receipt' });
    if (search) params.append('q', search);
    if (statusFilter) params.append('status', statusFilter);

    api.get(`moves/?${params.toString()}`)
      .then((res) => setReceipts(res.data))
      .catch((err) => {
        toast.error('Failed to load receipts');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleCreateReceipt = async (e) => {
    e.preventDefault();
    if (!formData.product || !formData.to_location) {
      toast.error('Product and Destination Location are required');
      return;
    }

    // Ensure vendor location is set
    let fromLoc = formData.from_location;
    if (!fromLoc && vendorLocations.length > 0) {
      fromLoc = vendorLocations[0].id;
    }

    try {
      const payload = {
        doc_type: 'receipt',
        product: formData.product,
        qty: formData.qty,
        from_location: fromLoc,
        to_location: formData.to_location,
        partner_name: formData.partner_name || 'Vendor Supplier',
        notes: formData.notes,
        status: formData.auto_validate ? 'done' : 'ready',
        auto_validate: formData.auto_validate,
      };

      await api.post('moves/', payload);
      toast.success(formData.auto_validate ? 'Receipt validated and stock added!' : 'Receipt created in Ready state!');
      setShowModal(false);
      setFormData({
        product: products[0]?.id || '',
        qty: '',
        to_location: locations[0]?.id || '',
        from_location: vendorLocations[0]?.id || '',
        partner_name: '',
        notes: '',
        auto_validate: false,
      });
      fetchReceipts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create receipt');
    }
  };

  const handleValidate = async (id, ref) => {
    try {
      const res = await api.post(`moves/${id}/validate/`);
      toast.success(res.data.message || `Receipt ${ref} validated!`);
      fetchReceipts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Validation failed');
    }
  };

  const handleCancel = async (id, ref) => {
    if (!window.confirm(`Are you sure you want to cancel receipt ${ref}?`)) return;
    try {
      await api.post(`moves/${id}/cancel/`);
      toast.info(`Receipt ${ref} canceled`);
      fetchReceipts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel receipt');
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
            placeholder="Search reference, vendor, or product..."
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
          <span>Create Incoming Receipt</span>
        </button>
      </div>

      {/* Receipts Table */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowDownLeft size={18} color="#10b981" />
            <h3 className="card-title">Incoming Goods Receipts ({receipts.length})</h3>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Supplier / Vendor</th>
                <th>Product</th>
                <th>Received Qty</th>
                <th>Destination Location</th>
                <th>Created At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading receipts...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No receipts recorded yet. Click "Create Incoming Receipt" to record incoming stock.
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <code style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                        {r.reference}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building size={14} color="var(--text-dim)" />
                        <strong>{r.partner_name || 'Vendor'}</strong>
                      </div>
                    </td>
                    <td>
                      <strong>{r.product_name}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)' }}>
                        SKU: {r.product_sku}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '14px', color: '#10b981' }}>+{r.qty}</strong> {r.product_uom}
                    </td>
                    <td>{r.to_location_name}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-${r.status}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {r.status !== 'done' && r.status !== 'canceled' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleValidate(r.id, r.reference)}
                              title="Validate and increase stock"
                            >
                              <CheckCircle size={14} />
                              <span>Validate</span>
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleCancel(r.id, r.reference)}
                              title="Cancel Receipt"
                              style={{ color: '#ef4444' }}
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {r.status === 'done' && (
                          <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>Received</span>
                        )}
                        {r.status === 'canceled' && (
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

      {/* Create Receipt Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Incoming Receipt</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateReceipt}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Supplier / Vendor Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Apex Industrial Steel Corp"
                    value={formData.partner_name}
                    onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
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

                  <div className="form-group">
                    <label>Received Quantity *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="e.g. 50"
                      value={formData.qty}
                      onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                      required
                      min="0.01"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Destination Warehouse Location *</label>
                  <select
                    className="form-control"
                    value={formData.to_location}
                    onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
                    required
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.code || 'Internal'})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Vendor Source Location</label>
                  <select
                    className="form-control"
                    value={formData.from_location}
                    onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
                  >
                    {vendorLocations.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Notes / Delivery Note Ref</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. PO-84920 bill of lading"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '12px', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="auto_validate"
                    checked={formData.auto_validate}
                    onChange={(e) => setFormData({ ...formData, auto_validate: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="auto_validate" style={{ margin: 0, cursor: 'pointer', fontSize: '13px' }}>
                    <strong>Validate Immediately</strong> (Directly increment stock on save)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
