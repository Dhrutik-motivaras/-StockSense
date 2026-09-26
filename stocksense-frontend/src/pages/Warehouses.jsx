import React, { useEffect, useState } from 'react';
import { Warehouse as WarehouseIcon, Plus, MapPin, X, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', address: '' });

  const toast = useToast();

  const fetchWarehouses = () => {
    setLoading(true);
    api.get('warehouses/')
      .then((res) => setWarehouses(res.data))
      .catch((err) => {
        toast.error('Failed to load warehouses');
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('warehouses/', formData);
      toast.success(`Warehouse "${formData.name}" created with default stock location!`);
      setShowModal(false);
      setFormData({ name: '', code: '', address: '' });
      fetchWarehouses();
    } catch (err) {
      toast.error(err.response?.data?.code?.[0] || 'Failed to create warehouse');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete warehouse "${name}"?`)) return;
    try {
      await api.delete(`warehouses/${id}/`);
      toast.success('Warehouse deleted');
      fetchWarehouses();
    } catch (err) {
      toast.error('Failed to delete warehouse');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>Warehouse Facilities</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Manage primary warehouses, storage depots, and plants</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          <span>Add Warehouse</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {warehouses.map((w) => (
          <div key={w.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#fff', fontWeight: '700' }}>{w.name}</h3>
                  <code style={{ color: 'var(--accent-primary)', fontSize: '12px', fontWeight: 'bold' }}>
                    Code: {w.code}
                  </code>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleDelete(w.id, w.name)}
                  style={{ color: '#ef4444', padding: '4px' }}
                  title="Delete Warehouse"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {w.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <MapPin size={14} color="var(--text-dim)" />
                  <span>{w.address}</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-dim)' }}>
              <span>Registered Locations:</span>
              <strong style={{ color: '#fff' }}>{w.location_count || 1} zones</strong>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Warehouse</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Warehouse Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. West Coast Distribution Center"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Short Code * (e.g. WH3)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. WH3"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Physical Address</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="e.g. 100 Logistics Blvd, Dock 4"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Warehouse</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
