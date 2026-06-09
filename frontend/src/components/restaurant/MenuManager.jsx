import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import ImageCarousel from '../ImageCarousel';
import { Plus, Trash2, X, UploadCloud } from 'lucide-react';

const MenuManager = () => {
  const { restaurantToken } = useContext(AuthContext);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', photos: [], category: '', 
    isOutOfStock: false, discount: { type: 'none', value: 0 }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}` } };
      const catRes = await axios.get('http://localhost:5001/api/restaurant/categories', config);
      setCategories(catRes.data);
      const menuRes = await axios.get('http://localhost:5001/api/restaurant/menu', config);
      setMenuItems(menuRes.data);
    } catch (error) {
      console.error('Failed to fetch menu data');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}` } };
      await axios.post('http://localhost:5001/api/restaurant/categories', { name: newCategoryName }, config);
      setNewCategoryName('');
      fetchData();
    } catch (err) {
      alert('Failed to add category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete category and ALL its items?')) return;
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}` } };
      await axios.delete(`http://localhost:5001/api/restaurant/categories/${id}`, config);
      fetchData();
    } catch (err) {
      alert('Failed to delete category');
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item._id);
      setFormData({
        name: item.name,
        description: item.description || '',
        price: item.price,
        photos: item.photos || (item.photo ? [item.photo] : []),
        category: item.category?._id || item.category,
        isOutOfStock: item.isOutOfStock,
        discount: item.discount || { type: 'none', value: 0 }
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '', description: '', price: '', photos: [], 
        category: categories.length > 0 ? categories[0]._id : '', 
        isOutOfStock: false, discount: { type: 'none', value: 0 }
      });
    }
    setShowItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}` } };
      if (editingItem) {
        await axios.put(`http://localhost:5001/api/restaurant/menu/${editingItem}`, formData, config);
      } else {
        await axios.post('http://localhost:5001/api/restaurant/menu', formData, config);
      }
      setShowItemModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to save item');
    }
  };

  const handleToggleStock = async (item) => {
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}` } };
      await axios.put(`http://localhost:5001/api/restaurant/menu/${item._id}`, { isOutOfStock: !item.isOutOfStock }, config);
      fetchData();
    } catch (err) {
      alert('Failed to update stock status');
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const imageFormData = new FormData();
    files.forEach(file => imageFormData.append('images', file));
    
    setUploading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}`, 'Content-Type': 'multipart/form-data' } };
      const res = await axios.post('http://localhost:5001/api/upload', imageFormData, config);
      setFormData(prev => ({ ...prev, photos: [...(prev.photos || []), ...res.data.urls] }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}` } };
      await axios.delete(`http://localhost:5001/api/restaurant/menu/${id}`, config);
      fetchData();
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2>Menu Management</h2>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => {
          if (categories.length === 0) return alert('Create a category first!');
          setEditingItem(null);
          setFormData({ name: '', description: '', price: '', photos: [], category: categories[0]._id, isOutOfStock: false, discount: { type: 'none', value: 0 } });
          setShowItemModal(true);
        }}><Plus size={18} /> Add Menu Item</button>
      </div>

      <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
        <div className="bento-card" style={{ width: '100%', maxWidth: '280px', minWidth: '200px', background: '#f9fafb', flexShrink: 0, alignSelf: 'flex-start' }}>
          <h3 className="mb-2">Categories</h3>
          <form onSubmit={handleAddCategory} className="flex gap-2 mb-3">
            <div className="form-group mb-0" style={{ margin: 0, flex: 1 }}>
              <input type="text" placeholder="New category..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-secondary flex items-center justify-center"><Plus size={18} /></button>
          </form>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categories.map(cat => (
              <li key={cat._id} className="flex justify-between items-center" style={{ background: 'white', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: 500 }}>{cat.name}</span>
                <button className="btn btn-sm btn-outline flex items-center justify-center" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.3rem' }} onClick={() => handleDeleteCategory(cat._id)}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ flex: 1 }}>
          {categories.map(cat => {
            const items = menuItems.filter(i => i.category?._id === cat._id || i.category === cat._id);
            if (items.length === 0) return null;
            return (
              <div key={cat._id} className="mb-3">
                <h3 className="mb-2" style={{ color: 'var(--secondary)' }}>{cat.name}</h3>
                <div className="bento-grid bento-grid-items">
                  {items.map(item => (
                    <div key={item._id} className="bento-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', height: '100%' }}>
                      <div style={{ position: 'relative' }}>
                        <ImageCarousel photos={item.photos && item.photos.length > 0 ? item.photos : (item.photo ? [item.photo] : [])} altText={item.name} />
                        {item.discount?.type !== 'none' && (
                          <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'var(--primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, zIndex: 10 }}>
                            {item.discount.type === 'percentage' ? `${item.discount.value}% OFF` : `SAVE Rs. ${item.discount.value}`}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.6rem', gap: '0.4rem' }}>
                        <div className="flex justify-between items-start" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: '1.2', flex: 1, minWidth: '100px' }}>{item.name}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>Rs. {item.price.toFixed(2)}</span>
                          </div>
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4', margin: 0 }}>{item.description}</p>

                        <div className="flex gap-2 mt-auto">
                          <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => {
                            setEditingItem(item._id);
                            setFormData({
                              name: item.name, description: item.description, price: item.price,
                              photos: item.photos && item.photos.length > 0 ? item.photos : (item.photo ? [item.photo] : []), 
                              category: item.category._id || item.category,
                              isOutOfStock: item.isOutOfStock,
                              discount: item.discount || { type: 'none', value: 0 }
                            });
                            setShowItemModal(true);
                          }}>Edit</button>
                          <button className={`btn btn-sm ${item.isOutOfStock ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => handleToggleStock(item._id, item.isOutOfStock)}>
                            {item.isOutOfStock ? 'Publish' : 'Hide'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showItemModal && (
        <div className="modal-overlay">
          <div className="modal-content bento-card">
            <h3 className="mb-2">{editingItem ? 'Edit Item' : 'New Item'}</h3>
            <form onSubmit={handleSaveItem}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="2" />
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
                  <label>Price (Rs.)</label>
                  <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                  <label>Item Images (Max 5)</label>
                  <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
                    <label className="btn btn-outline btn-sm flex items-center justify-center" style={{ cursor: 'pointer', margin: 0, height: '60px', padding: '0 1rem', background: 'rgba(215, 15, 100, 0.05)', border: '2px dashed var(--secondary)', color: 'var(--secondary)' }}>
                      <UploadCloud size={20} style={{ marginRight: '0.5rem' }} />
                      {uploading ? 'Uploading...' : 'Add Photos'}
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} style={{ display: 'none' }} />
                    </label>
                    {formData.photos && formData.photos.length > 0 && (
                      <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: '0.2rem', flex: 1 }}>
                        {formData.photos.map((url, idx) => (
                          <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                            <img src={url} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                            <button 
                              type="button" 
                              onClick={() => setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }))}
                              style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bento-card" style={{ background: '#f9fafb', padding: '1rem', marginBottom: '1.5rem' }}>
                <h4 className="mb-1 text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>Discount Config</h4>
                <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
                  <div className="form-group mb-0" style={{ flex: 1 }}>
                    <label>Type</label>
                    <select value={formData.discount.type} onChange={e => setFormData({...formData, discount: { ...formData.discount, type: e.target.value }})}>
                      <option value="none">None</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (Rs.)</option>
                    </select>
                  </div>
                  {formData.discount.type !== 'none' && (
                    <div className="form-group mb-0" style={{ flex: 1 }}>
                      <label>Value</label>
                      <input type="number" step="0.01" value={formData.discount.value} onChange={e => setFormData({...formData, discount: { ...formData.discount, value: e.target.value }})} required />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="stockToggle" checked={formData.isOutOfStock} onChange={e => setFormData({...formData, isOutOfStock: e.target.checked})} style={{ width: 'auto' }} />
                <label htmlFor="stockToggle" style={{ margin: 0 }}>Item is Out of Stock</label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowItemModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>{editingItem ? 'Save Changes' : 'Create Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManager;
