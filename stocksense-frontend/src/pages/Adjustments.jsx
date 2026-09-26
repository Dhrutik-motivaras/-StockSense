import React, { useEffect, useState, useCallback } from 'react';
import { 
  SlidersHorizontal, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUp, 
  ArrowDown, 
  Layers, 
  History 
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function Adjustments() {
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [adjustmentMoves, setAdjustmentMoves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [currentSystemStock, setCurrentSystemStock] = useState(0);
  const [countedQty, setCountedQty] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toast = useToast();

  const fetchMetadata = async () => {
    try {
      const [prodRes, locRes] = await Promise.all([
        api.get('products/'),
        api.get('locations/?type=internal'),
      ]);
      setProducts(prodRes.data);
      setLocations(locRes.data);

      if (prodRes.data.length > 0) setSelectedProduct(prodRes.data[0].id);
      if (locRes.data.length > 0) setSelectedLocation(locRes.data[0].id);
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  const fetchAdjustmentHistory = useCallback(() => {
    setLoading(true);
    api.get('moves/?doc_type=adjustment')
      .then((res) => setAdjustmentMoves(res.data))
      .catch((err) => {
        toast.error('Failed to load adjustment history');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch current stock whenever product or location changes
  useEffect(() => {
    if (selectedProduct && selectedLocation) {
      api.get(`quants/?product=${selectedProduct}&location=${selectedLocation}`)
        .then((res) => {
          if (res.data.length > 0) {
            setCurrentSystemStock(parseFloat(res.data[0].quantity));
          } else {
            setCurrentSystemStock(0);
          }
        })
        .catch(() => setCurrentSystemStock(0));
    }
  }, [selectedProduct, selectedLocation]);

  useEffect(() => {
    fetchMetadata();
    fetchAdjustmentHistory();
  }, [fetchAdjustmentHistory]);

  const prodObj = products.find((p) => p.id === parseInt(selectedProduct));
  const locObj = locations.find((l) => l.id === parseInt(selectedLocation));
  const parsedCounted = countedQty !== '' ? parseFloat(countedQty) : null;
  const discrepancy = parsedCounted !== null ? parsedCounted - currentSystemStock : 0;

  const handleApplyAdjustment = async (e) => {
    e.preventDefault();
    if (countedQty === '' || parsedCounted === null) {
      toast.error('Please enter the physical counted quantity');
      return;
    }

    if (parsedCounted < 0) {
      toast.error('Counted quantity cannot be negative');
      return;
    }

    if (discrepancy === 0) {
      toast.info('Counted quantity matches system recorded quantity. No adjustment needed.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('adjustments/', {
        product: selectedProduct,
        location: selectedLocation,
        counted_quantity: parsedCounted,
        notes: notes || 'Physical count cycle audit',
      });
      toast.success(res.data.message || 'Stock adjusted and ledger updated!');
      setCountedQty('');
      setNotes('');
      // Refresh current stock & history
      api.get(`quants/?product=${selectedProduct}&location=${selectedLocation}`).then((r) => {
        setCurrentSystemStock(r.data.length > 0 ? parseFloat(r.data[0].quantity) : 0);
      });
      fetchAdjustmentHistory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to apply adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: '24px' }}>
        {/* Adjustment Calculator Form */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={18} color="#f59e0b" />
              <h3 className="card-title">Physical Count Adjustment</h3>
            </div>
          </div>

          <form onSubmit={handleApplyAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Select Product *</label>
              <select
                className="form-control"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Inventory Location *</label>
              <select
                className="form-control"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                required
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>

            {/* Current Recorded Stock Box */}
            <div style={{
              background: 'var(--bg-input)',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Recorded System Stock:</span>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>
                  {currentSystemStock} {prodObj?.uom || 'units'}
                </div>
              </div>
              <Layers size={24} color="var(--accent-primary)" />
            </div>

            <div className="form-group">
              <label>Physical Counted Quantity *</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                placeholder={`Counted ${prodObj?.uom || 'units'} on shelf`}
                value={countedQty}
                onChange={(e) => setCountedQty(e.target.value)}
                required
                min="0"
              />
            </div>

            {/* Live Discrepancy Calculator Card */}
            {parsedCounted !== null && (
              <div style={{
                background: discrepancy > 0 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : discrepancy < 0 
                    ? 'rgba(239, 68, 68, 0.1)' 
                    : 'var(--bg-input)',
                border: `1px solid ${discrepancy > 0 ? '#10b981' : discrepancy < 0 ? '#ef4444' : 'var(--border-color)'}`,
                padding: '12px 16px',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                    Calculated Variance:
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '16px',
                    fontWeight: '800',
                    color: discrepancy > 0 ? '#10b981' : discrepancy < 0 ? '#ef4444' : '#94a3b8'
                  }}>
                    {discrepancy > 0 && <ArrowUp size={16} />}
                    {discrepancy < 0 && <ArrowDown size={16} />}
                    <span>{discrepancy > 0 ? `+${discrepancy}` : discrepancy} {prodObj?.uom}</span>
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                  {discrepancy > 0 
                    ? 'Surplus stock detected. System will record a Stock Gain.' 
                    : discrepancy < 0 
                      ? 'Stock deficit / shrinkage detected. System will record a Stock Loss.'
                      : 'Physical count matches system record perfectly.'}
                </p>
              </div>
            )}

            <div className="form-group">
              <label>Reason / Audit Note</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Damaged goods, breakage, or physical recount"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-warning"
              disabled={submitting}
              style={{
                backgroundColor: '#f59e0b',
                color: '#000',
                fontWeight: '700',
                justifyContent: 'center',
                padding: '10px'
              }}
            >
              <CheckCircle size={16} />
              <span>{submitting ? 'Applying Adjustment...' : 'Apply & Log Adjustment'}</span>
            </button>
          </form>
        </div>

        {/* Adjustments History Ledger */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="#f59e0b" />
              <h3 className="card-title">Adjustment History & Ledger ({adjustmentMoves.length})</h3>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Location Involved</th>
                  <th>Type & Notes</th>
                  <th>Audit Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      Loading adjustments...
                    </td>
                  </tr>
                ) : adjustmentMoves.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No inventory adjustments logged yet.
                    </td>
                  </tr>
                ) : (
                  adjustmentMoves.map((m) => {
                    const isGain = m.from_location_type === 'adjustment';
                    return (
                      <tr key={m.id}>
                        <td>
                          <code style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                            {m.reference}
                          </code>
                        </td>
                        <td>
                          <strong>{m.product_name}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)' }}>
                            SKU: {m.product_sku}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '14px', color: isGain ? '#10b981' : '#ef4444' }}>
                            {isGain ? `+${m.qty}` : `-${m.qty}`}
                          </strong>{' '}
                          {m.product_uom}
                        </td>
                        <td>{isGain ? m.to_location_name : m.from_location_name}</td>
                        <td>
                          <span style={{ fontSize: '12px', color: isGain ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                            {isGain ? 'Stock Gain' : 'Stock Loss'}
                          </span>
                          {m.notes && (
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)' }}>
                              {m.notes}
                            </span>
                          )}
                        </td>
                        <td>{new Date(m.created_at).toLocaleDateString()}</td>
                        <td>
                          <span className="badge badge-done">Done</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
