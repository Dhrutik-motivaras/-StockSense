import React, { useEffect, useState } from 'react';
import { Tags, Plus, X, Trash2, Package } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');

  const toast = useToast();

  const fetchCategories = () => {
    setLoading(true);
    api.get('categories/')
      .then((res) => setCategories(res.data))
      .catch((err) => {
        toast.error('Failed to load categories');
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('categories/', { name });
      toast.success(`Category "${name}" created!`);
      setShowModal(false);
      setName('');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.name?.[0] || 'Failed to create category');
    }
  };

  const handleDelete = async (id, catName) => {
    if (!window.confirm(`Delete category "${catName}"?`)) return;
    try {
      await api.delete(`categories/${id}/`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>Product Categories</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Organize products into logical inventory classifications</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          <span>Add Category</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {categories.map((c) => (
          <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '15px', color: '#fff', fontWeight: '700' }}>{c.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: 'var(--text-dim)', fontSize: '12px' }}>
                <Package size={13} />
                <span>{c.product_count || 0} Products</span>
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleDelete(c.id, c.name)}
              style={{ color: '#ef4444', padding: '6px' }}
              title="Delete Category"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Product Category</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Raw Materials or Electronics"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
