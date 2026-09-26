import React, { useEffect, useState, useCallback } from 'react';
import { 
  ArrowUpRight, 
  Plus, 
  Search, 
  CheckCircle, 
  XCircle, 
  X, 
  UserCheck 
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [customerLocations, setCustomerLocations] = useState([]);
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
    partner_name: '',
    notes: '',
    auto_validate: false,
  });

  const toast = useToast();

  const fetchMetadata = async () => {
    try {
      const [prodRes, internalLocRes, custLocRes] = await Promise.all([
        api.get('products/'),
        api.get('locations/?type=internal'),
        api.get('locations/?type=customer'),
      ]);
      setProducts(prodRes.data);
      setLocations(internalLocRes.data);
      setCustomerLocations(custLocRes.data);

      if (prodRes.data.length > 0) setFormData((prev) => ({ ...prev, product: prodRes.data[0].id }));
      if (internalLocRes.data.length > 0) setFormData((prev) => ({ ...prev, from_location: internalLocRes.data[0].id }));
      if (custLocRes.data.length > 0) setFormData((prev) => ({ ...prev, to_location: custLocRes.data[0].id }));
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  const fetchDeliveries = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ doc_type: 'delivery' });
    if (search) params.append('q', search);
    if (statusFilter) params.append('status', statusFilter);

    api.get(`moves/?${params.toString()}`)
      .then((res) => setDeliveries(res.data))
      .catch((err) => {
        toast.error('Failed to load delivery orders');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  // Check available stock whenever product or from_location changes
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
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleCreateDelivery = async (e) => {
    e.preventDefault();
    if (!formData.product || !formData.from_location) {
      toast.error('Product and Source Location are required');
      return;
    }

    if (formData.auto_validate && availableStock !== null && parseFloat(formData.qty) > availableStock) {
      toast.error(`Cannot validate immediately: Available stock (${availableStock}) is less than requested delivery (${formData.qty})`);
      return;
    }

    let toLoc = formData.to_location;
    if (!toLoc && customerLocations.length > 0) {
      toLoc = customerLocations[0].id;
    }

    try {
      const payload = {
        doc_type: 'delivery',
        product: formData.product,
        qty: formData.qty,
        from_location: formData.from_location,
        to_location: toLoc,
        partner_name: formData.partner_name || 'Customer Order',
        notes: formData.notes,
        status: formData.auto_validate ? 'done' : 'ready',
        auto_validate: formData.auto_validate,
      };

      await api.post('moves/', payload);
      toast.success(formData.auto_validate ? 'Delivery validated and stock deducted!' : 'Delivery order created in Ready state!');
      setShowModal(false);
      setFormData({
        product: products[0]?.id || '',
        qty: '',
        from_location: locations[0]?.id || '',
        to_location: customerLocations[0]?.id || '',
        partner_name: '',
        notes: '',
        auto_validate: false,
      });
      fetchDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create delivery order');
    }
  };

  const handleValidate = async (id, ref) => {
    try {
      const res = await api.post(`moves/${id}/validate/`);
      toast.success(res.data.message || `Delivery ${ref} validated!`);
      fetchDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Validation failed due to insufficient stock');
    }
  };

  const handleCancel = async (id, ref) => {
    if (!window.confirm(`Are you sure you want to cancel delivery ${ref}?`)) return;
    try {
      await api.post(`moves/${id}/cancel/`);
      toast.info(`Delivery ${ref} canceled`);
      fetchDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel delivery');
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
            placeholder="Search reference, customer, or product..."
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
          <span>Create Delivery Order</span>
        </button>
      </div>

      {/* Deliveries Table */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowUpRight size={18} color="#06b6d4" />
            <h3 className="card-title">Outgoing Delivery Orders ({deliveries.length})</h3>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer / Destination</th>
                <th>Product</th>
                <th>Shipment Qty</th>
                <th>Source Location</th>
                <th>Created At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading deliveries...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No delivery orders recorded yet. Click "Create Delivery Order" to dispatch stock.
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <code style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                        {d.reference}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck size={14} color="var(--text-dim)" />
                        <strong>{d.partner_name || 'Customer'}</strong>
                      </div>
                    </td>
                    <td>
                      <strong>{d.product_name}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)' }}>
                        SKU: {d.product_sku}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '14px', color: '#ef4444' }}>-{d.qty}</strong> {d.product_uom}
                    </td>
                    <td>{d.from_location_name}</td>
                    <td>{new Date(d.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-${d.status}`}>
                        {d.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {d.status !== 'done' && d.status !== 'canceled' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleValidate(d.id, d.reference)}
                              title="Pick, Pack, & Validate Delivery"
                            >
                              <CheckCircle size={14} />
                              <span>Validate</span>
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleCancel(d.id, d.reference)}
                              title="Cancel Delivery"
                              style={{ color: '#ef4444' }}
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {d.status === 'done' && (
                          <span style={{ color: '#06b6d4', fontSize: '12px', fontWeight: 600 }}>Shipped</span>
                        )}
                        {d.status === 'canceled' && (
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

      {/* Create Delivery Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Outgoing Delivery Order</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateDelivery}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Customer / Destination Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Acme Tech Solutions Inc"
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
                    <label>Source Internal Location *</label>
                    <select
                      className="form-control"
                      value={formData.from_location}
                      onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
                      required
                    >
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name} ({l.code || 'Internal'})</option>
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
                  <label>Delivery Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 10"
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    required
                    min="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Customer Destination Location</label>
                  <select
                    className="form-control"
                    value={formData.to_location}
                    onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
                  >
                    {customerLocations.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Sales Order / Delivery Notes</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. SO-904 customer shipping instructions"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '12px', borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    id="auto_validate_delivery"
                    checked={formData.auto_validate}
                    onChange={(e) => setFormData({ ...formData, auto_validate: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="auto_validate_delivery" style={{ margin: 0, cursor: 'pointer', fontSize: '13px' }}>
                    <strong>Validate Immediately</strong> (Check availability and deduct stock directly)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Delivery Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
