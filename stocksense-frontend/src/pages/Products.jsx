import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('1');

  const fetchProducts = () => {
    api.get('products/')
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    api.post('products/', { name, sku, category })
      .then(() => {
        setName('');
        setSku('');
        fetchProducts();
      })
      .catch((err) => alert('Failed to create product'));
  };

  return (
    <div>
      <h1>Product Management</h1>
      
      {/* Create Product Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
        <input 
          placeholder="Product Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
          style={{ padding: '8px' }}
        />
        <input 
          placeholder="SKU" 
          value={sku} 
          onChange={(e) => setSku(e.target.value)} 
          required 
          style={{ padding: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Add Product
        </button>
      </form>

      {/* Products Table */}
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: '#e2e8f0' }}>
            <th>ID</th>
            <th>Name</th>
            <th>SKU</th>
            <th>Reorder Level</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.sku}</td>
              <td>{p.reorder_level}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}