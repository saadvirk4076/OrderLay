import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { io } from 'socket.io-client';

const LiveOrders = () => {
  const { restaurantToken, restaurantData } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const socketRef = useRef(null);
  const audioRef = useRef(new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3')); // generic ping sound

  useEffect(() => {
    fetchOrders();

    // Setup Socket.io
    socketRef.current = io('http://localhost:5001');
    socketRef.current.emit('joinRestaurantRoom', restaurantData._id);

    socketRef.current.on('newOrder', (order) => {
      setOrders(prev => [...prev, order]);
      // Play sound alert for new order
      audioRef.current.play().catch(e => console.log('Audio play failed', e));
      // Try browser notification
      if (Notification.permission === 'granted') {
        new Notification('New Order Received!', { body: `Order for ${order.totalAmount}` });
      }
    });

    socketRef.current.on('orderStatusUpdated', (updatedOrder) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
    });

    // Request notification permission
    if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}` } };
      const res = await axios.get('http://localhost:5001/api/restaurant/orders', config);
      setOrders(res.data);
    } catch (error) {
      console.error('Failed to fetch orders');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}` } };
      await axios.put(`http://localhost:5001/api/restaurant/orders/${id}/status`, { status }, config);
      // State is updated either via socket or fetch
      fetchOrders(); 
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const columns = ['New', 'Processing', 'Out for Delivery'];

  return (
    <div>
      <h2 className="mb-3">Live Order Queue</h2>
      
      <div className="bento-grid bento-grid-3" style={{ minHeight: '60vh', alignItems: 'flex-start' }}>
        {columns.map(colStatus => (
          <div key={colStatus} className="bento-card" style={{ background: '#f9fafb' }}>
            <h3 className="text-center mb-3 pb-2" style={{ borderBottom: '2px solid var(--border-color)', color: colStatus === 'New' ? 'var(--warning)' : colStatus === 'Processing' ? 'var(--secondary)' : 'var(--success)' }}>
              {colStatus} ({orders.filter(o => o.status === colStatus).length})
            </h3>
            
            <div className="flex" style={{ flexDirection: 'column', gap: '1rem' }}>
              {orders.filter(o => o.status === colStatus).map(order => (
                <div key={order._id} className="bento-card" style={{ padding: '1.25rem', border: `2px solid ${colStatus === 'New' ? 'var(--warning)' : colStatus === 'Processing' ? 'var(--secondary)' : 'var(--success)'}` }}>
                  <div className="flex justify-between mb-1">
                    <strong style={{ fontSize: '1.1rem' }}>{order.customerName}</strong>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{order.customerPhone}</p>
                    <a href={`tel:${order.customerPhone}`} className="btn btn-outline" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}>Call</a>
                  </div>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0, flex: 1, lineHeight: '1.4' }}>{order.customerAddress}</p>
                    <a href={
                      order.deliveryLocation?.lat && order.deliveryLocation?.lng
                        ? `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLocation.lat},${order.deliveryLocation.lng}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress)}`
                    } target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Map</a>
                  </div>
                  
                  <div style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '12px', margin: '1rem 0' }}>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between mb-1" style={{ fontSize: '0.9rem' }}>
                        <span><span style={{ color: 'var(--secondary)', fontWeight: 600 }}>{item.quantity}x</span> {item.name}</span>
                        <span>Rs. {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)', fontWeight: 700 }}>
                      <span>Total</span>
                      <span>Rs. {order.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
                    {colStatus === 'New' && (
                      <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => updateStatus(order._id, 'Processing')}>Accept</button>
                    )}
                    {colStatus === 'Processing' && (
                      <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => updateStatus(order._id, 'Out for Delivery')}>Dispatch</button>
                    )}
                    {colStatus === 'Out for Delivery' && (
                      <button className="btn btn-sm" style={{ flex: 1, background: 'var(--success)', color: 'white' }} onClick={() => updateStatus(order._id, 'Completed')}>Delivered</button>
                    )}
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => updateStatus(order._id, 'Canceled')}>Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveOrders;
