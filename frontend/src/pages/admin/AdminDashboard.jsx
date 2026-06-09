import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

const AdminDashboard = () => {
  const { adminToken, logoutAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalRestaurants: 0, activeRestaurants: 0, totalOrders: 0, overallRevenue: 0 });
  const [restaurants, setRestaurants] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null); // null means create mode
  const [restaurantForm, setRestaurantForm] = useState({ name: '', email: '', phone: '', address: '', newPassword: '' });
  const [createdInfo, setCreatedInfo] = useState(null);

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin');
      return;
    }
    fetchData();
  }, [adminToken]);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${adminToken}` } };
      const statsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/admin/stats`, config);
      setStats(statsRes.data);
      const restRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/admin/restaurants`, config);
      setRestaurants(restRes.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        logoutAdmin();
        navigate('/admin');
      }
    }
  };

  const toggleStatus = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${adminToken}` } };
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/admin/restaurants/${id}/status`, {}, config);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this restaurant and ALL its data?')) return;
    try {
      const config = { headers: { Authorization: `Bearer ${adminToken}` } };
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/admin/restaurants/${id}`, config);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const downloadQR = (slug) => {
    const canvas = document.getElementById(`qr-${slug}`);
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `${slug}-qr.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${adminToken}` } };
      if (editingRestaurant) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/admin/restaurants/${editingRestaurant._id}`, restaurantForm, config);
        setShowModal(false);
        setEditingRestaurant(null);
      } else {
        const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/admin/restaurants`, restaurantForm, config);
        setCreatedInfo(res.data);
      }
      setRestaurantForm({ name: '', email: '', phone: '', address: '', newPassword: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save');
    }
  };

  const openModal = (restaurant = null) => {
    if (restaurant) {
      setEditingRestaurant(restaurant);
      setRestaurantForm({
        name: restaurant.name || '',
        email: restaurant.email || '',
        phone: restaurant.phone || '',
        address: restaurant.address || '',
        newPassword: ''
      });
    } else {
      setEditingRestaurant(null);
      setRestaurantForm({ name: '', email: '', phone: '', address: '', newPassword: '' });
    }
    setCreatedInfo(null);
    setShowModal(true);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Super Admin</h1>
        <button className="btn btn-outline" onClick={logoutAdmin}>Logout</button>
      </div>

      <div className="bento-grid bento-grid-4 mb-3">
        <div className="bento-card text-center">
          <p className="text-muted">Total Restaurants</p>
          <div className="stat-value">{stats.totalRestaurants}</div>
        </div>
        <div className="bento-card text-center">
          <p className="text-muted">Active Restaurants</p>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.activeRestaurants}</div>
        </div>
        <div className="bento-card text-center">
          <p className="text-muted">Total Orders</p>
          <div className="stat-value" style={{ color: 'var(--secondary)' }}>{stats.totalOrders}</div>
        </div>
        <div className="bento-card text-center">
          <p className="text-muted">Total Revenue</p>
          <div className="stat-value">Rs. {(stats.overallRevenue || 0).toFixed(2)}</div>
        </div>
      </div>

      <div className="bento-card">
        <div className="action-bar mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Restaurants Management</h2>
          <button className="btn btn-primary" onClick={() => openModal(null)}>+ Provision Restaurant</button>
        </div>

        <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug / URL</th>
              <th>Email</th>
              <th>Password</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map(r => (
              <tr key={r._id}>
                <td>{r.name}</td>
                <td><a href={`/r/${r.slug}`} target="_blank" rel="noreferrer">/r/{r.slug}</a></td>
                <td>{r.email}</td>
                <td><span style={{ fontFamily: 'monospace', background: 'var(--glass-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{r.plainPassword || 'N/A'}</span></td>
                <td>
                  <span className={`status-badge ${r.status}`}>{r.status}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'none' }}>
                      <QRCodeCanvas id={`qr-${r.slug}`} value={`${window.location.origin}/r/${r.slug}`} size={1024} />
                    </div>
                    <button className="btn btn-sm btn-secondary flex items-center gap-1" onClick={() => downloadQR(r.slug)}>
                      <QrCode size={14} /> QR
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openModal(r)}>Edit</button>
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => toggleStatus(r._id)}>
                      {r.status === 'active' ? 'Suspend' : 'Reactivate'}
                    </button>
                    <button 
                      className="btn btn-sm" 
                      style={{ background: 'var(--danger)', color: 'white' }}
                      onClick={() => handleDelete(r._id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content bento-card">
            <h3 className="mb-2">{editingRestaurant ? 'Edit Restaurant' : 'Provision New Restaurant'}</h3>
            {createdInfo ? (
              <div className="success-box">
                <p>Please provide this URL and Password to the restaurant owner.</p>
                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', margin: '1rem 0', fontFamily: 'monospace' }}>
                  <strong>URL:</strong> /r/{createdInfo.slug} <br/>
                  <strong>Password:</strong> {createdInfo.defaultPassword}
                </div>
                <button className="btn btn-primary btn-block" onClick={() => { setCreatedInfo(null); setShowModal(false); }}>Close</button>
              </div>
            ) : (
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label>Restaurant Name</label>
                  <input type="text" value={restaurantForm.name} onChange={e => setRestaurantForm({...restaurantForm, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Email (Login ID)</label>
                  <input type="email" value={restaurantForm.email} onChange={e => setRestaurantForm({...restaurantForm, email: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" value={restaurantForm.phone} onChange={e => setRestaurantForm({...restaurantForm, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input type="text" value={restaurantForm.address} onChange={e => setRestaurantForm({...restaurantForm, address: e.target.value})} />
                </div>
                {editingRestaurant && (
                  <div className="form-group">
                    <label>Change Password (leave blank to keep current)</label>
                    <input type="text" value={restaurantForm.newPassword} onChange={e => setRestaurantForm({...restaurantForm, newPassword: e.target.value})} />
                  </div>
                )}
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingRestaurant ? 'Save Changes' : 'Create'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
