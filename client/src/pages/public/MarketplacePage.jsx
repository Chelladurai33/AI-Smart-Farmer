import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';

const MarketplacePage = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ search: '', category: '', district: '', minPrice: '', maxPrice: '', sort: 'latest', page: 1 });
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'));

  useEffect(() => {
    api.get('/products/categories')
      .then(r => {
        const list = r.data.data || [];
        if (list.length > 0) setCategories(list.map(c => c.name));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      const res = await api.get(`/products?${params}`);
      setProducts(res.data.data?.products || []);
      setPagination(res.data.data?.pagination || {});
      const cats = [...new Set((res.data.data?.products || []).map(p => p.category?.name).filter(Boolean))];
      if (cats.length > 0) {
        setCategories(prev => [...new Set([...prev, ...cats])]);
      }
    } catch {}
    setLoading(false);
  };

  const addToCart = (product) => {
    const existing = cart.find(i => i.productId === product.id);
    let newCart;
    if (existing) {
      newCart = cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
    } else {
      newCart = [...cart, { productId: product.id, name: product.name, price: product.expectedPrice, unit: product.unit, quantity: 1, imageUrl: product.imageUrl }];
    }
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const DISTRICTS = ['Chennai','Coimbatore','Madurai','Salem','Trichy','Tirunelveli','Erode','Vellore'];

  return (
    <div style={{ minHeight: 'calc(100vh - 70px)', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--gradient-hero)', padding: '3rem 0', color: 'white' }}>
        <div className="container">
          <h1 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: '2rem', marginBottom: '0.5rem' }}>🛒 Farm Marketplace</h1>
          <p style={{ opacity: 0.85 }}>Fresh produce directly from farmers across Tamil Nadu</p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <input className="form-control-custom" placeholder="🔍 Search crops..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
              style={{ maxWidth: 320, background: 'rgba(255,255,255,0.9)' }} />
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 15px' }}>
        <div className="row g-4">
          {/* Filters Sidebar */}
          <div className="col-md-3">
            <div className="glass-card p-3">
              <h5 style={{ fontWeight: 700, marginBottom: '1rem' }}>🎛️ Filters</h5>

              <div className="mb-3">
                <label className="form-label-custom">Category</label>
                <select className="form-control-custom" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value, page: 1 }))}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label-custom">District</label>
                <select className="form-control-custom" value={filters.district} onChange={e => setFilters(f => ({ ...f, district: e.target.value, page: 1 }))}>
                  <option value="">All Districts</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label-custom">Price Range (₹/kg)</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input type="number" className="form-control-custom" placeholder="Min" value={filters.minPrice} onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value, page: 1 }))} style={{ width: '50%' }} />
                  <input type="number" className="form-control-custom" placeholder="Max" value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value, page: 1 }))} style={{ width: '50%' }} />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label-custom">Sort By</label>
                <select className="form-control-custom" value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value, page: 1 }))}>
                  <option value="latest">Latest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>

              <button onClick={() => setFilters({ search: '', category: '', district: '', minPrice: '', maxPrice: '', sort: 'latest', page: 1 })} className="btn-outline-custom w-100" style={{ fontSize: '0.85rem' }}>Clear Filters</button>
            </div>

            {user?.role === 'BUYER' && cart.length > 0 && (
              <div className="glass-card p-3 mt-3">
                <h5 style={{ fontWeight: 700 }}>🛍️ Cart ({cart.length})</h5>
                {cart.map(item => <div key={item.productId} style={{ fontSize: '0.8rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border-light)' }}>{item.name} x{item.quantity}</div>)}
                <Link to="/buyer/cart" className="btn-primary-custom" style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', fontSize: '0.85rem' }}>View Cart</Link>
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="col-md-9">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{pagination.total || 0} products found</span>
            </div>

            {loading ? (
              <div className="row g-3">
                {[...Array(6)].map((_, i) => <div key={i} className="col-md-4"><div className="skeleton" style={{ height: 280, borderRadius: 'var(--radius-lg)' }} /></div>)}
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌱</div>
                <h3>No products found</h3>
                <p>Try adjusting your filters</p>
              </div>
            ) : (
              <div className="row g-3">
                {products.map(product => (
                  <div key={product.id} className="col-md-4 col-sm-6">
                    <div className="product-card">
                      <div style={{ overflow: 'hidden', height: 180 }}>
                        <Link to={`/marketplace/${product.id}`}>
                          <img src={product.imageUrl} alt={product.name} className="product-card-img" />
                        </Link>
                      </div>
                      <div className="product-card-body">
                        <Link to={`/marketplace/${product.id}`} style={{ textDecoration: 'none' }}>
                          <h5 style={{ fontWeight: 700, margin: '0 0 0.25rem', fontSize: '1rem', color: 'var(--text-primary)' }}>{product.name}</h5>
                        </Link>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>📍 {product.district} · {product.category?.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>👨‍🌾 {product.farmer?.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div><span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>₹{product.expectedPrice}</span><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/{product.unit}</span></div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{product.quantity} {product.unit}</span>
                        </div>
                        {product.avgRating > 0 && <div style={{ fontSize: '0.78rem', color: '#f59e0b', marginBottom: '0.5rem' }}>{'⭐'.repeat(Math.round(product.avgRating))} ({product.reviewCount})</div>}
                        {user?.role === 'BUYER' && (
                          <button onClick={() => addToCart(product)} className="btn-primary-custom w-100" style={{ fontSize: '0.82rem', padding: '0.4rem' }}>🛒 Add to Cart</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
                {[...Array(pagination.pages)].map((_, i) => (
                  <button key={i} onClick={() => setFilters(f => ({ ...f, page: i + 1 }))}
                    style={{ width: 36, height: 36, borderRadius: 8, border: `1.5px solid ${filters.page === i + 1 ? 'var(--primary)' : 'var(--border)'}`, background: filters.page === i + 1 ? 'var(--primary)' : 'transparent', color: filters.page === i + 1 ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default MarketplacePage;
