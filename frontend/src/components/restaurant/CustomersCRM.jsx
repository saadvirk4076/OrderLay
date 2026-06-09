import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const CustomersCRM = () => {
  const { restaurantToken } = useContext(AuthContext);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${restaurantToken}` } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/restaurant/customers`, config);
      // Sort by total spend descending
      const sorted = res.data.sort((a, b) => b.totalSpend - a.totalSpend);
      setCustomers(sorted);
    } catch (error) {
      console.error('Failed to fetch customers');
    }
  };

  return (
    <div>
      <h2>Customer CRM</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Overview of your customers based on completed orders, aggregated by phone number.
      </p>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Phone Number</th>
              <th>Name (Latest)</th>
              <th>Total Orders</th>
              <th>Total Spend</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.phone}>
                <td>{c.phone}</td>
                <td>{c.name}</td>
                <td>{c.orderCount}</td>
                <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                  Rs. {c.totalSpend.toFixed(2)}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No completed orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomersCRM;
