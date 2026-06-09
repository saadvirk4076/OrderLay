import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { UploadCloud, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

const ProfileManager = () => {
  const { restaurantToken } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/restaurant/profile`, config);
      setProfile(res.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    if (e.target.name.includes('operatingHours.')) {
      const field = e.target.name.split('.')[1];
      setProfile({
        ...profile,
        operatingHours: { ...profile.operatingHours, [field]: e.target.value }
      });
    } else {
      setProfile({ ...profile, [e.target.name]: e.target.value });
    }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('images', file);
    
    setUploading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}`, 'Content-Type': 'multipart/form-data' } };
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/upload`, formData, config);
      setProfile(prev => ({ ...prev, [field]: res.data.urls[0] }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleOpen = () => {
    setProfile({
      ...profile,
      operatingHours: { ...profile.operatingHours, isOpen: !profile.operatingHours.isOpen }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}` } };
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/restaurant/profile`, profile, config);
      alert('Profile updated successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to update profile');
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById('store-qr-code');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `${profile.slug || 'store'}-qr.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Store Profile</h2>
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500 }}>Store Status:</span>
          <span className={`status-badge ${profile.operatingHours?.isOpen ? 'active' : 'suspended'}`}>
            {profile.operatingHours?.isOpen ? 'Open (Accepting Orders)' : 'Closed'}
          </span>
          <button className={`btn btn-sm ${profile.operatingHours?.isOpen ? 'btn-outline' : 'btn-primary'}`} onClick={handleToggleOpen}>
            {profile.operatingHours?.isOpen ? 'Close Store' : 'Open Store'}
          </button>
          <button className="btn btn-sm btn-secondary flex items-center gap-1" onClick={downloadQR}>
            <QrCode size={16} /> Download QR
          </button>
        </div>
      </div>
      <div style={{ display: 'none' }}>
        {profile.slug && <QRCodeCanvas id="store-qr-code" value={`${window.location.origin}/r/${profile.slug}`} size={1024} />}
      </div>

      <form onSubmit={handleSave} className="bento-grid bento-grid-2">
        <div className="flex gap-4" style={{ flexDirection: 'column' }}>
          <div className="bento-card" style={{ background: '#f9fafb' }}>
            <h3 className="mb-2">Contact Details</h3>
            <div className="form-group">
              <label>Restaurant Name</label>
              <input type="text" name="name" value={profile.name || ''} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="text" name="phone" value={profile.phone || ''} onChange={handleChange} />
            </div>
            <div className="form-group mb-0">
              <label>Address</label>
              <textarea name="address" value={profile.address || ''} onChange={handleChange} rows="3" />
            </div>
          </div>

          <div className="bento-card" style={{ background: '#f9fafb' }}>
            <h3 className="mb-2">Operating Hours</h3>
            <div className="flex gap-3">
              <div className="form-group mb-0" style={{ flex: 1 }}>
                <label>Opening Time (HH:mm)</label>
                <input type="time" name="operatingHours.openTime" value={profile.operatingHours?.openTime || ''} onChange={handleChange} />
              </div>
              <div className="form-group mb-0" style={{ flex: 1 }}>
                <label>Closing Time (HH:mm)</label>
                <input type="time" name="operatingHours.closeTime" value={profile.operatingHours?.closeTime || ''} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>

        <div className="bento-card" style={{ background: '#f9fafb' }}>
          <h3 className="mb-2">Store Images</h3>
          <div className="form-group">
            <label>Profile Picture</label>
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt="Profile" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--border-color)' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  <UploadCloud size={24} />
                </div>
              )}
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                {uploading ? 'Uploading...' : 'Upload New Picture'}
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'profilePicture')} disabled={uploading} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
          <div className="form-group mt-3">
            <label>Banner Image</label>
            <div className="flex gap-2" style={{ flexDirection: 'column' }}>
              {profile.bannerImage ? (
                <img src={profile.bannerImage} alt="Banner" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
              ) : (
                <div style={{ width: '100%', height: '120px', borderRadius: '12px', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  <UploadCloud size={32} />
                </div>
              )}
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, alignSelf: 'flex-start' }}>
                {uploading ? 'Uploading...' : 'Upload New Banner'}
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'bannerImage')} disabled={uploading} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button type="submit" className="btn btn-primary btn-block" disabled={uploading}>Save Profile Changes</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProfileManager;
