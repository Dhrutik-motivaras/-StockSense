import React, { useEffect, useState } from 'react';
import { MapPin, Plus, X, Trash2, Tag } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'internal',
    warehouse: '',
  });

  const toast = useToast();

  const fetchLocations = () => {
    setLoading(true);
    api.get('locations/')
      .then((res) => setLocations(res.data))
      .catch((err) => {
        toast.error('Failed to load locations');
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  const fetchWarehouses = () => {
    api.get('warehouses/').then((res) => {
      setWarehouses(res.data);
      if (res.data.length > 0) {
        setFormData((prev) => ({ ...prev, warehouse: res.data[0].id }));
      }
    });
  };

  useEffect(() => {
    fetchLocations();
    fetchWarehouses();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        type: formData.type,
        warehouse: formData.type === 'internal' && formData.warehouse ? formData.warehouse : null,
      };
      await api.post('locations/', payload);
      toast.success(`Location "${formData.name}" created!`);
      setShowModal(false);
      setFormData({ name: '', code: '', type: 'internal', warehouse: warehouses[0]?.id || '' });
      fetchLocations();
    } catch (err) {
      toast.error('Failed to create location');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete location "${name}"?`)) return;
    try {
      await api.delete(`locations/${id}/`);
      toast.success('Location deleted');
      fetchLocations();
    } catch (err) {
      toast.error('Failed to delete location');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>Stock Locations & Zones</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Manage physical aisles, racks, shelves, and virtual partner locations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          <span>Add Location</span>
        </button>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Location Code</th>
                <th>Location Name</th>
                <th>Location Type</th>
                <th>Parent Warehouse</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading locations...
                  </td>
                </tr>
              ) : (
                locations.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <code style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                        {l.code || 'N/A'}
                      </code>
                    </td>
                    <td>
                      <strong>{l.name}</strong>
                    </td>
                    <td>
                      <span className={`badge badge-${l.type === 'internal' ? 'ready' : l.type === 'vendor' ? 'waiting' : l.type === 'customer' ? 'done' : 'canceled'}`}>
                        {l.type}
                      </span>
                    </td>
                    <td>
                      {l.warehouse_name ? (
                        <span>{l.warehouse_name} ({l.warehouse_code})</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>Virtual (Unassigned)</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDelete(l.id, l.name)}
                        style={{ color: '#ef4444', padding: '4px' }}
                        title="Delete Location"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Location</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Location Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Storage Rack C - Bay 2"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Location Code (e.g. WH1/RACK-C)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. WH1/RACK-C"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="form-group">
                  <label>Location Type *</label>
                  <select
                    className="form-control"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="internal">Internal Location (Physical Warehouse/Rack)</option>
                    <option value="vendor">Vendor Location (Supplier Virtual)</option>
                    <option value="customer">Customer Location (Client Virtual)</option>
                    <option value="adjustment">Inventory Adjustment (Loss/Gain Virtual)</option>
                  </select>
                </div>
                {formData.type === 'internal' && (
                  <div className="form-group">
                    <label>Parent Warehouse Facility</label>
                    <select
                      className="form-control"
                      value={formData.warehouse}
                      onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                    >
                      <option value="">None / Floating</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Location</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
