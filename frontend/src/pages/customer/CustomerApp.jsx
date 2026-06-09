import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import ImageCarousel from '../../components/ImageCarousel';
import { ShoppingCart, Package, Plus, Minus, X, Trash2, MapPin, ChevronDown, ChevronUp, Map as MapIcon, Home as HomeIcon, Bell } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapEvents({ setMarkerPos }) {
  useMapEvents({
    click(e) {
      setMarkerPos(e.latlng);
    }
  });
  return null;
}

const CustomerApp = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  
  // Cart state
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem(`cart_${slug}`)) || []);
  
  // Checkout & Order Tracking state
  const [showCheckout, setShowCheckout] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState([31.5204, 74.3587]);
  const [markerPos, setMarkerPos] = useState([31.5204, 74.3587]);
  const [trackedOrder, setTrackedOrder] = useState(() => JSON.parse(localStorage.getItem(`order_${slug}`)) || null);

  const getDisplayStatus = (status) => {
    switch(status) {
      case 'New': return 'Pending';
      case 'Out for Delivery': return 'Delivering';
      default: return status;
    }
  };
  
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '', lat: null, lng: null });
  
  // Temporary quantities for items before adding to cart
  const [tempQuantities, setTempQuantities] = useState({});
  
  const socketRef = useRef(null);

  useEffect(() => {
    fetchRestaurantData();
  }, [slug]);

  useEffect(() => {
    localStorage.setItem(`cart_${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  // Save tracked order to localStorage
  useEffect(() => {
    if (trackedOrder) {
      localStorage.setItem(`order_${slug}`, JSON.stringify(trackedOrder));
    } else {
      localStorage.removeItem(`order_${slug}`);
    }
  }, [trackedOrder, slug]);

  // Handle live socket updates & verify order exists
  useEffect(() => {
    if (trackedOrder?._id) {
      axios.get(`http://localhost:5001/api/public/order/${trackedOrder._id}`)
        .then(res => {
          setTrackedOrder(res.data);
          
          socketRef.current = io('http://localhost:5001');
          socketRef.current.emit('joinRestaurantRoom', trackedOrder._id);
          
          socketRef.current.on('orderStatusUpdated', (updatedOrder) => {
            setTrackedOrder(updatedOrder);
          });
        })
        .catch(err => {
          if (err.response?.status === 404) {
            setTrackedOrder(null);
          }
        });

      return () => socketRef.current?.disconnect();
    }
  }, [trackedOrder?._id]);

  const fetchRestaurantData = async () => {
    try {
      const res = await axios.get(`http://localhost:5001/api/public/restaurant/${slug}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load restaurant data');
    }
  };

  const getTempQty = (id) => tempQuantities[id] || 1;
  const updateTempQty = (id, delta) => {
    setTempQuantities(prev => ({
      ...prev,
      [id]: Math.min(10, Math.max(1, (prev[id] || 1) + delta))
    }));
  };

  const addToCart = (item, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItem === item._id);
      if (existing) {
        return prev.map(i => i.menuItem === item._id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { menuItem: item._id, name: item.name, price: calculatePrice(item), quantity: qty }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.menuItem !== itemId));
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.menuItem === id) {
        return { ...i, quantity: i.quantity + delta };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const calculatePrice = (item) => {
    if (!item.discount || item.discount.type === 'none') return item.price;
    if (item.discount.type === 'percentage') return item.price * (1 - item.discount.value / 100);
    if (item.discount.type === 'flat') return Math.max(0, item.price - item.discount.value);
    return item.price;
  };

  const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  const handleLocation = () => {
    if (navigator.geolocation) {
      setCheckoutForm({ ...checkoutForm, address: 'Fetching location...' });
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          if (res.data && res.data.display_name) {
            setCheckoutForm({ ...checkoutForm, address: res.data.display_name, lat, lng: lon });
          } else {
            setCheckoutForm({ ...checkoutForm, address: `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`, lat, lng: lon });
          }
        } catch (err) {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setCheckoutForm({ ...checkoutForm, address: `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`, lat, lng: lon });
        }
      }, () => {
        alert('Location access denied');
        setCheckoutForm({ ...checkoutForm, address: '', lat: null, lng: null });
      });
    }
  };

  const openMap = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        const pos = [position.coords.latitude, position.coords.longitude];
        setMapCenter(pos);
        setMarkerPos(pos);
        setShowMap(true);
      }, () => setShowMap(true));
    } else {
      setShowMap(true);
    }
  };

  const confirmMapLocation = async () => {
    setShowMap(false);
    setCheckoutForm({ ...checkoutForm, address: 'Fetching location...' });
    try {
      const lat = markerPos.lat || markerPos[0];
      const lon = markerPos.lng || markerPos[1];
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      if (res.data && res.data.display_name) {
        setCheckoutForm(prev => ({ ...prev, address: res.data.display_name, lat, lng: lon }));
      } else {
        setCheckoutForm(prev => ({ ...prev, address: `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`, lat, lng: lon }));
      }
    } catch (err) {
      const lat = markerPos.lat || markerPos[0];
      const lon = markerPos.lng || markerPos[1];
      setCheckoutForm(prev => ({ ...prev, address: `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`, lat, lng: lon }));
    }
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    const activeCart = cart.filter(i => i.quantity > 0);
    if (activeCart.length === 0) return alert('Please add at least one item to your order!');
    
    if (!checkoutForm.name.trim() || !checkoutForm.phone.trim() || !checkoutForm.address.trim()) {
      return alert('Please fill in all the details');
    }

    if (checkoutForm.name.trim().length < 2) {
      return alert('Please enter a valid name.');
    }

    const cleanPhone = checkoutForm.phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return alert('Please enter a valid phone number (10-15 digits).');
    }

    if (checkoutForm.address.trim().length < 5) {
      return alert('Please enter a more specific delivery address.');
    }

    try {
      const payload = {
        restaurantId: data.restaurant._id,
        customerPhone: checkoutForm.phone,
        customerName: checkoutForm.name,
        customerAddress: checkoutForm.address,
        deliveryLocation: (checkoutForm.lat && checkoutForm.lng) ? { lat: checkoutForm.lat, lng: checkoutForm.lng } : undefined,
        items: activeCart,
        totalAmount: activeCart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      };
      const res = await axios.post('http://localhost:5001/api/public/order', payload);
      localStorage.setItem(`order_${slug}`, JSON.stringify(res.data));
      setTrackedOrder(res.data);
      setCart([]);
      setShowCheckout(false);
      setShowTracking(true);

      // Prompt for push notifications
      if ('Notification' in window && navigator.serviceWorker) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          const wantsNotifications = window.confirm('Would you like to receive push notifications for order updates?');
          if (wantsNotifications) {
            try {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                const register = await navigator.serviceWorker.register('/sw.js');
                const subscription = await register.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_PUBLIC_VAPID_KEY)
                });
                await axios.post(`http://localhost:5001/api/push/subscribe-order/${res.data._id}`, {
                  subscription
                });
                alert('Order update notifications enabled!');
              }
            } catch(e) {
              console.error('Push error', e);
            }
          }
        }
      }

    } catch (err) {
      alert(err.response?.data?.message || 'Order failed');
    }
  };

  const enableOrderNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const register = await navigator.serviceWorker.register('/sw.js');
        const subscription = await register.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_PUBLIC_VAPID_KEY)
        });
        await axios.post(`http://localhost:5001/api/push/subscribe-order/${trackedOrder._id}`, {
          subscription
        });
        alert('Order update notifications enabled! You will be notified when the restaurant changes your order status.');
      } else {
        alert('Permission for notifications was denied.');
      }
    } catch(e) {
      console.error('Push error', e);
      alert('Failed to enable notifications');
    }
  };

  if (error) return <div style={{ color: 'var(--danger)', padding: '2rem', textAlign: 'center' }}><h2>{error}</h2></div>;
  if (!data) return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>;

  const { restaurant, categories, menuItems } = data;



  return (
    <div style={{ paddingBottom: trackedOrder && cart.length > 0 ? '180px' : '120px', position: 'relative' }}>
      {/* Home Button */}
      <button 
        onClick={() => navigate('/')}
        style={{ 
          position: 'absolute', top: '1rem', left: '1rem', zIndex: 100, 
          background: 'rgba(255,255,255,0.9)', color: 'var(--text-color)', 
          borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', 
          alignItems: 'center', justifyContent: 'center', border: 'none', 
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)', cursor: 'pointer'
        }}
      >
        <HomeIcon size={20} />
      </button>

      {/* Banner */}
      {restaurant.bannerImage && (
        <div className="storefront-banner" style={{ backgroundImage: `url(${restaurant.bannerImage})` }} />
      )}
      
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
        <div className="bento-card flex items-center gap-4 mb-3" style={{ marginTop: restaurant.bannerImage ? '0' : '2rem', position: 'relative', zIndex: 10, flexWrap: 'wrap' }}>
          {restaurant.profilePicture && (
            <img src={restaurant.profilePicture} alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid white', objectFit: 'cover' }} />
          )}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={{ margin: '0 0 0.5rem 0' }}>{restaurant.name}</h1>
            <p className="text-muted mb-2">{restaurant.address}</p>
            <span className={`status-badge ${restaurant.operatingHours.isOpen ? 'active' : 'suspended'}`}>
              {restaurant.operatingHours.isOpen ? 'Open Now' : 'Currently Closed'}
            </span>
          </div>
        </div>

        {/* Menu */}
        <div className="mt-3">
          {categories.map(cat => {
            const items = menuItems.filter(i => i.category === cat._id);
            if (items.length === 0) return null;
            return (
              <div key={cat._id} className="mb-3">
                <h2 className="mb-2" style={{ paddingLeft: '0.5rem' }}>{cat.name}</h2>
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
                            {item.discount?.type !== 'none' && <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap' }}>Rs. {item.price.toFixed(2)}</span>}
                            <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.15rem', whiteSpace: 'nowrap' }}>
                              Rs. {calculatePrice(item).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4', margin: 0 }}>{item.description}</p>

                        <div style={{ marginTop: 'auto' }}>
                        {!restaurant.operatingHours.isOpen ? (
                          <button className="btn btn-sm btn-outline btn-block" disabled>Closed</button>
                        ) : cart.find(i => i.menuItem === item._id) ? (
                          <div className="flex justify-between items-center w-100" style={{ background: '#f9fafb', borderRadius: '12px', padding: '0.2rem', border: '1px solid var(--border-color)' }}>
                            <button className="btn btn-outline flex items-center justify-center" style={{ border: 'none', background: 'white', padding: '0.4rem', flex: 1, borderRadius: '10px' }} onClick={() => updateQuantity(item._id, -1)}>
                              <Minus size={18} />
                            </button>
                            <span style={{ fontWeight: 700, fontSize: '1.1rem', width: '40px', textAlign: 'center' }}>{cart.find(i => i.menuItem === item._id).quantity}</span>
                            <button className="btn btn-outline flex items-center justify-center" style={{ border: 'none', background: 'white', padding: '0.4rem', flex: 1 }} onClick={() => updateQuantity(item._id, 1)}>
                              <Plus size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 w-100">
                            <div className="flex justify-between items-center" style={{ background: '#f9fafb', borderRadius: '12px', padding: '0.2rem', border: '1px solid var(--border-color)', width: '80px' }}>
                              <button className="btn btn-outline flex items-center justify-center" style={{ border: 'none', background: 'transparent', padding: '0.2rem', borderRadius: '10px' }} onClick={() => updateTempQty(item._id, -1)}>
                                <Minus size={16} />
                              </button>
                              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{getTempQty(item._id)}</span>
                              <button className="btn btn-outline flex items-center justify-center" style={{ border: 'none', background: 'transparent', padding: '0.2rem' }} onClick={() => updateTempQty(item._id, 1)}>
                                <Plus size={16} />
                              </button>
                            </div>
                            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '1rem', fontWeight: 600 }} onClick={() => {
                              addToCart(item, getTempQty(item._id));
                              setTempQuantities(prev => ({ ...prev, [item._id]: 1 }));
                            }}>Add</button>
                          </div>
                        )}
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

      {/* Floating Cart Bar */}
      {cart.length > 0 && (
        <div className="cart-bar" style={{ fontSize: '0.95rem' }}>
          <div style={{ overflow: 'hidden' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{cart.filter(i => i.quantity > 0).reduce((a,b)=>a+b.quantity, 0)} Items</span>
            <span style={{ marginLeft: '0.75rem', fontWeight: 700, fontSize: '1rem' }}>Rs. {cartTotal.toFixed(2)}</span>
          </div>
          <button className="btn btn-primary" style={{ borderRadius: '30px', padding: '0.4rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }} onClick={() => {
            if (cart.filter(i => i.quantity > 0).length === 0) return alert('Your cart is empty!');
            setShowCheckout(true);
          }}>Review Order</button>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="modal-overlay">
          <div className="modal-content bento-card">
            <h2 className="mb-2">Checkout</h2>
            
            <div className="cart-items mb-3">
              {cart.map((item) => (
                <div key={item.menuItem} className="flex justify-between items-center mb-3 pb-3" style={{ borderBottom: '1px solid var(--border-color)', opacity: item.quantity === 0 ? 0.4 : 1, transition: 'opacity 0.2s', gap: '1rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.01em', lineHeight: '1.3', flex: 1 }}>{item.name}</span>
                  <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                    <button className="btn btn-sm btn-outline flex items-center justify-center" style={{ padding: '0.3rem' }} onClick={() => updateQuantity(item.menuItem, -1)}>
                      <Minus size={14} />
                    </button>
                    <span style={{ width: '20px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                    <button className="btn btn-sm btn-outline flex items-center justify-center" style={{ padding: '0.3rem' }} onClick={() => updateQuantity(item.menuItem, 1)}>
                      <Plus size={14} />
                    </button>
                    <button className="btn btn-sm flex items-center justify-center" style={{ padding: '0.3rem', color: 'var(--danger)', background: 'transparent' }} onClick={() => removeFromCart(item.menuItem)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center mt-4 mb-4 pt-2">
                <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-dark)' }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-dark)' }}>Rs. {cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={submitOrder}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} required placeholder="John Doe" />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} required placeholder="123-456-7890" />
              </div>
              <div className="form-group">
                <label>Delivery Address</label>
                <div className="flex gap-2">
                  <input type="text" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} required style={{ flex: 1 }} placeholder="123 Main St" />
                  <button type="button" className="btn btn-outline flex items-center justify-center" style={{ padding: '0 0.8rem' }} onClick={handleLocation} title="Use My Location">
                    <MapPin size={18} />
                  </button>
                  <button type="button" className="btn btn-outline flex items-center justify-center" style={{ padding: '0 0.8rem' }} onClick={openMap} title="Select on Map">
                    <MapIcon size={18} />
                  </button>
                </div>
              </div>

              <div className="flex justify-between gap-3 mt-4">
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowCheckout(false)}>Back</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Place Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Track Order Pill */}
      {!showTracking && trackedOrder && (
        <div className="cart-bar" style={{ bottom: cart.filter(i => i.quantity > 0).length > 0 ? '90px' : '24px', cursor: 'pointer', border: '2px solid var(--primary)' }} onClick={() => setShowTracking(true)}>
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-dark)' }}>Order: {getDisplayStatus(trackedOrder.status)}</span>
          </div>
          <button className="btn btn-primary" style={{ borderRadius: '30px', padding: '0.4rem 1rem' }}>Track</button>
        </div>
      )}

      {/* Tracking Modal */}
      {showTracking && trackedOrder && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setShowTracking(false); }}>
          <div className="modal-content bento-card">
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ margin: 0 }}>Order Tracker</h2>
              <button className="btn btn-outline" style={{ padding: '0.3rem', border: 'none' }} onClick={() => setShowTracking(false)}><X size={20} /></button>
            </div>
            
            <div className="text-center mt-3 mb-3">
              <h1 style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{getDisplayStatus(trackedOrder.status)}</h1>
              <p className="text-muted">Order ID: #{trackedOrder._id.slice(-6).toUpperCase()}</p>
            </div>
            
            <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <h3 className="mb-2">Order Details</h3>
              {trackedOrder.items.map((i, idx) => (
                <div key={idx} className="flex justify-between mb-1 pb-1">
                  <span><span style={{ color: 'var(--secondary)', fontWeight: 600, marginRight: '0.5rem' }}>{i.quantity}x</span> {i.name}</span>
                  <span style={{ fontWeight: 600 }}>Rs. {(i.price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)', fontWeight: 700, fontSize: '1.1rem' }}>
                <span>Total</span>
                <span>Rs. {trackedOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {trackedOrder.status !== 'Completed' && trackedOrder.status !== 'Cancelled' && trackedOrder.status !== 'Canceled' && (
              <button className="btn btn-outline flex items-center justify-center gap-2 w-100 mb-3" onClick={enableOrderNotifications}>
                <Bell size={18} /> Enable Live Notifications
              </button>
            )}

            <div className="flex gap-3 mt-3">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowTracking(false)}>Back to Menu</button>
              <a href={`tel:${restaurant.phone}`} className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }}>Call</a>
              {(trackedOrder.status === 'Completed' || trackedOrder.status === 'Cancelled' || trackedOrder.status === 'Canceled') && (
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => {
                  setTrackedOrder(null);
                  setShowTracking(false);
                  localStorage.removeItem(`order_${slug}`);
                }}>Clear</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map Selection Modal */}
      {showMap && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setShowMap(false); }}>
          <div className="modal-content bento-card" style={{ padding: '1.5rem', width: '95%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center mb-3">
              <h2 style={{ margin: 0 }}>Pin Location</h2>
              <button className="btn btn-outline" style={{ padding: '0.3rem', border: 'none' }} onClick={() => setShowMap(false)}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border-color)', position: 'relative', zIndex: 1 }}>
              <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                <Marker position={markerPos} />
                <MapEvents setMarkerPos={setMarkerPos} />
              </MapContainer>
            </div>
            <button className="btn btn-primary" onClick={confirmMapLocation}>Confirm Map Pin</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerApp;
