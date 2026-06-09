import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, QrCode, X, Store } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/public/restaurants');
      setRestaurants(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [globalCart, setGlobalCart] = useState({ slug: null, items: [] });
  const [globalOrder, setGlobalOrder] = useState({ slug: null, order: null });

  useEffect(() => {
    let scanner = null;
    if (isScannerOpen) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render((decodedText) => {
        scanner.clear();
        setIsScannerOpen(false);
        try {
          const url = new URL(decodedText);
          if (url.pathname.startsWith('/r/')) {
            navigate(url.pathname);
          } else {
            window.location.href = decodedText;
          }
        } catch {
          navigate(`/r/${decodedText}`);
        }
      }, (error) => {});
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      }
    };
  }, [isScannerOpen, navigate]);

  useEffect(() => {
    // Scan local storage for any active cart or active order
    let foundCart = null;
    let foundOrder = null;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      if (key.startsWith('cart_')) {
        try {
          const items = JSON.parse(localStorage.getItem(key));
          if (items && items.length > 0 && items.some(item => item.quantity > 0)) {
            foundCart = { slug: key.replace('cart_', ''), items: items.filter(item => item.quantity > 0) };
          }
        } catch(e) {}
      }
      
      if (key.startsWith('order_')) {
        try {
          const order = JSON.parse(localStorage.getItem(key));
          if (order && order._id) {
            foundOrder = { slug: key.replace('order_', ''), order };
          }
        } catch(e) {}
      }
    }
    
    if (foundCart) setGlobalCart(foundCart);
    if (foundOrder) setGlobalOrder(foundOrder);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', paddingBottom: '2rem' }}>
      {/* Hero Section */}
      <div style={{ backgroundImage: 'radial-gradient(circle, rgba(255, 133, 176, 1) 0%, #ff4891ff 50%, rgba(212, 0, 71, 1) 100%)', backgroundColor: '#ffabf9', color: 'black', padding: '2rem 1rem 4rem 1rem', textAlign: 'center', borderRadius: '0 0 30px 30px', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em', color: 'white', textShadow: '0 4px 12px rgba(29, 158, 37, 0.25)' }}>OrderLay</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: '500px', margin: '0 auto 2rem auto', lineHeight: '1.5', color: 'black' }}>
          Discover the best local spots or instantly scan your table's QR code to start ordering.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', maxWidth: '500px', minWidth: '280px', display: 'flex' }}>
            <div style={{ position: 'relative', flex: '1' }}>
              <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 10 }} />
              <input
                type="text"
                placeholder="Search for a restaurant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '1rem 120px 1rem 3rem', borderRadius: '50px', border: 'none', fontSize: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', outline: 'none' }}
              />
              <button
                style={{ position: 'absolute', right: '6px', top: '6px', bottom: '6px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '40px', padding: '0 1.5rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => {
                  const firstMatch = filteredRestaurants[0];
                  if (firstMatch) navigate(`/r/${firstMatch.slug}`);
                }}
              >
                Search
              </button>

              {/* Suggestions Dropdown */}
              {searchQuery.length > 0 && filteredRestaurants.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '16px', marginTop: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 50, textAlign: 'left' }}>
                  {filteredRestaurants.slice(0, 5).map(r => (
                    <div
                      key={r._id}
                      onClick={() => navigate(`/r/${r.slug}`)}
                      style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: 'var(--text-color)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      {r.profilePicture ? (
                        <img src={r.profilePicture} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <Store size={20} color="#9ca3af" />
                      )}
                      <span style={{ fontWeight: 600 }}>{r.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            className="btn"
            style={{ background: 'black', color: 'white', borderRadius: '50px', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', fontWeight: 700, fontSize: '1.05rem', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
            onClick={() => setIsScannerOpen(true)}
          >
            <QrCode size={20} /> Scan QR
          </button>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1rem' }}>
        <h2 className="mb-3" style={{ fontSize: '1.5rem' }}>Popular Spots</h2>

        {loading ? (
          <div className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>Loading restaurants...</div>
        ) : filteredRestaurants.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 220px))', gap: '1rem', justifyContent: 'center' }}>
            {filteredRestaurants.map(r => (
              <div
                key={r._id}
                className="bento-card"
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', aspectRatio: '1 / 1', display: 'flex', flexDirection: 'column' }}
                onClick={() => navigate(`/r/${r.slug}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
              >
                {/* Banner background */}
                <div style={{
                  height: '40%',
                  background: r.bannerImage ? `url(${r.bannerImage}) center/cover no-repeat` : 'linear-gradient(135deg, var(--primary), #b30c52)',
                  flexShrink: 0
                }} />

                {/* Content area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.8rem', marginTop: '-35px', position: 'relative' }}>
                  {r.profilePicture ? (
                    <img
                      src={r.profilePicture}
                      alt={`${r.name} logo`}
                      style={{
                        width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover',
                        border: '3px solid white', background: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '70px', height: '70px', borderRadius: '50%', background: '#f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                    }}>
                      <Store size={28} color="#9ca3af" />
                    </div>
                  )}

                  <h3 style={{ margin: '0.5rem 0 0.2rem 0', fontSize: '1rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{r.name}</h3>

                  {r.phone && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>{r.phone}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center bento-card" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
            No restaurants found matching "{searchQuery}".
          </div>
        )}
      </div>

      {isScannerOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content bento-card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <div className="flex justify-between items-center mb-3">
              <h3 style={{ margin: 0 }}>Scan Table QR Code</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => setIsScannerOpen(false)}
              >
                <X size={24} />
              </button>
            </div>
            <div id="reader" style={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}></div>
            <p className="text-center text-muted mt-3" style={{ fontSize: '0.9rem' }}>
              Point your camera at the QR code on your table to view the menu and order.
            </p>
          </div>
        </div>
      )}
      {/* Floating Cart Bar (Global) */}
      {globalCart.items.length > 0 && (
        <div className="cart-bar" style={{ fontSize: '0.95rem' }}>
          <div style={{ overflow: 'hidden' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{globalCart.items.reduce((a,b)=>a+b.quantity, 0)} Items in Cart</span>
            <span style={{ marginLeft: '0.75rem', fontWeight: 700, fontSize: '1rem' }}>
              Rs. {globalCart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)}
            </span>
          </div>
          <button className="btn btn-primary" style={{ borderRadius: '30px', padding: '0.4rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }} onClick={() => {
            navigate(`/r/${globalCart.slug}`);
          }}>Return to Menu</button>
        </div>
      )}

      {/* Floating Track Order Pill (Global) */}
      {globalOrder.order && (
        <div className="cart-bar" style={{ bottom: globalCart.items.length > 0 ? '90px' : '24px', cursor: 'pointer', border: '2px solid var(--primary)' }} onClick={() => navigate(`/r/${globalOrder.slug}`)}>
          <div className="flex items-center gap-2">
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-dark)' }}>
              Order: {globalOrder.order.status === 'New' ? 'Pending' : globalOrder.order.status === 'Out for Delivery' ? 'Delivering' : globalOrder.order.status}
            </span>
          </div>
          <button className="btn btn-primary" style={{ borderRadius: '30px', padding: '0.4rem 1rem' }}>Track</button>
        </div>
      )}
    </div>
  );
};

export default Home;
