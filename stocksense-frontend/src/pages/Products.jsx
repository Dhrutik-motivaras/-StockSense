import React, { useEffect, useState, useCallback } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Trash2, 
  X,
  Layers
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedProductStock, setSelectedProductStock] = useState(null); // for location breakdown modal

  // Create Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    uom: 'Units',
    reorder_level: 10,
    price: 0.00,
    description: '',
    initial_stock: '',
    initial_location: '',
  });

  const toast = useToast();

  const fetchMetadata = async () => {
    try {
      const [catRes, locRes] = await Promise.all([
        api.get('categories/'),
        api.get('locations/?type=internal'),
      ]);
      setCategories(catRes.data);
      setLocations(locRes.data);
      if (catRes.data.length > 0) {
        setFormData((prev) => ({ ...prev, category: catRes.data[0].id }));
      }
      if (locRes.data.length > 0) {
        setFormData((prev) => ({ ...prev, initial_location: locRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (selectedCategory) params.append('category', selectedCategory);
    if (lowStockFilter) params.append('low_stock', 'true');

    api.get(`products/?${params.toString()}`)
      .then((res) => setProducts(res.data))
      .catch((err) => {
        toast.error('Failed to load products');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [searchQuery, selectedCategory, lowStockFilter]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!formData.category) {
      toast.error('Please create or select a product category first');
      return;
    }

    // Build payload with correct types so DRF doesn't reject numeric strings
    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      category: parseInt(formData.category, 10),
      uom: formData.uom,
      reorder_level: parseInt(formData.reorder_level, 10) || 0,
      price: parseFloat(formData.price) || 0,
      description: formData.description,
      ...(formData.initial_stock !== '' && {
        initial_stock: formData.initial_stock,
        initial_location: formData.initial_location ? parseInt(formData.initial_location, 10) : null,
      }),
    };

    try {
      await api.post('products/', payload);
      toast.success(`Product "${formData.name}" registered successfully!`);
      setShowModal(false);
      setFormData({
        name: '',
        sku: '',
        category: categories[0]?.id || '',
        uom: 'Units',
        reorder_level: 10,
        price: 0.00,
        description: '',
        initial_stock: '',
        initial_location: locations[0]?.id || '',
      });
      fetchProducts();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        // Surface first field-level error message from DRF
        const firstField = Object.keys(data)[0];
        const firstMsg = Array.isArray(data[firstField]) ? data[firstField][0] : data[firstField];
        toast.error(`${firstField}: ${firstMsg}`);
      } else {
        toast.error('Failed to create product – check server logs');
      }
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`products/${id}/`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div>
      {/* Top Filter and Actions Bar */}
      <div className="filter-bar">
        <div className="filter-input-group">
          <Search size={16} className="filter-input-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <button
          className={`btn ${lowStockFilter ? 'btn-danger' : 'btn-secondary'} btn-sm`}
          onClick={() => setLowStockFilter(!lowStockFilter)}
          title="Filter only low stock products"
        >
          <AlertTriangle size={14} />
          <span>{lowStockFilter ? 'Showing Low Stock' : 'Filter Low Stock'}</span>
        </button>

        <button 
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
          style={{ marginLeft: 'auto' }}
        >
          <Plus size={16} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Products Table Card */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color="var(--accent-primary)" />
            <h3 className="card-title">Product Catalog ({products.length})</h3>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU Code</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Stock on Hand</th>
                <th>Reorder Level</th>
                <th>Status</th>
                <th>Location Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading product catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No products found matching the criteria. Click "Add New Product" to create one.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                        {p.sku}
                      </code>
                    </td>
                    <td>
                      <strong>{p.name}</strong>
                      {p.description && (
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.description}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#93c5fd' }}>
                        {p.category_name}
                      </span>
                    </td>
                    <td>${Number(p.price).toFixed(2)}</td>
                    <td>
                      <strong style={{ fontSize: '14px', color: p.is_low_stock ? '#ef4444' : '#10b981' }}>
                        {p.total_stock}
                      </strong>{' '}
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{p.uom}</span>
                    </td>
                    <td>{p.reorder_level} {p.uom}</td>
                    <td>
                      {p.is_low_stock ? (
                        <span className="badge badge-low-stock">
                          <AlertTriangle size={11} />
                          <span>Low Stock</span>
                        </span>
                      ) : (
                        <span className="badge badge-in-stock">
                          <CheckCircle2 size={11} />
                          <span>Healthy</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedProductStock(p)}
                        title="View stock breakdown across warehouses & racks"
                      >
                        <MapPin size={13} />
                        <span>Breakdown ({p.stock_by_location?.length || 0})</span>
                      </button>
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        title="Delete Product"
                        style={{ color: '#ef4444' }}
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

      {/* Create Product Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register New Product</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Ergonomic Office Desk"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>SKU / Barcode *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. DSK-ERG-01"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      className="form-control"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Unit of Measure (UOM)</label>
                    <select
                      className="form-control"
                      value={formData.uom}
                      onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    >
                      <option value="Units">Units (pcs)</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="Meters">Meters (m)</option>
                      <option value="Litres">Litres (L)</option>
                      <option value="Boxes">Boxes (bx)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reorder Alert Level</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Technical specifications or notes..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Initial Stock Opening Setup */}
                <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', display: 'block', marginBottom: '8px' }}>
                    Optional Initial Stock Opening Balance
                  </span>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Initial Quantity</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="0.00"
                        value={formData.initial_stock}
                        onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Initial Storage Location</label>
                      <select
                        className="form-control"
                        value={formData.initial_location}
                        onChange={(e) => setFormData({ ...formData, initial_location: e.target.value })}
                      >
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>{l.name} ({l.code || l.type})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock by Location Detail Modal */}
      {selectedProductStock && (
        <div className="modal-backdrop" onClick={() => setSelectedProductStock(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Stock Availability by Location</h3>
              <button className="modal-close" onClick={() => setSelectedProductStock(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div>
                <h4 style={{ color: '#fff', fontSize: '15px' }}>{selectedProductStock.name}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                  SKU: {selectedProductStock.sku} | Total: {selectedProductStock.total_stock} {selectedProductStock.uom}
                </p>
              </div>

              <div className="table-responsive" style={{ marginTop: '12px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Location Name</th>
                      <th>Location Code</th>
                      <th>Type</th>
                      <th>Quantity Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProductStock.stock_by_location?.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                          No stock allocated to any location yet.
                        </td>
                      </tr>
                    ) : (
                      selectedProductStock.stock_by_location.map((loc, idx) => (
                        <tr key={idx}>
                          <td><strong>{loc.location_name}</strong></td>
                          <td><code>{loc.location_code || 'N/A'}</code></td>
                          <td>
                            <span className="badge badge-ready">{loc.location_type}</span>
                          </td>
                          <td>
                            <strong style={{ color: '#10b981' }}>{loc.quantity}</strong> {selectedProductStock.uom}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedProductStock(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}