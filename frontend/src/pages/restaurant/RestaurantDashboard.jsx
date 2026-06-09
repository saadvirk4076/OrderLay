import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import axios from 'axios';
import ProfileManager from '../../components/restaurant/ProfileManager';
import MenuManager from '../../components/restaurant/MenuManager';
import LiveOrders from '../../components/restaurant/LiveOrders';
import CustomersCRM from '../../components/restaurant/CustomersCRM';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const RestaurantDashboard = () => {
  const { restaurantToken, restaurantData, logoutRestaurant } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); // Close menu on select
  };

  const enableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const register = await navigator.serviceWorker.register('/sw.js');
        const subscription = await register.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_PUBLIC_VAPID_KEY)
        });
        await axios.post('http://localhost:5001/api/push/subscribe-restaurant', {
          restaurantId: restaurantData._id,
          subscription
        });
        alert('Notifications enabled! You will receive alerts even when this tab is closed.');
      } else {
        alert('Permission for notifications was denied.');
      }
    } catch (err) {
      console.error('Push error', err);
      alert('Failed to enable notifications');
    }
  };

  if (!restaurantToken) {
    navigate('/restaurant');
    return null;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>{restaurantData.name} Dashboard</h1>
        <div className="flex gap-2">
          <button className="btn btn-outline flex items-center gap-2" onClick={enableNotifications}>
            <Bell size={18} /> Enable Notifications
          </button>
          <button className="btn btn-outline" onClick={logoutRestaurant}>Logout</button>
        </div>
      </div>

      <div className="bento-card mb-3">
        <div className="flex justify-between items-center mobile-menu-btn" style={{ display: 'none', marginBottom: isMobileMenuOpen ? '1rem' : 0 }}>
          <h3 style={{ margin: 0 }}>Menu Options</h3>
          <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu size={24} />
          </button>
        </div>
        <div className={`tabs-container ${isMobileMenuOpen ? 'open' : ''}`}>
          <button className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => handleTabClick('orders')}>Live Orders</button>
          <button className={`tab-btn ${activeTab === 'crm' ? 'active' : ''}`} onClick={() => handleTabClick('crm')}>Customer CRM</button>
          <button className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => handleTabClick('menu')}>Menu Management</button>
          <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => handleTabClick('profile')}>Account Management</button>
        </div>
      </div>

      <div className="bento-card">
        {activeTab === 'profile' && <ProfileManager />}
        {activeTab === 'menu' && <MenuManager />}
        {activeTab === 'orders' && <LiveOrders />}
        {activeTab === 'crm' && <CustomersCRM />}
      </div>
    </div>
  );
};

export default RestaurantDashboard;
